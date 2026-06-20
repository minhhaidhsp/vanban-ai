from datetime import datetime, timezone, timedelta
from app.schemas.reminder import ReminderOut


def _fmt_dt(dt: datetime) -> str:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _escape(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
            .replace(";", "\\;")
            .replace(",", "\\,")
            .replace("\n", "\\n")
    )


def generate_ics(reminder: ReminderOut, base_url: str) -> str:
    now = datetime.now(timezone.utc)
    dtstart = _fmt_dt(reminder.remind_at)
    dtend = _fmt_dt(reminder.remind_at + timedelta(minutes=30))
    dtstamp = _fmt_dt(now)

    description_parts = []
    if reminder.description:
        description_parts.append(reminder.description)
    if reminder.document_title:
        description_parts.append(f"Tài liệu: {reminder.document_title}")
    description = "\\n\\n".join(_escape(p) for p in description_parts)

    url = f"{base_url.rstrip('/')}/dashboard/tools/reminders"
    summary = _escape(reminder.title)

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//VanBanAI//Reminder//VI",
        "BEGIN:VEVENT",
        f"UID:{reminder.id}@vanban.ai",
        f"DTSTAMP:{dtstamp}",
        f"DTSTART:{dtstart}",
        f"DTEND:{dtend}",
        f"SUMMARY:{summary}",
    ]
    if description:
        lines.append(f"DESCRIPTION:{description}")
    lines += [
        f"URL:{url}",
        "BEGIN:VALARM",
        "TRIGGER:-PT30M",
        "ACTION:DISPLAY",
        f"DESCRIPTION:Nhắc hẹn: {summary}",
        "END:VALARM",
        "END:VEVENT",
        "END:VCALENDAR",
    ]
    return "\r\n".join(lines) + "\r\n"
