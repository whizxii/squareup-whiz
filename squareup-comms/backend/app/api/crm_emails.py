"""CRM Emails API — send, receive, track, and browse email communication."""

from __future__ import annotations

from datetime import datetime
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field

from app.core.auth import get_current_user
from app.core.responses import ApiError, success_response
from app.api.deps import get_email_service, get_gmail_sync_service
from app.services.crm_email_service import EmailService
from app.services.integrations.gmail_sync import GmailSyncService

router = APIRouter(prefix="/api/crm/v2", tags=["crm-emails"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------


class EmailSendBody(BaseModel):
    contact_id: str
    deal_id: Optional[str] = None
    subject: Optional[str] = Field(default=None, max_length=500)
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    from_address: Optional[str] = Field(default=None, max_length=320)
    to_addresses: List[str] = Field(default_factory=list)
    cc_addresses: List[str] = Field(default_factory=list)
    thread_id: Optional[str] = None
    sequence_id: Optional[str] = None
    sequence_step: Optional[int] = None


class EmailReceiveBody(BaseModel):
    contact_id: str
    deal_id: Optional[str] = None
    subject: Optional[str] = Field(default=None, max_length=500)
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    from_address: str = Field(..., max_length=320)
    to_addresses: List[str] = Field(default_factory=list)
    cc_addresses: List[str] = Field(default_factory=list)
    thread_id: Optional[str] = None
    external_message_id: Optional[str] = None
    received_at: Optional[datetime] = None


class EmailResponse(BaseModel):
    id: str
    contact_id: str
    deal_id: Optional[str] = None
    direction: str
    subject: Optional[str] = None
    body_html: Optional[str] = None
    body_text: Optional[str] = None
    from_address: str
    to_addresses: str = "[]"
    cc_addresses: str = "[]"
    thread_id: Optional[str] = None
    external_message_id: Optional[str] = None
    opened_at: Optional[datetime] = None
    clicked_at: Optional[datetime] = None
    bounced: bool = False
    status: str = "draft"
    sequence_id: Optional[str] = None
    sequence_step: Optional[int] = None
    sent_at: Optional[datetime] = None
    received_at: Optional[datetime] = None
    created_by: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}

    @classmethod
    def from_model(cls, email: Any) -> "EmailResponse":
        return cls(
            id=email.id,
            contact_id=email.contact_id,
            deal_id=email.deal_id,
            direction=email.direction,
            subject=email.subject,
            body_html=email.body_html,
            body_text=email.body_text,
            from_address=email.from_address,
            to_addresses=email.to_addresses or "[]",
            cc_addresses=email.cc_addresses or "[]",
            thread_id=email.thread_id,
            external_message_id=email.external_message_id,
            opened_at=email.opened_at,
            clicked_at=email.clicked_at,
            bounced=email.bounced,
            status=email.status or "draft",
            sequence_id=email.sequence_id,
            sequence_step=email.sequence_step,
            sent_at=email.sent_at,
            received_at=email.received_at,
            created_by=email.created_by,
            created_at=email.created_at,
        )


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@router.post(
    "/emails/send",
    status_code=status.HTTP_201_CREATED,
)
async def send_email(
    body: EmailSendBody,
    svc: EmailService = Depends(get_email_service),
    user_id: str = Depends(get_current_user),
):
    """Send an outbound email to a contact."""
    data = body.model_dump(exclude_unset=True)
    email = await svc.send_email(data, user_id)
    return success_response(EmailResponse.from_model(email))


@router.post(
    "/emails/receive",
    status_code=status.HTTP_201_CREATED,
)
async def receive_email(
    body: EmailReceiveBody,
    svc: EmailService = Depends(get_email_service),
    user_id: str = Depends(get_current_user),
):
    """Record an inbound email (from sync or manual entry)."""
    data = body.model_dump(exclude_unset=True)
    email = await svc.receive_email(data, user_id)
    return success_response(EmailResponse.from_model(email))


@router.get("/emails")
async def list_emails(
    contact_id: Optional[str] = Query(default=None),
    deal_id: Optional[str] = Query(default=None),
    direction: Optional[str] = Query(default=None),
    status_filter: Optional[str] = Query(default=None, alias="status"),
    thread_id: Optional[str] = Query(default=None),
    sequence_id: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    sort_by: str = Query(default="created_at"),
    sort_dir: str = Query(default="desc"),
    cursor: Optional[str] = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    svc: EmailService = Depends(get_email_service),
    user_id: str = Depends(get_current_user),
):
    """List emails with filters and cursor pagination."""
    page = await svc.repo.search(
        contact_id=contact_id,
        deal_id=deal_id,
        direction=direction,
        status=status_filter,
        thread_id=thread_id,
        sequence_id=sequence_id,
        query=search,
        sort_by=sort_by,
        sort_dir=sort_dir,
        cursor=cursor,
        limit=limit,
    )
    return success_response({
        "items": [EmailResponse.from_model(e).model_dump(mode="json") for e in page.items],
        "next_cursor": page.next_cursor,
        "has_more": page.has_more,
        "total_count": page.total_count,
    })


@router.get("/emails/{email_id}")
async def get_email(
    email_id: str,
    svc: EmailService = Depends(get_email_service),
    user_id: str = Depends(get_current_user),
):
    """Get a single email by ID."""
    email = await svc.get_email(email_id)
    if email is None:
        raise ApiError(status_code=404, detail="Email not found")
    return success_response(EmailResponse.from_model(email))


@router.get("/emails/thread/{thread_id}")
async def get_thread(
    thread_id: str,
    svc: EmailService = Depends(get_email_service),
    user_id: str = Depends(get_current_user),
):
    """Get all emails in a thread (oldest first)."""
    emails = await svc.get_thread(thread_id)
    return success_response([
        EmailResponse.from_model(e).model_dump(mode="json") for e in emails
    ])


@router.put("/emails/{email_id}/track/open")
async def track_email_open(
    email_id: str,
    svc: EmailService = Depends(get_email_service),
    user_id: str = Depends(get_current_user),
):
    """Record that an email was opened."""
    email = await svc.track_open(email_id)
    if email is None:
        raise ApiError(status_code=404, detail="Email not found")
    return success_response(EmailResponse.from_model(email))


@router.put("/emails/{email_id}/track/click")
async def track_email_click(
    email_id: str,
    svc: EmailService = Depends(get_email_service),
    user_id: str = Depends(get_current_user),
):
    """Record that a link in an email was clicked."""
    email = await svc.track_click(email_id)
    if email is None:
        raise ApiError(status_code=404, detail="Email not found")
    return success_response(EmailResponse.from_model(email))


@router.post("/emails/sync")
async def sync_gmail(
    svc: GmailSyncService = Depends(get_gmail_sync_service),
    user_id: str = Depends(get_current_user),
):
    """Trigger a manual Gmail sync (pull emails and match to contacts)."""
    stats = await svc.sync_now(user_id)
    return success_response(stats)


@router.get("/contacts/{contact_id}/emails")
async def get_emails_for_contact(
    contact_id: str,
    svc: EmailService = Depends(get_email_service),
    user_id: str = Depends(get_current_user),
):
    """Get all emails for a contact (newest first)."""
    emails = await svc.get_emails_for_contact(contact_id)
    return success_response([
        EmailResponse.from_model(e).model_dump(mode="json") for e in emails
    ])
