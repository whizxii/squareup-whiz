"""Gmail sync integration — bi-directional email sync via Gmail API.

Supports:
- Pull: Fetch inbox + sent mail, match to CRM contacts, create CRMEmail records
- Push: Send emails via Gmail API from user's connected account
- Thread grouping via Gmail thread_id
- Mock mode for development when Gmail API is not configured

Usage:
    gmail_svc = GmailSyncService(session, events, background, cache)
    await gmail_svc.sync_now(user_id)  # manual trigger
    # or schedule via BackgroundTaskManager.schedule_periodic()
"""

from __future__ import annotations

import base64
import json
import uuid
from datetime import datetime, timezone, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

import httpx
from sqlalchemy import select

from app.core.config import settings
from app.core.logging_config import get_logger
from app.models.crm import CRMContact
from app.models.crm_email import CRMEmail
from app.services.base import BaseService
from app.services.integrations.google_auth import (
    get_user_integration_config,
    get_valid_access_token,
)

logger = get_logger(__name__)

# Mock email data for development (Indian business context)
_MOCK_INBOUND_EMAILS = [
    {
        "from_address": "priya.sharma@techcorp.in",
        "subject": "Re: Partnership Proposal — Q2 Campaign",
        "body_text": "Hi, thanks for the proposal. We'd love to discuss the terms further. Can we schedule a call this week?",
        "body_html": "<p>Hi, thanks for the proposal. We'd love to discuss the terms further. Can we schedule a call this week?</p>",
    },
    {
        "from_address": "rajesh.kumar@infoway.com",
        "subject": "Pricing clarification for Enterprise Plan",
        "body_text": "Could you share the detailed pricing breakdown for 50+ seats? We're comparing with other CRM vendors.",
        "body_html": "<p>Could you share the detailed pricing breakdown for 50+ seats? We're comparing with other CRM vendors.</p>",
    },
    {
        "from_address": "anjali.desai@startupfund.vc",
        "subject": "Follow-up: Demo session feedback",
        "body_text": "The demo was impressive. Our investment committee has a few questions about your GTM strategy.",
        "body_html": "<p>The demo was impressive. Our investment committee has a few questions about your GTM strategy.</p>",
    },
]

_MOCK_OUTBOUND_EMAILS = [
    {
        "to_address": "priya.sharma@techcorp.in",
        "subject": "Partnership Proposal — Q2 Campaign",
        "body_text": "Dear Priya, I'm excited to share our partnership proposal for the upcoming Q2 campaign.",
        "body_html": "<p>Dear Priya, I'm excited to share our partnership proposal for the upcoming Q2 campaign.</p>",
    },
    {
        "to_address": "rajesh.kumar@infoway.com",
        "subject": "Enterprise Plan — Custom Quote",
        "body_text": "Hi Rajesh, please find attached the custom pricing for your team of 50+.",
        "body_html": "<p>Hi Rajesh, please find attached the custom pricing for your team of 50+.</p>",
    },
]


