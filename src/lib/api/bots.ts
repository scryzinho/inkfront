export type UserBot = {
  tenant_id: string;
  status: string;
  created_at: string;
  guild_id: string | null;
  guild_name: string | null;
  guild_icon: string | null;
  bot_name?: string | null;
  bot_avatar?: string | null;
  bot_status: string;
  shard_app_id: string | null;
  last_heartbeat: string | null;
  current_version: string | null;
  desired_version: string | null;
  last_error: string | null;
  subscription_status: string | null;
  subscription_end: string | null;
  guild_member_count?: number | null;
  guild_roles_count?: number | null;
  guild_channels_count?: number | null;
  guild_boost_count?: number | null;
  guild_permissions?: {
    admin: boolean;
    manageChannels: boolean;
    manageRoles: boolean;
    manageMessages: boolean;
  };
};

function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_INKCLOUD_API_URL as string | undefined)?.replace(/\/+$/, "");
  return envUrl || "http://localhost:9000";
}

export async function fetchBots(): Promise<UserBot[]> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/bots`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    }
  });
  if (response.status === 401) return [];
  if (!response.ok) {
    throw new Error(`Bots error (${response.status})`);
  }
  const data = await response.json();
  return data?.bots || [];
}
