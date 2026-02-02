import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Phone, Filter, Hash, Trash2, Save, RefreshCw } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Switch } from "@/components/ui/switch";
import {
  GlassSelect,
  GlassSelectContent,
  GlassSelectItem,
  GlassSelectTrigger,
  GlassSelectValue,
} from "@/components/ui/GlassSelect";
import { Modal } from "@/components/ui/Modal";
import { fetchStoreChannels, fetchStoreRoles, type StoreChannel, type StoreRole } from "@/lib/api/store";
import {
  fetchSuggestionsConfig,
  updateSuggestionsConfig,
  fetchContMembersCallConfig,
  updateContMembersCallConfig,
  fetchAiModeratorConfig,
  updateAiModeratorConfig,
  fetchTopicsConfig,
  updateTopicsConfig,
  fetchNukeConfig,
  updateNukeConfig,
  type SuggestionsAutoModerationConfig,
  type SuggestionsConfig,
  type ContMembersCallConfig,
  type AiModeratorConfig,
  type TopicsConfig,
  type TopicConfigEntry,
  type NukeConfig,
} from "@/lib/api/automations";
import { useTenant } from "@/lib/tenant";

const CHANNEL_NONE = "__none";
const ROLE_NONE = "__none";

const DEFAULT_AUTO_MOD: SuggestionsAutoModerationConfig = {
  enabled: false,
  mode: "porcentagem",
  approval_threshold: 75,
  rejection_threshold: 25,
  approval_delay_hours: 24,
};

