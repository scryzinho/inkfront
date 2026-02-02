import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Send,
  X,
  Save,
  MessageSquare,
  Settings,
  Eye,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { Switch } from "@/components/ui/switch";
import { GlassInput } from "@/components/ui/GlassInput";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/format";
import {
  fetchTicketsConfig,
  updateTicketsConfig,
  fetchTicketsData,
  sendTicketsPanel,
  fetchTicketChannels,
  fetchTicketRoles,
  type TicketsConfig,
  type TicketChannel,
  type TicketRole,
  uploadTicketImage,
  type TicketImageTarget,
} from "@/lib/api/tickets";
import { useTenant } from "@/lib/tenant";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

const MEMBER_BUTTONS = [
  { key: "close", label: "Fechar Ticket" },
  { key: "notify", label: "Notificar Atendente" },
  { key: "add_user", label: "Adicionar Usuário" },
  { key: "remove_user", label: "Remover Usuário" },
  { key: "transfer", label: "Transferir" },
  { key: "request_call", label: "Solicitar Call" },
  { key: "transcript", label: "Transcript" },
];

const TEAM_BUTTONS = [
  { key: "close", label: "Fechar Ticket" },
  { key: "assume", label: "Assumir Ticket" },
  { key: "notify", label: "Notificar Usuário" },
  { key: "rename", label: "Renomear Ticket" },
  { key: "priority", label: "Definir Prioridade" },
  { key: "resolved", label: "Resolvido" },
  { key: "archive", label: "Arquivar Ticket" },
  { key: "add_user", label: "Adicionar Usuário" },
  { key: "remove_user", label: "Remover Usuário" },
  { key: "transcript", label: "Transcript" },
  { key: "history", label: "Histórico" },
  { key: "manage_call", label: "Gerenciar Call" },
  { key: "transfer", label: "Transferir" },
];

const DEFAULT_MESSAGES = {
  close_message: "Seu ticket `{channel_name}` foi fechado por {autor_mention}.",
  close_message_reason:
    "Seu ticket `{channel_name}` foi fechado por {autor_mention}.\n**Motivo:** {reason}",
  notify_message_staff_to_user:
    "Olá {user_mention}, você está sendo notificado sobre o seu ticket `{channel_name}`. A equipe de suporte está aguardando sua resposta.",
  notify_message_user_to_staff:
    "{user_mention} está solicitando sua atenção no ticket `{channel_name}`.",
  add_user_message: "{alvo_mention} foi adicionado a este ticket por {autor_mention}.",
  add_user_dm_message:
    "Olá {alvo_mention}, você foi adicionado ao ticket `{channel_name}` por {autor_mention}.",
  remove_user_message:
    "{alvo_mention} foi removido deste ticket por {autor_mention}.",
  remove_user_dm_message:
    "Olá {alvo_mention}, você foi removido do ticket `{channel_name}` por {autor_mention}.",
  assume_message: "{autor_mention} assumiu o atendimento deste ticket.",
  assume_dm_message:
    "Olá {user_mention}, o atendente {autor_mention} assumiu seu ticket `{channel_name}`.",
  transfer_message: "O ticket foi transferido por {autor_mention}.",
  create_call_message: "Uma call de voz foi iniciada para este ticket por {autor_mention}.",
  create_call_dm_message: "Olá! Uma call de voz foi criada para o seu ticket `{channel_name}`.",
  request_call_message: "O usuário {autor_mention} solicitou a criação de uma call.",
  transcript_message: "Aqui está o transcript do seu ticket `{channel_name}`.",
};

const DEFAULT_PANEL = (name = "Novo Painel") => ({
  name,
  enabled: false,
  mode: "channel",
  message_style: "embed",
  channel_id: "",
  category_id: "",
  message_id: null,
  has_pending_changes: false,
  button: { label: "Abrir Ticket", emoji: "📩", style: "green" },
  embed: {
    title: "SEJA BEM VINDO(A) AO SUPORTE 👋",
    description:
      "Clique no botão abaixo para abrir um ticket e ser atendido por nossa equipe.",
    color: "#5865F2",
    image_url: "",
    thumbnail_url: "",
  },
  content: {
    content:
      "# SEJA BEM VINDO(A) AO SUPORTE 👋\n\nClique no botão abaixo para abrir um ticket e ser atendido por nossa equipe.",
    image_url: "",
  },
  container: {
    content:
      "# SEJA BEM VINDO(A) AO SUPORTE 👋\n\nClique no botão abaixo para abrir um ticket e ser atendido por nossa equipe.",
    color: "#5865F2",
    image_url: "",
    thumbnail_url: "",
  },
  options: [],
  forms: {},
  roles: {},
  messages: { ...DEFAULT_MESSAGES },
  preferences: {
    transcripts: { send_on_close: false },
    member_setup: { disabled_buttons: [] },
    team_setup: { disabled_buttons: [] },
    auto_close: {
      inactive: { enabled: false, minutes: 0, warn_message: "", close_message: "" },
      user_left: { enabled: false },
      at_time: { enabled: false, time: "", close_message: "" },
    },
    require_reason: { enabled: false },
    send_close_message: { enabled: true },
  },
  office_hours: { start_time: "", end_time: "" },
  ai_enabled: false,
  ai_prompt: "",
  ai_use_context: false,
});

const DEFAULT_OPTION = (name = "Nova opção") => ({
  id: "",
  name,
  description: "",
  emoji: "",
  roles: { mention: [], allowed: [], forbidden: [] },
  open_message: {
    style: "embed",
    embed: { title: "Seu ticket foi aberto!", description: "Aguarde um momento...", color: "#5865F2", image_url: "", thumbnail_url: "" },
    content: { content: "Seu ticket foi aberto!", image_url: "" },
    container: { content: "Seu ticket foi aberto!", color: "#5865F2", image_url: "", thumbnail_url: "" },
  },
  preferences: {},
});

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
}

function clone<T>(value: T): T {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value)) as T;
}

