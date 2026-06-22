from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    expiresAt: str


class CloudAccountBase(BaseModel):
    name: str
    access_key_id: str = Field(alias="accessKeyId")
    access_key_secret: str = Field(alias="accessKeySecret")
    account_type: str = Field(alias="accountType")
    bill_endpoint: str = Field(alias="billEndpoint")
    currency: str
    enabled: bool = True


class CloudAccountCreate(CloudAccountBase):
    pass


class CloudAccountUpdate(CloudAccountBase):
    pass


class CloudAccountOut(CloudAccountBase):
    id: str
    created_at: datetime = Field(alias="createdAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class InstancePolicyBase(BaseModel):
    account_id: str = Field(alias="accountId")
    name: str
    region: str
    instance_id: str = Field(alias="instanceId")
    resource_group_id: str | None = Field(default=None, alias="resourceGroupId")
    traffic_limit_gb: float = Field(default=180.0, alias="trafficLimitGb")
    bill_threshold: float = Field(default=1.0, alias="billThreshold")
    auto_start_enabled: bool = Field(default=True, alias="autoStartEnabled")
    recreate_on_released: bool = Field(default=False, alias="recreateOnReleased")
    recreate_template_id: str | None = Field(default=None, alias="recreateTemplateId")
    cooldown_seconds: int = Field(default=1800, alias="cooldownSeconds")
    enabled: bool = True


class InstancePolicyCreate(InstancePolicyBase):
    pass


class InstancePolicyUpdate(InstancePolicyBase):
    pass


class InstancePolicyOut(InstancePolicyBase):
    id: str
    created_at: datetime = Field(alias="createdAt")
    updated_at: datetime = Field(alias="updatedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class TelegramBotBase(BaseModel):
    name: str
    bot_token: str = Field(alias="botToken")
    parse_mode: str = Field(default="Markdown", alias="parseMode")
    enabled: bool = True


class TelegramBotCreate(TelegramBotBase):
    pass


class TelegramBotUpdate(TelegramBotBase):
    pass


class TelegramBotOut(TelegramBotBase):
    id: str

    class Config:
        from_attributes = True
        populate_by_name = True


class TelegramTargetBase(BaseModel):
    bot_id: str = Field(alias="botId")
    name: str
    chat_id: str = Field(alias="chatId")
    receive_alerts: bool = Field(default=True, alias="receiveAlerts")
    receive_recoveries: bool = Field(default=True, alias="receiveRecoveries")
    receive_daily_bill: bool = Field(default=True, alias="receiveDailyBill")
    enabled: bool = True


class TelegramTargetCreate(TelegramTargetBase):
    pass


class TelegramTargetUpdate(TelegramTargetBase):
    pass


class TelegramTargetOut(TelegramTargetBase):
    id: str

    class Config:
        from_attributes = True
        populate_by_name = True


class JobScheduleUpdate(BaseModel):
    cron_expr: str = Field(alias="cronExpr")
    timezone: str
    enabled: bool = True


class JobScheduleOut(BaseModel):
    id: str
    job_type: str = Field(alias="jobType")
    cron_expr: str = Field(alias="cronExpr")
    timezone: str
    enabled: bool

    class Config:
        from_attributes = True
        populate_by_name = True


class InspectionLogOut(BaseModel):
    id: str
    instance_policy_id: str = Field(alias="instancePolicyId")
    current_status: str = Field(alias="currentStatus")
    traffic_gb: float | None = Field(alias="trafficGb")
    bill_amount: float | None = Field(alias="billAmount")
    currency: str | None = None
    action: str
    success: bool
    message: str
    executed_at: datetime = Field(alias="executedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class JobRunLogOut(BaseModel):
    id: str
    schedule_id: str | None = Field(alias="scheduleId")
    job_type: str = Field(alias="jobType")
    success: bool
    summary: str
    executed_at: datetime = Field(alias="executedAt")

    class Config:
        from_attributes = True
        populate_by_name = True


class DashboardSummary(BaseModel):
    runningCount: int
    stoppedCount: int
    releasedCount: int
    overLimitCount: int
    billWarningCount: int
    totalMonthlyBill: float
    currency: str
    latestReportAt: str | None
    instances: list[dict]
    recentLogs: list[dict]


class TestNotificationRequest(BaseModel):
    target_id: str = Field(alias="targetId")
    title: str = "测试通知"
    message: str = "后台通知链路已打通。"
