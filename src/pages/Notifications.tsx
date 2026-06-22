import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Bot, Send, Trash2, UserPlus } from "lucide-react";
import { FormEvent, useState } from "react";

import { SectionCard } from "@/components/SectionCard";
import { useAuthStore } from "@/store/auth";
import type { TelegramBot, TelegramTarget } from "@/types";
import { api } from "@/utils/api";

const emptyBot: Partial<TelegramBot> = { name: "", botToken: "", parseMode: "Markdown", enabled: true };
const emptyTarget: Partial<TelegramTarget> = {
  botId: "",
  name: "",
  chatId: "",
  receiveAlerts: true,
  receiveRecoveries: true,
  receiveDailyBill: true,
  enabled: true,
};

export default function Notifications() {
  const token = useAuthStore((state) => state.token)!;
  const queryClient = useQueryClient();
  const [botForm, setBotForm] = useState<Partial<TelegramBot>>(emptyBot);
  const [targetForm, setTargetForm] = useState<Partial<TelegramTarget>>(emptyTarget);

  const botsQuery = useQuery({ queryKey: ["bots"], queryFn: () => api.getBots(token) });
  const targetsQuery = useQuery({ queryKey: ["targets"], queryFn: () => api.getTargets(token) });

  const saveBot = useMutation({
    mutationFn: (payload: Partial<TelegramBot>) => api.saveBot(token, payload),
    onSuccess: () => {
      setBotForm(emptyBot);
      queryClient.invalidateQueries({ queryKey: ["bots"] });
    },
  });
  const saveTarget = useMutation({
    mutationFn: (payload: Partial<TelegramTarget>) => api.saveTarget(token, payload),
    onSuccess: () => {
      setTargetForm(emptyTarget);
      queryClient.invalidateQueries({ queryKey: ["targets"] });
    },
  });
  const deleteBot = useMutation({
    mutationFn: (id: string) => api.deleteBot(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bots"] }),
  });
  const deleteTarget = useMutation({
    mutationFn: (id: string) => api.deleteTarget(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["targets"] }),
  });
  const testTarget = useMutation({
    mutationFn: (targetId: string) => api.testTarget(token, targetId),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="Telegram 机器人" description="一个机器人可以绑定多个通知目标">
          <form
            className="grid gap-4"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              saveBot.mutate(botForm);
            }}
          >
            <label>
              <span className="mb-2 block text-sm text-slate-300">机器人名称</span>
              <input
                value={botForm.name || ""}
                onChange={(event) => setBotForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm text-slate-300">Bot Token</span>
              <input
                value={botForm.botToken || ""}
                onChange={(event) => setBotForm((current) => ({ ...current, botToken: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
              />
            </label>
            <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/15 px-4 py-3 text-sm text-cyan-50">
              <Bot size={16} />
              保存机器人
            </button>
          </form>
        </SectionCard>

        <SectionCard title="通知目标" description="支持针对告警、恢复与日报分别订阅">
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              saveTarget.mutate(targetForm);
            }}
          >
            <label className="md:col-span-2">
              <span className="mb-2 block text-sm text-slate-300">绑定机器人</span>
              <select
                value={targetForm.botId}
                onChange={(event) => setTargetForm((current) => ({ ...current, botId: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
              >
                <option value="">请选择机器人</option>
                {botsQuery.data?.map((bot) => (
                  <option key={bot.id} value={bot.id}>
                    {bot.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-2 block text-sm text-slate-300">目标名称</span>
              <input
                value={targetForm.name || ""}
                onChange={(event) => setTargetForm((current) => ({ ...current, name: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
              />
            </label>
            <label>
              <span className="mb-2 block text-sm text-slate-300">Chat ID</span>
              <input
                value={targetForm.chatId || ""}
                onChange={(event) => setTargetForm((current) => ({ ...current, chatId: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
              />
            </label>
            {[
              ["receiveAlerts", "接收告警"],
              ["receiveRecoveries", "接收恢复"],
              ["receiveDailyBill", "接收日报"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input
                  type="checkbox"
                  checked={Boolean((targetForm as Record<string, boolean>)[key])}
                  onChange={(event) => setTargetForm((current) => ({ ...current, [key]: event.target.checked }))}
                />
                <span className="text-sm text-slate-300">{label}</span>
              </label>
            ))}
            <button className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/15 px-4 py-3 text-sm text-cyan-50">
              <UserPlus size={16} />
              保存通知目标
            </button>
          </form>
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionCard title="机器人列表" description="Token 在前端会完整显示，实际生产建议配合反向代理与更严格权限控制">
          <div className="space-y-3">
            {botsQuery.data?.map((bot) => (
              <div key={bot.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div>
                  <div className="flex items-center gap-3">
                    <BellRing size={18} className="text-cyan-200" />
                    <h3 className="text-base font-medium text-white">{bot.name}</h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">{bot.botToken}</p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteBot.mutate(bot.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                >
                  <Trash2 size={16} />
                  删除
                </button>
              </div>
            )) || <p className="text-sm text-slate-400">暂无机器人。</p>}
          </div>
        </SectionCard>

        <SectionCard title="通知目标列表" description="点击测试即可验证 TG 是否连通">
          <div className="space-y-3">
            {targetsQuery.data?.map((target) => (
              <div key={target.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
                <div>
                  <h3 className="text-base font-medium text-white">{target.name}</h3>
                  <p className="mt-2 text-sm text-slate-400">{target.chatId}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => testTarget.mutate(target.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50"
                  >
                    <Send size={16} />
                    测试
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteTarget.mutate(target.id)}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
                  >
                    <Trash2 size={16} />
                    删除
                  </button>
                </div>
              </div>
            )) || <p className="text-sm text-slate-400">暂无通知目标。</p>}
          </div>
        </SectionCard>
      </div>
    </div>
  );
}
