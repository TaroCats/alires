export type LoginResponse = {
  token: string;
  expiresAt: string;
};

export type CloudAccount = {
  id: string;
  name: string;
  accessKeyId: string;
  accessKeySecret: string;
  accountType: "cn" | "intl";
  billEndpoint: string;
  currency: string;
  enabled: boolean;
  createdAt: string;
};

export type InstancePolicy = {
  id: string;
  accountId: string;
  name: string;
  region: string;
  instanceId: string;
  resourceGroupId?: string | null;
  trafficLimitGb: number;
  billThreshold: number;
  autoStartEnabled: boolean;
  recreateOnReleased: boolean;
  recreateTemplateId?: string | null;
  cooldownSeconds: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TelegramBot = {
  id: string;
  name: string;
  botToken: string;
  parseMode: string;
  enabled: boolean;
};

export type TelegramTarget = {
  id: string;
  botId: string;
  name: string;
  chatId: string;
  receiveAlerts: boolean;
  receiveRecoveries: boolean;
  receiveDailyBill: boolean;
  enabled: boolean;
};

export type JobSchedule = {
  id: string;
  jobType: "monitor" | "daily_report";
  cronExpr: string;
  timezone: string;
  enabled: boolean;
};

export type DashboardSummary = {
  runningCount: number;
  stoppedCount: number;
  releasedCount: number;
  overLimitCount: number;
  billWarningCount: number;
  totalMonthlyBill: number;
  currency: string;
  latestReportAt: string | null;
  instances: {
    id: string;
    name: string;
    instanceId: string;
    region: string;
    status: string;
    trafficGb: number | null;
    billAmount: number | null;
    currency: string;
    lastMessage: string;
    enabled: boolean;
  }[];
  recentLogs: {
    id: string;
    jobType: string;
    summary: string;
    success: boolean;
    executedAt: string;
  }[];
};

export type LogsResponse = {
  inspectionLogs: {
    id: string;
    instancePolicyId: string;
    currentStatus: string;
    trafficGb: number | null;
    billAmount: number | null;
    currency: string | null;
    action: string;
    success: boolean;
    message: string;
    executedAt: string;
  }[];
  jobLogs: {
    id: string;
    scheduleId: string | null;
    jobType: string;
    success: boolean;
    summary: string;
    executedAt: string;
  }[];
};
