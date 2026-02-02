export type SuggestionsAutoModerationConfig = {
  enabled: boolean;
  mode: "porcentagem" | "quantidade";
  approval_threshold: number;
  rejection_threshold: number;
  approval_delay_hours: number;
};

export type SuggestionsConfig = {
  status: boolean;
  channel: string | null;
  immune_role_id: string | null;
  create_threads: boolean;
  thread_message: string;
  auto_moderation: SuggestionsAutoModerationConfig;
};

function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_INKCLOUD_API_URL as string | undefined)?.replace(/\/+$/, "");
  return envUrl || "http://localhost:9000";
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  return response;
}

export async function fetchSuggestionsConfig(): Promise<SuggestionsConfig> {
  const response = await apiRequest("/api/automations/suggestions-config", { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Suggestions config error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config as SuggestionsConfig;
}

export type CallCounterBackendConfig = {
  enabled: boolean;
  channel_id: number | null;
  message: string;
  count: number;
};

export type CallCounterConfig = {
  enabled: boolean;
  channelId: string | null;
  message: string;
  count: number;
};

export type ContMembersCallCounter = {
  prefixo: string;
  tipo: "canal" | "categoria";
  target_id: string;
  guild_id?: string | null;
};

export type ContMembersCallConfig = {
  ativado: boolean;
  estilo: number;
  contadores: ContMembersCallCounter[];
};

export type AiModeratorConfig = {
  ativado: boolean;
  cargo_imune_id: string | null;
  prompt: string | null;
  rejection_message: string | null;
};

export type TopicConfigEntry = {
  id: string;
  channel_id: string;
  name: string;
  content: string;
  locked: boolean;
};

export type TopicsConfig = {
  ativado: boolean;
  immune_role_id: string | null;
  topicos: TopicConfigEntry[];
};

export type NukeChannelConfig = {
  intervalo_minutos: number;
  proxima_nuke?: string | null;
};

export type NukeConfig = {
  ativado: boolean;
  logs_ativados: boolean;
  canais: Record<string, NukeChannelConfig>;
};

const DEFAULT_CALL_COUNTER_CONFIG: CallCounterConfig = {
  enabled: false,
  channelId: null,
  message: "Chamadas hoje: {count}",
  count: 0,
};

function mapCallCounterFromBackend(payload: CallCounterBackendConfig | null | undefined): CallCounterConfig {
  if (!payload) return { ...DEFAULT_CALL_COUNTER_CONFIG };
  return {
    enabled: Boolean(payload.enabled),
    channelId: payload.channel_id !== null && payload.channel_id !== undefined ? String(payload.channel_id) : null,
    message: typeof payload.message === "string" ? payload.message : DEFAULT_CALL_COUNTER_CONFIG.message,
    count: typeof payload.count === "number" ? payload.count : DEFAULT_CALL_COUNTER_CONFIG.count,
  };
}

export async function fetchCallCounterConfig(): Promise<CallCounterConfig> {
  const response = await apiRequest("/api/automations/call-counter-config", { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Call counter config error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return mapCallCounterFromBackend(data.config);
}

export async function updateCallCounterConfig(
  config: Partial<CallCounterConfig> | Partial<CallCounterBackendConfig>
): Promise<CallCounterConfig> {
  const payload = {
    config: {
      enabled: Boolean(config.enabled),
      channel_id: config.channel_id ?? (config.channelId ? Number(config.channelId) : null) ?? null,
      message: typeof config.message === "string" ? config.message : DEFAULT_CALL_COUNTER_CONFIG.message,
    },
  };
  const response = await apiRequest("/api/automations/call-counter-config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Call counter config update error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return mapCallCounterFromBackend(data.config);
}

export async function updateSuggestionsConfig(
  config: SuggestionsConfig
): Promise<SuggestionsConfig> {
  const response = await apiRequest("/api/automations/suggestions-config", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Suggestions config update error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config as SuggestionsConfig;
}

export async function fetchContMembersCallConfig(): Promise<ContMembersCallConfig> {
  const response = await apiRequest("/api/automations/cont-members-call-config", { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cont members call config error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config as ContMembersCallConfig;
}

export async function updateContMembersCallConfig(
  config: ContMembersCallConfig
): Promise<ContMembersCallConfig> {
  const response = await apiRequest("/api/automations/cont-members-call-config", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cont members call config update error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config as ContMembersCallConfig;
}

export async function fetchAiModeratorConfig(): Promise<AiModeratorConfig> {
  const response = await apiRequest("/api/automations/ai-moderator-config", { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI moderator config error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config as AiModeratorConfig;
}

export async function updateAiModeratorConfig(config: AiModeratorConfig): Promise<AiModeratorConfig> {
  const response = await apiRequest("/api/automations/ai-moderator-config", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`AI moderator config update error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config as AiModeratorConfig;
}

export async function fetchTopicsConfig(): Promise<TopicsConfig> {
  const response = await apiRequest("/api/automations/topics-config", { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Topics config error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config as TopicsConfig;
}

export async function updateTopicsConfig(config: TopicsConfig): Promise<TopicsConfig> {
  const response = await apiRequest("/api/automations/topics-config", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Topics config update error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config as TopicsConfig;
}

export async function fetchNukeConfig(): Promise<NukeConfig> {
  const response = await apiRequest("/api/automations/nuke-config", { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Nuke config error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config as NukeConfig;
}

export async function updateNukeConfig(config: NukeConfig): Promise<NukeConfig> {
  const response = await apiRequest("/api/automations/nuke-config", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Nuke config update error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config as NukeConfig;
}
