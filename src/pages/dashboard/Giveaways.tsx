import { useEffect, useMemo, useState } from "react";
import { Gift, Plus, Save, RefreshCw, Trash2, Settings, Users, FileText, Send } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { SettingsRow } from "@/components/dashboard/SettingsRow";
import { Switch } from "@/components/ui/switch";
import {
  GlassSelect,
  GlassSelectContent,
  GlassSelectItem,
  GlassSelectTrigger,
  GlassSelectValue,
} from "@/components/ui/GlassSelect";
import { GlassInput } from "@/components/ui/GlassInput";
import { Modal } from "@/components/ui/Modal";
import {
  fetchGiveawaysData,
  updateGiveawaysData,
  createGiveaway,
  deleteGiveaway,
  sendGiveawayMessage,
} from "@/lib/api/giveaways";
import { fetchStoreChannels, fetchStoreRoles, type StoreChannel, type StoreRole } from "@/lib/api/store";
import { useTenant } from "@/lib/tenant";

const ROLE_NONE = "__none";
const CHANNEL_NONE = "__none";

const REQUIREMENTS_CONFIG: Record<
  string,
  { label: string; description: string; type: "toggle" | "text" | "number" | "channel" | "user_list" }
> = {
  in_any_voice_channel: {
    label: "Estar em um canal de voz",
    description: "O participante deve estar em qualquer canal de voz.",
    type: "toggle",
  },
  is_voice_muted: {
    label: "Estar com o microfone mutado",
    description: "O participante deve estar com o microfone mutado.",
    type: "toggle",
  },
  is_voice_deafened: {
    label: "Estar com o fone desativado",
    description: "O participante deve estar com o fone desativado (surdo).",
    type: "toggle",
  },
  has_feedback: {
    label: "Ter deixado feedback",
    description: "O participante deve ter deixado um feedback no canal de feedbacks.",
    type: "toggle",
  },
  min_account_age_days: {
    label: "Dias mínimos da conta",
    description: "Define a idade mínima da conta do Discord.",
    type: "number",
  },
  min_server_age_days: {
    label: "Dias mínimos no servidor",
    description: "Define o tempo mínimo que o membro deve estar no servidor.",
    type: "number",
  },
  custom_nickname: {
    label: "Nickname customizado",
    description: "Exige que o participante tenha um texto específico no nickname.",
    type: "text",
  },
  custom_status: {
    label: "Status customizado",
    description: "Exige que o participante tenha um texto específico no status.",
    type: "text",
  },
  invited_by: {
    label: "Ser convidado por",
    description: "Define um ou mais membros que devem ter convidado o participante.",
    type: "user_list",
  },
  min_invites: {
    label: "Mínimo de convites",
    description: "Define o número mínimo de convites que o membro deve ter.",
    type: "number",
  },
  specific_voice_channel: {
    label: "Estar em canal de voz específico",
    description: "Define um canal de voz onde o membro deve estar.",
    type: "channel",
  },
  server_tag: {
    label: "Usar tag do servidor",
    description: "Define um servidor específico cuja tag o usuário deve estar usando.",
    type: "text",
  },
};

const DEFAULT_GIVEAWAY = {
  name: "",
  mode: "real",
  author_id: null,
  created_at: null,
  log_channel_id: null,
  monitor_enabled: false,
  message_style: "embed",
  button: {
    label: "Participar",
    emoji: "",
    style: "green",
  },
  embed: {
    title: "",
    description: "",
    image_url: "",
    thumbnail_url: "",
    color: "#5865F2",
  },
  content: {
    content: "",
    image_url: "",
  },
  container: {
    content: "",
    image_url: "",
    thumbnail_url: "",
    color: "#5865F2",
  },
  tasks: [],
  requirements: {},
  allowed_roles: [],
  forbidden_roles: [],
  bonus_roles: {},
  prize: {
    type: "none",
    dm_notify: true,
    content: "",
  },
  winner_users: [],
  winner_roles: [],
};

const deepMerge = (base: any, override: any) => {
  if (!override) return { ...base };
  const result: any = Array.isArray(base) ? [...base] : { ...base };
  Object.entries(override).forEach(([key, value]) => {
    if (value && typeof value === "object" && !Array.isArray(value) && base?.[key]) {
      result[key] = deepMerge(base[key], value);
    } else {
      result[key] = value;
    }
  });
  return result;
};

