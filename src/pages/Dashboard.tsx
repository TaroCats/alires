import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Coins, PlayCircle, Power, RefreshCw, ServerCrash } from "lucide-react";

import { SectionCard } from "@/components/SectionCard";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuthStore } from "@/store/auth";
import { api } from "@/utils/api";

function formatDate(value: string | null) {
  if (!value) {
    return "尚未发送";
  }
  return new Date(value).toLocaleString("zh-CN");
}

export default function Dashboard() {
  const token = useAuthStore((state) => state.token)!;
  const queryClient = useQueryClient();
  const summaryQuery = useQuery({
    queryKey: ["summary"],
    queryFn: () => api.getSummary(token),
    refetchInterval: 10_000,
  });

  const reportMutation = useMutation({
    mutationFn: () => api.sendDailyReport(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });

  const monitorMutation = useMutation({
    mutationFn: () => api.runManualMonitor(token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });

  const data = summaryQuery.data;

  return (
    <div className="space-y-6">
      <div className="rounded-[32px] border border-cyan-400/10 bg-[linear-gradient(135deg,rgba(8,47,73,0.92),rgba(15,23,42,0.96))] p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300/70">Control Deck</p>
            <h2 className="mt-3 font-['Chakra_Petch'] text-4xl text-white">阿里云实例总览</h2>
            <p className="mt-3 max-w-2xl text-sm text-slate-300">
              自动聚合实例状态、流量和月账单，支持日常巡检、释放重建和日报发送。
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => monitorMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white transition hover:bg-white/15"
            >
              <PlayCircle size={16} />
              {monitorMutation.isPending ? "巡检中..." : "立即巡检"}
            </button>
            <button
              type="button"
              onClick={() => reportMutation.mutate()}
              className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/15 px-4 py-3 text-sm text-cyan-50 transition hover:bg-cyan-400/25"
            >
              <RefreshCw size={16} />
              {reportMutation.isPending ? "发送中..." : "立即发送日报"}
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard title="运行中" value={`${data?.runningCount ?? 0}`} hint="最近巡检结果中的 Running 实例" icon={PlayCircle} />
        <StatCard title="已停止" value={`${data?.stoppedCount ?? 0}`} hint="Stopped 状态且可按策略拉起" icon={Power} />
        <StatCard title="已释放" value={`${data?.releasedCount ?? 0}`} hint="需要按模板重建的实例数" icon={ServerCrash} />
        <StatCard title="本月账单" value={`${data?.currency ?? "$"}${(data?.totalMonthlyBill ?? 0).toFixed(2)}`} hint={`账单预警 ${data?.billWarningCount ?? 0} 台`} icon={Coins} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.9fr]">
        <SectionCard title="实例动态" description="自动刷新最近巡检结果与状态判定">
          <div className="space-y-3">
            {data?.instances.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-medium text-white">{item.name}</h3>
                      <StatusBadge status={item.status} />
                    </div>
                    <p className="mt-2 text-sm text-slate-400">
                      {item.instanceId} · {item.region}
                    </p>
                  </div>
                  <div className="text-right text-sm text-slate-300">
                    <p>流量 {item.trafficGb?.toFixed(2) ?? "--"} GB</p>
                    <p>
                      账单 {item.currency}
                      {(item.billAmount ?? 0).toFixed(2)}
                    </p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-400">{item.lastMessage}</p>
              </div>
            )) || <p className="text-sm text-slate-400">尚未配置实例策略。</p>}
          </div>
        </SectionCard>

        <SectionCard
          title="任务快照"
          description={`最近日报: ${formatDate(data?.latestReportAt ?? null)}`}
          action={
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1 text-xs text-amber-100">
              过限 {data?.overLimitCount ?? 0}
            </span>
          }
        >
          <div className="space-y-3">
            {data?.recentLogs.map((item) => (
              <div key={item.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">{item.jobType}</p>
                  <span className={`rounded-full px-3 py-1 text-xs ${item.success ? "bg-emerald-500/10 text-emerald-100" : "bg-rose-500/10 text-rose-100"}`}>
                    {item.success ? "成功" : "失败"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-400">{item.summary}</p>
                <p className="mt-2 text-xs text-slate-500">{formatDate(item.executedAt)}</p>
              </div>
            )) || <p className="text-sm text-slate-400">暂无日志。</p>}
          </div>
        </SectionCard>
      </div>

      {summaryQuery.isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            {summaryQuery.error instanceof Error ? summaryQuery.error.message : "加载总览失败"}
          </div>
        </div>
      ) : null}
      {monitorMutation.data ? (
        <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
          已完成手动巡检，共巡检 {monitorMutation.data.count} 台实例，失败 {monitorMutation.data.failed} 台。
        </div>
      ) : null}
      {monitorMutation.isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">
          {monitorMutation.error instanceof Error ? monitorMutation.error.message : "手动巡检失败"}
        </div>
      ) : null}
      {reportMutation.data ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-50">
          {reportMutation.data.summary}
        </div>
      ) : null}
      {reportMutation.isError ? (
        <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-50">
          {reportMutation.error instanceof Error ? reportMutation.error.message : "日报发送失败"}
        </div>
      ) : null}
    </div>
  );
}
