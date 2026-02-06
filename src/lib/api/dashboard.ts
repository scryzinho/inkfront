import { mockBotStatus, mockGuilds } from "@/lib/mock-data";
import { MOCK_AVATAR } from "@/lib/mock-shared";

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

export async function fetchDashboardOverview(_tenantOverride?: string | null): Promise<DashboardOverviewResponse> {
  const guild = mockGuilds[0];
  return {
    bot: {
      online: mockBotStatus.online,
      uptime_seconds: 123456,
      version: mockBotStatus.version,
      last_heartbeat: mockBotStatus.lastHeartbeat,
      token_valid: mockBotStatus.tokenStatus === "valid",
      name: "inkCloud Bot",
      avatar: MOCK_AVATAR,
      tag: "inkCloud#0001",
    },
    guild: guild
      ? {
          guild_id: guild.id,
          name: guild.name,
          icon: guild.icon || MOCK_AVATAR,
          members: guild.members,
          channels: guild.channels,
          roles: guild.roles,
          boosts: guild.boosts,
          permissions: guild.permissions,
        }
      : null,
  };
}
