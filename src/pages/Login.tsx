import { ShieldCheck } from "lucide-react";
import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "@/utils/api";
import { useAuthStore } from "@/store/auth";

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.login(username, password);
      setAuth(response.token, response.expiresAt);
      navigate("/dashboard");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#050816] px-4 py-10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(6,182,212,0.24),_transparent_35%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.18),_transparent_30%)]" />
      <div className="relative w-full max-w-xl rounded-[32px] border border-cyan-400/15 bg-slate-950/85 p-8 shadow-[0_20px_120px_rgba(8,15,42,0.55)]">
        <div className="flex items-center gap-4">
          <div className="rounded-3xl border border-cyan-400/25 bg-cyan-400/10 p-4 text-cyan-100">
            <ShieldCheck size={32} />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-cyan-300/70">AliRes Admin</p>
            <h1 className="mt-2 font-['Chakra_Petch'] text-4xl text-white">阿里云运维控制台</h1>
          </div>
        </div>
        <p className="mt-6 text-sm text-slate-400">
          登录后可管理阿里云账号、实例恢复策略、TG 机器人和日报任务。
        </p>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">管理员账号</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="请输入管理员账号"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-slate-300">管理员密码</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="请输入管理员密码"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-400/50"
            />
          </label>
          {error ? <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl border border-cyan-400/30 bg-cyan-400/15 px-4 py-3 font-medium text-cyan-50 transition hover:bg-cyan-400/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "登录中..." : "进入管理后台"}
          </button>
        </form>
      </div>
    </div>
  );
}
