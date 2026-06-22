from __future__ import annotations

import json
from pathlib import Path

from sqlalchemy.orm import Session

from api.config import settings
from api.models import AdminUser, CloudAccount, InstancePolicy, JobSchedule, TelegramBot, TelegramTarget
from api.security import hash_password


def _seed_admin(db: Session) -> None:
    if db.query(AdminUser).count():
        return
    db.add(AdminUser(username=settings.admin_username, password_hash=hash_password(settings.admin_password)))
    db.commit()


def _seed_schedules(db: Session) -> None:
    if db.query(JobSchedule).count():
        return
    db.add_all(
        [
            JobSchedule(job_type="monitor", cron_expr="*/5 * * * *", timezone="Asia/Shanghai", enabled=True),
            JobSchedule(job_type="daily_report", cron_expr="0 9 * * *", timezone="Asia/Shanghai", enabled=True),
        ]
    )
    db.commit()


def _import_legacy_config(db: Session) -> None:
    if db.query(CloudAccount).count():
        return
    legacy_file = Path(settings.legacy_config_file)
    if not legacy_file.exists():
        return

    data = json.loads(legacy_file.read_text(encoding="utf-8"))
    telegram = data.get("telegram", {})
    if telegram.get("bot_token") and telegram.get("chat_id"):
        bot = TelegramBot(name="默认机器人", bot_token=telegram["bot_token"], parse_mode="Markdown", enabled=True)
        db.add(bot)
        db.flush()
        db.add(
            TelegramTarget(
                bot_id=bot.id,
                name="默认通知目标",
                chat_id=telegram["chat_id"],
                receive_alerts=True,
                receive_recoveries=True,
                receive_daily_bill=True,
                enabled=True,
            )
        )

    for index, item in enumerate(data.get("users", []), start=1):
        account = CloudAccount(
            name=item.get("name") or f"阿里云账号 {index}",
            access_key_id=item.get("ak", ""),
            access_key_secret=item.get("sk", ""),
            account_type="cn" if item.get("currency") == "¥" else "intl",
            bill_endpoint=item.get("bill_endpoint", "business.ap-southeast-1.aliyuncs.com"),
            currency=item.get("currency", "$"),
            enabled=True,
        )
        db.add(account)
        db.flush()
        db.add(
            InstancePolicy(
                account_id=account.id,
                name=item.get("name") or item.get("instance_id") or f"实例 {index}",
                region=item.get("region", "cn-hongkong"),
                instance_id=item.get("instance_id", ""),
                resource_group_id=item.get("resgroup"),
                traffic_limit_gb=float(item.get("traffic_limit", 180)),
                bill_threshold=float(item.get("bill_threshold", 1)),
                auto_start_enabled=True,
                recreate_on_released=False,
                recreate_template_id=None,
                cooldown_seconds=1800,
                enabled=True,
            )
        )
    db.commit()


def initialize_defaults(db: Session) -> None:
    _seed_admin(db)
    _seed_schedules(db)
    _import_legacy_config(db)