const toIdList = (value: any) => {
  if (!value) return [] as string[];
  const list = Array.isArray(value) ? value : [value];
  return list.map((item) => String(item)).filter((item) => item.trim().length > 0);
};

export default function GiveawaysPage() {
  const [giveawaysData, setGiveawaysData] = useState<Record<string, any>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createDraft, setCreateDraft] = useState({ name: "", mode: "real" as "real" | "falso" });
  const [channels, setChannels] = useState<StoreChannel[]>([]);
  const [roles, setRoles] = useState<StoreRole[]>([]);
  const [sendingTasks, setSendingTasks] = useState<Record<string, boolean>>({});
  const [sendErrors, setSendErrors] = useState<Record<string, string | null>>({});
  const { tenantId } = useTenant();

  const giveawaysList = useMemo(() => {
    return Object.entries(giveawaysData)
      .filter(([, data]) => data && typeof data === "object" && data.name)
      .map(([id, data]) => ({ id, data }));
  }, [giveawaysData]);

  const selectedGiveaway = useMemo(() => {
    if (!selectedId) return null;
    const raw = giveawaysData[selectedId];
    if (!raw) return null;
    return deepMerge(DEFAULT_GIVEAWAY, raw);
  }, [giveawaysData, selectedId]);

  const handleSendGiveawayMessage = async (taskId: string) => {
    if (!selectedId) return;
    setSendingTasks((prev) => ({ ...prev, [taskId]: true }));
    setSendErrors((prev) => ({ ...prev, [taskId]: null }));
    try {
      const saved = await handleSave();
      if (!saved) {
        setSendErrors((prev) => ({
          ...prev,
          [taskId]: "Não foi possível salvar o sorteio antes de enviar a mensagem.",
        }));
        return;
      }
      const response = await sendGiveawayMessage({
        giveaway_id: selectedId,
        task_id: taskId,
        resend: !!selectedGiveaway?.tasks?.find((task) => task.id === taskId)?.message_id,
      });
      if (response?.data && typeof response.data === "object") {
        setGiveawaysData(response.data);
      }
    } catch (err) {
      setSendErrors((prev) => ({
        ...prev,
        [taskId]: "Não foi possível enviar a mensagem.",
      }));
    } finally {
      setSendingTasks((prev) => ({ ...prev, [taskId]: false }));
    }
  };

  const textChannels = useMemo(
    () => channels.filter((channel) => channel.type === 0 || channel.type === 5),
    [channels]
  );
  const voiceChannels = useMemo(
    () => channels.filter((channel) => channel.type === 2 || channel.type === 13),
    [channels]
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchGiveawaysData()
      .then((data) => {
        if (!mounted) return;
        setGiveawaysData(data || {});
        const first = Object.keys(data || {})[0];
        if (first) setSelectedId(first);
      })
      .catch(() => {
        if (!mounted) return;
        setGiveawaysData({});
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  useEffect(() => {
    fetchStoreChannels(true, true)
      .then((data) => setChannels(data))
      .catch(() => setChannels([]));
    fetchStoreRoles()
      .then((data) => setRoles(data))
      .catch(() => setRoles([]));
  }, [tenantId]);

  const updateGiveaway = (id: string, updater: (current: any) => any) => {
    setGiveawaysData((prev) => {
      const current = deepMerge(DEFAULT_GIVEAWAY, prev[id] || {});
      return { ...prev, [id]: updater(current) };
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      const saved = await updateGiveawaysData(giveawaysData);
      setGiveawaysData(saved || {});
      return true;
    } catch (err) {
      setError("Não foi possível salvar os sorteios.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setLoading(true);
      const data = await fetchGiveawaysData();
      setGiveawaysData(data || {});
      const first = Object.keys(data || {})[0];
      if (first) setSelectedId(first);
    } catch (err) {
      setError("Não foi possível carregar os sorteios.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!createDraft.name.trim()) return;
    try {
      const result = await createGiveaway(createDraft.name.trim(), createDraft.mode);
      const data = result.all || {};
      setGiveawaysData(data);
      setSelectedId(result.id);
      setShowCreateModal(false);
      setCreateDraft({ name: "", mode: "real" });
    } catch (err) {
      setError("Não foi possível criar o sorteio.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await deleteGiveaway(id);
      setGiveawaysData(result.data || {});
      if (selectedId === id) {
        const next = Object.keys(result.data || {})[0];
        setSelectedId(next || null);
      }
    } catch (err) {
      setError("Não foi possível excluir o sorteio.");
    }
  };

  const roleName = (roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    return role ? role.name : roleId;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sorteios</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Crie e gerencie sorteios para seu servidor
        </p>
      </div>

      <GlassCard className="p-5" hover={false}>
        <SectionHeader
          title="Sorteios"
          description={`${giveawaysList.length} sorteios configurados`}
          actions={
            <div className="flex items-center gap-2">
              <GlassButton size="sm" variant="ghost" onClick={handleRefresh}>
                <RefreshCw className="w-4 h-4" />
                Atualizar
              </GlassButton>
              <GlassButton size="sm" onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4" />
                Novo sorteio
              </GlassButton>
              <GlassButton size="sm" variant="primary" onClick={handleSave} disabled={saving}>
                <Save className="w-4 h-4" />
                {saving ? "Salvando..." : "Salvar"}
              </GlassButton>
            </div>
          }
        />

        {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Carregando sorteios...</p>
        ) : (
          <div className="grid lg:grid-cols-[320px_1fr] gap-6">
            <div className="space-y-3">
              {giveawaysList.length === 0 && (
                <div className="text-sm text-muted-foreground">Nenhum sorteio criado.</div>
              )}
              {giveawaysList.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(item.id);
                    }
                  }}
                  className={`w-full text-left p-3 rounded-xl border transition-colors ${
                    selectedId === item.id ? "border-white/20 bg-white/5" : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{item.data.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.data.mode === "falso" ? "Sorteio falso" : "Sorteio real"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDelete(item.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {selectedGiveaway ? (
              <div className="space-y-4">
                <Tabs defaultValue="general" className="space-y-4">
                  <TabsList className="bg-white/[0.03] border border-white/5 p-1 rounded-xl flex-wrap">
                    <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-white/10">
                      <Settings className="w-4 h-4 mr-2" />
                      Geral
                    </TabsTrigger>
                    <TabsTrigger value="message" className="rounded-lg data-[state=active]:bg-white/10">
                      <FileText className="w-4 h-4 mr-2" />
                      Mensagem
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-white/10">
                      <Gift className="w-4 h-4 mr-2" />
                      Tarefas
                    </TabsTrigger>
                    <TabsTrigger value="preferences" className="rounded-lg data-[state=active]:bg-white/10">
                      <Users className="w-4 h-4 mr-2" />
                      Preferências
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="general">
                    <div className="space-y-4">
                      <SettingsRow
                        label="Nome do sorteio"
                        description="Identificação interna do sorteio"
                        control={
                          <GlassInput
                            value={selectedGiveaway.name}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                name: event.target.value,
                              }))
                            }
                          />
                        }
                      />
                      <SettingsRow
                        label="Tipo"
                        description="Real ou falso"
                        control={
                          <GlassSelect
                            value={selectedGiveaway.mode}
                            onValueChange={(value) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                mode: value,
                              }))
                            }
                          >
                            <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                              <GlassSelectValue />
                            </GlassSelectTrigger>
                            <GlassSelectContent>
                              <GlassSelectItem value="real">Sorteio Real</GlassSelectItem>
                              <GlassSelectItem value="falso">Sorteio Falso</GlassSelectItem>
                            </GlassSelectContent>
                          </GlassSelect>
                        }
                      />
                      <SettingsRow
                        label="Canal de logs"
                        description="Onde registrar eventos do sorteio"
                        control={
                          <GlassSelect
                            value={selectedGiveaway.log_channel_id || CHANNEL_NONE}
                            onValueChange={(value) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                log_channel_id: value === CHANNEL_NONE ? null : value,
                              }))
                            }
                          >
                            <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                              <GlassSelectValue placeholder="Selecione um canal" />
                            </GlassSelectTrigger>
                            <GlassSelectContent>
                              <GlassSelectItem value={CHANNEL_NONE}>Nenhum canal</GlassSelectItem>
                              {textChannels.map((channel) => (
                                <GlassSelectItem key={channel.id} value={channel.id}>
                                  #{channel.name}
                                </GlassSelectItem>
                              ))}
                            </GlassSelectContent>
                          </GlassSelect>
                        }
                      />
                      <SettingsRow
                        label="Monitor de requisitos"
                        description="Remove participantes que não atendem requisitos"
                        control={
                          <Switch
                            checked={!!selectedGiveaway.monitor_enabled}
                            onCheckedChange={(checked) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                monitor_enabled: checked,
                              }))
                            }
                          />
                        }
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="message">
                    <div className="space-y-4">
                      <SettingsRow
                        label="Estilo da mensagem"
                        description="Embed, texto simples ou container"
                        control={
                          <GlassSelect
                            value={selectedGiveaway.message_style}
                            onValueChange={(value) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                message_style: value,
                              }))
                            }
                          >
                            <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                              <GlassSelectValue />
                            </GlassSelectTrigger>
                            <GlassSelectContent>
                              <GlassSelectItem value="embed">Embed</GlassSelectItem>
                              <GlassSelectItem value="content">Texto simples</GlassSelectItem>
                              <GlassSelectItem value="container">Container V2</GlassSelectItem>
                            </GlassSelectContent>
                          </GlassSelect>
                        }
                      />
                      <div className="grid md:grid-cols-3 gap-4">
                        <GlassInput
                          placeholder="Texto do botão"
                          value={selectedGiveaway.button?.label || ""}
                          onChange={(event) =>
                            updateGiveaway(selectedId, (current) => ({
                              ...current,
                              button: { ...current.button, label: event.target.value },
                            }))
                          }
                        />
                        <GlassInput
                          placeholder="Emoji"
                          value={selectedGiveaway.button?.emoji || ""}
                          onChange={(event) =>
                            updateGiveaway(selectedId, (current) => ({
                              ...current,
                              button: { ...current.button, emoji: event.target.value },
                            }))
                          }
                        />
                        <GlassSelect
                          value={selectedGiveaway.button?.style || "green"}
                          onValueChange={(value) =>
                            updateGiveaway(selectedId, (current) => ({
                              ...current,
                              button: { ...current.button, style: value },
                            }))
                          }
                        >
                          <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                            <GlassSelectValue />
                          </GlassSelectTrigger>
                          <GlassSelectContent>
                            <GlassSelectItem value="green">Verde</GlassSelectItem>
                            <GlassSelectItem value="grey">Cinza</GlassSelectItem>
                            <GlassSelectItem value="red">Vermelho</GlassSelectItem>
                            <GlassSelectItem value="blue">Azul</GlassSelectItem>
                          </GlassSelectContent>
                        </GlassSelect>
                      </div>
                      {selectedGiveaway.message_style === "embed" && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <GlassInput
                            placeholder="Título"
                            value={selectedGiveaway.embed?.title || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                embed: { ...current.embed, title: event.target.value },
                              }))
                            }
                          />
                          <GlassInput
                            placeholder="Cor (hex)"
                            value={selectedGiveaway.embed?.color || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                embed: { ...current.embed, color: event.target.value },
                              }))
                            }
                          />
                          <GlassInput
                            placeholder="URL da imagem"
                            value={selectedGiveaway.embed?.image_url || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                embed: { ...current.embed, image_url: event.target.value },
                              }))
                            }
                          />
                          <GlassInput
                            placeholder="URL da thumbnail"
                            value={selectedGiveaway.embed?.thumbnail_url || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                embed: { ...current.embed, thumbnail_url: event.target.value },
                              }))
                            }
                          />
                          <div className="md:col-span-2">
                            <GlassInput
                              placeholder="Descrição"
                              value={selectedGiveaway.embed?.description || ""}
                              onChange={(event) =>
                                updateGiveaway(selectedId, (current) => ({
                                  ...current,
                                  embed: { ...current.embed, description: event.target.value },
                                }))
                              }
                            />
                          </div>
                        </div>
                      )}
                      {selectedGiveaway.message_style === "content" && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <GlassInput
                            placeholder="Conteúdo"
                            value={selectedGiveaway.content?.content || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                content: { ...current.content, content: event.target.value },
                              }))
                            }
                          />
                          <GlassInput
                            placeholder="URL da imagem"
                            value={selectedGiveaway.content?.image_url || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                content: { ...current.content, image_url: event.target.value },
                              }))
                            }
                          />
                        </div>
                      )}
                      {selectedGiveaway.message_style === "container" && (
                        <div className="grid md:grid-cols-2 gap-4">
                          <GlassInput
                            placeholder="Conteúdo"
                            value={selectedGiveaway.container?.content || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                container: { ...current.container, content: event.target.value },
                              }))
                            }
                          />
                          <GlassInput
                            placeholder="Cor (hex)"
                            value={selectedGiveaway.container?.color || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                container: { ...current.container, color: event.target.value },
                              }))
                            }
                          />
                          <GlassInput
                            placeholder="URL da imagem"
                            value={selectedGiveaway.container?.image_url || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                container: { ...current.container, image_url: event.target.value },
                              }))
                            }
                          />
                          <GlassInput
                            placeholder="URL da thumbnail"
                            value={selectedGiveaway.container?.thumbnail_url || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                container: { ...current.container, thumbnail_url: event.target.value },
                              }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="tasks">
                    <div className="space-y-4">
                      <GlassButton
                        size="sm"
                        onClick={() =>
                          updateGiveaway(selectedId, (current) => ({
                            ...current,
                            tasks: [
                              ...(current.tasks || []),
                              {
                                id: Math.random().toString(36).slice(2, 8),
                                name: "Nova tarefa",
                                status: "pending",
                                channel_id: null,
                                start_time: null,
                                end_time: null,
                                min_participants: 0,
                                max_participants: 0,
                                max_winners: 1,
                                participants: [],
                              },
                            ],
                          }))
                        }
                      >
                        <Plus className="w-4 h-4" />
                        Criar tarefa
                      </GlassButton>
                      {(selectedGiveaway.tasks || []).length === 0 && (
                        <p className="text-sm text-muted-foreground">Nenhuma tarefa criada.</p>
                      )}
                      {(selectedGiveaway.tasks || []).map((task: any, index: number) => (
                        <div key={task.id} className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <GlassInput
                            value={task.name || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => {
                                const nextTasks = [...(current.tasks || [])];
                                nextTasks[index] = { ...nextTasks[index], name: event.target.value };
                                return { ...current, tasks: nextTasks };
                              })
                            }
                          />
                          <div className="flex items-center gap-2">
                            <GlassButton
                              variant="ghost"
                              size="sm"
                              loading={!!sendingTasks[task.id]}
                              onClick={() => handleSendGiveawayMessage(task.id)}
                            >
                              <Send className="w-4 h-4" />
                              {task.message_id ? "Reenviar mensagem" : "Enviar mensagem"}
                            </GlassButton>
                            <button
                              type="button"
                              className="text-destructive"
                              onClick={() =>
                                updateGiveaway(selectedId, (current) => {
                                  const nextTasks = [...(current.tasks || [])];
                                  nextTasks.splice(index, 1);
                                  return { ...current, tasks: nextTasks };
                                })
                              }
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {sendErrors[task.id] && (
                          <p className="text-xs text-destructive">{sendErrors[task.id]}</p>
                        )}
                          <div className="grid md:grid-cols-3 gap-3">
                            <GlassSelect
                              value={task.status || "pending"}
                              onValueChange={(value) =>
                                updateGiveaway(selectedId, (current) => {
                                  const nextTasks = [...(current.tasks || [])];
                                  nextTasks[index] = { ...nextTasks[index], status: value };
                                  return { ...current, tasks: nextTasks };
                                })
                              }
                            >
                              <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                                <GlassSelectValue />
                              </GlassSelectTrigger>
                              <GlassSelectContent>
                                <GlassSelectItem value="pending">Pendente</GlassSelectItem>
                                <GlassSelectItem value="running">Em andamento</GlassSelectItem>
                                <GlassSelectItem value="finished">Finalizado</GlassSelectItem>
                                <GlassSelectItem value="error">Erro</GlassSelectItem>
                              </GlassSelectContent>
                            </GlassSelect>
                            <GlassSelect
                              value={task.channel_id || CHANNEL_NONE}
                              onValueChange={(value) =>
                                updateGiveaway(selectedId, (current) => {
                                  const nextTasks = [...(current.tasks || [])];
                                  nextTasks[index] = {
                                    ...nextTasks[index],
                                    channel_id: value === CHANNEL_NONE ? null : value,
                                  };
                                  return { ...current, tasks: nextTasks };
                                })
                              }
                            >
                              <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                                <GlassSelectValue placeholder="Canal" />
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
                            <GlassInput
                              placeholder="Ganhadores"
                              value={String(task.max_winners ?? 1)}
                              onChange={(event) =>
                                updateGiveaway(selectedId, (current) => {
                                  const nextTasks = [...(current.tasks || [])];
                                  nextTasks[index] = {
                                    ...nextTasks[index],
                                    max_winners: Number.parseInt(event.target.value || "1", 10) || 1,
                                  };
                                  return { ...current, tasks: nextTasks };
                                })
                              }
                            />
                          </div>
                          <div className="grid md:grid-cols-3 gap-3">
                            <GlassInput
                              placeholder="Min participantes"
                              value={String(task.min_participants ?? 0)}
                              onChange={(event) =>
                                updateGiveaway(selectedId, (current) => {
                                  const nextTasks = [...(current.tasks || [])];
                                  nextTasks[index] = {
                                    ...nextTasks[index],
                                    min_participants: Number.parseInt(event.target.value || "0", 10) || 0,
                                  };
                                  return { ...current, tasks: nextTasks };
                                })
                              }
                            />
                            <GlassInput
                              placeholder="Max participantes"
                              value={String(task.max_participants ?? 0)}
                              onChange={(event) =>
                                updateGiveaway(selectedId, (current) => {
                                  const nextTasks = [...(current.tasks || [])];
                                  nextTasks[index] = {
                                    ...nextTasks[index],
                                    max_participants: Number.parseInt(event.target.value || "0", 10) || 0,
                                  };
                                  return { ...current, tasks: nextTasks };
                                })
                              }
                            />
                            <GlassInput
                              placeholder="Início (timestamp)"
                              value={task.start_time ? String(task.start_time) : ""}
                              onChange={(event) =>
                                updateGiveaway(selectedId, (current) => {
                                  const nextTasks = [...(current.tasks || [])];
                                  const value = Number.parseInt(event.target.value || "0", 10);
                                  nextTasks[index] = { ...nextTasks[index], start_time: value || null };
                                  return { ...current, tasks: nextTasks };
                                })
                              }
                            />
                            <GlassInput
                              placeholder="Fim (timestamp)"
                              value={task.end_time ? String(task.end_time) : ""}
                              onChange={(event) =>
                                updateGiveaway(selectedId, (current) => {
                                  const nextTasks = [...(current.tasks || [])];
                                  const value = Number.parseInt(event.target.value || "0", 10);
                                  nextTasks[index] = { ...nextTasks[index], end_time: value || null };
                                  return { ...current, tasks: nextTasks };
                                })
                              }
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>

                  <TabsContent value="preferences">
                    <div className="space-y-6">
                      <div>
                        <p className="text-sm font-medium mb-2">Requisitos</p>
                        <div className="space-y-3">
                          {Object.entries(REQUIREMENTS_CONFIG).map(([key, config]) => {
                            const req = selectedGiveaway.requirements?.[key] || {};
                            const enabled = !!req.enabled;
                            return (
                              <div key={key} className="p-3 rounded-lg border border-white/10 bg-white/5 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="text-sm font-medium">{config.label}</p>
                                    <p className="text-xs text-muted-foreground">{config.description}</p>
                                  </div>
                                  <Switch
                                    checked={enabled}
                                    onCheckedChange={(checked) =>
                                      updateGiveaway(selectedId, (current) => ({
                                        ...current,
                                        requirements: {
                                          ...(current.requirements || {}),
                                          [key]: { ...req, enabled: checked },
                                        },
                                      }))
                                    }
                                  />
                                </div>
                                {config.type === "text" && (
                                  <GlassInput
                                    placeholder="Valor"
                                    value={req.value || ""}
                                    onChange={(event) =>
                                      updateGiveaway(selectedId, (current) => ({
                                        ...current,
                                        requirements: {
                                          ...(current.requirements || {}),
                                          [key]: { ...req, value: event.target.value },
                                        },
                                      }))
                                    }
                                  />
                                )}
                                {config.type === "number" && (
                                  <GlassInput
                                    placeholder="Valor"
                                    value={req.value ? String(req.value) : ""}
                                    onChange={(event) =>
                                      updateGiveaway(selectedId, (current) => ({
                                        ...current,
                                        requirements: {
                                          ...(current.requirements || {}),
                                          [key]: { ...req, value: Number.parseInt(event.target.value || "0", 10) || 0 },
                                        },
                                      }))
                                    }
                                  />
                                )}
                                {config.type === "channel" && (
                                  <GlassSelect
                                    value={req.value || CHANNEL_NONE}
                                    onValueChange={(value) =>
                                      updateGiveaway(selectedId, (current) => ({
                                        ...current,
                                        requirements: {
                                          ...(current.requirements || {}),
                                          [key]: { ...req, value: value === CHANNEL_NONE ? null : value },
                                        },
                                      }))
                                    }
                                  >
                                    <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                                      <GlassSelectValue placeholder="Selecione um canal" />
                                    </GlassSelectTrigger>
                                    <GlassSelectContent>
                                      <GlassSelectItem value={CHANNEL_NONE}>Nenhum canal</GlassSelectItem>
                                      {voiceChannels.map((channel) => (
                                        <GlassSelectItem key={channel.id} value={channel.id}>
                                          {channel.name}
                                        </GlassSelectItem>
                                      ))}
                                    </GlassSelectContent>
                                  </GlassSelect>
                                )}
                                {config.type === "user_list" && (
                                  <GlassInput
                                    placeholder="IDs separados por vírgula"
                                    value={(req.value || []).join(", ")}
                                    onChange={(event) =>
                                      updateGiveaway(selectedId, (current) => ({
                                        ...current,
                                        requirements: {
                                          ...(current.requirements || {}),
                                          [key]: {
                                            ...req,
                                            value: event.target.value
                                              .split(",")
                                              .map((item) => item.trim())
                                              .filter(Boolean),
                                          },
                                        },
                                      }))
                                    }
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Cargos permitidos</p>
                        <GlassSelect
                          value={ROLE_NONE}
                          onValueChange={(value) => {
                            if (value === ROLE_NONE) return;
                            updateGiveaway(selectedId, (current) => ({
                              ...current,
                              allowed_roles: Array.from(new Set([...(current.allowed_roles || []), value])),
                            }));
                          }}
                        >
                          <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                            <GlassSelectValue placeholder="Adicionar cargo" />
                          </GlassSelectTrigger>
                          <GlassSelectContent>
                            <GlassSelectItem value={ROLE_NONE}>Selecione um cargo</GlassSelectItem>
                            {roles.map((role) => (
                              <GlassSelectItem key={role.id} value={role.id}>
                                {role.name}
                              </GlassSelectItem>
                            ))}
                          </GlassSelectContent>
                        </GlassSelect>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {toIdList(selectedGiveaway.allowed_roles).map((roleId) => (
                            <button
                              key={roleId}
                              type="button"
                              className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sm"
                              onClick={() =>
                                updateGiveaway(selectedId, (current) => ({
                                  ...current,
                                  allowed_roles: toIdList(current.allowed_roles).filter((id) => id !== roleId),
                                }))
                              }
                            >
                              {roleName(roleId)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Cargos proibidos</p>
                        <GlassSelect
                          value={ROLE_NONE}
                          onValueChange={(value) => {
                            if (value === ROLE_NONE) return;
                            updateGiveaway(selectedId, (current) => ({
                              ...current,
                              forbidden_roles: Array.from(new Set([...(current.forbidden_roles || []), value])),
                            }));
                          }}
                        >
                          <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                            <GlassSelectValue placeholder="Adicionar cargo" />
                          </GlassSelectTrigger>
                          <GlassSelectContent>
                            <GlassSelectItem value={ROLE_NONE}>Selecione um cargo</GlassSelectItem>
                            {roles.map((role) => (
                              <GlassSelectItem key={role.id} value={role.id}>
                                {role.name}
                              </GlassSelectItem>
                            ))}
                          </GlassSelectContent>
                        </GlassSelect>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {toIdList(selectedGiveaway.forbidden_roles).map((roleId) => (
                            <button
                              key={roleId}
                              type="button"
                              className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sm"
                              onClick={() =>
                                updateGiveaway(selectedId, (current) => ({
                                  ...current,
                                  forbidden_roles: toIdList(current.forbidden_roles).filter((id) => id !== roleId),
                                }))
                              }
                            >
                              {roleName(roleId)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Premiação</p>
                        <SettingsRow
                          label="Tipo de premiação"
                          description="Nenhuma, conteúdo na DM"
                          control={
                            <GlassSelect
                              value={selectedGiveaway.prize?.type || "none"}
                              onValueChange={(value) =>
                                updateGiveaway(selectedId, (current) => ({
                                  ...current,
                                  prize: { ...current.prize, type: value },
                                }))
                              }
                            >
                              <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                                <GlassSelectValue />
                              </GlassSelectTrigger>
                              <GlassSelectContent>
                                <GlassSelectItem value="none">Nada será entregue</GlassSelectItem>
                                <GlassSelectItem value="content">Conteúdo na DM</GlassSelectItem>
                                <GlassSelectItem value="product">Produto da Loja</GlassSelectItem>
                              </GlassSelectContent>
                            </GlassSelect>
                          }
                        />
                        {selectedGiveaway.prize?.type === "none" && (
                          <SettingsRow
                            label="Avisar vencedor na DM"
                            description="Enviar aviso ao vencedor"
                            control={
                              <Switch
                                checked={!!selectedGiveaway.prize?.dm_notify}
                                onCheckedChange={(checked) =>
                                  updateGiveaway(selectedId, (current) => ({
                                    ...current,
                                    prize: { ...current.prize, dm_notify: checked },
                                  }))
                                }
                              />
                            }
                          />
                        )}
                        {selectedGiveaway.prize?.type === "content" && (
                          <GlassInput
                            placeholder="Conteúdo da DM"
                            value={selectedGiveaway.prize?.content || ""}
                            onChange={(event) =>
                              updateGiveaway(selectedId, (current) => ({
                                ...current,
                                prize: { ...current.prize, content: event.target.value },
                              }))
                            }
                          />
                        )}
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Vencedores</p>
                        <GlassInput
                          placeholder="IDs de usuários separados por vírgula"
                          value={toIdList(selectedGiveaway.winner_users).join(", ")}
                          onChange={(event) =>
                            updateGiveaway(selectedId, (current) => ({
                              ...current,
                              winner_users: event.target.value
                                .split(",")
                                .map((item) => item.trim())
                                .filter(Boolean),
                            }))
                          }
                        />
                        <GlassSelect
                          value={ROLE_NONE}
                          onValueChange={(value) => {
                            if (value === ROLE_NONE) return;
                            updateGiveaway(selectedId, (current) => ({
                              ...current,
                              winner_roles: Array.from(new Set([...(current.winner_roles || []), value])),
                            }));
                          }}
                        >
                          <GlassSelectTrigger className="mt-2 px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                            <GlassSelectValue placeholder="Adicionar cargo vencedor" />
                          </GlassSelectTrigger>
                          <GlassSelectContent>
                            <GlassSelectItem value={ROLE_NONE}>Selecione um cargo</GlassSelectItem>
                            {roles.map((role) => (
                              <GlassSelectItem key={role.id} value={role.id}>
                                {role.name}
                              </GlassSelectItem>
                            ))}
                          </GlassSelectContent>
                        </GlassSelect>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {toIdList(selectedGiveaway.winner_roles).map((roleId) => (
                            <button
                              key={roleId}
                              type="button"
                              className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sm"
                              onClick={() =>
                                updateGiveaway(selectedId, (current) => ({
                                  ...current,
                                  winner_roles: toIdList(current.winner_roles).filter((id) => id !== roleId),
                                }))
                              }
                            >
                              {roleName(roleId)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : (
              <div className="flex items-center justify-center py-16 animate-fade-up">
                <div className="text-center">
                  <Gift className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="text-sm text-muted-foreground">Selecione um sorteio para configurar</p>
                </div>
              </div>
            )}
          </div>
        )}
      </GlassCard>

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Novo Sorteio">
        <div className="space-y-4 animate-fade-up">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Nome do sorteio</label>
            <GlassInput
              placeholder="Digite o nome do sorteio"
              value={createDraft.name}
              onChange={(event) => setCreateDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tipo de sorteio</label>
            <GlassSelect
              value={createDraft.mode}
              onValueChange={(value) => setCreateDraft((prev) => ({ ...prev, mode: value as "real" | "falso" }))}
            >
              <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
                <GlassSelectValue />
              </GlassSelectTrigger>
              <GlassSelectContent>
                <GlassSelectItem value="real">Sorteio Real</GlassSelectItem>
                <GlassSelectItem value="falso">Sorteio Falso</GlassSelectItem>
              </GlassSelectContent>
            </GlassSelect>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <GlassButton variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </GlassButton>
            <GlassButton variant="primary" onClick={handleCreate}>
              <Gift className="w-4 h-4 mr-2" />
              Criar sorteio
            </GlassButton>
          </div>
        </div>
      </Modal>
    </div>
  );
}
