import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";

import { SectionCard } from "@/components/SectionCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuthStore } from "@/store/auth";
import { api } from "@/utils/api";

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN");
}

export default function Jobs() {
  const token = useAuthStore((state) => state.token)!;
  const queryClient = useQueryClient();
  const schedulesQuery = useQuery({ queryKey: ["schedules"], queryFn: () => api.getSchedules(token) });
  const logsQuery = useQuery({
    queryKey: ["logs"],
    queryFn: () => api.getLogs(token),
    refetchInterval: 10_000,
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof api.saveSchedule>[1]) => api.saveSchedule(token, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["schedules"] }),
  });

  return (
    <div className="space-y-6">
      <SectionCard title="调度任务" description="支持直接修改巡检频率和日报发送时间，保存后调度器即时热更新">
        <div className="grid gap-4 md:grid-cols-2">
          {schedulesQuery.data?.map((schedule) => (
            <div key={schedule.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <p className="text-base font-medium text-white">{schedule.jobType}</p>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm text-slate-300">CRON 表达式</span>
                <input
                  value={schedule.cronExpr}
                  onChange={(event) =>
                    queryClient.setQueryData(["schedules"], (current: typeof schedulesQuery.data) =>
                      current?.map((item) => (item.id === schedule.id ? { ...item, cronExpr: event.target.value } : item)),
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
                />
              </label>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm text-slate-300">时区</span>
                <input
                  value={schedule.timezone}
                  onChange={(event) =>
                    queryClient.setQueryData(["schedules"], (current: typeof schedulesQuery.data) =>
                      current?.map((item) => (item.id === schedule.id ? { ...item, timezone: event.target.value } : item)),
                    )
                  }
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
                />
              </label>
              <button
                type="button"
                onClick={() => updateMutation.mutate(schedule)}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/15 px-4 py-3 text-sm text-cyan-50"
              >
                <Save size={16} />
                保存调度
              </button>
            </div>
          ))}
        </div>
      </SectionCard>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="巡检日志" description="展示自动巡检与手动恢复结果">
          <div className="space-y-3">
            {logsQuery.data?.inspectionLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-base font-medium text-white">{log.instancePolicyId}</p>
                    <p className="mt-2 text-sm text-slate-400">{log.message}</p>
                  </div>
                  <StatusBadge status={log.currentStatus} />
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>动作 {log.action}</span>
                  <span>流量 {log.trafficGb?.toFixed(2) ?? "--"} GB</span>
                  <span>账单 {(log.currency || "$") + (log.billAmount ?? 0).toFixed(2)}</span>
                  <span>{formatDate(log.executedAt)}</span>
                </div>
              </div>
            )) || <p className="text-sm text-slate-400">暂无巡检日志。</p>}
          </div>
        </SectionCard>

        <SectionCard title="任务日志" description="聚合日报、手动测试和调度执行结果">
          <div className="space-y-3">
            {logsQuery.data?.jobLogs.map((log) => (
              <div key={log.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-base font-medium text-white">{log.jobType}</p>
                  <span className={`rounded-full px-3 py-1 text-xs ${log.success ? "bg-emerald-500/10 text-emerald-100" : "bg-rose-500/10 text-rose-100"}`}>
                    {log.success ? "成功" : "失败"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{log.summary}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDate(log.executedAt)}</p>
              </div>
            )) || <p className="text-sm text-slate-400">暂无任务日志。</p>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
