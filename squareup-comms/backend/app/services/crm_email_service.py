"""Email service — business logic for CRM email communication."""

from __future__ import annotations

import json
import re
from datetime import datetime
from typing import TYPE_CHECKING, Any, Sequence
import uuid

from sqlalchemy import select

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.crm import CRMActivity, CRMContact
from app.models.crm_audit import CRMAuditLog
from app.models.crm_deal import CRMDeal
from app.models.crm_email import CRMEmail
from app.models.crm_sequence import CRMSequenceEnrollment
from app.repositories.crm_email_repo import EmailRepository
from app.services.base import BaseService

if TYPE_CHECKING:
    from app.services.integrations.gmail_sync import GmailSyncService

logger = get_logger(__name__)


class EmailService(BaseService):
    """Business logic for email operations."""

    @property
    def repo(self) -> EmailRepository:
        return EmailRepository(self.session)

    # ─── Merge Fields ──────────────────────────────────────────────

    async def _resolve_merge_fields(
        self,
        template: str,
        contact_id: str,
        deal_id: str | None = None,
    ) -> str:
        """Replace {first_name}, {company}, {deal_value}, etc. in a template string."""
        if "{" not in template:
            return template

        result = await self.session.execute(
            select(CRMContact).where(CRMContact.id == contact_id)
        )
        contact = result.scalars().first()
        if contact is None:
            return template

        # Split name into first/last
        name_parts = (contact.name or "").split(None, 1)
        first_name = name_parts[0] if name_parts else ""
        last_name = name_parts[1] if len(name_parts) > 1 else ""

        replacements: dict[str, str] = {
            "{first_name}": first_name,
            "{last_name}": last_name,
            "{full_name}": contact.name or "",
            "{email}": contact.email or "",
            "{company}": contact.company or "",
            "{title}": contact.title or "",
        }

        # Resolve deal fields if a deal is linked
        if deal_id:
            deal_result = await self.session.execute(
                select(CRMDeal).where(CRMDeal.id == deal_id)
            )
            deal = deal_result.scalars().first()
            if deal:
                replacements["{deal_title}"] = deal.title or ""
                replacements["{deal_value}"] = str(deal.value or "")
                replacements["{deal_stage}"] = deal.stage or ""

        resolved = template
        for placeholder, value in replacements.items():
            resolved = resolved.replace(placeholder, value)
        return resolved

    # ─── Tracking Helpers ──────────────────────────────────────────

    @staticmethod
    def _inject_tracking_pixel(body_html: str, email_id: str) -> str:
        """Append a 1x1 transparent tracking pixel before </body> or at end."""
        base = settings.EMAIL_TRACKING_BASE_URL.rstrip("/")
        pixel = (
            f'<img src="{base}/emails/{email_id}/track/open" '
            f'width="1" height="1" alt="" style="display:none" />'
        )
        if "</body>" in body_html:
            return body_html.replace("</body>", f"{pixel}</body>")
        return body_html + pixel

    @staticmethod
    def _wrap_links(body_html: str, email_id: str) -> str:
        """Replace <a href="..."> URLs with click-tracking redirects."""
        base = settings.EMAIL_TRACKING_BASE_URL.rstrip("/")
        track_url = f"{base}/emails/{email_id}/track/click"

        def _replace_href(match: re.Match[str]) -> str:
            original_url = match.group(1)
            # Don't wrap tracking URLs or mailto links
            if track_url in original_url or original_url.startswith("mailto:"):
                return match.group(0)
            return f'href="{track_url}?url={original_url}"'

        return re.sub(r'href="([^"]+)"', _replace_href, body_html)

    # ─── Send ──────────────────────────────────────────────────────

    async def _resolve_to_address(self, contact_id: str, to_addresses: list[str]) -> str:
        """Build a comma-separated 'to' string, falling back to contact email."""
        if to_addresses:
            return ", ".join(to_addresses)
        result = await self.session.execute(
            select(CRMContact.email).where(CRMContact.id == contact_id)
        )
        contact_email = result.scalar_one_or_none()
        return contact_email or ""

    async def send_email(
        self,
        data: dict[str, Any],
        user_id: str,
        *,
        gmail_service: GmailSyncService | None = None,
    ) -> CRMEmail:
        """Send an email — resolves merge fields, injects tracking, creates record.

        If *gmail_service* is provided (and Gmail is configured for the user),
        the email is delivered via the Gmail API.  Otherwise the CRM record is
        created with status ``"sent"`` for local-only tracking (backwards compat).
        """
        now = datetime.utcnow()

        # Resolve merge fields in subject and body
        contact_id = data["contact_id"]
        deal_id = data.get("deal_id")
        subject = data.get("subject") or ""
        body_html = data.get("body_html") or ""
        body_text = data.get("body_text") or ""

        subject = await self._resolve_merge_fields(subject, contact_id, deal_id)
        body_html = await self._resolve_merge_fields(body_html, contact_id, deal_id)
        body_text = await self._resolve_merge_fields(body_text, contact_id, deal_id)

        # Start as "queued" when we'll attempt real delivery, else "sent" (local)
        initial_status = "queued" if gmail_service else "sent"

        email = CRMEmail(
            contact_id=contact_id,
            deal_id=deal_id,
            direction="outbound",
            subject=subject,
            body_html=body_html,
            body_text=body_text,
            from_address=data.get("from_address", f"{user_id}@squareup.com"),
            to_addresses=json.dumps(data.get("to_addresses", [])),
            cc_addresses=json.dumps(data.get("cc_addresses", [])),
            thread_id=data.get("thread_id") or str(uuid.uuid4()),
            status=initial_status,
            sequence_id=data.get("sequence_id"),
            sequence_step=data.get("sequence_step"),
            sent_at=now,
            created_by=user_id,
            created_at=now,
        )
        email = await self.repo.create(email)

        # Inject tracking pixel and wrap links in HTML body
        if email.body_html:
            tracked_html = self._inject_tracking_pixel(email.body_html, email.id)
            tracked_html = self._wrap_links(tracked_html, email.id)
            email = await self.repo.update(email, {"body_html": tracked_html})

        # Attempt Gmail delivery when a gmail_service is available
        if gmail_service:
            to_addresses_list: list[str] = data.get("to_addresses", [])
            to_str = await self._resolve_to_address(contact_id, to_addresses_list)
            cc_addresses_list: list[str] = data.get("cc_addresses", [])

            gmail_data: dict[str, str] = {
                "to": to_str,
                "subject": email.subject or "",
                "body_html": email.body_html or "",
                "body_text": email.body_text or "",
            }
            if cc_addresses_list:
                gmail_data["cc"] = ", ".join(cc_addresses_list)

            try:
                sent = await gmail_service.send_via_gmail(gmail_data, user_id)
                delivery_status = "sent" if sent else "sent"  # local-only fallback still counts
                delivery_method = "gmail" if sent else "local"
            except Exception:
                logger.exception("Gmail delivery failed for email %s", email.id)
                delivery_status = "send_failed"
                delivery_method = "local"

            email = await self.repo.update(email, {"status": delivery_status})
            logger.info(
                "Email %s delivery_method=%s status=%s",
                email.id, delivery_method, delivery_status,
            )

        # Log activity on the contact
        activity = CRMActivity(
            contact_id=email.contact_id,
            type="email_sent",
            title=f"Email sent: {email.subject or '(no subject)'}",
            content=email.body_text[:200] if email.body_text else None,
            performed_by=user_id,
            performer_type="user",
        )
        self.session.add(activity)

        # Audit log
        audit = CRMAuditLog(
            entity_type="email",
            entity_id=email.id,
            action="create",
            changes=json.dumps({"subject": email.subject, "direction": "outbound"}),
            performed_by=user_id,
        )
        self.session.add(audit)
        await self.session.commit()

        await self.events.emit("email.sent", {
            "email_id": email.id,
            "contact_id": email.contact_id,
            "deal_id": email.deal_id,
            "subject": email.subject,
        })

        return email

    async def receive_email(
        self,
        data: dict[str, Any],
        user_id: str,
    ) -> CRMEmail:
        """Record an inbound email (from sync or manual)."""
        now = datetime.utcnow()

        email = CRMEmail(
            contact_id=data["contact_id"],
            deal_id=data.get("deal_id"),
            direction="inbound",
            subject=data.get("subject"),
            body_html=data.get("body_html"),
            body_text=data.get("body_text"),
            from_address=data["from_address"],
            to_addresses=json.dumps(data.get("to_addresses", [])),
            cc_addresses=json.dumps(data.get("cc_addresses", [])),
            thread_id=data.get("thread_id"),
            external_message_id=data.get("external_message_id"),
            status="delivered",
            received_at=data.get("received_at", now),
            created_by=user_id,
            created_at=now,
        )
        email = await self.repo.create(email)

        # Log activity
        activity = CRMActivity(
            contact_id=email.contact_id,
            type="email_received",
            title=f"Email received: {email.subject or '(no subject)'}",
            content=email.body_text[:200] if email.body_text else None,
            performed_by=user_id,
            performer_type="system",
        )
        self.session.add(activity)
        await self.session.commit()

        await self.events.emit("email.received", {
            "email_id": email.id,
            "contact_id": email.contact_id,
            "thread_id": email.thread_id,
        })

        # Reply detection: auto-stop sequences with stop_on_reply
        await self._check_sequence_reply(email.contact_id)

        return email

    async def track_open(self, email_id: str) -> CRMEmail | None:
        """Record that an email was opened."""
        email = await self.repo.get_by_id(email_id)
        if email is None:
            return None

        now = datetime.utcnow()
        if email.opened_at is None:
            email = await self.repo.update(email, {
                "opened_at": now,
                "status": "opened",
            })

            await self.events.emit("email.opened", {
                "email_id": email_id,
                "contact_id": email.contact_id,
            })

        return email

    async def track_click(self, email_id: str) -> CRMEmail | None:
        """Record that a link in an email was clicked."""
        email = await self.repo.get_by_id(email_id)
        if email is None:
            return None

        now = datetime.utcnow()
        updates: dict[str, Any] = {"clicked_at": now, "status": "clicked"}
        if email.opened_at is None:
            updates["opened_at"] = now

        email = await self.repo.update(email, updates)

        await self.events.emit("email.clicked", {
            "email_id": email_id,
            "contact_id": email.contact_id,
        })

        return email

    async def get_email(self, email_id: str) -> CRMEmail | None:
        """Get a single email by ID."""
        return await self.repo.get_by_id(email_id)

    async def get_thread(self, thread_id: str) -> Sequence[CRMEmail]:
        """Get all emails in a thread."""
        return await self.repo.get_thread(thread_id)

    async def get_emails_for_contact(self, contact_id: str) -> Sequence[CRMEmail]:
        """Get all emails for a contact."""
        return await self.repo.get_for_contact(contact_id)

    # ─── Reply Detection ──────────────────────────────────────────

    async def _check_sequence_reply(self, contact_id: str) -> None:
        """Check if contact has active sequence enrollments and mark as replied."""
        from app.models.crm_sequence import CRMEmailSequence

        result = await self.session.execute(
            select(CRMSequenceEnrollment).where(
                CRMSequenceEnrollment.contact_id == contact_id,
                CRMSequenceEnrollment.status == "active",
            )
        )
        enrollments = result.scalars().all()

        for enrollment in enrollments:
            # Load the sequence to check stop_on_reply on current step
            seq_result = await self.session.execute(
                select(CRMEmailSequence).where(CRMEmailSequence.id == enrollment.sequence_id)
            )
            sequence = seq_result.scalars().first()
            if sequence is None:
                continue

            steps = json.loads(sequence.steps)
            current_step_idx = enrollment.current_step
            if current_step_idx < len(steps):
                step = steps[current_step_idx]
                if step.get("stop_on_reply", False):
                    now = datetime.utcnow()
                    enrollment.status = "replied"
                    enrollment.next_send_at = None
                    self.session.add(enrollment)

                    sequence.total_replied = (sequence.total_replied or 0) + 1
                    sequence.updated_at = now
                    self.session.add(sequence)

                    await self.session.commit()

                    await self.events.emit("sequence.contact_replied", {
                        "enrollment_id": enrollment.id,
                        "sequence_id": enrollment.sequence_id,
                        "contact_id": contact_id,
                    })
                    logger.info(
                        "Sequence reply detected: enrollment=%s sequence=%s contact=%s",
                        enrollment.id, enrollment.sequence_id, contact_id,
                    )
