import { getSelectedTenantId } from "@/lib/tenant";

export type BotIdentityResponse = {
  name: string | null;
  avatar: string | null;
};

function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_INKCLOUD_API_URL as string | undefined)?.replace(/\/+$/, "");
  return envUrl || "http://localhost:9000";
}

export async function fetchBotIdentity(guildId?: string | null): Promise<BotIdentityResponse> {
  const baseUrl = getApiBaseUrl();
  const tenantId = getSelectedTenantId();
  const query = guildId ? `?guild_id=${encodeURIComponent(guildId)}` : "";
  const response = await fetch(`${baseUrl}/api/bot/identity${query}`, {
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
    throw new Error(`Bot identity error (${response.status})`);
  }
  return response.json();
}
