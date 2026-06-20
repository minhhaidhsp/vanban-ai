import asyncio
import base64
import logging
from datetime import datetime, timezone

from app.schemas.reminder import ReminderOut
from app.core.config import Settings
from app.services.ics_service import generate_ics

logger = logging.getLogger(__name__)


def _fmt_vn(dt: datetime) -> str:
    """Format datetime as HH:mm ngày dd/MM/yyyy in Vietnam time (UTC+7)."""
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    ts = dt.timestamp() + 7 * 3600
    vn = datetime.utcfromtimestamp(ts)
    return vn.strftime("%H:%M ngày %d/%m/%Y")


def _build_html(reminder: ReminderOut) -> str:
    time_str = _fmt_vn(reminder.remind_at)
    desc_row = (
        f'<p style="margin:8px 0;color:#374151;">{reminder.description}</p>'
        if reminder.description else ""
    )
    doc_row = (
        f'<p style="margin:8px 0;color:#6b7280;font-size:13px;">📄 Tài liệu: {reminder.document_title}</p>'
        if reminder.document_title else ""
    )
    return f"""<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;padding:32px;">
        <tr><td>
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#6b7280;letter-spacing:1px;text-transform:uppercase;">
            Nhắc hẹn từ VănBản.AI
          </p>
          <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">
            {reminder.title}
          </h1>
          <p style="margin:0 0 8px;color:#374151;">
            ⏰ <strong>{time_str}</strong> (Giờ Việt Nam)
          </p>
          {desc_row}
          {doc_row}
          <hr style="margin:24px 0;border:none;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            Mở file đính kèm <strong>nhac-hen.ics</strong> để thêm vào
            Google Calendar / Outlook / Apple Calendar.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#d1d5db;">Gửi từ VănBản.AI</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _send_one(sg, message) -> int:
    """Synchronous SendGrid send — runs in thread pool via asyncio.to_thread."""
    response = sg.send(message)
    return response.status_code


async def send_reminder_email(
    reminder: ReminderOut,
    settings: Settings,
    base_url: str = "https://vanban.ai",
) -> bool:
    """Gửi email nhắc hẹn qua SendGrid với file .ics đính kèm."""
    logger.debug("DEBUG: Sending email to %s", reminder.recipients)

    if not settings.sendgrid_api_key:
        logger.warning("[email] SendGrid API key chưa cấu hình — bỏ qua")
        return False
    if not reminder.recipients:
        logger.debug("DEBUG: No recipients — skipping")
        return False

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import (
            Mail, Attachment, FileContent, FileName, FileType, Disposition,
        )
    except ImportError:
        logger.error("[email] sendgrid chưa được cài đặt")
        return False

    ics_content = generate_ics(reminder, base_url)
    encoded_ics = base64.b64encode(ics_content.encode("utf-8")).decode()
    html = _build_html(reminder)
    subject = f"[Nhắc hẹn] {reminder.title}"

    sg = SendGridAPIClient(settings.sendgrid_api_key)
    success = True

    for recipient in reminder.recipients:
        try:
            message = Mail(
                from_email=(settings.sendgrid_from_email, settings.sendgrid_from_name),
                to_emails=recipient,
                subject=subject,
                html_content=html,
            )
            attachment = Attachment(
                FileContent(encoded_ics),
                FileName("nhac-hen.ics"),
                FileType("text/calendar; method=REQUEST"),
                Disposition("attachment"),
            )
            message.attachment = attachment

            # sg.send() là blocking I/O — chạy trong thread pool tránh block event loop
            status_code = await asyncio.to_thread(_send_one, sg, message)
            logger.debug("DEBUG: SendGrid response %s for %s", status_code, recipient)
            logger.info("[email] gửi đến %s → status %s", recipient, status_code)
            if status_code >= 300:
                logger.error("[email] SendGrid trả lỗi %s cho %s", status_code, recipient)
                success = False
        except Exception as exc:
            logger.debug("DEBUG ERROR: %s", str(exc))
            logger.error("[email] lỗi khi gửi đến %s: %s", recipient, exc)
            success = False

    return success
