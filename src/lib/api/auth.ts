import { mockGuilds } from "@/lib/mock-data";
import { MOCK_AVATAR, MOCK_TENANT_ID } from "@/lib/mock-shared";
import { readMock, writeMock } from "@/lib/mock-storage";

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

const USER_KEY = "inkcloud_mock_user";

const DEFAULT_USER: AuthUser = {
  id: "demo-user",
  discord_user_id: "123456789012345678",
  username: "Conta Demo",
  email: "demo@inkcloud.local",
  avatar: MOCK_AVATAR,
  is_in_inkcloud_guild: true,
  needs_invite: false,
  tenant_id: MOCK_TENANT_ID,
  selected_guild_id: mockGuilds[0]?.id || "123456789",
  selected_guild_name: mockGuilds[0]?.name || "inkCloud Community",
  has_selected_guild: true,
};

function getUser(): AuthUser {
  return readMock<AuthUser>(USER_KEY, DEFAULT_USER);
}

function setUser(user: AuthUser) {
  writeMock(USER_KEY, user);
}

export async function fetchMe(): Promise<AuthUser | null> {
  return getUser();
}

export function getDiscordLoginUrl(redirectTo = "/checkout") {
  return redirectTo;
}

export type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: number;
};

export async function fetchDiscordGuilds(): Promise<DiscordGuild[]> {
  return mockGuilds.map((guild, index) => ({
    id: guild.id,
    name: guild.name,
    icon: guild.icon || MOCK_AVATAR,
    owner: index === 0,
    permissions: 0x8,
  }));
}

export async function selectGuild(guildId: string): Promise<any> {
  const guild = mockGuilds.find((item) => item.id === guildId);
  const nextUser: AuthUser = {
    ...getUser(),
    selected_guild_id: guildId,
    selected_guild_name: guild?.name || "Servidor selecionado",
    has_selected_guild: true,
  };
  setUser(nextUser);
  return { status: "ok", guild_id: guildId };
}

export async function fetchInvite(): Promise<{ in_guild: boolean; invite_url?: string }> {
  return { in_guild: true };
}

export async function revalidateGuild(): Promise<{ is_in_guild: boolean }> {
  return { is_in_guild: true };
}

export async function logout(): Promise<void> {
  return;
}