const DEFAULT_SUGGESTIONS_CONFIG: SuggestionsConfig = {
  status: false,
  channel: null,
  immune_role_id: null,
  create_threads: true,
  thread_message: "{user}, este tópico foi criado para discutir a sua sugestão.",
  auto_moderation: { ...DEFAULT_AUTO_MOD },
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

const DEFAULT_TOS_PROMPT = `Critérios para TOS_VIOLATION (qualquer um): 1) Discurso de ódio, racismo, homofobia, transfobia, xenofobia, discriminação; 2) Assédio, bullying, intimidação, doxxing, stalking; 3) Ameaças de violência, autolesão, suicídio, glorificação da violência; 4) Spam, golpes, phishing, links maliciosos, promoções suspeitas, esquemas financeiros, vendas não autorizadas; 5) Conteúdo sexual explícito, nudez, pornografia, sexualização de menores; 6) Drogas ilegais, armas, atividades criminosas, terrorismo; 7) Desinformação perigosa sobre saúde, política, desastres, conspirações; 8) Incitação à violência, extremismo, radicalização; 9) Violação de direitos autorais, pirataria, conteúdo protegido; 10) Tentativas de contornar moderação, evasão de ban, criação de contas falsas; 11) Comportamento tóxico, linguagem ofensiva excessiva, provocações; 12) Compartilhamento de informações pessoais sem consentimento; 13) Coordenação de ataques ou raids; 14) Conteúdo que promove automutilação ou distúrbios alimentares; 15) Malware, vírus, conteúdo malicioso.
Exceções (não considerar violação): denúncias/relatos sem incitação, discussão moderada sobre regras, citações de terceiros, humor leve sem alvo específico, reclamações sem ofensa grave, mensagens fora de contexto sem intenção maliciosa.
Atenção: se a mensagem foi editada, analise SOMENTE o conteúdo atual. Não trate o ato de editar como violação.
Normalização: considere substituições por números e símbolos que imitam letras (leet). Interprete, por exemplo, 'g0lp3' como 'golpe', 'v!0lênc!a' como 'violência', '@dm!n' como 'admin'. Desconsidere variações de maiúsculas/minúsculas, acentuação e repetição exagerada de caracteres.
Idioma: a mensagem pode estar em qualquer idioma.`;

type AutoModDraft = {
  mode: SuggestionsAutoModerationConfig["mode"];
  approval_threshold: string;
  rejection_threshold: string;
  approval_delay_hours: string;
};

type AutomationsPageProps = {
  initialTab?: "suggestions" | "callCounter" | "tosFilter" | "topics" | "nuke";
  singleTab?: boolean;
};

export default function AutomationsPage({
  initialTab = "suggestions",
  singleTab = false,
}: AutomationsPageProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [config, setConfig] = useState<SuggestionsConfig | null>(null);
  const [channels, setChannels] = useState<StoreChannel[]>([]);
  const [roles, setRoles] = useState<StoreRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { tenantId } = useTenant();
  const navigate = useNavigate();
  const [contMembersConfig, setContMembersConfig] = useState<ContMembersCallConfig | null>(null);
  const [contMembersLoading, setContMembersLoading] = useState(false);
  const [contMembersSaving, setContMembersSaving] = useState(false);
  const [contMembersError, setContMembersError] = useState<string | null>(null);
  const [showAddCounterModal, setShowAddCounterModal] = useState(false);
  const [counterDraft, setCounterDraft] = useState({
    prefixo: "",
    tipo: "canal" as "canal" | "categoria",
    target_id: "",
  });
  const [addCounterError, setAddCounterError] = useState<string | null>(null);
  const [aiModeratorConfig, setAiModeratorConfig] = useState<AiModeratorConfig | null>(null);
  const [aiModeratorLoading, setAiModeratorLoading] = useState(false);
  const [aiModeratorSaving, setAiModeratorSaving] = useState(false);
  const [aiModeratorError, setAiModeratorError] = useState<string | null>(null);
  const [showAiPromptModal, setShowAiPromptModal] = useState(false);
  const [aiPromptDraft, setAiPromptDraft] = useState({
    prompt: DEFAULT_TOS_PROMPT,
    rejection_message: DEFAULT_AI_MODERATOR_CONFIG.rejection_message,
  });
  const [aiPromptError, setAiPromptError] = useState<string | null>(null);
  const [topicsConfig, setTopicsConfig] = useState<TopicsConfig | null>(null);
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsSaving, setTopicsSaving] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);
  const [showAddTopicModal, setShowAddTopicModal] = useState(false);
  const [topicDraft, setTopicDraft] = useState({
    channel_id: "",
    name: "",
    content: "",
    locked: false,
  });
  const [topicDraftError, setTopicDraftError] = useState<string | null>(null);
  const [nukeConfig, setNukeConfig] = useState<NukeConfig | null>(null);
  const [nukeLoading, setNukeLoading] = useState(false);
  const [nukeSaving, setNukeSaving] = useState(false);
  const [nukeError, setNukeError] = useState<string | null>(null);
  const [showNukeModal, setShowNukeModal] = useState(false);
  const [nukeDraft, setNukeDraft] = useState({
    channel_id: "",
    intervalo_minutos: "1440",
  });
  const [nukeDraftError, setNukeDraftError] = useState<string | null>(null);
  const [showAutoModModal, setShowAutoModModal] = useState(false);
  const [autoModDraft, setAutoModDraft] = useState<AutoModDraft>({
    mode: DEFAULT_AUTO_MOD.mode,
    approval_threshold: String(DEFAULT_AUTO_MOD.approval_threshold),
    rejection_threshold: String(DEFAULT_AUTO_MOD.rejection_threshold),
    approval_delay_hours: String(DEFAULT_AUTO_MOD.approval_delay_hours),
  });
  const [autoModError, setAutoModError] = useState<string | null>(null);
  const [showThreadMessageModal, setShowThreadMessageModal] = useState(false);
  const [threadMessageDraft, setThreadMessageDraft] = useState(
    DEFAULT_SUGGESTIONS_CONFIG.thread_message
  );
  const [threadMessageError, setThreadMessageError] = useState<string | null>(null);
  const updateRequestId = useRef(0);

  const ensureString = (value: string | number | null | undefined) => {
    if (value === undefined || value === null) {
      return null;
    }
    return String(value);
  };

  const normalizeConfig = (payload: Partial<SuggestionsConfig> | null | undefined): SuggestionsConfig => {
    if (!payload) return { ...DEFAULT_SUGGESTIONS_CONFIG };
    return {
      ...DEFAULT_SUGGESTIONS_CONFIG,
      ...payload,
      channel: ensureString(payload.channel),
      immune_role_id: ensureString(payload.immune_role_id),
      auto_moderation: {
        ...DEFAULT_AUTO_MOD,
        ...(payload.auto_moderation || {}),
      },
    };
  };

  const createTopicId = () => {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `topic_${Date.now()}_${Math.random().toString(16).slice(2)}`;
  };

  const formatInterval = (minutes: number) => {
    if (minutes >= 60 && minutes % 60 === 0) {
      return `${minutes / 60}h`;
    }
    return `${minutes}min`;
  };

  const formatNextNuke = (value?: string | null) => {
    if (!value) return "Aguardando agendamento";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Agendamento inválido";
    return date.toLocaleString();
  };

  const commitSuggestionsConfig = async (nextConfig: SuggestionsConfig) => {
    if (!tenantId) return;
    const requestId = ++updateRequestId.current;
    setConfig(nextConfig);
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSuggestionsConfig(nextConfig);
      if (requestId !== updateRequestId.current) return;
      setConfig(normalizeConfig(updated));
    } catch (err) {
      console.error("[automations] save suggestions", err);
      if (requestId !== updateRequestId.current) return;
      setError("Não foi possível salvar as configurações.");
      loadConfig();
    } finally {
      if (requestId === updateRequestId.current) {
        setSaving(false);
      }
    }
  };

  const updateSuggestions = (patch: Partial<SuggestionsConfig>) => {
    if (!config) return;
    const mergedAutoMod = patch.auto_moderation
      ? { ...config.auto_moderation, ...patch.auto_moderation }
      : config.auto_moderation;
    const nextConfig = normalizeConfig({
      ...config,
      ...patch,
      auto_moderation: mergedAutoMod,
    });
    commitSuggestionsConfig(nextConfig);
  };

  const loadConfig = async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    let suggestionsPayload: SuggestionsConfig | null = null;
    try {
      suggestionsPayload = await fetchSuggestionsConfig();
    } catch (err) {
      console.error("[automations] load suggestions", err);
      setError(
        err instanceof Error
          ? `Não foi possível carregar as configurações de sugestões: ${err.message}`
          : "Não foi possível carregar as configurações de sugestões."
      );
    }
    setConfig(normalizeConfig(suggestionsPayload));

    try {
      const channelData = await fetchStoreChannels(true, true);
      setChannels(channelData);
    } catch (err) {
      console.error("[automations] load channels", err);
      setChannels([]);
    }

    try {
      const roleData = await fetchStoreRoles();
      setRoles(roleData);
    } catch (err) {
      console.error("[automations] load roles", err);
      setRoles([]);
    }

    setLoading(false);
  };

  const loadContMembersCallConfig = async () => {
    if (!tenantId) return;
    setContMembersLoading(true);
    setContMembersError(null);
    try {
      const payload = await fetchContMembersCallConfig();
      setContMembersConfig({
        ...DEFAULT_CONT_MEMBERS_CALL_CONFIG,
        ...(payload || {}),
        contadores: payload?.contadores || [],
      });
    } catch (err) {
      console.error("[automations] load cont members call", err);
      setContMembersError(
        err instanceof Error
          ? `Não foi possível carregar o contador em call: ${err.message}`
          : "Não foi possível carregar o contador em call."
      );
      setContMembersConfig(DEFAULT_CONT_MEMBERS_CALL_CONFIG);
    } finally {
      setContMembersLoading(false);
    }
  };

  const loadAiModeratorConfig = async () => {
    if (!tenantId) return;
    setAiModeratorLoading(true);
    setAiModeratorError(null);
    try {
      const payload = await fetchAiModeratorConfig();
      setAiModeratorConfig({
        ...DEFAULT_AI_MODERATOR_CONFIG,
        ...(payload || {}),
        cargo_imune_id: ensureString(payload?.cargo_imune_id),
        prompt: payload?.prompt ?? null,
        rejection_message:
          payload?.rejection_message || DEFAULT_AI_MODERATOR_CONFIG.rejection_message,
      });
    } catch (err) {
      console.error("[automations] load ai moderator", err);
      setAiModeratorError(
        err instanceof Error
          ? `Não foi possível carregar o filtro TOS: ${err.message}`
          : "Não foi possível carregar o filtro TOS."
      );
      setAiModeratorConfig({ ...DEFAULT_AI_MODERATOR_CONFIG });
    } finally {
      setAiModeratorLoading(false);
    }
  };

  const loadTopicsConfig = async () => {
    if (!tenantId) return;
    setTopicsLoading(true);
    setTopicsError(null);
    try {
      const payload = await fetchTopicsConfig();
      setTopicsConfig({
        ...DEFAULT_TOPICS_CONFIG,
        ...(payload || {}),
        immune_role_id: ensureString(payload?.immune_role_id),
        topicos: payload?.topicos || [],
      });
    } catch (err) {
      console.error("[automations] load topics", err);
      setTopicsError(
        err instanceof Error
          ? `Não foi possível carregar os tópicos: ${err.message}`
          : "Não foi possível carregar os tópicos."
      );
      setTopicsConfig({ ...DEFAULT_TOPICS_CONFIG });
    } finally {
      setTopicsLoading(false);
    }
  };

  const loadNukeConfig = async () => {
    if (!tenantId) return;
    setNukeLoading(true);
    setNukeError(null);
    try {
      const payload = await fetchNukeConfig();
      setNukeConfig({
        ...DEFAULT_NUKE_CONFIG,
        ...(payload || {}),
        canais: payload?.canais || {},
      });
    } catch (err) {
      console.error("[automations] load nuke", err);
      setNukeError(
        err instanceof Error
          ? `Não foi possível carregar o nuke: ${err.message}`
          : "Não foi possível carregar o nuke."
      );
      setNukeConfig({ ...DEFAULT_NUKE_CONFIG });
    } finally {
      setNukeLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
    if (!singleTab) {
      loadContMembersCallConfig();
      loadAiModeratorConfig();
      loadTopicsConfig();
      loadNukeConfig();
    }
  }, [tenantId, singleTab]);

  const handleRefresh = () => {
    loadConfig();
    if (!singleTab) {
      loadContMembersCallConfig();
      loadAiModeratorConfig();
      loadTopicsConfig();
      loadNukeConfig();
    }
  };

  const handleSave = async () => {
    if (!config) return;
    await commitSuggestionsConfig(config);
  };

  const handleContMembersRefresh = () => {
    loadContMembersCallConfig();
  };

  const handleContMembersSave = async () => {
    if (!contMembersConfig) return;
    setContMembersSaving(true);
    setContMembersError(null);
    try {
      const updated = await updateContMembersCallConfig(contMembersConfig);
      setContMembersConfig({
        ...DEFAULT_CONT_MEMBERS_CALL_CONFIG,
        ...(updated || {}),
        contadores: updated?.contadores || [],
      });
    } catch (err) {
      console.error("[automations] save cont members call", err);
      setContMembersError("Não foi possível salvar o contador em call.");
    } finally {
      setContMembersSaving(false);
    }
  };

  const handleAiModeratorSave = async () => {
    if (!aiModeratorConfig) return;
    setAiModeratorSaving(true);
    setAiModeratorError(null);
    try {
      const updated = await updateAiModeratorConfig(aiModeratorConfig);
      setAiModeratorConfig({
        ...DEFAULT_AI_MODERATOR_CONFIG,
        ...(updated || {}),
        cargo_imune_id: ensureString(updated?.cargo_imune_id),
        prompt: updated?.prompt ?? null,
        rejection_message:
          updated?.rejection_message || DEFAULT_AI_MODERATOR_CONFIG.rejection_message,
      });
    } catch (err) {
      console.error("[automations] save ai moderator", err);
      setAiModeratorError("Não foi possível salvar o filtro TOS.");
    } finally {
      setAiModeratorSaving(false);
    }
  };

  const handleTopicsSave = async () => {
    if (!topicsConfig) return;
    setTopicsSaving(true);
    setTopicsError(null);
    try {
      const updated = await updateTopicsConfig(topicsConfig);
      setTopicsConfig({
        ...DEFAULT_TOPICS_CONFIG,
        ...(updated || {}),
        immune_role_id: ensureString(updated?.immune_role_id),
        topicos: updated?.topicos || [],
      });
    } catch (err) {
      console.error("[automations] save topics", err);
      setTopicsError("Não foi possível salvar os tópicos.");
    } finally {
      setTopicsSaving(false);
    }
  };

  const handleNukeSave = async () => {
    if (!nukeConfig) return;
    setNukeSaving(true);
    setNukeError(null);
    try {
      const updated = await updateNukeConfig(nukeConfig);
      setNukeConfig({
        ...DEFAULT_NUKE_CONFIG,
        ...(updated || {}),
        canais: updated?.canais || {},
      });
    } catch (err) {
      console.error("[automations] save nuke", err);
      setNukeError("Não foi possível salvar o nuke.");
    } finally {
      setNukeSaving(false);
    }
  };

  const openAutoModModal = () => {
    if (!config) return;
    setAutoModDraft({
      mode: config.auto_moderation.mode,
      approval_threshold: String(config.auto_moderation.approval_threshold),
      rejection_threshold: String(config.auto_moderation.rejection_threshold),
      approval_delay_hours: String(config.auto_moderation.approval_delay_hours),
    });
    setAutoModError(null);
    setShowAutoModModal(true);
  };

  const openThreadMessageModal = () => {
    if (!config) return;
    setThreadMessageDraft(config.thread_message);
    setThreadMessageError(null);
    setShowThreadMessageModal(true);
  };

  const openAddCounterModal = () => {
    setCounterDraft({ prefixo: "", tipo: "canal", target_id: "" });
    setAddCounterError(null);
    setShowAddCounterModal(true);
  };

  const handleAddCounter = () => {
    if (!contMembersConfig) return;
    const prefixo = counterDraft.prefixo.trim();
    if (!prefixo) {
      setAddCounterError("Defina um prefixo para o contador.");
      return;
    }
    if (!counterDraft.target_id) {
      setAddCounterError("Selecione um canal ou categoria.");
      return;
    }
    const next = {
      ...contMembersConfig,
      contadores: [
        ...(contMembersConfig.contadores || []).filter(
          (c) => c.target_id !== counterDraft.target_id
        ),
        {
          prefixo,
          tipo: counterDraft.tipo,
          target_id: counterDraft.target_id,
        },
      ],
    };
    setContMembersConfig(next);
    setShowAddCounterModal(false);
  };

  const handleRemoveCounter = (targetId: string) => {
    setContMembersConfig((prev) =>
      prev
        ? {
            ...prev,
            contadores: (prev.contadores || []).filter((c) => c.target_id !== targetId),
          }
        : prev
    );
  };

  const openAiPromptModal = () => {
    setAiPromptDraft({
      prompt: aiModeratorConfig?.prompt ?? DEFAULT_TOS_PROMPT,
      rejection_message:
        aiModeratorConfig?.rejection_message || DEFAULT_AI_MODERATOR_CONFIG.rejection_message,
    });
    setAiPromptError(null);
    setShowAiPromptModal(true);
  };

  const handleAiPromptSave = () => {
    const prompt = aiPromptDraft.prompt.trim();
    if (!prompt) {
      setAiPromptError("Defina um prompt válido.");
      return;
    }
    const rejection = aiPromptDraft.rejection_message.trim() || DEFAULT_AI_MODERATOR_CONFIG.rejection_message;
    setAiModeratorConfig((prev) =>
      prev ? { ...prev, prompt, rejection_message: rejection } : prev
    );
    setShowAiPromptModal(false);
  };

  const handleAiPromptReset = () => {
    setAiModeratorConfig((prev) =>
      prev
        ? { ...prev, prompt: null, rejection_message: DEFAULT_AI_MODERATOR_CONFIG.rejection_message }
        : prev
    );
  };

  const openAddTopicModal = () => {
    setTopicDraft({
      channel_id: "",
      name: "",
      content: "",
      locked: false,
    });
    setTopicDraftError(null);
    setShowAddTopicModal(true);
  };

  const handleAddTopic = () => {
    if (!topicsConfig) return;
    const name = topicDraft.name.trim();
    const content = topicDraft.content.trim();
    if (!topicDraft.channel_id) {
      setTopicDraftError("Selecione um canal.");
      return;
    }
    if (!name) {
      setTopicDraftError("Defina um nome para o tópico.");
      return;
    }
    if (!content) {
      setTopicDraftError("Defina o conteúdo do tópico.");
      return;
    }
    const newTopic: TopicConfigEntry = {
      id: createTopicId(),
      channel_id: topicDraft.channel_id,
      name,
      content,
      locked: topicDraft.locked,
    };
    setTopicsConfig({
      ...topicsConfig,
      topicos: [...(topicsConfig.topicos || []), newTopic],
    });
    setShowAddTopicModal(false);
  };

  const handleRemoveTopic = (topicId: string) => {
    setTopicsConfig((prev) =>
      prev
        ? { ...prev, topicos: (prev.topicos || []).filter((t) => t.id !== topicId) }
        : prev
    );
  };

  const openNukeModal = () => {
    setNukeDraft({ channel_id: "", intervalo_minutos: "1440" });
    setNukeDraftError(null);
    setShowNukeModal(true);
  };

  const handleAddNukeChannel = () => {
    if (!nukeConfig) return;
    const intervalo = Number(nukeDraft.intervalo_minutos);
    if (!nukeDraft.channel_id) {
      setNukeDraftError("Selecione um canal.");
      return;
    }
    if (!Number.isFinite(intervalo) || intervalo < 1) {
      setNukeDraftError("Informe um intervalo válido em minutos.");
      return;
    }
    setNukeConfig({
      ...nukeConfig,
      canais: {
        ...(nukeConfig.canais || {}),
        [nukeDraft.channel_id]: {
          intervalo_minutos: Math.floor(intervalo),
          proxima_nuke: null,
        },
      },
    });
    setShowNukeModal(false);
  };

  const handleRemoveNukeChannel = (channelId: string) => {
    setNukeConfig((prev) => {
      if (!prev) return prev;
      const next = { ...prev.canais };
      delete next[channelId];
      return { ...prev, canais: next };
    });
  };

  const validateAutoModDraft = () => {
    const errors: string[] = [];
    const mode = autoModDraft.mode?.toLowerCase() as SuggestionsAutoModerationConfig["mode"];
    if (mode !== "quantidade" && mode !== "porcentagem") {
      errors.push("O modo deve ser 'quantidade' ou 'porcentagem'.");
    }

    const parseInteger = (value: string) => {
      const trimmed = value.trim();
      if (!/^\d+$/.test(trimmed)) return null;
      return Number.parseInt(trimmed, 10);
    };

    const approvalVal = parseInteger(autoModDraft.approval_threshold);
    if (approvalVal === null) {
      errors.push("Votos de aprovação deve ser um número inteiro (ex: 75).");
    } else if (approvalVal < 1 || approvalVal > 100000) {
      errors.push("Votos de aprovação deve estar entre 1 e 100000.");
    }

    const rejectionVal = parseInteger(autoModDraft.rejection_threshold);
    if (rejectionVal === null) {
      errors.push("Votos de rejeição deve ser um número inteiro (ex: 40).");
    } else if (rejectionVal < 1 || rejectionVal > 100000) {
      errors.push("Votos de rejeição deve estar entre 1 e 100000.");
    }

    const delayVal = parseInteger(autoModDraft.approval_delay_hours);
    if (delayVal === null) {
      errors.push("O tempo mínimo para moderação deve ser um número inteiro (ex: 24).");
    } else if (delayVal < 0 || delayVal > 8760) {
      errors.push("O tempo mínimo para moderação deve estar entre 0 e 8760 horas.");
    }

    if (mode === "porcentagem" && approvalVal !== null && rejectionVal !== null) {
      if (approvalVal + rejectionVal !== 100) {
        errors.push("Em modo 'porcentagem', a soma de aprovação e rejeição deve ser 100.");
      }
    }

    return { errors, mode, approvalVal, rejectionVal, delayVal };
  };

  const handleAutoModSave = async () => {
    if (!config) return;
    const { errors, mode, approvalVal, rejectionVal, delayVal } = validateAutoModDraft();
    if (errors.length > 0) {
      setAutoModError(errors.join("\n"));
      return;
    }
    setAutoModError(null);
    await commitSuggestionsConfig(
      normalizeConfig({
        ...config,
        auto_moderation: {
          ...config.auto_moderation,
          mode,
          approval_threshold: approvalVal ?? config.auto_moderation.approval_threshold,
          rejection_threshold: rejectionVal ?? config.auto_moderation.rejection_threshold,
          approval_delay_hours: delayVal ?? config.auto_moderation.approval_delay_hours,
        },
      })
    );
    setShowAutoModModal(false);
  };

  const handleThreadMessageSave = async () => {
    if (!config) return;
    setThreadMessageError(null);
    await commitSuggestionsConfig(
      normalizeConfig({
        ...config,
        thread_message: threadMessageDraft,
      })
    );
    setShowThreadMessageModal(false);
  };

  const channelOptions = channels.filter((channel) => channel.type === 0 || channel.type === 5);
  const textChannels = channels.filter((channel) => channel.type === 0);
  const voiceChannels = channels.filter((channel) => channel.type === 2 || channel.type === 13);
  const categoryChannels = channels.filter((channel) => channel.type === 4);
  const roleOptions = roles;
  const aiPromptDisplay = aiModeratorConfig?.prompt ?? DEFAULT_TOS_PROMPT;
  const aiPromptPreview =
    aiPromptDisplay.length > 800 ? `${aiPromptDisplay.slice(0, 800)}...` : aiPromptDisplay;
  const nukeChannels = Object.entries(nukeConfig?.canais || {});
  const pageTitle = singleTab ? "Sugestões" : "Automações";
  const pageDescription = singleTab
    ? "Gerencie o sistema de sugestões do servidor"
    : "Configure automações e filtros do servidor";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{pageTitle}</h1>
          <p className="text-muted-foreground text-sm mt-1">{pageDescription}</p>
        </div>
        <div className="flex items-center gap-2">
          {singleTab && (
            <GlassButton
              size="sm"
              variant="ghost"
              onClick={() => navigate("/dashboard/automations")}
            >
              Voltar
            </GlassButton>
          )}
          <GlassButton size="sm" variant="ghost" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </GlassButton>
        </div>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {!singleTab && (
          <TabsList className="bg-white/[0.03] border border-white/5 p-1 rounded-xl">
            <TabsTrigger value="suggestions" className="rounded-lg data-[state=active]:bg-white/10">
              <MessageSquare className="w-4 h-4 mr-2" />
              Sugestões
            </TabsTrigger>
          <TabsTrigger value="callCounter" className="rounded-lg data-[state=active]:bg-white/10">
            <Phone className="w-4 h-4 mr-2" />
            Contador em Call
          </TabsTrigger>
            <TabsTrigger value="tosFilter" className="rounded-lg data-[state=active]:bg-white/10">
              <Filter className="w-4 h-4 mr-2" />
              Filtro TOS
            </TabsTrigger>
            <TabsTrigger value="topics" className="rounded-lg data-[state=active]:bg-white/10">
              <Hash className="w-4 h-4 mr-2" />
              Tópicos
            </TabsTrigger>
            <TabsTrigger value="nuke" className="rounded-lg data-[state=active]:bg-white/10">
              <Trash2 className="w-4 h-4 mr-2" />
              Nuke
            </TabsTrigger>
          </TabsList>
        )}

        <TabsContent value="suggestions">
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Sistema de Sugestões"
              description="Configure o canal de sugestões e moderação automática"
            />
            {loading || !config ? (
              <div className="text-sm text-muted-foreground mt-4">Carregando configurações...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={config.status}
                        onCheckedChange={(value) => updateSuggestions({ status: value })}
                      />
                      <span className="text-sm text-muted-foreground">
                        {config.status ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Canal de sugestões</label>
                    <GlassSelect
                      value={config.channel ?? CHANNEL_NONE}
                      onValueChange={(value) =>
                        updateSuggestions({
                          channel: value === CHANNEL_NONE ? null : value,
                        })
                      }
                      disabled={!config.status}
                    >
                      <GlassSelectTrigger>
                        <GlassSelectValue placeholder="Selecione um canal" />
                      </GlassSelectTrigger>
                      <GlassSelectContent>
                        <GlassSelectItem value={CHANNEL_NONE}>Nenhum canal</GlassSelectItem>
                        {channelOptions.map((channel) => (
                          <GlassSelectItem key={channel.id} value={channel.id}>
                            #{channel.name}
                          </GlassSelectItem>
                        ))}
                      </GlassSelectContent>
                    </GlassSelect>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cargo Imune</label>
                    <GlassSelect
                      value={config.immune_role_id ?? ROLE_NONE}
                      onValueChange={(value) =>
                        updateSuggestions({
                          immune_role_id: value === ROLE_NONE ? null : value,
                        })
                      }
                      disabled={!config.status}
                    >
                      <GlassSelectTrigger>
                        <GlassSelectValue placeholder="Selecione um cargo" />
                      </GlassSelectTrigger>
                      <GlassSelectContent>
                        <GlassSelectItem value={ROLE_NONE}>Nenhum</GlassSelectItem>
                        {roleOptions.map((role) => (
                          <GlassSelectItem key={role.id} value={role.id}>
                            {role.name}
                          </GlassSelectItem>
                        ))}
                      </GlassSelectContent>
                    </GlassSelect>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Tópicos automáticos</h3>
                    <Switch
                      checked={config.create_threads}
                      disabled={!config.status}
                      onCheckedChange={(value) => updateSuggestions({ create_threads: value })}
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium">Mensagem do tópico</p>
                      <p className="text-xs text-muted-foreground">
                        Use <code className="px-1 rounded bg-white/5">{`{user}`}</code> para mencionar o autor.
                      </p>
                    </div>
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={openThreadMessageModal}
                      disabled={!config.status || !config.create_threads}
                    >
                      Editar mensagem
                    </GlassButton>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground whitespace-pre-wrap">
                    {config.thread_message}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium">Moderação automática</h3>
                    <Switch
                      checked={config.auto_moderation.enabled}
                      disabled={!config.status}
                      onCheckedChange={(value) =>
                        updateSuggestions({
                          auto_moderation: {
                            ...config.auto_moderation,
                            enabled: value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground space-y-1">
                    <p>
                      Modo: <span className="text-foreground">{config.auto_moderation.mode}</span>
                    </p>
                    <p>
                      Limite de aprovação:{" "}
                      <span className="text-foreground">
                        {config.auto_moderation.approval_threshold}
                        {config.auto_moderation.mode === "porcentagem" ? "%" : " votos"}
                      </span>
                    </p>
                    <p>
                      Limite de rejeição:{" "}
                      <span className="text-foreground">
                        {config.auto_moderation.rejection_threshold}
                        {config.auto_moderation.mode === "porcentagem" ? "%" : " votos"}
                      </span>
                    </p>
                    <p>
                      Tempo mínimo:{" "}
                      <span className="text-foreground">
                        {config.auto_moderation.approval_delay_hours}h
                      </span>
                    </p>
                  </div>
                  <div className="flex justify-end">
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={openAutoModModal}
                      disabled={!config.status || !config.auto_moderation.enabled}
                    >
                      Configurar limites
                    </GlassButton>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <GlassButton variant="ghost" size="sm" onClick={handleRefresh} disabled={loading}>
                    <RefreshCw className="w-4 h-4" />
                    Sincronizar
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="primary"
                    onClick={handleSave}
                    disabled={!config || saving}
                  >
                    <Save className="w-4 h-4" />
                    {saving ? "Salvando..." : "Salvar"}
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        {!singleTab && (
          <TabsContent value="callCounter">
            <GlassCard className="p-5" hover={false}>
              <SectionHeader
                title="Contador em Call"
                description="Contadores automáticos de membros em canais de voz"
              />
              {contMembersError && (
                <div className="text-sm text-destructive">{contMembersError}</div>
              )}
              {contMembersLoading || !contMembersConfig ? (
                <div className="text-sm text-muted-foreground mt-4">Carregando configurações...</div>
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Ativar contador</p>
                    <Switch
                      checked={contMembersConfig.ativado}
                      onCheckedChange={(value) =>
                        setContMembersConfig((prev) =>
                          prev ? { ...prev, ativado: value } : prev
                        )
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estilo do contador</label>
                    <GlassSelect
                      value={String(contMembersConfig.estilo ?? 0)}
                      onValueChange={(value) =>
                        setContMembersConfig((prev) =>
                          prev ? { ...prev, estilo: Number(value) } : prev
                        )
                      }
                    >
                      <GlassSelectTrigger>
                        <GlassSelectValue />
                      </GlassSelectTrigger>
                      <GlassSelectContent>
                        <GlassSelectItem value="0">Prefixo: Contagem</GlassSelectItem>
                        <GlassSelectItem value="1">Prefixo Contagem</GlassSelectItem>
                        <GlassSelectItem value="2">Contagem Prefixo</GlassSelectItem>
                        <GlassSelectItem value="3">Contagem: Prefixo</GlassSelectItem>
                      </GlassSelectContent>
                    </GlassSelect>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">Contadores configurados</p>
                      <GlassButton size="sm" variant="ghost" onClick={openAddCounterModal}>
                        Adicionar contador
                      </GlassButton>
                    </div>
                    {contMembersConfig.contadores.length === 0 ? (
                      <div className="text-sm text-muted-foreground">
                        Nenhum contador configurado.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {contMembersConfig.contadores.map((contador) => {
                          const target =
                            contador.tipo === "canal"
                              ? voiceChannels.find((ch) => ch.id === contador.target_id)
                              : categoryChannels.find((ch) => ch.id === contador.target_id);
                          const targetLabel = target ? target.name : contador.target_id;
                          return (
                            <div
                              key={`${contador.tipo}-${contador.target_id}`}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                            >
                              <div className="space-y-1">
                                <p className="font-medium">{contador.prefixo}</p>
                                <p className="text-xs text-muted-foreground">
                                  {contador.tipo === "canal" ? "Canal de voz" : "Categoria"}:{" "}
                                  <span className="text-foreground">{targetLabel}</span>
                                </p>
                              </div>
                              <GlassButton
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveCounter(contador.target_id)}
                              >
                                Remover
                              </GlassButton>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                    <GlassButton
                      variant="ghost"
                      size="sm"
                      onClick={handleContMembersRefresh}
                      disabled={contMembersLoading}
                    >
                      <RefreshCw className="w-4 h-4" />
                      Atualizar
                    </GlassButton>
                    <GlassButton
                      size="sm"
                      variant="primary"
                      onClick={handleContMembersSave}
                      disabled={!contMembersConfig || contMembersSaving}
                    >
                      <Save className="w-4 h-4" />
                      {contMembersSaving ? "Salvando..." : "Salvar"}
                    </GlassButton>
                  </div>
                </div>
              )}
            </GlassCard>
          </TabsContent>
        )}

        {!singleTab && (
        <TabsContent value="tosFilter">
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Filtro TOS (inK Moderator)"
              description="Moderação automática com IA para mensagens suspeitas"
            />
            {aiModeratorError && (
              <div className="text-sm text-destructive">{aiModeratorError}</div>
            )}
            {aiModeratorLoading || !aiModeratorConfig ? (
              <div className="text-sm text-muted-foreground mt-4">Carregando configurações...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={aiModeratorConfig.ativado}
                        onCheckedChange={(value) =>
                          setAiModeratorConfig((prev) =>
                            prev ? { ...prev, ativado: value } : prev
                          )
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {aiModeratorConfig.ativado ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cargo Imune</label>
                    <GlassSelect
                      value={aiModeratorConfig.cargo_imune_id ?? ROLE_NONE}
                      onValueChange={(value) =>
                        setAiModeratorConfig((prev) =>
                          prev
                            ? { ...prev, cargo_imune_id: value === ROLE_NONE ? null : value }
                            : prev
                        )
                      }
                      disabled={!aiModeratorConfig.ativado}
                    >
                      <GlassSelectTrigger>
                        <GlassSelectValue placeholder="Selecione um cargo" />
                      </GlassSelectTrigger>
                      <GlassSelectContent>
                        <GlassSelectItem value={ROLE_NONE}>Nenhum</GlassSelectItem>
                        {roleOptions.map((role) => (
                          <GlassSelectItem key={role.id} value={role.id}>
                            {role.name}
                          </GlassSelectItem>
                        ))}
                      </GlassSelectContent>
                    </GlassSelect>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prompt customizado</label>
                    <div className="text-sm text-muted-foreground">
                      {aiModeratorConfig.prompt ? "Sim" : "Não (padrão)"}
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Prompt e mensagem de remoção</p>
                      <p className="text-xs text-muted-foreground">
                        O prompt padrão será usado se você não customizar.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <GlassButton
                        size="sm"
                        variant="ghost"
                        onClick={openAiPromptModal}
                        disabled={!aiModeratorConfig.ativado}
                      >
                        Editar
                      </GlassButton>
                      <GlassButton
                        size="sm"
                        variant="ghost"
                        onClick={handleAiPromptReset}
                        disabled={!aiModeratorConfig.ativado || !aiModeratorConfig.prompt}
                      >
                        Resetar
                      </GlassButton>
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {aiPromptPreview}
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-muted-foreground">
                    Mensagem de remoção:{" "}
                    <span className="text-foreground">
                      {aiModeratorConfig.rejection_message || DEFAULT_AI_MODERATOR_CONFIG.rejection_message}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={loadAiModeratorConfig}
                    disabled={aiModeratorLoading}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="primary"
                    onClick={handleAiModeratorSave}
                    disabled={!aiModeratorConfig || aiModeratorSaving}
                  >
                    <Save className="w-4 h-4" />
                    {aiModeratorSaving ? "Salvando..." : "Salvar"}
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>
        )}

        {!singleTab && (
        <TabsContent value="topics">
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Tópicos Automáticos"
              description="Crie tópicos automáticos quando mensagens forem enviadas"
            />
            {topicsError && <div className="text-sm text-destructive">{topicsError}</div>}
            {topicsLoading || !topicsConfig ? (
              <div className="text-sm text-muted-foreground mt-4">Carregando configurações...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={topicsConfig.ativado}
                        onCheckedChange={(value) =>
                          setTopicsConfig((prev) =>
                            prev ? { ...prev, ativado: value } : prev
                          )
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {topicsConfig.ativado ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cargo Imune</label>
                    <GlassSelect
                      value={topicsConfig.immune_role_id ?? ROLE_NONE}
                      onValueChange={(value) =>
                        setTopicsConfig((prev) =>
                          prev
                            ? { ...prev, immune_role_id: value === ROLE_NONE ? null : value }
                            : prev
                        )
                      }
                      disabled={!topicsConfig.ativado}
                    >
                      <GlassSelectTrigger>
                        <GlassSelectValue placeholder="Selecione um cargo" />
                      </GlassSelectTrigger>
                      <GlassSelectContent>
                        <GlassSelectItem value={ROLE_NONE}>Nenhum</GlassSelectItem>
                        {roleOptions.map((role) => (
                          <GlassSelectItem key={role.id} value={role.id}>
                            {role.name}
                          </GlassSelectItem>
                        ))}
                      </GlassSelectContent>
                    </GlassSelect>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Tópicos configurados</label>
                    <div className="text-sm text-muted-foreground">
                      {topicsConfig.topicos.length} tópico(s)
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Gerenciar tópicos</p>
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={openAddTopicModal}
                      disabled={!topicsConfig.ativado}
                    >
                      Adicionar tópico
                    </GlassButton>
                  </div>
                  {topicsConfig.topicos.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Nenhum tópico configurado.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topicsConfig.topicos.map((topico) => {
                        const channel = textChannels.find((ch) => ch.id === topico.channel_id);
                        const channelLabel = channel ? `#${channel.name}` : topico.channel_id;
                        const contentPreview =
                          topico.content.length > 140
                            ? `${topico.content.slice(0, 140)}...`
                            : topico.content;
                        return (
                          <div
                            key={topico.id}
                            className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="font-medium">{topico.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  Canal: <span className="text-foreground">{channelLabel}</span>
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Trancado:{" "}
                                  <span className="text-foreground">
                                    {topico.locked ? "Sim" : "Não"}
                                  </span>
                                </p>
                              </div>
                              <GlassButton
                                size="sm"
                                variant="ghost"
                                onClick={() => handleRemoveTopic(topico.id)}
                                disabled={!topicsConfig.ativado}
                              >
                                Remover
                              </GlassButton>
                            </div>
                            <div className="text-xs text-muted-foreground whitespace-pre-wrap">
                              {contentPreview}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={loadTopicsConfig}
                    disabled={topicsLoading}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="primary"
                    onClick={handleTopicsSave}
                    disabled={!topicsConfig || topicsSaving}
                  >
                    <Save className="w-4 h-4" />
                    {topicsSaving ? "Salvando..." : "Salvar"}
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>
        )}

        {!singleTab && (
      <TabsContent value="nuke">
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Nuke de Canais"
              description="Recrie automaticamente canais em intervalos definidos"
            />
            {nukeError && <div className="text-sm text-destructive">{nukeError}</div>}
            {nukeLoading || !nukeConfig ? (
              <div className="text-sm text-muted-foreground mt-4">Carregando configurações...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={nukeConfig.ativado}
                        onCheckedChange={(value) =>
                          setNukeConfig((prev) => (prev ? { ...prev, ativado: value } : prev))
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {nukeConfig.ativado ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Logs</label>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={nukeConfig.logs_ativados}
                        onCheckedChange={(value) =>
                          setNukeConfig((prev) =>
                            prev ? { ...prev, logs_ativados: value } : prev
                          )
                        }
                        disabled={!nukeConfig.ativado}
                      />
                      <span className="text-sm text-muted-foreground">
                        {nukeConfig.logs_ativados ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Canais configurados</label>
                    <div className="text-sm text-muted-foreground">{nukeChannels.length}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Canais para nuke</p>
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={openNukeModal}
                      disabled={!nukeConfig.ativado}
                    >
                      Adicionar canal
                    </GlassButton>
                  </div>
                  {nukeChannels.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      Nenhum canal configurado.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {nukeChannels.map(([channelId, channelConfig]) => {
                        const channel = textChannels.find((ch) => ch.id === channelId);
                        const channelLabel = channel ? `#${channel.name}` : channelId;
                        return (
                          <div
                            key={channelId}
                            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
                          >
                            <div className="space-y-1">
                              <p className="font-medium">{channelLabel}</p>
                              <p className="text-xs text-muted-foreground">
                                Intervalo:{" "}
                                <span className="text-foreground">
                                  {formatInterval(channelConfig.intervalo_minutos)}
                                </span>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Próxima execução:{" "}
                                <span className="text-foreground">
                                  {formatNextNuke(channelConfig.proxima_nuke)}
                                </span>
                              </p>
                            </div>
                            <GlassButton
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRemoveNukeChannel(channelId)}
                              disabled={!nukeConfig.ativado}
                            >
                              Remover
                            </GlassButton>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                  <GlassButton
                    variant="ghost"
                    size="sm"
                    onClick={loadNukeConfig}
                    disabled={nukeLoading}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Atualizar
                  </GlassButton>
                  <GlassButton
                    size="sm"
                    variant="primary"
                    onClick={handleNukeSave}
                    disabled={!nukeConfig || nukeSaving}
                  >
                    <Save className="w-4 h-4" />
                    {nukeSaving ? "Salvando..." : "Salvar"}
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>
        )}
      </Tabs>

      <Modal
        isOpen={showThreadMessageModal}
        onClose={() => setShowThreadMessageModal(false)}
        title="Editar mensagem do tópico"
        description="Defina a mensagem exibida ao criar o tópico da sugestão."
        size="lg"
      >
        <div className="space-y-3">
          <label className="text-sm font-medium">Mensagem</label>
          <textarea
            rows={4}
            value={threadMessageDraft}
            onChange={(event) => setThreadMessageDraft(event.target.value)}
            maxLength={2000}
            className="w-full px-4 py-3 text-sm rounded-xl bg-white/[0.03] border border-white/10 outline-none focus:border-white/20 resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Use <code className="px-1 rounded bg-white/5">{`{user}`}</code> para mencionar o autor.
          </p>
          {threadMessageError && (
            <div className="text-sm text-destructive whitespace-pre-wrap">{threadMessageError}</div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => setShowThreadMessageModal(false)}
            disabled={saving}
          >
            Cancelar
          </GlassButton>
          <GlassButton
            variant="primary"
            size="sm"
            onClick={handleThreadMessageSave}
            loading={saving}
          >
            Salvar
          </GlassButton>
        </div>
      </Modal>

      <Modal
        isOpen={showAutoModModal}
        onClose={() => setShowAutoModModal(false)}
        title="Configurar limites de moderação"
        description="Defina o modo e os thresholds de aprovação/rejeição."
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Modo</label>
            <GlassSelect
              value={autoModDraft.mode}
              onValueChange={(value) =>
                setAutoModDraft((prev) => ({
                  ...prev,
                  mode: value as SuggestionsAutoModerationConfig["mode"],
                }))
              }
            >
              <GlassSelectTrigger>
                <GlassSelectValue />
              </GlassSelectTrigger>
              <GlassSelectContent>
                <GlassSelectItem value="porcentagem">Porcentagem</GlassSelectItem>
                <GlassSelectItem value="quantidade">Quantidade</GlassSelectItem>
              </GlassSelectContent>
            </GlassSelect>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Limite de aprovação</label>
              <input
                type="number"
                min={1}
                max={100000}
                value={autoModDraft.approval_threshold}
                onChange={(event) =>
                  setAutoModDraft((prev) => ({
                    ...prev,
                    approval_threshold: event.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/10 outline-none focus:border-white/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Limite de rejeição</label>
              <input
                type="number"
                min={1}
                max={100000}
                value={autoModDraft.rejection_threshold}
                onChange={(event) =>
                  setAutoModDraft((prev) => ({
                    ...prev,
                    rejection_threshold: event.target.value,
                  }))
                }
                className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/10 outline-none focus:border-white/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tempo mínimo para moderação (horas)</label>
            <input
              type="number"
              min={0}
              max={8760}
              value={autoModDraft.approval_delay_hours}
              onChange={(event) =>
                setAutoModDraft((prev) => ({
                  ...prev,
                  approval_delay_hours: event.target.value,
                }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/10 outline-none focus:border-white/20"
            />
          </div>

          {autoModError && (
            <div className="text-sm text-destructive whitespace-pre-wrap">{autoModError}</div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <GlassButton
            variant="ghost"
            size="sm"
            onClick={() => setShowAutoModModal(false)}
            disabled={saving}
          >
            Cancelar
          </GlassButton>
          <GlassButton
            variant="primary"
            size="sm"
            onClick={handleAutoModSave}
            loading={saving}
          >
            Salvar
          </GlassButton>
        </div>
      </Modal>

      <Modal
        isOpen={showAddCounterModal}
        onClose={() => setShowAddCounterModal(false)}
        title="Adicionar contador em call"
        description="Selecione o canal de voz ou categoria que receberá a contagem."
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prefixo</label>
            <input
              type="text"
              value={counterDraft.prefixo}
              onChange={(event) =>
                setCounterDraft((prev) => ({ ...prev, prefixo: event.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/10 outline-none focus:border-white/20"
              placeholder="Ex: Em Call"
              maxLength={50}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Tipo</label>
            <GlassSelect
              value={counterDraft.tipo}
              onValueChange={(value) =>
                setCounterDraft((prev) => ({ ...prev, tipo: value as "canal" | "categoria", target_id: "" }))
              }
            >
              <GlassSelectTrigger>
                <GlassSelectValue />
              </GlassSelectTrigger>
              <GlassSelectContent>
                <GlassSelectItem value="canal">Canal de voz</GlassSelectItem>
                <GlassSelectItem value="categoria">Categoria</GlassSelectItem>
              </GlassSelectContent>
            </GlassSelect>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {counterDraft.tipo === "canal" ? "Canal de voz" : "Categoria"}
            </label>
            <GlassSelect
              value={counterDraft.target_id || CHANNEL_NONE}
              onValueChange={(value) =>
                setCounterDraft((prev) => ({
                  ...prev,
                  target_id: value === CHANNEL_NONE ? "" : value,
                }))
              }
            >
              <GlassSelectTrigger>
                <GlassSelectValue placeholder="Selecione uma opção" />
              </GlassSelectTrigger>
              <GlassSelectContent>
                <GlassSelectItem value={CHANNEL_NONE}>Selecione uma opção</GlassSelectItem>
                {(counterDraft.tipo === "canal" ? voiceChannels : categoryChannels).map((ch) => (
                  <GlassSelectItem key={ch.id} value={ch.id}>
                    {ch.name}
                  </GlassSelectItem>
                ))}
              </GlassSelectContent>
            </GlassSelect>
          </div>
          {addCounterError && (
            <div className="text-sm text-destructive">{addCounterError}</div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <GlassButton variant="ghost" size="sm" onClick={() => setShowAddCounterModal(false)}>
            Cancelar
          </GlassButton>
          <GlassButton variant="primary" size="sm" onClick={handleAddCounter}>
            Adicionar
          </GlassButton>
        </div>
      </Modal>

      <Modal
        isOpen={showAiPromptModal}
        onClose={() => setShowAiPromptModal(false)}
        title="Editar prompt do filtro TOS"
        description="Defina as regras para a IA e a mensagem de remoção."
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Prompt (regras)</label>
            <textarea
              rows={8}
              value={aiPromptDraft.prompt}
              onChange={(event) =>
                setAiPromptDraft((prev) => ({ ...prev, prompt: event.target.value }))
              }
              className="w-full px-4 py-3 text-sm rounded-xl bg-white/[0.03] border border-white/10 outline-none focus:border-white/20 resize-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem de remoção</label>
            <input
              type="text"
              value={aiPromptDraft.rejection_message}
              onChange={(event) =>
                setAiPromptDraft((prev) => ({ ...prev, rejection_message: event.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/10 outline-none focus:border-white/20"
              maxLength={100}
            />
          </div>
          {aiPromptError && <div className="text-sm text-destructive">{aiPromptError}</div>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <GlassButton variant="ghost" size="sm" onClick={() => setShowAiPromptModal(false)}>
            Cancelar
          </GlassButton>
          <GlassButton variant="primary" size="sm" onClick={handleAiPromptSave}>
            Salvar
          </GlassButton>
        </div>
      </Modal>

      <Modal
        isOpen={showAddTopicModal}
        onClose={() => setShowAddTopicModal(false)}
        title="Adicionar tópico automático"
        description="Selecione o canal e configure a mensagem do tópico."
        size="lg"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Canal</label>
            <GlassSelect
              value={topicDraft.channel_id || CHANNEL_NONE}
              onValueChange={(value) =>
                setTopicDraft((prev) => ({
                  ...prev,
                  channel_id: value === CHANNEL_NONE ? "" : value,
                }))
              }
            >
              <GlassSelectTrigger>
                <GlassSelectValue placeholder="Selecione um canal" />
              </GlassSelectTrigger>
              <GlassSelectContent>
                <GlassSelectItem value={CHANNEL_NONE}>Selecione um canal</GlassSelectItem>
                {textChannels.map((channel) => (
                  <GlassSelectItem key={channel.id} value={channel.id}>
                    #{channel.name}
                  </GlassSelectItem>
                ))}
              </GlassSelectContent>
            </GlassSelect>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nome do tópico</label>
            <input
              type="text"
              value={topicDraft.name}
              onChange={(event) =>
                setTopicDraft((prev) => ({ ...prev, name: event.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/10 outline-none focus:border-white/20"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Conteúdo</label>
            <textarea
              rows={4}
              value={topicDraft.content}
              onChange={(event) =>
                setTopicDraft((prev) => ({ ...prev, content: event.target.value }))
              }
              className="w-full px-4 py-3 text-sm rounded-xl bg-white/[0.03] border border-white/10 outline-none focus:border-white/20 resize-none"
              placeholder="Use {user} para mencionar quem enviou a mensagem"
              maxLength={4000}
            />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Trancar tópico</label>
            <Switch
              checked={topicDraft.locked}
              onCheckedChange={(value) =>
                setTopicDraft((prev) => ({ ...prev, locked: value }))
              }
            />
          </div>
          {topicDraftError && <div className="text-sm text-destructive">{topicDraftError}</div>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <GlassButton variant="ghost" size="sm" onClick={() => setShowAddTopicModal(false)}>
            Cancelar
          </GlassButton>
          <GlassButton variant="primary" size="sm" onClick={handleAddTopic}>
            Adicionar
          </GlassButton>
        </div>
      </Modal>

      <Modal
        isOpen={showNukeModal}
        onClose={() => setShowNukeModal(false)}
        title="Adicionar canal para nuke"
        description="Defina o canal e o intervalo de execução."
        size="md"
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Canal</label>
            <GlassSelect
              value={nukeDraft.channel_id || CHANNEL_NONE}
              onValueChange={(value) =>
                setNukeDraft((prev) => ({
                  ...prev,
                  channel_id: value === CHANNEL_NONE ? "" : value,
                }))
              }
            >
              <GlassSelectTrigger>
                <GlassSelectValue placeholder="Selecione um canal" />
              </GlassSelectTrigger>
              <GlassSelectContent>
                <GlassSelectItem value={CHANNEL_NONE}>Selecione um canal</GlassSelectItem>
                {textChannels.map((channel) => (
                  <GlassSelectItem key={channel.id} value={channel.id}>
                    #{channel.name}
                  </GlassSelectItem>
                ))}
              </GlassSelectContent>
            </GlassSelect>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Intervalo (minutos)</label>
            <input
              type="number"
              min={1}
              value={nukeDraft.intervalo_minutos}
              onChange={(event) =>
                setNukeDraft((prev) => ({ ...prev, intervalo_minutos: event.target.value }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/10 outline-none focus:border-white/20"
            />
          </div>
          {nukeDraftError && <div className="text-sm text-destructive">{nukeDraftError}</div>}
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <GlassButton variant="ghost" size="sm" onClick={() => setShowNukeModal(false)}>
            Cancelar
          </GlassButton>
          <GlassButton variant="primary" size="sm" onClick={handleAddNukeChannel}>
            Adicionar
          </GlassButton>
        </div>
      </Modal>
    </div>
  );
}
