import { readMock, writeMock } from "@/lib/mock-storage";

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

const DEFAULT_AUTO_MOD: SuggestionsAutoModerationConfig = {
  enabled: false,
  mode: "porcentagem",
  approval_threshold: 75,
  rejection_threshold: 25,
  approval_delay_hours: 24,
};

const DEFAULT_SUGGESTIONS_CONFIG: SuggestionsConfig = {
  status: true,
  channel: "1101",
  immune_role_id: null,
  create_threads: true,
  thread_message: "{user}, este tópico foi criado para discutir a sua sugestão.",
  auto_moderation: { ...DEFAULT_AUTO_MOD },
};

const DEFAULT_CALL_COUNTER_CONFIG: CallCounterConfig = {
  enabled: false,
  channelId: "1102",
  message: "Chamadas hoje: {count}",
  count: 12,
};

const DEFAULT_CONT_MEMBERS_CALL_CONFIG: ContMembersCallConfig = {
  ativado: false,
  estilo: 0,
  contadores: [],
};

const DEFAULT_AI_MODERATOR_CONFIG: AiModeratorConfig = {
  ativado: false,
  cargo_imune_id: null,
  prompt: null,
  rejection_message: "violar regras internas.",
};

const DEFAULT_TOPICS_CONFIG: TopicsConfig = {
  ativado: false,
  immune_role_id: null,
  topicos: [],
};

const DEFAULT_NUKE_CONFIG: NukeConfig = {
  ativado: false,
  logs_ativados: false,
  canais: {},
};

const KEY_SUGGESTIONS = "inkcloud_mock_suggestions";
const KEY_CALL_COUNTER = "inkcloud_mock_call_counter";
const KEY_CONT_MEMBERS = "inkcloud_mock_cont_members";
const KEY_AI_MOD = "inkcloud_mock_ai_mod";
const KEY_TOPICS = "inkcloud_mock_topics";
const KEY_NUKE = "inkcloud_mock_nuke";

export async function fetchSuggestionsConfig(): Promise<SuggestionsConfig> {
  return readMock<SuggestionsConfig>(KEY_SUGGESTIONS, DEFAULT_SUGGESTIONS_CONFIG);
}

export async function updateSuggestionsConfig(
  config: SuggestionsConfig
): Promise<SuggestionsConfig> {
  return writeMock<SuggestionsConfig>(KEY_SUGGESTIONS, config);
}

export async function fetchCallCounterConfig(): Promise<CallCounterConfig> {
  return readMock<CallCounterConfig>(KEY_CALL_COUNTER, DEFAULT_CALL_COUNTER_CONFIG);
}

export async function updateCallCounterConfig(
  config: Partial<CallCounterConfig> | Partial<CallCounterBackendConfig>
): Promise<CallCounterConfig> {
  const current = readMock<CallCounterConfig>(KEY_CALL_COUNTER, DEFAULT_CALL_COUNTER_CONFIG);
  const next: CallCounterConfig = {
    ...current,
    enabled: typeof config.enabled === "boolean" ? config.enabled : current.enabled,
    channelId:
      typeof (config as CallCounterConfig).channelId === "string"
        ? (config as CallCounterConfig).channelId
        : typeof (config as CallCounterBackendConfig).channel_id === "number"
        ? String((config as CallCounterBackendConfig).channel_id)
        : current.channelId,
    message: typeof config.message === "string" ? config.message : current.message,
    count: typeof config.count === "number" ? config.count : current.count,
  };
  return writeMock<CallCounterConfig>(KEY_CALL_COUNTER, next);
}

export async function fetchContMembersCallConfig(): Promise<ContMembersCallConfig> {
  return readMock<ContMembersCallConfig>(KEY_CONT_MEMBERS, DEFAULT_CONT_MEMBERS_CALL_CONFIG);
}

export async function updateContMembersCallConfig(
  config: ContMembersCallConfig
): Promise<ContMembersCallConfig> {
  return writeMock<ContMembersCallConfig>(KEY_CONT_MEMBERS, config);
}

export async function fetchAiModeratorConfig(): Promise<AiModeratorConfig> {
  return readMock<AiModeratorConfig>(KEY_AI_MOD, DEFAULT_AI_MODERATOR_CONFIG);
}

export async function updateAiModeratorConfig(config: AiModeratorConfig): Promise<AiModeratorConfig> {
  return writeMock<AiModeratorConfig>(KEY_AI_MOD, config);
}

export async function fetchTopicsConfig(): Promise<TopicsConfig> {
  return readMock<TopicsConfig>(KEY_TOPICS, DEFAULT_TOPICS_CONFIG);
}

export async function updateTopicsConfig(config: TopicsConfig): Promise<TopicsConfig> {
  return writeMock<TopicsConfig>(KEY_TOPICS, config);
}

export async function fetchNukeConfig(): Promise<NukeConfig> {
  return readMock<NukeConfig>(KEY_NUKE, DEFAULT_NUKE_CONFIG);
}

export async function updateNukeConfig(config: NukeConfig): Promise<NukeConfig> {
  return writeMock<NukeConfig>(KEY_NUKE, config);
}
