from __future__ import annotations

import requests
from sqlalchemy.orm import Session

from api.models import TelegramBot, TelegramTarget


def send_message(bot: TelegramBot, target: TelegramTarget, title: str, message: str) -> None:
    if not bot.bot_token or not target.chat_id:
        return
    text = f"*{title}*\n\n{message}" if bot.parse_mode == "Markdown" else f"{title}\n\n{message}"
    requests.post(
        f"https://api.telegram.org/bot{bot.bot_token}/sendMessage",
        json={
            "chat_id": target.chat_id,
            "text": text,
            "parse_mode": bot.parse_mode if bot.parse_mode != "None" else None,
        },
        timeout=10,
    )


def send_by_preferences(db: Session, event_type: str, title: str, message: str) -> int:
    bots = db.query(TelegramBot).filter(TelegramBot.enabled.is_(True)).all()
    sent = 0
    for bot in bots:
        for target in bot.targets:
            if not target.enabled:
                continue
            should_receive = {
                "alert": target.receive_alerts,
                "recovery": target.receive_recoveries,
                "daily": target.receive_daily_bill,
            }.get(event_type, True)
            if not should_receive:
                continue
            send_message(bot, target, title, message)
            sent += 1
    return sent
