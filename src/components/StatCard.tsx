import type { LucideIcon } from "lucide-react";

type StatCardProps = {
  title: string;
  value: string;
  hint: string;
  icon: LucideIcon;
};

export function StatCard({ title, value, hint, icon: Icon }: StatCardProps) {
  return (
    <div className="rounded-3xl border border-cyan-400/15 bg-slate-950/80 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/70">{title}</p>
          <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
        </div>
        <div className="rounded-2xl border border-cyan-400/25 bg-cyan-400/10 p-3 text-cyan-200">
          <Icon size={20} />
        </div>
      </div>
      <p className="mt-4 text-sm text-slate-400">{hint}</p>
    </div>
  );
}
