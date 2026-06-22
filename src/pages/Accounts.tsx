import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { FormEvent, useState } from "react";

import { SectionCard } from "@/components/SectionCard";
import { useAuthStore } from "@/store/auth";
import type { CloudAccount } from "@/types";
import { api } from "@/utils/api";

const emptyForm: Partial<CloudAccount> = {
  name: "",
  accessKeyId: "",
  accessKeySecret: "",
  accountType: "intl",
  billEndpoint: "business.ap-southeast-1.aliyuncs.com",
  currency: "$",
  enabled: true,
};

export default function Accounts() {
  const token = useAuthStore((state) => state.token)!;
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Partial<CloudAccount>>(emptyForm);

  const accountsQuery = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api.getAccounts(token),
  });

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<CloudAccount>) => api.saveAccount(token, payload),
    onSuccess: () => {
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.deleteAccount(token, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    saveMutation.mutate(form);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <SectionCard title="新增阿里云账号" description="支持国内站与国际站账单节点，可编辑 AccessKey 与货币配置">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          {[
            ["name", "账号备注"],
            ["accessKeyId", "AccessKey ID"],
            ["accessKeySecret", "AccessKey Secret"],
            ["billEndpoint", "账单节点"],
            ["currency", "货币符号"],
          ].map(([key, label]) => (
            <label key={key} className={key === "accessKeySecret" ? "md:col-span-2" : ""}>
              <span className="mb-2 block text-sm text-slate-300">{label}</span>
              <input
                type={key === "accessKeySecret" ? "password" : "text"}
                value={(form as Record<string, string>)[key] || ""}
                onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
              />
            </label>
          ))}
          <label>
            <span className="mb-2 block text-sm text-slate-300">账号类型</span>
            <select
              value={form.accountType}
              onChange={(event) => setForm((current) => ({ ...current, accountType: event.target.value as "cn" | "intl" }))}
              className="w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-cyan-400/50"
            >
              <option value="intl">国际站</option>
              <option value="cn">中国站</option>
            </select>
          </label>
          <label className="flex items-center gap-3 self-end rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={(event) => setForm((current) => ({ ...current, enabled: event.target.checked }))}
            />
            <span className="text-sm text-slate-300">启用该账号</span>
          </label>
          <button
            type="submit"
            className="md:col-span-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-400/30 bg-cyan-400/15 px-4 py-3 text-sm text-cyan-50 transition hover:bg-cyan-400/25"
          >
            <Plus size={16} />
            {saveMutation.isPending ? "保存中..." : "保存账号"}
          </button>
        </form>
      </SectionCard>

      <SectionCard title="已配置账号" description="在实例策略里可以绑定这些账号用于巡检和自动恢复">
        <div className="space-y-3">
          {accountsQuery.data?.map((account) => (
            <div key={account.id} className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-base font-medium text-white">{account.name}</h3>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">{account.accountType}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {account.accessKeyId} · {account.billEndpoint}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(account.id)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 transition hover:bg-rose-500/20"
                >
                  <Trash2 size={16} />
                  删除
                </button>
              </div>
            </div>
          )) || <p className="text-sm text-slate-400">暂无账号。</p>}
        </div>
      </SectionCard>
    </div>
  );
}
