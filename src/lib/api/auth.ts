export type AuthUser = {
  id: string;
  discord_user_id: string;
  username: string;
  email: string;
  avatar: string | null;
  is_in_inkcloud_guild: boolean;
  needs_invite: boolean;
  tenant_id: string | null;
  selected_guild_id: string | null;
  selected_guild_name: string | null;
  has_selected_guild: boolean;
};

function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_INKCLOUD_API_URL as string | undefined)?.replace(/\/+$/, "");
  return envUrl || "http://localhost:9000";
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  return response;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const response = await apiRequest("/api/me", { method: "GET" });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Auth error (${response.status})`);
  }
  return response.json();
}

export function getDiscordLoginUrl(redirectTo = "/checkout") {
  const baseUrl = getApiBaseUrl();
  const params = new URLSearchParams({ redirect: redirectTo });
  return `${baseUrl}/api/auth/discord/login?${params.toString()}`;
}

export type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: number;
};

export async function fetchDiscordGuilds(): Promise<DiscordGuild[]> {
  const response = await apiRequest("/api/discord/guilds", { method: "GET" });
  if (!response.ok) {
    throw new Error(`Guilds error (${response.status})`);
  }
  const data = await response.json();
  return data.guilds || [];
}

export async function selectGuild(guildId: string): Promise<any> {
  const response = await apiRequest("/api/select-guild", {
    method: "POST",
    body: JSON.stringify({ guild_id: guildId })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Select guild error (${response.status})`);
  }
  return response.json();
}

export async function fetchInvite(): Promise<{ in_guild: boolean; invite_url?: string }> {
  const response = await apiRequest("/api/auth/discord/invite", { method: "GET" });
  if (!response.ok) {
    throw new Error(`Invite error (${response.status})`);
  }
  return response.json();
}

export async function revalidateGuild(): Promise<{ is_in_guild: boolean }> {
  const response = await apiRequest("/api/auth/discord/revalidate-guild", { method: "POST" });
  if (!response.ok) {
    throw new Error(`Revalidate error (${response.status})`);
  }
  return response.json();
}

export async function logout(): Promise<void> {
  await apiRequest("/api/auth/logout", { method: "POST" });
}
