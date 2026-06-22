from __future__ import annotations

import requests
from sqlalchemy.orm import Session

from api.models import TelegramBot, TelegramTarget


class NotificationError(Exception):
    pass


def send_message(bot: TelegramBot, target: TelegramTarget, title: str, message: str) -> None:
    if not bot.bot_token or not target.chat_id:
        raise NotificationError("机器人 Token 或 Chat ID 未配置")
    text = f"*{title}*\n\n{message}" if bot.parse_mode == "Markdown" else f"{title}\n\n{message}"
    try:
        response = requests.post(
            f"https://api.telegram.org/bot{bot.bot_token}/sendMessage",
            json={
                "chat_id": target.chat_id,
                "text": text,
                "parse_mode": bot.parse_mode if bot.parse_mode != "None" else None,
            },
            timeout=10,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise NotificationError(f"Telegram 请求失败: {exc}") from exc

    data = response.json()
    if not data.get("ok"):
        raise NotificationError(data.get("description") or "Telegram 返回未知错误")


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
            try:
                send_message(bot, target, title, message)
                sent += 1
            except NotificationError:
                continue
    return sent
