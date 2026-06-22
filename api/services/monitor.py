from __future__ import annotations

from datetime import datetime

from sqlalchemy.orm import Session

from api.models import CloudAccount, InspectionLog, InstancePolicy, JobRunLog
from api.services.aliyun import AliyunService
from api.services.notification import send_by_preferences


def inspect_policy(db: Session, policy: InstancePolicy, manual: bool = False) -> InspectionLog:
    account = db.get(CloudAccount, policy.account_id)
    aliyun = AliyunService(account)
    snapshot = aliyun.inspect_instance(policy)
    action = "none"
    success = True
    message = snapshot.message or "巡检完成"

    try:
        if snapshot.status == "Released":
            if policy.recreate_on_released:
                new_instance_id = aliyun.recreate_instance(policy)
                old_instance_id = policy.instance_id
                policy.instance_id = new_instance_id
                action = "recreate"
                message = f"实例已释放，已基于模板重新创建: {old_instance_id} -> {new_instance_id}"
                send_by_preferences(db, "alert", "实例已重建", f"{policy.name}\n{message}")
            else:
                success = False
                message = "实例疑似被释放，但未启用自动重建"
                send_by_preferences(db, "alert", "实例释放告警", f"{policy.name}\n{message}")
        elif snapshot.traffic_gb is not None and snapshot.traffic_gb >= policy.traffic_limit_gb:
            if snapshot.status == "Running":
                aliyun.stop_instance(policy)
                action = "stop"
                message = f"流量已达 {snapshot.traffic_gb:.2f}GB，已执行关机止损"
                send_by_preferences(db, "alert", "流量止损提醒", f"{policy.name}\n{message}")
            else:
                message = f"流量已超阈值 {policy.traffic_limit_gb:.2f}GB，实例当前为 {snapshot.status}"
        elif snapshot.status == "Stopped" and policy.auto_start_enabled:
            aliyun.start_instance(policy)
            action = "start"
            message = "实例处于 Stopped，已尝试自动启动"
            send_by_preferences(db, "recovery", "实例自动恢复", f"{policy.name}\n{message}")
        else:
            message = snapshot.message or f"状态 {snapshot.status}，无需处理"
    except Exception as exc:
        success = False
        message = str(exc)

    log = InspectionLog(
        instance_policy_id=policy.id,
        current_status=snapshot.status,
        traffic_gb=snapshot.traffic_gb,
        bill_amount=snapshot.bill_amount,
        currency=snapshot.currency,
        action=action,
        success=success,
        message=message,
    )
    db.add(log)
    db.add(
        JobRunLog(
            schedule_id=None,
            job_type="manual_check" if manual else "monitor",
            success=success,
            summary=f"{policy.name}: {message}",
        )
    )
    db.commit()
    db.refresh(log)
    return log


def run_monitor_job(db: Session, manual: bool = False) -> dict:
    policies = db.query(InstancePolicy).filter(InstancePolicy.enabled.is_(True)).all()
    results = [inspect_policy(db, policy) for policy in policies]
    summary = {
        "count": len(results),
        "failed": sum(1 for item in results if not item.success),
        "executedAt": datetime.utcnow().isoformat(),
    }
    db.add(
        JobRunLog(
            schedule_id=None,
            job_type="manual_monitor" if manual else "monitor_batch",
            success=summary["failed"] == 0,
            summary=f"巡检 {summary['count']} 台实例，失败 {summary['failed']} 台",
        )
    )
    db.commit()
    return summary


def send_daily_report(db: Session) -> dict:
    policies = db.query(InstancePolicy).filter(InstancePolicy.enabled.is_(True)).all()
    if not policies:
        summary = "当前未配置任何实例策略"
        db.add(JobRunLog(job_type="daily_report", success=True, summary=summary))
        db.commit()
        return {"summary": summary}

    lines = ["📊 *[阿里云后台日报]*", f"📅 日期: {datetime.now().strftime('%Y-%m-%d')}", ""]
    total_bill = 0.0
    currency = "$"
    for policy in policies:
        account = db.get(CloudAccount, policy.account_id)
        snapshot = AliyunService(account).inspect_instance(policy)
        bill = snapshot.bill_amount or 0.0
        total_bill += bill
        currency = snapshot.currency or account.currency
        lines.append(
            "\n".join(
                [
                    f"👤 *{policy.name}*",
                    f"   🖥️ 状态: {snapshot.status}",
                    f"   🌐 IP: `{snapshot.ip or '无公网 IP'}`",
                    f"   📉 流量: {f'{snapshot.traffic_gb:.2f} GB' if snapshot.traffic_gb is not None else '查询失败'}",
                    f"   💰 账单: {currency}{bill:.2f}",
                ]
            )
        )
    lines.append(f"\n汇总账单: {currency}{total_bill:.2f}")
    sent = send_by_preferences(db, "daily", "每日账单", "\n\n".join(lines))
    summary = f"日报已发送到 {sent} 个 TG 目标，总账单 {currency}{total_bill:.2f}"
    db.add(JobRunLog(job_type="daily_report", success=True, summary=summary))
    db.commit()
    return {"summary": summary}
