import type {
  CloudAccount,
  DashboardSummary,
  InstancePolicy,
  JobSchedule,
  LoginResponse,
  LogsResponse,
  TelegramBot,
  TelegramTarget,
} from "@/types";

const API_BASE = "/api";

type RequestOptions = RequestInit & {
  token?: string | null;
};

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set("Content-Type", "application/json");
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!response.ok) {
    const data = await response.json().catch(() => ({ detail: "请求失败" }));
    throw new Error(data.detail || "请求失败");
  }
  return response.json() as Promise<T>;
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/auth/login", { method: "POST", body: JSON.stringify({ username, password }) }),
  getSummary: (token: string) => request<DashboardSummary>("/dashboard/summary", { token }),
  getAccounts: (token: string) => request<CloudAccount[]>("/accounts", { token }),
  saveAccount: (token: string, payload: Partial<CloudAccount>) =>
    request<CloudAccount>(payload.id ? `/accounts/${payload.id}` : "/accounts", {
      token,
      method: payload.id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    }),
  deleteAccount: (token: string, id: string) => request<{ ok: boolean }>(`/accounts/${id}`, { token, method: "DELETE" }),
  getInstances: (token: string) => request<InstancePolicy[]>("/instances", { token }),
  saveInstance: (token: string, payload: Partial<InstancePolicy>) =>
    request<InstancePolicy>(payload.id ? `/instances/${payload.id}` : "/instances", {
      token,
      method: payload.id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    }),
  deleteInstance: (token: string, id: string) => request<{ ok: boolean }>(`/instances/${id}`, { token, method: "DELETE" }),
  runCheck: (token: string, id: string) => request<{ ok: boolean; log: unknown }>(`/instances/${id}/run-check`, { token, method: "POST" }),
  recover: (token: string, id: string) => request<{ ok: boolean; log: unknown }>(`/instances/${id}/recover`, { token, method: "POST" }),
  getBots: (token: string) => request<TelegramBot[]>("/notifications/bots", { token }),
  saveBot: (token: string, payload: Partial<TelegramBot>) =>
    request<TelegramBot>(payload.id ? `/notifications/bots/${payload.id}` : "/notifications/bots", {
      token,
      method: payload.id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    }),
  deleteBot: (token: string, id: string) => request<{ ok: boolean }>(`/notifications/bots/${id}`, { token, method: "DELETE" }),
  getTargets: (token: string) => request<TelegramTarget[]>("/notifications/targets", { token }),
  saveTarget: (token: string, payload: Partial<TelegramTarget>) =>
    request<TelegramTarget>(payload.id ? `/notifications/targets/${payload.id}` : "/notifications/targets", {
      token,
      method: payload.id ? "PUT" : "POST",
      body: JSON.stringify(payload),
    }),
  deleteTarget: (token: string, id: string) => request<{ ok: boolean }>(`/notifications/targets/${id}`, { token, method: "DELETE" }),
  testTarget: (token: string, targetId: string) =>
    request<{ ok: boolean }>("/notifications/test", {
      token,
      method: "POST",
      body: JSON.stringify({ targetId, title: "测试通知", message: "这是来自 AliRes 管理后台的测试消息。" }),
    }),
  getSchedules: (token: string) => request<JobSchedule[]>("/schedules", { token }),
  saveSchedule: (token: string, payload: JobSchedule) =>
    request<JobSchedule>(`/schedules/${payload.id}`, {
      token,
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  runManualMonitor: (token: string) =>
    request<{ count: number; failed: number; executedAt: string }>("/monitor/run", {
      token,
      method: "POST",
    }),
  sendDailyReport: (token: string) => request<{ summary: string }>("/reports/send-daily", { token, method: "POST" }),
  getLogs: (token: string) => request<LogsResponse>("/logs", { token }),
};
