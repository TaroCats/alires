from __future__ import annotations

from contextlib import asynccontextmanager
from datetime import datetime, timedelta
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session

from api.config import settings
from api.database import Base, SessionLocal, engine, get_db
from api.models import AdminUser, CloudAccount, InspectionLog, InstancePolicy, JobRunLog, JobSchedule, TelegramBot, TelegramTarget
from api.schemas import (
    CloudAccountCreate,
    CloudAccountOut,
    CloudAccountUpdate,
    DashboardSummary,
    InspectionLogOut,
    InstancePolicyCreate,
    InstancePolicyOut,
    InstancePolicyUpdate,
    JobRunLogOut,
    JobScheduleOut,
    JobScheduleUpdate,
    LoginRequest,
    LoginResponse,
    TelegramBotCreate,
    TelegramBotOut,
    TelegramBotUpdate,
    TelegramTargetCreate,
    TelegramTargetOut,
    TelegramTargetUpdate,
    TestNotificationRequest,
)
from api.security import TOKEN_TTL_SECONDS, hash_password, issue_token, require_auth
from api.services.bootstrap import initialize_defaults
from api.services.monitor import inspect_policy, run_monitor_job, send_daily_report
from api.services.notification import send_message
from api.services.scheduler import scheduler_service

BASE_DIR = Path(__file__).resolve().parent.parent
FRONTEND_DIST_DIR = BASE_DIR / "dist"
FRONTEND_ASSETS_DIR = FRONTEND_DIST_DIR / "assets"


Base.metadata.create_all(bind=engine)
db = SessionLocal()
initialize_defaults(db)
db.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    scheduler_service.start()
    yield
    scheduler_service.shutdown()


