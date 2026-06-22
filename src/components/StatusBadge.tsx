import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: string }) {
  const style = {
    Running: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    Stopped: "border-slate-500/30 bg-slate-500/10 text-slate-200",
    Released: "border-rose-500/30 bg-rose-500/10 text-rose-200",
    Unknown: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  }[status] || "border-cyan-500/30 bg-cyan-500/10 text-cyan-100";

  return <span className={cn("rounded-full border px-3 py-1 text-xs font-medium", style)}>{status}</span>;
}