function normalizePanel(panel: any) {
  const base = DEFAULT_PANEL(panel?.name || "Painel");
  const normalized = { ...base, ...(panel || {}) };
  normalized.button = { ...base.button, ...(panel?.button || {}) };
  normalized.embed = { ...base.embed, ...(panel?.embed || {}) };
  normalized.content = { ...base.content, ...(panel?.content || {}) };
  normalized.container = { ...base.container, ...(panel?.container || {}) };
  normalized.messages = { ...base.messages, ...(panel?.messages || {}) };
  normalized.preferences = { ...base.preferences, ...(panel?.preferences || {}) };
  normalized.preferences.transcripts = {
    ...base.preferences.transcripts,
    ...(panel?.preferences?.transcripts || {}),
  };
  normalized.preferences.member_setup = {
    ...base.preferences.member_setup,
    ...(panel?.preferences?.member_setup || {}),
  };
  normalized.preferences.team_setup = {
    ...base.preferences.team_setup,
    ...(panel?.preferences?.team_setup || {}),
  };
  normalized.preferences.auto_close = {
    ...base.preferences.auto_close,
    ...(panel?.preferences?.auto_close || {}),
  };
  normalized.preferences.auto_close.inactive = {
    ...base.preferences.auto_close.inactive,
    ...(panel?.preferences?.auto_close?.inactive || {}),
  };
  normalized.preferences.auto_close.user_left = {
    ...base.preferences.auto_close.user_left,
    ...(panel?.preferences?.auto_close?.user_left || {}),
  };
  normalized.preferences.auto_close.at_time = {
    ...base.preferences.auto_close.at_time,
    ...(panel?.preferences?.auto_close?.at_time || {}),
  };
  normalized.preferences.require_reason = {
    ...base.preferences.require_reason,
    ...(panel?.preferences?.require_reason || {}),
  };
  normalized.preferences.send_close_message = {
    ...base.preferences.send_close_message,
    ...(panel?.preferences?.send_close_message || {}),
  };
  normalized.office_hours = { ...base.office_hours, ...(panel?.office_hours || {}) };
  normalized.options = Array.isArray(panel?.options) ? panel.options.map((opt: any) => ({ ...DEFAULT_OPTION(opt?.name), ...opt })) : [];
  normalized.forms = panel?.forms || {};
  return normalized;
}

