import { getSelectedTenantId } from "@/lib/tenant";

export type DashboardGuildPermissions = {
  admin: boolean;
  manageChannels: boolean;
  manageRoles: boolean;
  manageMessages: boolean;
};

export type DashboardGuildOverview = {
  guild_id: string;
  name: string | null;
  icon: string | null;
  members: number | null;
  channels: number | null;
  roles: number | null;
  boosts: number | null;
  permissions?: DashboardGuildPermissions;
};

export type DashboardBotStatus = {
  online: boolean;
  uptime_seconds: number | null;
  version: string | null;
  last_heartbeat: string | null;
  token_valid: boolean;
  name?: string | null;
  avatar?: string | null;
  tag?: string | null;
};

export type DashboardOverviewResponse = {
  bot: DashboardBotStatus | null;
  guild: DashboardGuildOverview | null;
};

function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_INKCLOUD_API_URL as string | undefined)?.replace(/\/+$/, "");
  return envUrl || "http://localhost:9000";
}

export async function fetchDashboardOverview(
  tenantOverride?: string | null
): Promise<DashboardOverviewResponse> {
  const baseUrl = getApiBaseUrl();
  const tenantId = tenantOverride || getSelectedTenantId();
  const response = await fetch(`${baseUrl}/api/dashboard/overview`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {})
    }
  });
  if (response.status === 401) {
    throw new Error("Não autorizado");
  }
  if (!response.ok) {
    throw new Error(`Dashboard overview error (${response.status})`);
  }
  return response.json();
}
