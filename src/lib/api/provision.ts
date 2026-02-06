import { MOCK_TENANT_ID } from "@/lib/mock-shared";

export type ProvisionRequest = {
  discord_bot_token: string;
  guild_id: string;
  owner_id: string;
  admin_ids?: string[];
  plan?: string;
  server_name?: string;
};

export type ProvisionResponse = {
  tenant_id: string;
  status: string;
  current_period_end: string;
  app_status: string;
};

export async function validateBotToken(_token: string): Promise<{ valid: boolean; reason?: string }> {
  return { valid: true };
}

export async function provisionBot(_payload: ProvisionRequest): Promise<ProvisionResponse> {
  return {
    tenant_id: MOCK_TENANT_ID,
    status: "provisioned",
    current_period_end: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
    app_status: "online",
  };
}