class GmailSyncService(BaseService):
    """Bi-directional Gmail sync with mock fallback for development."""

    @property
    def is_gmail_configured(self) -> bool:
        """Check if Gmail API credentials are available."""
        return bool(
            settings.GOOGLE_CLIENT_ID
            and settings.GOOGLE_CLIENT_SECRET
            and settings.GMAIL_SYNC_ENABLED
        )

    # ─── Public API ───────────────────────────────────────────────

    async def sync_now(self, user_id: str = "system") -> dict[str, Any]:
        """Run a full sync cycle — pull + match. Returns summary stats."""
        if self.is_gmail_configured:
            return await self._sync_via_gmail_api(user_id)
        return await self._sync_mock(user_id)

    async def send_via_gmail(
        self,
        email_data: dict[str, Any],
        user_id: str,
    ) -> bool:
        """Send an email via Gmail API. Returns True if sent, False if falling back to mock."""
        if not self.is_gmail_configured:
            logger.info("Gmail not configured — email will be recorded without sending")
            return False

        config = await get_user_integration_config(user_id, "gmail", self.session)
        if not config:
            logger.warning("No Gmail integration found for user %s", user_id)
            return False

        try:
            access_token = await get_valid_access_token(
                config, self.session,
                test_url="https://gmail.googleapis.com/gmail/v1/users/me/profile",
            )
        except ValueError as exc:
            logger.error("Gmail token error for user %s: %s", user_id, exc)
            return False

        # Build RFC 2822 MIME message
        mime_msg = MIMEMultipart("alternative")
        mime_msg["To"] = email_data["to"]
        mime_msg["Subject"] = email_data.get("subject", "")
        if email_data.get("cc"):
            mime_msg["Cc"] = email_data["cc"]

        body_text = email_data.get("body_text", "")
        body_html = email_data.get("body_html", "")
        if body_text:
            mime_msg.attach(MIMEText(body_text, "plain"))
        if body_html:
            mime_msg.attach(MIMEText(body_html, "html"))

        # Base64url-encode the message
        raw_message = base64.urlsafe_b64encode(
            mime_msg.as_bytes()
        ).decode("ascii")

        # POST to Gmail send endpoint
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Content-Type": "application/json",
                },
                json={"raw": raw_message},
                timeout=30.0,
            )

        if resp.status_code not in (200, 201):
            logger.error("Gmail send failed (status=%d): %s", resp.status_code, resp.text)
            return False

        sent_msg = resp.json()
        logger.info(
            "Email sent via Gmail: message_id=%s thread_id=%s",
            sent_msg.get("id"),
            sent_msg.get("threadId"),
        )
        return True

    # ─── Gmail API sync (real implementation) ─────────────────────

    async def _sync_via_gmail_api(self, user_id: str) -> dict[str, Any]:
        """Sync emails via the real Gmail API.

        Flow:
        1. Get OAuth token from IntegrationConfig for user
        2. List messages since last sync (after date filter)
        3. For each message: fetch full payload, parse headers + body
        4. Match to CRM contacts by from/to address
        5. Create CRMEmail records, emit events
        """
        config = await get_user_integration_config(user_id, "gmail", self.session)
        if not config:
            logger.warning("No Gmail integration for user %s", user_id)
            return {"pulled": 0, "matched": 0, "skipped": 0, "error": "No Gmail integration found"}

        try:
            access_token = await get_valid_access_token(
                config, self.session,
                test_url="https://gmail.googleapis.com/gmail/v1/users/me/profile",
            )
        except ValueError as exc:
            logger.error("Gmail token error for user %s: %s", user_id, exc)
            return {"pulled": 0, "matched": 0, "skipped": 0, "error": str(exc)}

        stats: dict[str, int] = {"pulled": 0, "matched": 0, "skipped": 0}

        # Determine sync window — since last sync or last 7 days
        if config.last_synced_at:
            after_epoch = int(config.last_synced_at.timestamp())
        else:
            after_epoch = int((datetime.now(timezone.utc) - timedelta(days=7)).timestamp())

        # Fetch messages from INBOX and SENT
        for label in ("INBOX", "SENT"):
            query = f"after:{after_epoch}"
            await self._fetch_and_store_messages(
                access_token, user_id, query, label, stats
            )

        await self.session.commit()

        # Update last_synced_at on the integration config
        from app.models.integrations import IntegrationConfig as IC
        updated_config = IC(
            id=config.id,
            type=config.type,
            display_name=config.display_name,
            mcp_server_config=config.mcp_server_config,
            oauth_tokens_encrypted=config.oauth_tokens_encrypted,
            scopes=config.scopes,
            status=config.status,
            connected_by=config.connected_by,
            last_synced_at=datetime.now(timezone.utc),
            error_message=None,
            created_at=config.created_at,
            updated_at=datetime.now(timezone.utc),
        )
        await self.session.merge(updated_config)
        await self.session.commit()

        # Emit event
        if stats["matched"] > 0:
            await self.events.emit("gmail.sync_completed", {
                "user_id": user_id,
                "pulled": stats["pulled"],
                "matched": stats["matched"],
            })

        logger.info(
            "Gmail sync completed (API mode): pulled=%d matched=%d skipped=%d",
            stats["pulled"], stats["matched"], stats["skipped"],
        )
        return stats

    async def _fetch_and_store_messages(
        self,
        access_token: str,
        user_id: str,
        query: str,
        label: str,
        stats: dict[str, int],
    ) -> None:
        """Fetch a page of Gmail messages for a label and store matched ones."""
        auth_headers = {"Authorization": f"Bearer {access_token}"}

        async with httpx.AsyncClient(timeout=30.0) as client:
            list_resp = await client.get(
                "https://gmail.googleapis.com/gmail/v1/users/me/messages",
                headers=auth_headers,
                params={"q": query, "labelIds": label, "maxResults": "50"},
            )

            if list_resp.status_code != 200:
                logger.error("Gmail list messages failed: %s", list_resp.text)
                return

            messages = list_resp.json().get("messages", [])

            for msg_stub in messages:
                msg_id = msg_stub["id"]

                # Skip if already synced
                existing = await self._find_by_external_id(msg_id)
                if existing is not None:
                    stats["skipped"] += 1
                    continue

                # Fetch full message (reuses same TCP connection)
                msg_resp = await client.get(
                    f"https://gmail.googleapis.com/gmail/v1/users/me/messages/{msg_id}",
                    headers=auth_headers,
                    params={"format": "full"},
                )

                if msg_resp.status_code != 200:
                    stats["skipped"] += 1
                    continue

                msg_data = msg_resp.json()
                parsed = self._parse_gmail_message(msg_data)

                # Determine direction and match contact
                direction = "inbound" if label == "INBOX" else "outbound"
                contact_email = parsed["from"] if direction == "inbound" else parsed["to"]

                if not contact_email:
                    stats["skipped"] += 1
                    continue

                contact = await self._find_contact_by_email(contact_email)
                if contact is None:
                    stats["skipped"] += 1
                    continue

                now = datetime.now(timezone.utc)
                email_record = CRMEmail(
                    contact_id=contact.id,
                    direction=direction,
                    subject=parsed["subject"],
                    body_html=parsed["body_html"],
                    body_text=parsed["body_text"],
                    from_address=parsed["from"] or "",
                    to_addresses=json.dumps(parsed["to_list"]),
                    cc_addresses=json.dumps(parsed["cc_list"]),
                    thread_id=msg_data.get("threadId"),
                    external_message_id=msg_id,
                    status="delivered" if direction == "inbound" else "sent",
                    received_at=now if direction == "inbound" else None,
                    sent_at=now if direction == "outbound" else None,
                    created_by="gmail-sync",
                    created_at=now,
                )
                self.session.add(email_record)
                stats["pulled"] += 1
                stats["matched"] += 1

    @staticmethod
    def _parse_gmail_message(msg: dict[str, Any]) -> dict[str, Any]:
        """Extract headers and body from a Gmail API message payload."""
        headers = msg.get("payload", {}).get("headers", [])
        header_map: dict[str, str] = {}
        for h in headers:
            name_lower = h.get("name", "").lower()
            if name_lower in ("from", "to", "cc", "subject", "date"):
                header_map[name_lower] = h.get("value", "")

        # Extract the first email address from a header value like "Name <email>"
        def _extract_email(val: str) -> str:
            if "<" in val and ">" in val:
                return val[val.index("<") + 1 : val.index(">")]
            return val.strip()

        def _extract_email_list(val: str) -> list[str]:
            if not val:
                return []
            return [_extract_email(part) for part in val.split(",")]

        # Parse body — check parts or direct body
        body_text = ""
        body_html = ""
        payload = msg.get("payload", {})

        parts = payload.get("parts", [])
        if parts:
            for part in parts:
                mime = part.get("mimeType", "")
                data = part.get("body", {}).get("data", "")
                if data:
                    decoded = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
                    if mime == "text/plain" and not body_text:
                        body_text = decoded
                    elif mime == "text/html" and not body_html:
                        body_html = decoded
        else:
            # Single-part message
            data = payload.get("body", {}).get("data", "")
            if data:
                decoded = base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="replace")
                mime = payload.get("mimeType", "")
                if mime == "text/html":
                    body_html = decoded
                else:
                    body_text = decoded

        from_email = _extract_email(header_map.get("from", ""))
        to_raw = header_map.get("to", "")
        cc_raw = header_map.get("cc", "")

        return {
            "from": from_email,
            "to": _extract_email(to_raw) if to_raw else "",
            "to_list": _extract_email_list(to_raw),
            "cc_list": _extract_email_list(cc_raw),
            "subject": header_map.get("subject", ""),
            "body_text": body_text,
            "body_html": body_html,
        }

    # ─── Mock sync (development) ──────────────────────────────────

    async def _sync_mock(self, user_id: str) -> dict[str, Any]:
        """Generate realistic mock email data for development."""
        stats = {"pulled": 0, "matched": 0, "skipped": 0}

        # Pull mock inbound emails
        for mock in _MOCK_INBOUND_EMAILS:
            contact = await self._find_contact_by_email(mock["from_address"])
            if contact is None:
                stats["skipped"] += 1
                continue

            # Check if we already synced this (by external_message_id)
            mock_ext_id = f"mock-in-{mock['from_address']}-{mock['subject'][:30]}"
            existing = await self._find_by_external_id(mock_ext_id)
            if existing is not None:
                stats["skipped"] += 1
                continue

            now = datetime.now(timezone.utc)
            thread_id = f"thread-{uuid.uuid4().hex[:12]}"

            email = CRMEmail(
                contact_id=contact.id,
                direction="inbound",
                subject=mock["subject"],
                body_html=mock["body_html"],
                body_text=mock["body_text"],
                from_address=mock["from_address"],
                to_addresses=json.dumps([f"{user_id}@squareup.com"]),
                cc_addresses="[]",
                thread_id=thread_id,
                external_message_id=mock_ext_id,
                status="delivered",
                received_at=now - timedelta(hours=2),
                created_by="gmail-sync",
                created_at=now,
            )
            self.session.add(email)
            stats["pulled"] += 1
            stats["matched"] += 1

        # Pull mock outbound emails
        for mock in _MOCK_OUTBOUND_EMAILS:
            contact = await self._find_contact_by_email(mock["to_address"])
            if contact is None:
                stats["skipped"] += 1
                continue

            mock_ext_id = f"mock-out-{mock['to_address']}-{mock['subject'][:30]}"
            existing = await self._find_by_external_id(mock_ext_id)
            if existing is not None:
                stats["skipped"] += 1
                continue

            now = datetime.now(timezone.utc)
            thread_id = f"thread-{uuid.uuid4().hex[:12]}"

            email = CRMEmail(
                contact_id=contact.id,
                direction="outbound",
                subject=mock["subject"],
                body_html=mock["body_html"],
                body_text=mock["body_text"],
                from_address=f"{user_id}@squareup.com",
                to_addresses=json.dumps([mock["to_address"]]),
                cc_addresses="[]",
                thread_id=thread_id,
                external_message_id=mock_ext_id,
                status="sent",
                sent_at=now - timedelta(hours=3),
                created_by="gmail-sync",
                created_at=now,
            )
            self.session.add(email)
            stats["pulled"] += 1
            stats["matched"] += 1

        await self.session.commit()

        # Emit events for synced emails
        if stats["matched"] > 0:
            await self.events.emit("gmail.sync_completed", {
                "user_id": user_id,
                "pulled": stats["pulled"],
                "matched": stats["matched"],
            })

        logger.info(
            "Gmail sync completed (mock mode): pulled=%d matched=%d skipped=%d",
            stats["pulled"],
            stats["matched"],
            stats["skipped"],
        )
        return stats

    # ─── Helpers ──────────────────────────────────────────────────

    async def _find_contact_by_email(self, email_address: str) -> CRMContact | None:
        """Look up a CRM contact by their email address."""
        result = await self.session.execute(
            select(CRMContact).where(
                CRMContact.email == email_address,
                CRMContact.is_archived == False,  # noqa: E712
            )
        )
        return result.scalars().first()

    async def _find_by_external_id(self, external_message_id: str) -> CRMEmail | None:
        """Check if an email with this external ID already exists (dedup)."""
        result = await self.session.execute(
            select(CRMEmail).where(
                CRMEmail.external_message_id == external_message_id
            )
        )
        return result.scalars().first()
