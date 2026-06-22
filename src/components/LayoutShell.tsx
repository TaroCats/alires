import { Activity, Bell, Boxes, CalendarClock, LogOut, ServerCog } from "lucide-react";
import { NavLink } from "react-router-dom";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";

const navItems = [
  { to: "/dashboard", label: "总览", icon: Activity },
  { to: "/accounts", label: "阿里云账号", icon: Boxes },
  { to: "/instances", label: "实例策略", icon: ServerCog },
  { to: "/notifications", label: "通知配置", icon: Bell },
  { to: "/jobs", label: "任务日志", icon: CalendarClock },
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const logout = useAuthStore((state) => state.logout);

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:px-6">
        <aside className="hidden w-72 shrink-0 flex-col rounded-[28px] border border-cyan-400/10 bg-slate-950/85 p-6 lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300/70">AliRes</p>
            <h1 className="mt-4 font-['Chakra_Petch'] text-3xl font-semibold text-white">Cloud Command</h1>
            <p className="mt-3 text-sm text-slate-400">集中管理阿里云实例巡检、释放恢复和 TG 日报通知。</p>
          </div>
          <nav className="mt-8 space-y-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition",
                    isActive
                      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-100 shadow-[0_0_40px_rgba(34,211,238,0.12)]"
                      : "border-transparent text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-white",
                  )
                }
              >
                <Icon size={18} />
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            type="button"
            onClick={logout}
            className="mt-auto flex items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 transition hover:bg-rose-500/20"
          >
            <LogOut size={16} />
            退出登录
          </button>
        </aside>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
