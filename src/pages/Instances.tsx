import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, RotateCcw, Save, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { SectionCard } from "@/components/SectionCard";
import { useAuthStore } from "@/store/auth";
import type { InstancePolicy } from "@/types";
import { api } from "@/utils/api";

const initialForm: Partial<InstancePolicy> = {
  name: "",
  accountId: "",
  region: "cn-hongkong",
  instanceId: "",
  resourceGroupId: "",
  trafficLimitGb: 180,
  billThreshold: 1,
  autoStartEnabled: true,
  recreateOnReleased: false,
  recreateTemplateId: "",
  cooldownSeconds: 1800,
  enabled: true,
};

export default function Instances() {
  const token = useAuthStore((state) => state.token)!;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<InstancePolicy>>(initialForm);

  const accountsQuery = useQuery({ queryKey: ["accounts"], queryFn: () => api.getAccounts(token) });
  const instancesQuery = useQuery({ queryKey: ["instances"], queryFn: () => api.getInstances(token) });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<InstancePolicy>) => api.saveInstance(token, payload),
    onSuccess: () => {
      setForm(initialForm);
      queryClient.invalidateQueries({ queryKey: ["instances"] });
      queryClient.invalidateQueries({ queryKey: ["summary"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteInstance(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["instances"] }),
  });
  const runCheckMutation = useMutation({
    mutationFn: (id: string) => api.runCheck(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });
  const recoverMutation = useMutation({
    mutationFn: (id: string) => api.recover(token, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary"] });
      queryClient.invalidateQueries({ queryKey: ["logs"] });
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <SectionCard title="实例策略" description="定义巡检阈值、自动拉起与释放后重建策略">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm text-slate-300">实例备注</span>
            <input
              value={form.name || ""}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">绑定账号</span>
            <select
              value={form.accountId}
              onChange={(event) => setForm((current) => ({ ...current, accountId: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
            >
              <option value="">请选择账号</option>
              {accountsQuery.data?.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">Region</span>
            <input
              value={form.region || ""}
              onChange={(event) => setForm((current) => ({ ...current, region: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">实例 ID</span>
            <input
              value={form.instanceId || ""}
              onChange={(event) => setForm((current) => ({ ...current, instanceId: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">资源组 ID</span>
            <input
              value={form.resourceGroupId || ""}
              onChange={(event) => setForm((current) => ({ ...current, resourceGroupId: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">流量阈值 GB</span>
            <input
              type="number"
              value={form.trafficLimitGb || 0}
              onChange={(event) => setForm((current) => ({ ...current, trafficLimitGb: Number(event.target.value) }))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">账单阈值</span>
            <input
              type="number"
              value={form.billThreshold || 0}
              onChange={(event) => setForm((current) => ({ ...current, billThreshold: Number(event.target.value) }))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
            />
          </label>
          <label>
            <span className="mb-2 block text-sm text-slate-300">重试冷却秒数</span>
            <input
              type="number"
              value={form.cooldownSeconds || 0}
              onChange={(event) => setForm((current) => ({ ...current, cooldownSeconds: Number(event.target.value) }))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
            />
          </label>
          <label className="md:col-span-2">
            <span className="mb-2 block text-sm text-slate-300">释放后恢复模板 ID</span>
            <input
              value={form.recreateTemplateId || ""}
              onChange={(event) => setForm((current) => ({ ...current, recreateTemplateId: event.target.value }))}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
            />
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <input
              type="checkbox"
              checked={Boolean(form.autoStartEnabled)}
              onChange={(event) => setForm((current) => ({ ...current, autoStartEnabled: event.target.checked }))}
            />
            <span className="text-sm text-slate-300">Stopped 时自动拉起</span>
          </label>
          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <input
              type="checkbox"
              checked={Boolean(form.recreateOnReleased)}
              onChange={(event) => setForm((current) => ({ ...current, recreateOnReleased: event.target.checked }))}
            />
            <span className="text-sm text-slate-300">被释放后自动重建</span>
          </label>
          <button
            type="submit"
            className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/15 px-4 py-3 text-sm text-cyan-50 transition hover:bg-cyan-400/25"
          >
            <Save size={16} />
            {saveMutation.isPending ? "保存中..." : "保存实例策略"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="已配置实例" description="可随时手动触发巡检或恢复">
        <div className="space-y-3">
          {instancesQuery.data?.map((instance) => (
            <div key={instance.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-medium text-white">{instance.name}</h3>
                  <p className="mt-2 text-sm text-slate-400">
                    {instance.instanceId} · {instance.region} · 阈值 {instance.trafficLimitGb}GB
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => runCheckMutation.mutate(instance.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-100"
                  >
                    <Play size={15} />
                    巡检
                  </button>
                  <button
                    type="button"
                    onClick={() => recoverMutation.mutate(instance.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-100"
                  >
                    <RotateCcw size={15} />
                    恢复
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(instance.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-100"
                  >
                    <Trash2 size={15} />
                    删除
                  </button>
                </div>
              </div>
            </div>
          )) || <p className="text-sm text-slate-400">暂无实例策略。</p>}
        </div>
      </SectionCard>
    </div>
  );
}
