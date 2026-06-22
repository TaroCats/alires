from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.database import Base


def new_id() -> str:
    return uuid4().hex


class AdminUser(Base):
    __tablename__ = "admin_users"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(128))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class CloudAccount(Base):
    __tablename__ = "cloud_accounts"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(128))
    access_key_id: Mapped[str] = mapped_column(String(128))
    access_key_secret: Mapped[str] = mapped_column(String(256))
    account_type: Mapped[str] = mapped_column(String(16), default="intl")
    bill_endpoint: Mapped[str] = mapped_column(String(128))
    currency: Mapped[str] = mapped_column(String(8), default="$")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    instances: Mapped[list["InstancePolicy"]] = relationship(back_populates="account", cascade="all, delete-orphan")


class InstancePolicy(Base):
    __tablename__ = "instance_policies"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    account_id: Mapped[str] = mapped_column(ForeignKey("cloud_accounts.id"))
    name: Mapped[str] = mapped_column(String(128))
    region: Mapped[str] = mapped_column(String(64))
    instance_id: Mapped[str] = mapped_column(String(128))
    resource_group_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    traffic_limit_gb: Mapped[float] = mapped_column(Float, default=180.0)
    bill_threshold: Mapped[float] = mapped_column(Float, default=1.0)
    auto_start_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    recreate_on_released: Mapped[bool] = mapped_column(Boolean, default=False)
    recreate_template_id: Mapped[str | None] = mapped_column(String(128), nullable=True)
    cooldown_seconds: Mapped[int] = mapped_column(Integer, default=1800)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    account: Mapped[CloudAccount] = relationship(back_populates="instances")
    inspection_logs: Mapped[list["InspectionLog"]] = relationship(back_populates="instance_policy", cascade="all, delete-orphan")


class TelegramBot(Base):
    __tablename__ = "telegram_bots"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(128))
    bot_token: Mapped[str] = mapped_column(String(256))
    parse_mode: Mapped[str] = mapped_column(String(32), default="Markdown")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    targets: Mapped[list["TelegramTarget"]] = relationship(back_populates="bot", cascade="all, delete-orphan")


class TelegramTarget(Base):
    __tablename__ = "telegram_targets"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    bot_id: Mapped[str] = mapped_column(ForeignKey("telegram_bots.id"))
    name: Mapped[str] = mapped_column(String(128))
    chat_id: Mapped[str] = mapped_column(String(128))
    receive_alerts: Mapped[bool] = mapped_column(Boolean, default=True)
    receive_recoveries: Mapped[bool] = mapped_column(Boolean, default=True)
    receive_daily_bill: Mapped[bool] = mapped_column(Boolean, default=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)

    bot: Mapped[TelegramBot] = relationship(back_populates="targets")


class JobSchedule(Base):
    __tablename__ = "job_schedules"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    job_type: Mapped[str] = mapped_column(String(32), index=True)
    cron_expr: Mapped[str] = mapped_column(String(64))
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Shanghai")
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)


class InspectionLog(Base):
    __tablename__ = "inspection_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    instance_policy_id: Mapped[str] = mapped_column(ForeignKey("instance_policies.id"))
    current_status: Mapped[str] = mapped_column(String(32))
    traffic_gb: Mapped[float | None] = mapped_column(Float, nullable=True)
    bill_amount: Mapped[float | None] = mapped_column(Float, nullable=True)
    currency: Mapped[str | None] = mapped_column(String(8), nullable=True)
    action: Mapped[str] = mapped_column(String(32), default="none")
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    message: Mapped[str] = mapped_column(Text)
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    instance_policy: Mapped[InstancePolicy] = relationship(back_populates="inspection_logs")


class JobRunLog(Base):
    __tablename__ = "job_run_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    schedule_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    job_type: Mapped[str] = mapped_column(String(32))
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    summary: Mapped[str] = mapped_column(Text)
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class OperationLog(Base):
    __tablename__ = "operation_logs"

    id: Mapped[str] = mapped_column(String(32), primary_key=True, default=new_id)
    admin_user_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    action: Mapped[str] = mapped_column(String(64))
    detail: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
