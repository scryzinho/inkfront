import { mockGuilds, mockBotStatus } from "@/lib/mock-data";
import { MOCK_AVATAR, MOCK_TENANT_ID } from "@/lib/mock-shared";
import { readMock } from "@/lib/mock-storage";

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

const DEFAULT_BOTS: UserBot[] = [
  {
    tenant_id: MOCK_TENANT_ID,
    status: "active",
    created_at: "2024-01-01T00:00:00Z",
    guild_id: mockGuilds[0]?.id || null,
    guild_name: mockGuilds[0]?.name || "inkCloud Community",
    guild_icon: mockGuilds[0]?.icon || MOCK_AVATAR,
    bot_name: "inkCloud",
    bot_avatar: MOCK_AVATAR,
    bot_status: mockBotStatus.online ? "online" : "offline",
    shard_app_id: "app_demo",
    last_heartbeat: mockBotStatus.lastHeartbeat,
    current_version: mockBotStatus.version,
    desired_version: mockBotStatus.version,
    last_error: null,
    subscription_status: "active",
    subscription_end: null,
    guild_member_count: mockGuilds[0]?.members ?? 0,
    guild_roles_count: mockGuilds[0]?.roles ?? 0,
    guild_channels_count: mockGuilds[0]?.channels ?? 0,
    guild_boost_count: mockGuilds[0]?.boosts ?? 0,
    guild_permissions: mockGuilds[0]?.permissions || {
      admin: true,
      manageChannels: true,
      manageRoles: true,
      manageMessages: true,
    },
  },
];

export async function fetchBots(): Promise<UserBot[]> {
  return readMock<UserBot[]>("inkcloud_mock_bots", DEFAULT_BOTS);
}
