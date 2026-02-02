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

function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_INKCLOUD_API_URL as string | undefined)?.replace(/\/+$/, "");
  return envUrl || "http://localhost:9000";
}

export async function validateBotToken(token: string): Promise<{ valid: boolean; reason?: string }> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/validate-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ discord_bot_token: token })
  });

  if (!response.ok) {
    throw new Error(`Falha ao validar token (${response.status})`);
  }

  return response.json();
}

export async function provisionBot(payload: ProvisionRequest): Promise<ProvisionResponse> {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}/api/provision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Provisionamento falhou (${response.status})`);
  }

  return response.json();
}