app = FastAPI(title="AliRes Admin", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.cors_origin, "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if FRONTEND_ASSETS_DIR.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_ASSETS_DIR), name="frontend-assets")


def serialize(model):
    return model.model_dump(by_alias=True)


def require_entity(entity, message: str):
    if not entity:
        raise HTTPException(status_code=404, detail=message)
    return entity


@app.get("/api/health")
def health():
    return {"ok": True}


@app.post("/api/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(AdminUser).filter(AdminUser.username == payload.username).first()
    if not user or user.password_hash != hash_password(payload.password):
        raise HTTPException(status_code=401, detail="用户名或密码错误")
    expires_at = (datetime.utcnow() + timedelta(seconds=TOKEN_TTL_SECONDS)).isoformat()
    return {"token": issue_token(user.username), "expiresAt": expires_at}


@app.get("/api/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(_: str = Depends(require_auth), db: Session = Depends(get_db)):
    policies = db.query(InstancePolicy).order_by(InstancePolicy.created_at.desc()).all()
    job = db.query(JobRunLog).filter(JobRunLog.job_type == "daily_report").order_by(JobRunLog.executed_at.desc()).first()

    running = stopped = released = over_limit = bill_warning = 0
    total_bill = 0.0
    instances = []
    currency = "$"
    for policy in policies:
        latest = (
            db.query(InspectionLog)
            .filter(InspectionLog.instance_policy_id == policy.id)
            .order_by(InspectionLog.executed_at.desc())
            .first()
        )
        status = latest.current_status if latest else "Unknown"
        if status == "Running":
            running += 1
        elif status == "Stopped":
            stopped += 1
        elif status == "Released":
            released += 1
        if latest and latest.traffic_gb is not None and latest.traffic_gb >= policy.traffic_limit_gb:
            over_limit += 1
        if latest and latest.bill_amount is not None and latest.bill_amount >= policy.bill_threshold:
            bill_warning += 1
            total_bill += latest.bill_amount
            currency = latest.currency or currency
        elif latest and latest.bill_amount is not None:
            total_bill += latest.bill_amount
            currency = latest.currency or currency
        account = db.get(CloudAccount, policy.account_id)
        instances.append(
            {
                "id": policy.id,
                "name": policy.name,
                "instanceId": policy.instance_id,
                "region": policy.region,
                "status": status,
                "trafficGb": latest.traffic_gb if latest else None,
                "billAmount": latest.bill_amount if latest else None,
                "currency": latest.currency if latest else account.currency,
                "lastMessage": latest.message if latest else "尚未执行巡检",
                "enabled": policy.enabled,
            }
        )

    recent_logs = [
        {
            "id": log.id,
            "jobType": log.job_type,
            "summary": log.summary,
            "success": log.success,
            "executedAt": log.executed_at.isoformat(),
        }
        for log in db.query(JobRunLog).order_by(JobRunLog.executed_at.desc()).limit(8).all()
    ]
    return {
        "runningCount": running,
        "stoppedCount": stopped,
        "releasedCount": released,
        "overLimitCount": over_limit,
        "billWarningCount": bill_warning,
        "totalMonthlyBill": round(total_bill, 2),
        "currency": currency,
        "latestReportAt": job.executed_at.isoformat() if job else None,
        "instances": instances,
        "recentLogs": recent_logs,
    }


@app.get("/api/accounts", response_model=list[CloudAccountOut])
def list_accounts(_: str = Depends(require_auth), db: Session = Depends(get_db)):
    return db.query(CloudAccount).order_by(CloudAccount.created_at.desc()).all()


@app.post("/api/accounts", response_model=CloudAccountOut)
def create_account(payload: CloudAccountCreate, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    account = CloudAccount(**payload.model_dump(by_alias=False))
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@app.put("/api/accounts/{account_id}", response_model=CloudAccountOut)
def update_account(account_id: str, payload: CloudAccountUpdate, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    account = require_entity(db.get(CloudAccount, account_id), "账号不存在")
    for key, value in payload.model_dump(by_alias=False).items():
        setattr(account, key, value)
    db.commit()
    db.refresh(account)
    return account


@app.delete("/api/accounts/{account_id}")
def delete_account(account_id: str, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    account = require_entity(db.get(CloudAccount, account_id), "账号不存在")
    db.delete(account)
    db.commit()
    return {"ok": True}


@app.get("/api/instances", response_model=list[InstancePolicyOut])
def list_instances(_: str = Depends(require_auth), db: Session = Depends(get_db)):
    return db.query(InstancePolicy).order_by(InstancePolicy.updated_at.desc()).all()


@app.post("/api/instances", response_model=InstancePolicyOut)
def create_instance(payload: InstancePolicyCreate, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    policy = InstancePolicy(**payload.model_dump(by_alias=False))
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@app.put("/api/instances/{policy_id}", response_model=InstancePolicyOut)
def update_instance(policy_id: str, payload: InstancePolicyUpdate, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    policy = require_entity(db.get(InstancePolicy, policy_id), "实例策略不存在")
    for key, value in payload.model_dump(by_alias=False).items():
        setattr(policy, key, value)
    db.commit()
    db.refresh(policy)
    return policy


@app.delete("/api/instances/{policy_id}")
def delete_instance(policy_id: str, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    policy = require_entity(db.get(InstancePolicy, policy_id), "实例策略不存在")
    db.delete(policy)
    db.commit()
    return {"ok": True}


@app.post("/api/instances/{policy_id}/run-check")
def run_check(policy_id: str, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    policy = require_entity(db.get(InstancePolicy, policy_id), "实例策略不存在")
    log = inspect_policy(db, policy, manual=True)
    return {"ok": True, "log": serialize(InspectionLogOut.model_validate(log))}


@app.post("/api/instances/{policy_id}/recover")
def recover_instance(policy_id: str, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    policy = require_entity(db.get(InstancePolicy, policy_id), "实例策略不存在")
    log = inspect_policy(db, policy, manual=True)
    return {"ok": True, "log": serialize(InspectionLogOut.model_validate(log))}


@app.get("/api/notifications/bots", response_model=list[TelegramBotOut])
def list_bots(_: str = Depends(require_auth), db: Session = Depends(get_db)):
    return db.query(TelegramBot).all()


@app.post("/api/notifications/bots", response_model=TelegramBotOut)
def create_bot(payload: TelegramBotCreate, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    bot = TelegramBot(**payload.model_dump(by_alias=False))
    db.add(bot)
    db.commit()
    db.refresh(bot)
    return bot


@app.put("/api/notifications/bots/{bot_id}", response_model=TelegramBotOut)
def update_bot(bot_id: str, payload: TelegramBotUpdate, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    bot = require_entity(db.get(TelegramBot, bot_id), "机器人不存在")
    for key, value in payload.model_dump(by_alias=False).items():
        setattr(bot, key, value)
    db.commit()
    db.refresh(bot)
    return bot


@app.delete("/api/notifications/bots/{bot_id}")
def delete_bot(bot_id: str, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    bot = require_entity(db.get(TelegramBot, bot_id), "机器人不存在")
    db.delete(bot)
    db.commit()
    return {"ok": True}


@app.get("/api/notifications/targets", response_model=list[TelegramTargetOut])
def list_targets(_: str = Depends(require_auth), db: Session = Depends(get_db)):
    return db.query(TelegramTarget).all()


@app.post("/api/notifications/targets", response_model=TelegramTargetOut)
def create_target(payload: TelegramTargetCreate, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    target = TelegramTarget(**payload.model_dump(by_alias=False))
    db.add(target)
    db.commit()
    db.refresh(target)
    return target


@app.put("/api/notifications/targets/{target_id}", response_model=TelegramTargetOut)
def update_target(target_id: str, payload: TelegramTargetUpdate, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    target = require_entity(db.get(TelegramTarget, target_id), "通知目标不存在")
    for key, value in payload.model_dump(by_alias=False).items():
        setattr(target, key, value)
    db.commit()
    db.refresh(target)
    return target


@app.delete("/api/notifications/targets/{target_id}")
def delete_target(target_id: str, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    target = require_entity(db.get(TelegramTarget, target_id), "通知目标不存在")
    db.delete(target)
    db.commit()
    return {"ok": True}


@app.post("/api/notifications/test")
def test_notification(payload: TestNotificationRequest, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    target = require_entity(db.get(TelegramTarget, payload.target_id), "通知目标不存在")
    bot = require_entity(db.get(TelegramBot, target.bot_id), "机器人不存在")
    send_message(bot, target, payload.title, payload.message)
    db.add(JobRunLog(job_type="notification_test", success=True, summary=f"测试消息已发送到 {target.name}"))
    db.commit()
    return {"ok": True}


@app.get("/api/schedules", response_model=list[JobScheduleOut])
def list_schedules(_: str = Depends(require_auth), db: Session = Depends(get_db)):
    return db.query(JobSchedule).order_by(JobSchedule.job_type.asc()).all()


@app.put("/api/schedules/{schedule_id}", response_model=JobScheduleOut)
def update_schedule(schedule_id: str, payload: JobScheduleUpdate, _: str = Depends(require_auth), db: Session = Depends(get_db)):
    schedule = require_entity(db.get(JobSchedule, schedule_id), "调度任务不存在")
    schedule.cron_expr = payload.cron_expr
    schedule.timezone = payload.timezone
    schedule.enabled = payload.enabled
    db.commit()
    db.refresh(schedule)
    scheduler_service.reload()
    return schedule


@app.post("/api/reports/send-daily")
def run_daily_report(_: str = Depends(require_auth), db: Session = Depends(get_db)):
    return send_daily_report(db)


@app.post("/api/monitor/run")
def run_manual_monitor(_: str = Depends(require_auth), db: Session = Depends(get_db)):
    return run_monitor_job(db, manual=True)


@app.get("/api/logs")
def list_logs(_: str = Depends(require_auth), db: Session = Depends(get_db)):
    inspection_logs = [serialize(InspectionLogOut.model_validate(item)) for item in db.query(InspectionLog).order_by(InspectionLog.executed_at.desc()).limit(30).all()]
    job_logs = [serialize(JobRunLogOut.model_validate(item)) for item in db.query(JobRunLog).order_by(JobRunLog.executed_at.desc()).limit(30).all()]
    return {"inspectionLogs": inspection_logs, "jobLogs": job_logs}


@app.get("/{full_path:path}", include_in_schema=False)
def serve_frontend(full_path: str):
    if full_path.startswith("api"):
        raise HTTPException(status_code=404, detail="Not Found")

    index_file = FRONTEND_DIST_DIR / "index.html"
    if not index_file.exists():
        raise HTTPException(status_code=404, detail="前端资源尚未构建")

    requested_file = (FRONTEND_DIST_DIR / full_path).resolve() if full_path else index_file.resolve()
    if full_path and requested_file.is_file() and FRONTEND_DIST_DIR.resolve() in requested_file.parents:
        return FileResponse(requested_file)

    return FileResponse(index_file)
