"""Async email notification delivery via SMTP."""

from __future__ import annotations

import html as _html
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib

from app.core.config import settings

logger = logging.getLogger(__name__)


async def send_notification_email(
    *,
    user_id: str,
    notification_type: str,
    title: str,
    body: str | None,
) -> None:
    """Send an email notification. No-op if EMAIL_ENABLED is False.

    Looks up user email from UserProfile. Silently returns on any failure
    (this runs as a background task — must never raise).
    """
    if not settings.EMAIL_ENABLED:
        return

    try:
        from app.core.db import async_session
        from app.models.users import UserProfile

        async with async_session() as session:
            user = await session.get(UserProfile, user_id)
            if not user or not user.email:
                logger.debug("No email for user %s — skipping", user_id)
                return

        html = _render_email(notification_type, title, body)

        msg = MIMEMultipart("alternative")
        msg["Subject"] = title
        msg["From"] = f"{settings.EMAIL_FROM_NAME} <{settings.EMAIL_FROM_ADDRESS}>"
        msg["To"] = user.email
        msg.attach(MIMEText(body or title, "plain"))
        msg.attach(MIMEText(html, "html"))

        await aiosmtplib.send(
            msg,
            hostname=settings.EMAIL_SMTP_HOST,
            port=settings.EMAIL_SMTP_PORT,
            username=settings.EMAIL_SMTP_USERNAME,
            password=settings.EMAIL_SMTP_PASSWORD,
            use_tls=settings.EMAIL_SMTP_USE_TLS,
        )
        logger.info("Email sent to %s for %s", user.email, notification_type)

    except Exception:
        logger.error("Failed to send email for user %s", user_id, exc_info=True)


def _render_email(notification_type: str, title: str, body: str | None) -> str:
    """Render a simple branded HTML email."""
    safe_title = _html.escape(title)
    safe_body = f"<p>{_html.escape(body)}</p>" if body else ""
    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 18px;">SquareUp Comms</h1>
  </div>
  <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
    <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #1f2937;">{safe_title}</h2>
    {safe_body}
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
      You received this because of your notification settings in SquareUp Comms.
    </p>
  </div>
</body>
</html>"""