export default function TicketsPage() {
  const [config, setConfig] = useState<TicketsConfig>({ panels: {} });
  const [ticketsData, setTicketsData] = useState<any>({});
  const [channels, setChannels] = useState<TicketChannel[]>([]);
  const [roles, setRoles] = useState<TicketRole[]>([]);
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null);
  const [editorTab, setEditorTab] = useState("general");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPanelName, setNewPanelName] = useState("");
  const [optionEditId, setOptionEditId] = useState<string | null>(null);
  const [openMessageOptionId, setOpenMessageOptionId] = useState<string | null>(null);
  const [formsOptionId, setFormsOptionId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [uploadContext, setUploadContext] = useState<{
    target: TicketImageTarget;
    setter: (url: string) => void;
    label: string;
    optionId?: string;
  } | null>(null);
  const [uploadingTarget, setUploadingTarget] = useState<TicketImageTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { tenantId } = useTenant();

  const panels = useMemo(() => {
    const entries = Object.entries(config.panels || {});
    return entries.map(([id, panel]) => ({ id, ...normalizePanel(panel) }));
  }, [config]);

  const selectedPanel = useMemo(() => {
    if (!selectedPanelId) return null;
    const panel = config.panels?.[selectedPanelId];
    if (!panel) return null;
    return { id: selectedPanelId, ...normalizePanel(panel) };
  }, [config, selectedPanelId]);

  const startImageUpload = (
    target: TicketImageTarget,
    setter: (url: string) => void,
    label: string,
    optionId?: string
  ) => {
    setUploadContext({ target, setter, label, optionId });
    fileInputRef.current?.click();
  };

  const handleFileInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !uploadContext) return;
    try {
      setUploadingTarget(uploadContext.target);
      const payload = await uploadTicketImage(
        uploadContext.target,
        file,
        selectedPanel?.id || undefined,
        uploadContext.optionId
      );
      uploadContext.setter(payload.url);
    } catch (err) {
      console.error(err);
    } finally {
      setUploadingTarget(null);
      setUploadContext(null);
      event.target.value = "";
    }
  };

  const makePanelImageSetter = (
    section: "embed" | "content" | "container",
    field: "image_url" | "thumbnail_url"
  ) => {
    return (url: string) => {
      if (!selectedPanel) return;
      updatePanel(selectedPanel.id, (panel: any) => ({
        ...panel,
        [section]: { ...(panel[section] || {}), [field]: url },
      }));
    };
  };

  const openTickets = useMemo(() => {
    const tickets: any[] = [];
    const panelsData = ticketsData?.panels || {};
    Object.entries(panelsData).forEach(([panelId, users]: any) => {
      Object.entries(users || {}).forEach(([userId, userTickets]: any) => {
        (userTickets || []).forEach((ticket: any) => {
          tickets.push({
            panelId,
            userId,
            ticketId: ticket.ticket_id,
            status: ticket.status || "open",
            createdAt: ticket.created_at ? new Date(ticket.created_at * 1000).toISOString() : null,
          });
        });
      });
    });
    return tickets.filter((t) => t.status === "open" || t.status === "waiting");
  }, [ticketsData]);

  useEffect(() => {
    if (!tenantId) return;
    let active = true;
    const load = async () => {
      try {
        setLoading(true);
        const [cfg, data, ch, rl] = await Promise.all([
          fetchTicketsConfig(),
          fetchTicketsData(),
          fetchTicketChannels(true),
          fetchTicketRoles(),
        ]);
        if (!active) return;
        setConfig({ panels: cfg.panels || {} });
        setTicketsData(data || {});
        setChannels(ch || []);
        setRoles(rl || []);
        const firstPanelId = Object.keys(cfg.panels || {})[0] || null;
        setSelectedPanelId((prev) => prev || firstPanelId);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [tenantId]);

  useEffect(() => {
    setOptionEditId(null);
    setOpenMessageOptionId(null);
    setFormsOptionId(null);
  }, [selectedPanelId]);

  const handleRefresh = async () => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const [cfg, data, ch, rl] = await Promise.all([
        fetchTicketsConfig(),
        fetchTicketsData(),
        fetchTicketChannels(true),
        fetchTicketRoles(),
      ]);
      setConfig({ panels: cfg.panels || {} });
      setTicketsData(data || {});
      setChannels(ch || []);
      setRoles(rl || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updatePanel = (panelId: string, updater: (panel: any) => any) => {
    setConfig((prev) => {
      const next = clone(prev);
      next.panels = next.panels || {};
      const current = normalizePanel(next.panels[panelId] || DEFAULT_PANEL());
      const updated = updater(current);
      next.panels[panelId] = { ...updated, has_pending_changes: true };
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await updateTicketsConfig(config);
      setDirty(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCreatePanel = () => {
    const name = newPanelName.trim();
    if (!name) return;
    const id = makeId();
    setConfig((prev) => {
      const next = clone(prev);
      next.panels = next.panels || {};
      next.panels[id] = DEFAULT_PANEL(name);
      return next;
    });
    setDirty(true);
    setSelectedPanelId(id);
    setShowCreateDialog(false);
    setNewPanelName("");
  };

  const handleDeletePanel = (panelId: string) => {
    setConfig((prev) => {
      const next = clone(prev);
      next.panels = next.panels || {};
      delete next.panels[panelId];
      return next;
    });
    setDirty(true);
    if (selectedPanelId === panelId) {
      const remaining = Object.keys(config.panels || {}).filter((id) => id !== panelId);
      setSelectedPanelId(remaining[0] || null);
    }
  };

  const handleSendPanel = async (panelId: string) => {
    try {
      await sendTicketsPanel(panelId);
      await handleRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const roleOptions = roles || [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground text-sm mt-1">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gerencie painéis, configurações e atendimentos de tickets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <GlassButton size="sm" variant="ghost" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
            Atualizar
          </GlassButton>
          <GlassButton size="sm" variant="primary" onClick={handleSave} disabled={saving || !dirty}>
            <Save className="w-4 h-4" />
            {saving ? "Salvando" : "Salvar"}
          </GlassButton>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Painéis"
              actions={
                <GlassButton size="sm" onClick={() => setShowCreateDialog(true)}>
                  <Plus className="w-4 h-4" />
                </GlassButton>
              }
            />

            <div className="space-y-2">
              {panels.length === 0 && (
                <div className="text-sm text-muted-foreground">Nenhum painel criado ainda.</div>
              )}
              {panels.map((panel) => (
                <motion.button
                  key={panel.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedPanelId(panel.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl text-left transition-colors",
                    selectedPanelId === panel.id
                      ? "bg-white/10 border border-white/10"
                      : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <Ticket className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{panel.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {(openTickets.filter((t) => t.panelId === panel.id) || []).length} tickets
                      </p>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      panel.enabled ? "bg-success" : "bg-muted"
                    )}
                  />
                </motion.button>
              ))}
            </div>

            <div className="mt-6 pt-6 border-t border-white/5">
              <h4 className="text-sm font-medium mb-3">Tickets Abertos</h4>
              <div className="space-y-2">
                {openTickets.length === 0 && (
                  <div className="text-xs text-muted-foreground">Nenhum ticket aberto.</div>
                )}
                {openTickets.slice(0, 8).map((ticket) => (
                  <div
                    key={`${ticket.ticketId}-${ticket.userId}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-sm">{ticket.userId}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {ticket.createdAt ? formatDateTime(ticket.createdAt) : "-"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedPanel ? (
              <motion.div
                key={selectedPanel.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <GlassCard className="p-5" hover={false}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <Ticket className="w-5 h-5" />
                      <h3 className="font-semibold">{selectedPanel.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <GlassButton size="sm" variant="ghost" onClick={() => handleSendPanel(selectedPanel.id)}>
                        <Send className="w-4 h-4" />
                        Publicar
                      </GlassButton>
                      <GlassButton size="sm" variant="ghost" onClick={() => handleDeletePanel(selectedPanel.id)}>
                        <Trash2 className="w-4 h-4" />
                        Excluir
                      </GlassButton>
                    </div>
                  </div>

                  <Tabs value={editorTab} onValueChange={setEditorTab}>
                    <TabsList className="bg-white/[0.03] border border-white/5 p-1 rounded-xl mb-6 flex flex-wrap">
                      <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-white/10">
                        Geral
                      </TabsTrigger>
                      <TabsTrigger value="options" className="rounded-lg data-[state=active]:bg-white/10">
                        Opcoes
                      </TabsTrigger>
                      <TabsTrigger value="forms" className="rounded-lg data-[state=active]:bg-white/10">
                        Formularios
                      </TabsTrigger>
                      <TabsTrigger value="messages" className="rounded-lg data-[state=active]:bg-white/10">
                        Mensagens
                      </TabsTrigger>
                      <TabsTrigger value="preferences" className="rounded-lg data-[state=active]:bg-white/10">
                        Preferencias
                      </TabsTrigger>
                      <TabsTrigger value="ai" className="rounded-lg data-[state=active]:bg-white/10">
                        IA
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="general" className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <GlassInput
                          label="Nome do painel"
                          value={selectedPanel.name}
                          onChange={(e) =>
                            updatePanel(selectedPanel.id, (panel: any) => ({
                              ...panel,
                              name: e.target.value,
                            }))
                          }
                        />
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Status</label>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={selectedPanel.enabled}
                              onCheckedChange={(value) =>
                                updatePanel(selectedPanel.id, (panel: any) => ({
                                  ...panel,
                                  enabled: value,
                                }))
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {selectedPanel.enabled ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Modo</label>
                          <select
                            className="glass-input"
                            value={selectedPanel.mode}
                            onChange={(e) =>
                              updatePanel(selectedPanel.id, (panel: any) => ({
                                ...panel,
                                mode: e.target.value,
                              }))
                            }
                          >
                            <option value="channel">Canal</option>
                            <option value="topic">Topico</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Canal</label>
                          <select
                            className="glass-input"
                            value={selectedPanel.channel_id || ""}
                            onChange={(e) =>
                              updatePanel(selectedPanel.id, (panel: any) => ({
                                ...panel,
                                channel_id: e.target.value,
                              }))
                            }
                          >
                            <option value="">Selecione um canal</option>
                            {channels
                              .filter((ch) => ch.type === 0 || ch.type === 5)
                              .map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                  #{ch.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      </div>

                      {selectedPanel.mode === "channel" && (
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Categoria</label>
                            <select
                              className="glass-input"
                              value={selectedPanel.category_id || ""}
                              onChange={(e) =>
                                updatePanel(selectedPanel.id, (panel: any) => ({
                                  ...panel,
                                  category_id: e.target.value,
                                }))
                              }
                            >
                              <option value="">Selecione uma categoria</option>
                              {channels
                                .filter((ch) => ch.type === 4)
                                .map((ch) => (
                                  <option key={ch.id} value={ch.id}>
                                    {ch.name}
                                  </option>
                                ))}
                            </select>
                          </div>
                        </div>
                      )}

                      <div className="grid sm:grid-cols-2 gap-4">
                        <GlassInput
                          label="Horario de atendimento (inicio)"
                          placeholder="Ex: 09:00"
                          value={selectedPanel.office_hours?.start_time || ""}
                          onChange={(e) =>
                            updatePanel(selectedPanel.id, (panel: any) => ({
                              ...panel,
                              office_hours: {
                                ...(panel.office_hours || {}),
                                start_time: e.target.value,
                              },
                            }))
                          }
                        />
                        <GlassInput
                          label="Horario de atendimento (fim)"
                          placeholder="Ex: 18:00"
                          value={selectedPanel.office_hours?.end_time || ""}
                          onChange={(e) =>
                            updatePanel(selectedPanel.id, (panel: any) => ({
                              ...panel,
                              office_hours: {
                                ...(panel.office_hours || {}),
                                end_time: e.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="options" className="space-y-6">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Opcoes que aparecem no painel de tickets
                        </p>
                        <GlassButton
                          size="sm"
                          onClick={() => {
                            const id = makeId();
                            updatePanel(selectedPanel.id, (panel: any) => {
                              const next = clone(panel);
                              const option = DEFAULT_OPTION("Nova opcao");
                              option.id = id;
                              next.options = [...(next.options || []), option];
                              return next;
                            });
                            setOptionEditId(id);
                          }}
                        >
                          <Plus className="w-4 h-4" />
                          Nova opcao
                        </GlassButton>
                      </div>

                      <div className="space-y-3">
                        {selectedPanel.options.length === 0 && (
                          <div className="text-sm text-muted-foreground">Nenhuma opcao criada.</div>
                        )}
                        {selectedPanel.options.map((option: any) => (
                          <div
                            key={option.id}
                            className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{option.emoji || "🎫"}</span>
                              <div>
                                <p className="font-medium">{option.name}</p>
                                <p className="text-xs text-muted-foreground">{option.description}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                className="p-2 rounded-lg hover:bg-white/5"
                                onClick={() => setOptionEditId(option.id)}
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                className="p-2 rounded-lg hover:bg-white/5 text-destructive"
                                onClick={() =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    options: panel.options.filter((opt: any) => opt.id !== option.id),
                                  }))
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {optionEditId && (
                        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-semibold">Editar opcao</h4>
                            <button onClick={() => setOptionEditId(null)} className="text-muted-foreground">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          {(() => {
                            const option = selectedPanel.options.find((opt: any) => opt.id === optionEditId);
                            if (!option) return null;
                            return (
                              <div className="grid sm:grid-cols-2 gap-4">
                                <GlassInput
                                  label="Nome"
                                  value={option.name}
                                  onChange={(e) =>
                                    updatePanel(selectedPanel.id, (panel: any) => ({
                                      ...panel,
                                      options: panel.options.map((opt: any) =>
                                        opt.id === option.id ? { ...opt, name: e.target.value } : opt
                                      ),
                                    }))
                                  }
                                />
                                <GlassInput
                                  label="Emoji"
                                  value={option.emoji || ""}
                                  onChange={(e) =>
                                    updatePanel(selectedPanel.id, (panel: any) => ({
                                      ...panel,
                                      options: panel.options.map((opt: any) =>
                                        opt.id === option.id ? { ...opt, emoji: e.target.value } : opt
                                      ),
                                    }))
                                  }
                                />
                                <div className="sm:col-span-2">
                                  <label className="text-sm font-medium">Descricao</label>
                                  <textarea
                                    className="glass-input h-24"
                                    value={option.description}
                                    onChange={(e) =>
                                      updatePanel(selectedPanel.id, (panel: any) => ({
                                        ...panel,
                                        options: panel.options.map((opt: any) =>
                                          opt.id === option.id ? { ...opt, description: e.target.value } : opt
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                            );
                          })()}
                          <div className="grid md:grid-cols-3 gap-4">
                            {[
                              { key: "mention", label: "Cargos de atendentes" },
                              { key: "allowed", label: "Cargos permitidos" },
                              { key: "forbidden", label: "Cargos proibidos" },
                            ].map((block) => {
                              const option = selectedPanel.options.find((opt: any) => opt.id === optionEditId);
                              if (!option) return null;
                              const current = option.roles?.[block.key] || [];
                              return (
                                <div key={block.key} className="space-y-2">
                                  <p className="text-sm font-medium">{block.label}</p>
                                  <div className="max-h-40 overflow-y-auto space-y-2 rounded-lg border border-white/10 p-2">
                                    {roleOptions.map((role) => (
                                      <label key={role.id} className="flex items-center gap-2 text-xs">
                                        <input
                                          type="checkbox"
                                          checked={current.includes(role.id)}
                                          onChange={() =>
                                            updatePanel(selectedPanel.id, (panel: any) => ({
                                              ...panel,
                                              options: panel.options.map((opt: any) => {
                                                if (opt.id !== option.id) return opt;
                                                const roles = { ...(opt.roles || { mention: [], allowed: [], forbidden: [] }) };
                                                const list = new Set(roles[block.key] || []);
                                                if (list.has(role.id)) {
                                                  list.delete(role.id);
                                                } else {
                                                  list.add(role.id);
                                                }
                                                roles[block.key] = Array.from(list);
                                                return { ...opt, roles };
                                              }),
                                            }))
                                          }
                                        />
                                        {role.name}
                                      </label>
                                    ))}
                                    {roleOptions.length === 0 && (
                                      <div className="text-xs text-muted-foreground">Nenhum cargo encontrado.</div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="forms" className="space-y-6">
                      <p className="text-sm text-muted-foreground">
                        Formularios por opcao (maximo 5 perguntas por opcao).
                      </p>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Opcao</label>
                        <select
                          className="glass-input"
                          value={formsOptionId || ""}
                          onChange={(e) => setFormsOptionId(e.target.value)}
                        >
                          <option value="">Selecione uma opcao</option>
                          {selectedPanel.options.map((opt: any) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {formsOptionId && (
                        <div className="space-y-4">
                          {(() => {
                            const questions = selectedPanel.forms?.[formsOptionId] || [];
                            return (
                              <>
                                <div className="flex items-center justify-between">
                                  <span className="text-sm">Perguntas ({questions.length}/5)</span>
                                  <GlassButton
                                    size="sm"
                                    onClick={() => {
                                      updatePanel(selectedPanel.id, (panel: any) => {
                                        const next = clone(panel);
                                        const list = next.forms?.[formsOptionId] || [];
                                        if (list.length >= 5) return next;
                                        list.push({
                                          id: makeId(),
                                          label: "Nova pergunta",
                                          placeholder: "",
                                          style: "short",
                                          required: false,
                                        });
                                        next.forms = { ...next.forms, [formsOptionId]: list };
                                        return next;
                                      });
                                    }}
                                  >
                                    <Plus className="w-4 h-4" />
                                    Adicionar
                                  </GlassButton>
                                </div>
                                <div className="space-y-3">
                                  {questions.map((q: any) => (
                                    <div key={q.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                                      <div className="flex items-center justify-between">
                                        <span className="text-sm font-semibold">{q.label}</span>
                                        <button
                                          className="text-destructive"
                                          onClick={() =>
                                            updatePanel(selectedPanel.id, (panel: any) => {
                                              const next = clone(panel);
                                              const list = (next.forms?.[formsOptionId] || []).filter((item: any) => item.id !== q.id);
                                              next.forms = { ...next.forms, [formsOptionId]: list };
                                              return next;
                                            })
                                          }
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                      <div className="grid sm:grid-cols-2 gap-4">
                                        <GlassInput
                                          label="Titulo"
                                          value={q.label}
                                          onChange={(e) =>
                                            updatePanel(selectedPanel.id, (panel: any) => {
                                              const next = clone(panel);
                                              const list = next.forms?.[formsOptionId] || [];
                                              next.forms = {
                                                ...next.forms,
                                                [formsOptionId]: list.map((item: any) =>
                                                  item.id === q.id ? { ...item, label: e.target.value } : item
                                                ),
                                              };
                                              return next;
                                            })
                                          }
                                        />
                                        <GlassInput
                                          label="Placeholder"
                                          value={q.placeholder || ""}
                                          onChange={(e) =>
                                            updatePanel(selectedPanel.id, (panel: any) => {
                                              const next = clone(panel);
                                              const list = next.forms?.[formsOptionId] || [];
                                              next.forms = {
                                                ...next.forms,
                                                [formsOptionId]: list.map((item: any) =>
                                                  item.id === q.id ? { ...item, placeholder: e.target.value } : item
                                                ),
                                              };
                                              return next;
                                            })
                                          }
                                        />
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium">Estilo</label>
                                          <select
                                            className="glass-input"
                                            value={q.style || "short"}
                                            onChange={(e) =>
                                              updatePanel(selectedPanel.id, (panel: any) => {
                                                const next = clone(panel);
                                                const list = next.forms?.[formsOptionId] || [];
                                                next.forms = {
                                                  ...next.forms,
                                                  [formsOptionId]: list.map((item: any) =>
                                                    item.id === q.id ? { ...item, style: e.target.value } : item
                                                  ),
                                                };
                                                return next;
                                              })
                                            }
                                          >
                                            <option value="short">Short</option>
                                            <option value="paragraph">Paragraph</option>
                                          </select>
                                        </div>
                                        <div className="space-y-2">
                                          <label className="text-sm font-medium">Obrigatoria</label>
                                          <div className="flex items-center gap-3">
                                            <Switch
                                              checked={Boolean(q.required)}
                                              onCheckedChange={(value) =>
                                                updatePanel(selectedPanel.id, (panel: any) => {
                                                  const next = clone(panel);
                                                  const list = next.forms?.[formsOptionId] || [];
                                                  next.forms = {
                                                    ...next.forms,
                                                    [formsOptionId]: list.map((item: any) =>
                                                      item.id === q.id ? { ...item, required: value } : item
                                                    ),
                                                  };
                                                  return next;
                                                })
                                              }
                                            />
                                            <span className="text-sm text-muted-foreground">{q.required ? "Sim" : "Nao"}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                  {questions.length === 0 && (
                                    <div className="text-sm text-muted-foreground">Nenhuma pergunta criada.</div>
                                  )}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="messages" className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Mensagem do painel
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Estilo</label>
                            <select
                              className="glass-input"
                              value={selectedPanel.message_style}
                              onChange={(e) =>
                                updatePanel(selectedPanel.id, (panel: any) => ({
                                  ...panel,
                                  message_style: e.target.value,
                                }))
                              }
                            >
                              <option value="embed">Embed</option>
                              <option value="content">Texto</option>
                              <option value="container">Container V2</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Botao</label>
                            <div className="grid grid-cols-3 gap-2">
                              <input
                                className="glass-input"
                                placeholder="Label"
                                value={selectedPanel.button?.label || ""}
                                onChange={(e) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    button: { ...panel.button, label: e.target.value },
                                  }))
                                }
                              />
                              <input
                                className="glass-input"
                                placeholder="Emoji"
                                value={selectedPanel.button?.emoji || ""}
                                onChange={(e) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    button: { ...panel.button, emoji: e.target.value },
                                  }))
                                }
                              />
                              <select
                                className="glass-input"
                                value={selectedPanel.button?.style || "green"}
                                onChange={(e) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    button: { ...panel.button, style: e.target.value },
                                  }))
                                }
                              >
                                <option value="green">Verde</option>
                                <option value="grey">Cinza</option>
                                <option value="blue">Azul</option>
                                <option value="red">Vermelho</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        {selectedPanel.message_style === "embed" && (
                          <div className="grid sm:grid-cols-2 gap-4">
                            <GlassInput
                              label="Titulo"
                              value={selectedPanel.embed?.title || ""}
                              onChange={(e) =>
                                updatePanel(selectedPanel.id, (panel: any) => ({
                                  ...panel,
                                  embed: { ...panel.embed, title: e.target.value },
                                }))
                              }
                            />
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Cor</label>
                              <ColorPicker
                                value={selectedPanel.embed?.color || "#5865F2"}
                                onChange={(value) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    embed: { ...panel.embed, color: value },
                                  }))
                                }
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-sm font-medium">Descricao</label>
                              <textarea
                                className="glass-input h-24"
                                value={selectedPanel.embed?.description || ""}
                                onChange={(e) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    embed: { ...panel.embed, description: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <GlassInput
                                label="Imagem"
                                value={selectedPanel.embed?.image_url || ""}
                                onChange={(e) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    embed: { ...panel.embed, image_url: e.target.value },
                                  }))
                                }
                              />
                              <div className="flex items-center gap-2">
                                <GlassButton
                                  size="sm"
                                  variant="ghost"
                                  disabled={uploadingTarget !== null && uploadingTarget !== "embed_image"}
                                  onClick={() =>
                                    startImageUpload(
                                      "embed_image",
                                      makePanelImageSetter("embed", "image_url"),
                                      "Upload de imagem do embed"
                                    )
                                  }
                                >
                                  {uploadingTarget === "embed_image" ? "Enviando..." : "Upload"}
                                </GlassButton>
                                <GlassButton
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    updatePanel(selectedPanel.id, (panel: any) => ({
                                      ...panel,
                                      embed: { ...panel.embed, image_url: "" },
                                    }))
                                  }
                                >
                                  Limpar
                                </GlassButton>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <GlassInput
                                label="Thumbnail"
                                value={selectedPanel.embed?.thumbnail_url || ""}
                                onChange={(e) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    embed: { ...panel.embed, thumbnail_url: e.target.value },
                                  }))
                                }
                              />
                              <div className="flex items-center gap-2">
                                <GlassButton
                                  size="sm"
                                  variant="ghost"
                                  disabled={uploadingTarget !== null && uploadingTarget !== "embed_thumb"}
                                  onClick={() =>
                                    startImageUpload(
                                      "embed_thumb",
                                      makePanelImageSetter("embed", "thumbnail_url"),
                                      "Upload de thumbnail do embed"
                                    )
                                  }
                                >
                                  {uploadingTarget === "embed_thumb" ? "Enviando..." : "Upload"}
                                </GlassButton>
                                <GlassButton
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    updatePanel(selectedPanel.id, (panel: any) => ({
                                      ...panel,
                                      embed: { ...panel.embed, thumbnail_url: "" },
                                    }))
                                  }
                                >
                                  Limpar
                                </GlassButton>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedPanel.message_style === "content" && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Conteudo</label>
                              <textarea
                                className="glass-input h-24"
                                value={selectedPanel.content?.content || ""}
                                onChange={(e) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    content: { ...panel.content, content: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <GlassInput
                                label="Imagem"
                                value={selectedPanel.content?.image_url || ""}
                                onChange={(e) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    content: { ...panel.content, image_url: e.target.value },
                                  }))
                                }
                              />
                              <div className="flex items-center gap-2">
                                <GlassButton
                                  size="sm"
                                  variant="ghost"
                                  disabled={uploadingTarget !== null && uploadingTarget !== "content_image"}
                                  onClick={() =>
                                    startImageUpload(
                                      "content_image",
                                      makePanelImageSetter("content", "image_url"),
                                      "Upload de imagem do texto"
                                    )
                                  }
                                >
                                  {uploadingTarget === "content_image" ? "Enviando..." : "Upload"}
                                </GlassButton>
                                <GlassButton
                                  size="sm"
                                  variant="ghost"
                                  onClick={() =>
                                    updatePanel(selectedPanel.id, (panel: any) => ({
                                      ...panel,
                                      content: { ...panel.content, image_url: "" },
                                    }))
                                  }
                                >
                                  Limpar
                                </GlassButton>
                              </div>
                            </div>
                          </div>
                        )}

                        {selectedPanel.message_style === "container" && (
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Conteudo</label>
                              <textarea
                                className="glass-input h-24"
                                value={selectedPanel.container?.content || ""}
                                onChange={(e) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    container: { ...panel.container, content: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Cor</label>
                                <ColorPicker
                                  value={selectedPanel.container?.color || "#5865F2"}
                                  onChange={(value) =>
                                    updatePanel(selectedPanel.id, (panel: any) => ({
                                      ...panel,
                                      container: { ...panel.container, color: value },
                                    }))
                                  }
                                />
                              </div>
                              <div className="space-y-2">
                                <GlassInput
                                  label="Imagem"
                                  value={selectedPanel.container?.image_url || ""}
                                  onChange={(e) =>
                                    updatePanel(selectedPanel.id, (panel: any) => ({
                                      ...panel,
                                      container: { ...panel.container, image_url: e.target.value },
                                    }))
                                  }
                                />
                                <div className="flex items-center gap-2">
                                  <GlassButton
                                    size="sm"
                                    variant="ghost"
                                    disabled={uploadingTarget !== null && uploadingTarget !== "container_image"}
                                    onClick={() =>
                                      startImageUpload(
                                        "container_image",
                                        makePanelImageSetter("container", "image_url"),
                                        "Upload container"
                                      )
                                    }
                                  >
                                    {uploadingTarget === "container_image" ? "Enviando..." : "Upload"}
                                  </GlassButton>
                                  <GlassButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      updatePanel(selectedPanel.id, (panel: any) => ({
                                        ...panel,
                                        container: { ...panel.container, image_url: "" },
                                      }))
                                    }
                                  >
                                    Limpar
                                  </GlassButton>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <GlassInput
                                  label="Thumbnail"
                                  value={selectedPanel.container?.thumbnail_url || ""}
                                  onChange={(e) =>
                                    updatePanel(selectedPanel.id, (panel: any) => ({
                                      ...panel,
                                      container: { ...panel.container, thumbnail_url: e.target.value },
                                    }))
                                  }
                                />
                                <div className="flex items-center gap-2">
                                  <GlassButton
                                    size="sm"
                                    variant="ghost"
                                    disabled={uploadingTarget !== null && uploadingTarget !== "container_thumb"}
                                    onClick={() =>
                                      startImageUpload(
                                        "container_thumb",
                                        makePanelImageSetter("container", "thumbnail_url"),
                                        "Upload thumbnail container"
                                      )
                                    }
                                  >
                                    {uploadingTarget === "container_thumb" ? "Enviando..." : "Upload"}
                                  </GlassButton>
                                  <GlassButton
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      updatePanel(selectedPanel.id, (panel: any) => ({
                                        ...panel,
                                        container: { ...panel.container, thumbnail_url: "" },
                                      }))
                                    }
                                  >
                                    Limpar
                                  </GlassButton>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          Mensagem de abertura (por opcao)
                        </h4>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Opcao</label>
                          <select
                            className="glass-input"
                            value={openMessageOptionId || ""}
                            onChange={(e) => setOpenMessageOptionId(e.target.value)}
                          >
                            <option value="">Selecione uma opcao</option>
                            {selectedPanel.options.map((opt: any) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        {openMessageOptionId && (() => {
                          const option = selectedPanel.options.find((opt: any) => opt.id === openMessageOptionId);
                          if (!option) return null;
                          const openMessage = option.open_message || DEFAULT_OPTION().open_message;
                          return (
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Estilo</label>
                                <select
                                  className="glass-input"
                                  value={openMessage.style || "embed"}
                                  onChange={(e) =>
                                    updatePanel(selectedPanel.id, (panel: any) => ({
                                      ...panel,
                                      options: panel.options.map((opt: any) =>
                                        opt.id === option.id
                                          ? { ...opt, open_message: { ...openMessage, style: e.target.value } }
                                          : opt
                                      ),
                                    }))
                                  }
                                >
                                  <option value="embed">Embed</option>
                                  <option value="content">Texto</option>
                                  <option value="container">Container V2</option>
                                </select>
                              </div>
                              {openMessage.style === "embed" && (
                                <div className="grid sm:grid-cols-2 gap-4">
                                  <GlassInput
                                    label="Titulo"
                                    value={openMessage.embed?.title || ""}
                                    onChange={(e) =>
                                      updatePanel(selectedPanel.id, (panel: any) => ({
                                        ...panel,
                                        options: panel.options.map((opt: any) =>
                                          opt.id === option.id
                                            ? {
                                                ...opt,
                                                open_message: {
                                                  ...openMessage,
                                                  embed: { ...openMessage.embed, title: e.target.value },
                                                },
                                              }
                                            : opt
                                        ),
                                      }))
                                    }
                                  />
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Cor</label>
                                    <ColorPicker
                                      value={openMessage.embed?.color || "#5865F2"}
                                      onChange={(value) =>
                                        updatePanel(selectedPanel.id, (panel: any) => ({
                                          ...panel,
                                          options: panel.options.map((opt: any) =>
                                            opt.id === option.id
                                              ? {
                                                  ...opt,
                                                  open_message: {
                                                    ...openMessage,
                                                    embed: { ...openMessage.embed, color: value },
                                                  },
                                                }
                                              : opt
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="text-sm font-medium">Descricao</label>
                                    <textarea
                                      className="glass-input h-24"
                                      value={openMessage.embed?.description || ""}
                                      onChange={(e) =>
                                        updatePanel(selectedPanel.id, (panel: any) => ({
                                          ...panel,
                                          options: panel.options.map((opt: any) =>
                                            opt.id === option.id
                                              ? {
                                                  ...opt,
                                                  open_message: {
                                                    ...openMessage,
                                                    embed: { ...openMessage.embed, description: e.target.value },
                                                  },
                                                }
                                              : opt
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <GlassInput
                                    label="Imagem"
                                    value={openMessage.embed?.image_url || ""}
                                    onChange={(e) =>
                                      updatePanel(selectedPanel.id, (panel: any) => ({
                                        ...panel,
                                        options: panel.options.map((opt: any) =>
                                          opt.id === option.id
                                            ? {
                                                ...opt,
                                                open_message: {
                                                  ...openMessage,
                                                  embed: { ...openMessage.embed, image_url: e.target.value },
                                                },
                                              }
                                            : opt
                                        ),
                                      }))
                                    }
                                  />
                                  <GlassInput
                                    label="Thumbnail"
                                    value={openMessage.embed?.thumbnail_url || ""}
                                    onChange={(e) =>
                                      updatePanel(selectedPanel.id, (panel: any) => ({
                                        ...panel,
                                        options: panel.options.map((opt: any) =>
                                          opt.id === option.id
                                            ? {
                                                ...opt,
                                                open_message: {
                                                  ...openMessage,
                                                  embed: { ...openMessage.embed, thumbnail_url: e.target.value },
                                                },
                                              }
                                            : opt
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                              )}
                              {openMessage.style === "content" && (
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Conteudo</label>
                                    <textarea
                                      className="glass-input h-24"
                                      value={openMessage.content?.content || ""}
                                      onChange={(e) =>
                                        updatePanel(selectedPanel.id, (panel: any) => ({
                                          ...panel,
                                          options: panel.options.map((opt: any) =>
                                            opt.id === option.id
                                              ? {
                                                  ...opt,
                                                  open_message: {
                                                    ...openMessage,
                                                    content: { ...openMessage.content, content: e.target.value },
                                                  },
                                                }
                                              : opt
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <GlassInput
                                    label="Imagem"
                                    value={openMessage.content?.image_url || ""}
                                    onChange={(e) =>
                                      updatePanel(selectedPanel.id, (panel: any) => ({
                                        ...panel,
                                        options: panel.options.map((opt: any) =>
                                          opt.id === option.id
                                            ? {
                                                ...opt,
                                                open_message: {
                                                  ...openMessage,
                                                  content: { ...openMessage.content, image_url: e.target.value },
                                                },
                                              }
                                            : opt
                                        ),
                                      }))
                                    }
                                  />
                                </div>
                              )}
                              {openMessage.style === "container" && (
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Conteudo</label>
                                    <textarea
                                      className="glass-input h-24"
                                      value={openMessage.container?.content || ""}
                                      onChange={(e) =>
                                        updatePanel(selectedPanel.id, (panel: any) => ({
                                          ...panel,
                                          options: panel.options.map((opt: any) =>
                                            opt.id === option.id
                                              ? {
                                                  ...opt,
                                                  open_message: {
                                                    ...openMessage,
                                                    container: { ...openMessage.container, content: e.target.value },
                                                  },
                                                }
                                              : opt
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                  <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <label className="text-sm font-medium">Cor</label>
                                      <ColorPicker
                                        value={openMessage.container?.color || "#5865F2"}
                                        onChange={(value) =>
                                          updatePanel(selectedPanel.id, (panel: any) => ({
                                            ...panel,
                                            options: panel.options.map((opt: any) =>
                                              opt.id === option.id
                                                ? {
                                                    ...opt,
                                                    open_message: {
                                                      ...openMessage,
                                                      container: { ...openMessage.container, color: value },
                                                    },
                                                  }
                                                : opt
                                            ),
                                          }))
                                        }
                                      />
                                    </div>
                                    <GlassInput
                                      label="Imagem"
                                      value={openMessage.container?.image_url || ""}
                                      onChange={(e) =>
                                        updatePanel(selectedPanel.id, (panel: any) => ({
                                          ...panel,
                                          options: panel.options.map((opt: any) =>
                                            opt.id === option.id
                                              ? {
                                                  ...opt,
                                                  open_message: {
                                                    ...openMessage,
                                                    container: { ...openMessage.container, image_url: e.target.value },
                                                  },
                                                }
                                              : opt
                                          ),
                                        }))
                                      }
                                    />
                                    <GlassInput
                                      label="Thumbnail"
                                      value={openMessage.container?.thumbnail_url || ""}
                                      onChange={(e) =>
                                        updatePanel(selectedPanel.id, (panel: any) => ({
                                          ...panel,
                                          options: panel.options.map((opt: any) =>
                                            opt.id === option.id
                                              ? {
                                                  ...opt,
                                                  open_message: {
                                                    ...openMessage,
                                                    container: { ...openMessage.container, thumbnail_url: e.target.value },
                                                  },
                                                }
                                              : opt
                                          ),
                                        }))
                                      }
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </TabsContent>

                    <TabsContent value="preferences" className="space-y-6">
                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold flex items-center gap-2">
                          <Settings className="w-4 h-4" />
                          Preferencias gerais
                        </h4>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Transcripts no fechamento</label>
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={Boolean(selectedPanel.preferences?.transcripts?.send_on_close)}
                                onCheckedChange={(value) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    preferences: {
                                      ...panel.preferences,
                                      transcripts: { ...panel.preferences.transcripts, send_on_close: value },
                                    },
                                  }))
                                }
                              />
                              <span className="text-sm text-muted-foreground">
                                {selectedPanel.preferences?.transcripts?.send_on_close ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Exigir motivo ao fechar</label>
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={Boolean(selectedPanel.preferences?.require_reason?.enabled)}
                                onCheckedChange={(value) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    preferences: {
                                      ...panel.preferences,
                                      require_reason: { enabled: value },
                                    },
                                  }))
                                }
                              />
                              <span className="text-sm text-muted-foreground">
                                {selectedPanel.preferences?.require_reason?.enabled ? "Sim" : "Nao"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Enviar DM ao fechar</label>
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={Boolean(selectedPanel.preferences?.send_close_message?.enabled)}
                                onCheckedChange={(value) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    preferences: {
                                      ...panel.preferences,
                                      send_close_message: { enabled: value },
                                    },
                                  }))
                                }
                              />
                              <span className="text-sm text-muted-foreground">
                                {selectedPanel.preferences?.send_close_message?.enabled ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Fechamento automatico</h4>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Inatividade (minutos)</label>
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={Boolean(selectedPanel.preferences?.auto_close?.inactive?.enabled)}
                                onCheckedChange={(value) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    preferences: {
                                      ...panel.preferences,
                                      auto_close: {
                                        ...panel.preferences.auto_close,
                                        inactive: {
                                          ...panel.preferences.auto_close.inactive,
                                          enabled: value,
                                        },
                                      },
                                    },
                                  }))
                                }
                              />
                              <input
                                className="glass-input w-24"
                                type="number"
                                value={selectedPanel.preferences?.auto_close?.inactive?.minutes || 0}
                                onChange={(e) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    preferences: {
                                      ...panel.preferences,
                                      auto_close: {
                                        ...panel.preferences.auto_close,
                                        inactive: {
                                          ...panel.preferences.auto_close.inactive,
                                          minutes: Number(e.target.value || 0),
                                        },
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Aviso de inatividade</label>
                            <textarea
                              className="glass-input h-20"
                              value={selectedPanel.preferences?.auto_close?.inactive?.warn_message || ""}
                              onChange={(e) =>
                                updatePanel(selectedPanel.id, (panel: any) => ({
                                  ...panel,
                                  preferences: {
                                    ...panel.preferences,
                                    auto_close: {
                                      ...panel.preferences.auto_close,
                                      inactive: {
                                        ...panel.preferences.auto_close.inactive,
                                        warn_message: e.target.value,
                                      },
                                    },
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Mensagem de fechamento (inatividade)</label>
                            <textarea
                              className="glass-input h-20"
                              value={selectedPanel.preferences?.auto_close?.inactive?.close_message || ""}
                              onChange={(e) =>
                                updatePanel(selectedPanel.id, (panel: any) => ({
                                  ...panel,
                                  preferences: {
                                    ...panel.preferences,
                                    auto_close: {
                                      ...panel.preferences.auto_close,
                                      inactive: {
                                        ...panel.preferences.auto_close.inactive,
                                        close_message: e.target.value,
                                      },
                                    },
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Fechar quando usuario sair</label>
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={Boolean(selectedPanel.preferences?.auto_close?.user_left?.enabled)}
                                onCheckedChange={(value) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    preferences: {
                                      ...panel.preferences,
                                      auto_close: {
                                        ...panel.preferences.auto_close,
                                        user_left: { enabled: value },
                                      },
                                    },
                                  }))
                                }
                              />
                              <span className="text-sm text-muted-foreground">
                                {selectedPanel.preferences?.auto_close?.user_left?.enabled ? "Ativo" : "Inativo"}
                              </span>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Horario especifico (HH:MM)</label>
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={Boolean(selectedPanel.preferences?.auto_close?.at_time?.enabled)}
                                onCheckedChange={(value) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    preferences: {
                                      ...panel.preferences,
                                      auto_close: {
                                        ...panel.preferences.auto_close,
                                        at_time: {
                                          ...panel.preferences.auto_close.at_time,
                                          enabled: value,
                                        },
                                      },
                                    },
                                  }))
                                }
                              />
                              <input
                                className="glass-input w-24"
                                value={selectedPanel.preferences?.auto_close?.at_time?.time || ""}
                                onChange={(e) =>
                                  updatePanel(selectedPanel.id, (panel: any) => ({
                                    ...panel,
                                    preferences: {
                                      ...panel.preferences,
                                      auto_close: {
                                        ...panel.preferences.auto_close,
                                        at_time: {
                                          ...panel.preferences.auto_close.at_time,
                                          time: e.target.value,
                                        },
                                      },
                                    },
                                  }))
                                }
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Mensagem de fechamento (horario)</label>
                            <textarea
                              className="glass-input h-20"
                              value={selectedPanel.preferences?.auto_close?.at_time?.close_message || ""}
                              onChange={(e) =>
                                updatePanel(selectedPanel.id, (panel: any) => ({
                                  ...panel,
                                  preferences: {
                                    ...panel.preferences,
                                    auto_close: {
                                      ...panel.preferences.auto_close,
                                      at_time: {
                                        ...panel.preferences.auto_close.at_time,
                                        close_message: e.target.value,
                                      },
                                    },
                                  },
                                }))
                              }
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Setup do membro</h4>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {MEMBER_BUTTONS.map((btn) => {
                            const disabled = selectedPanel.preferences?.member_setup?.disabled_buttons?.includes(btn.key);
                            return (
                              <label key={btn.key} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={!disabled}
                                  onChange={() =>
                                    updatePanel(selectedPanel.id, (panel: any) => {
                                      const next = clone(panel);
                                      const list = new Set(next.preferences?.member_setup?.disabled_buttons || []);
                                      if (list.has(btn.key)) list.delete(btn.key);
                                      else list.add(btn.key);
                                      next.preferences.member_setup.disabled_buttons = Array.from(list);
                                      return next;
                                    })
                                  }
                                />
                                {btn.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <h4 className="text-sm font-semibold">Setup do atendente</h4>
                        <div className="grid sm:grid-cols-2 gap-2">
                          {TEAM_BUTTONS.map((btn) => {
                            const disabled = selectedPanel.preferences?.team_setup?.disabled_buttons?.includes(btn.key);
                            return (
                              <label key={btn.key} className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  checked={!disabled}
                                  onChange={() =>
                                    updatePanel(selectedPanel.id, (panel: any) => {
                                      const next = clone(panel);
                                      const list = new Set(next.preferences?.team_setup?.disabled_buttons || []);
                                      if (list.has(btn.key)) list.delete(btn.key);
                                      else list.add(btn.key);
                                      next.preferences.team_setup.disabled_buttons = Array.from(list);
                                      return next;
                                    })
                                  }
                                />
                                {btn.label}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="ai" className="space-y-6">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Ativar inK AI</label>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={Boolean(selectedPanel.ai_enabled)}
                              onCheckedChange={(value) =>
                                updatePanel(selectedPanel.id, (panel: any) => ({
                                  ...panel,
                                  ai_enabled: value,
                                }))
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {selectedPanel.ai_enabled ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Usar contexto</label>
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={Boolean(selectedPanel.ai_use_context)}
                              onCheckedChange={(value) =>
                                updatePanel(selectedPanel.id, (panel: any) => ({
                                  ...panel,
                                  ai_use_context: value,
                                }))
                              }
                            />
                            <span className="text-sm text-muted-foreground">
                              {selectedPanel.ai_use_context ? "Ativo" : "Inativo"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Instrucoes adicionais</label>
                        <textarea
                          className="glass-input h-40"
                          value={selectedPanel.ai_prompt || ""}
                          onChange={(e) =>
                            updatePanel(selectedPanel.id, (panel: any) => ({
                              ...panel,
                              ai_prompt: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </GlassCard>
              </motion.div>
            ) : (
              <GlassCard className="p-6" hover={false}>
                <div className="text-sm text-muted-foreground">Selecione ou crie um painel.</div>
              </GlassCard>
            )}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Criar painel de tickets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <GlassInput
              label="Nome do painel"
              value={newPanelName}
              onChange={(e) => setNewPanelName(e.target.value)}
              placeholder="Ex: Suporte Geral"
            />
          </div>
          <DialogFooter className="mt-6">
            <GlassButton variant="ghost" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </GlassButton>
            <GlassButton variant="primary" onClick={handleCreatePanel}>
              Criar
            </GlassButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileInputChange}
      />
    </div>
  );
}
