from __future__ import annotations

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

from api.database import SessionLocal
from api.models import JobSchedule
from api.services.monitor import run_monitor_job, send_daily_report


class SchedulerService:
    def __init__(self):
        self.scheduler = BackgroundScheduler()

    def start(self):
        if not self.scheduler.running:
            self.scheduler.start()
        self.reload()

    def shutdown(self):
        if self.scheduler.running:
            self.scheduler.shutdown(wait=False)

    def reload(self):
        self.scheduler.remove_all_jobs()
        db = SessionLocal()
        try:
            schedules = db.query(JobSchedule).filter(JobSchedule.enabled.is_(True)).all()
            for schedule in schedules:
                trigger = CronTrigger.from_crontab(schedule.cron_expr, timezone=schedule.timezone)
                self.scheduler.add_job(
                    func=self._wrap_job(schedule.job_type),
                    trigger=trigger,
                    id=schedule.id,
                    replace_existing=True,
                )
        finally:
            db.close()

    def _wrap_job(self, job_type: str):
        def runner():
            db = SessionLocal()
            try:
                if job_type == "monitor":
                    run_monitor_job(db)
                elif job_type == "daily_report":
                    send_daily_report(db)
            finally:
                db.close()

        return runner


scheduler_service = SchedulerService()
