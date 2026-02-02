import { useEffect, useMemo, useState } from "react";
import {
  Key,
  MessageSquare,
  ListTodo,
  Settings,
  RefreshCw,
  Plus,
  Shield,
  Zap,
  Link2,
  Send,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import {
  GlassSelect,
  GlassSelectContent,
  GlassSelectItem,
  GlassSelectTrigger,
  GlassSelectValue,
} from "@/components/ui/GlassSelect";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { SettingsRow } from "@/components/dashboard/SettingsRow";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  fetchCloudConfig,
  sendCloudMessage,
  updateCloudConfig,
  updateCloudTasks,
} from "@/lib/api/cloud";
import { fetchStoreChannels, type StoreChannel } from "@/lib/api/store";
import { useTenant } from "@/lib/tenant";

const MESSAGE_STYLES = [
  { value: "embed", label: "Embed" },
  { value: "content", label: "Texto simples" },
  { value: "container", label: "Container" },
];

const TASK_STATUSES = [
  { value: "pending", label: "Pendente" },
  { value: "running", label: "Executando" },
  { value: "finished", label: "Finalizado" },
  { value: "error", label: "Erro" },
];

const TASK_TYPES = [
  { value: "recover_members", label: "Recuperar membros" },
  { value: "verify_members", label: "Verificar membros" },
  { value: "send_dms", label: "Enviar DMs" },
  { value: "list_members", label: "Listar membros" },
  { value: "backup", label: "Backup" },
];

const PREFERENCE_OPTIONS = [
  {
    key: "remove_autorole",
    label: "Remover autorole",
    description: "Remove o cargo de autorole após o membro ser verificado",
  },
  {
    key: "sync_oauth2",
    label: "Sincronizar OAuth2",
    description: "Envia os dados do membro verificado para o seu painel OAuth2",
  },
  {
    key: "require_oauth2",
    label: "Requerer OAuth2",
    description: "Exige verificação OAuth2 para liberar o acesso ao servidor",
  },
  {
    key: "persistent_oauth2",
    label: "Verificação persistente",
    description: "Mantém o membro verificado mesmo se ele sair e voltar",
  },
  {
    key: "auto_join_oauth2",
    label: "Auto Join",
    description: "Adiciona o membro automaticamente após concluir o OAuth2",
  },
  {
    key: "block_vpn",
    label: "Bloquear VPN",
    description: "Bloqueia verificações originadas de VPN ou proxy",
  },
  {
    key: "block_mobile",
    label: "Bloquear mobile",
    description: "Bloqueia verificações realizadas por redes móveis (3G/4G/5G)",
  },
  {
    key: "block_no_verified_email",
    label: "Bloquear sem e-mail verificado",
    description: "Impede a verificação de contas sem e-mail confirmado",
  },
  {
    key: "block_no_email",
    label: "Bloquear sem e-mail",
    description: "Impede a verificação de contas sem e-mail vinculado",
  },
  {
    key: "block_spam",
    label: "Bloquear spam",
    description: "Utiliza sistemas de detecção para bloquear contas suspeitas",
  },
];

const buildDefaultMessage = () => ({
  message_style: "embed",
  button: { label: "Verificar", emoji: "", style: "green" },
  embed: { title: "", description: "", image_url: "", thumbnail_url: "", color: "#5865F2" },
  content: { content: "", image_url: "" },
  container: { content: "", image_url: "", thumbnail_url: "", color: "#5865F2" },
});

const buildDefaultDefinitions = () =>
  PREFERENCE_OPTIONS.reduce((acc, option) => {
    acc[option.key] = false;
    return acc;
  }, {} as Record<string, boolean>);

const NONE_CHANNEL_VALUE = "__none__";

const buildDefaultConfig = () => ({
  client_id: "",
  client_secret: "",
  token: "",
  log_channel_id: null,
  message_verify: buildDefaultMessage(),
  definitions: buildDefaultDefinitions(),
  monitor_enabled: false,
});

const deepMerge = (base: any, override: any): any => {
  if (override === undefined || override === null) return base;
  const result = Array.isArray(base) ? [...base] : { ...base };
  Object.entries(override).forEach(([key, value]) => {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      base &&
      typeof base === "object" &&
      key in base
    ) {
      result[key] = deepMerge(base[key], value);
    } else {
      result[key] = value;
    }
  });
  return result;
};

const mergeCloudConfig = (incoming: Record<string, any> | undefined) => {
  if (!incoming || typeof incoming !== "object") {
    return buildDefaultConfig();
  }
  return deepMerge(buildDefaultConfig(), incoming);
};

const generateTaskId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 10);
};

const resolveChannelValue = (value: string | number | null | undefined) =>
  value === undefined || value === null ? NONE_CHANNEL_VALUE : String(value);

export default function CloudPage() {
  const [config, setConfig] = useState<Record<string, any>>(buildDefaultConfig());
  const [tasks, setTasks] = useState<any[]>([]);
  const [channels, setChannels] = useState<StoreChannel[]>([]);
  const [activeTab, setActiveTab] = useState<"settings" | "messages" | "tasks" | "preferences">("settings");
  const [loading, setLoading] = useState(true);
  const [savingConfig, setSavingConfig] = useState(false);
  const [savingTasks, setSavingTasks] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [messageChannelId, setMessageChannelId] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [messageAlert, setMessageAlert] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { tenantId } = useTenant();

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCloudConfig();
      setConfig(mergeCloudConfig(data.config));
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch (err) {
      setError("Não foi possível carregar as configurações da nuvem.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, [tenantId]);

  useEffect(() => {
    let mounted = true;
    fetchStoreChannels(true, true)
      .then((data) => {
        if (mounted) setChannels(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (mounted) setChannels([]);
      });
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  const textChannels = useMemo(
    () => channels.filter((channel) => channel.type === 0 || channel.type === 5),
    [channels]
  );

  const isConfigured = Boolean(config.client_id);

  const taskStats = useMemo(() => {
    const running = tasks.filter((task) => task.status === "running").length;
    const finished = tasks.filter((task) => task.status === "finished").length;
    const pending = tasks.filter((task) => task.status === "pending").length;
    const errored = tasks.filter((task) => task.status === "error").length;
    return { running, finished, pending, errored, total: tasks.length };
  }, [tasks]);

  const logChannel = channels.find((channel) => String(channel.id) === String(config.log_channel_id));

  const updateConfig = (partial: Record<string, any>) => {
    setConfig((prev) => deepMerge(prev, partial));
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    setError(null);
    try {
      const saved = await updateCloudConfig(config);
      setConfig(mergeCloudConfig(saved));
    } catch (err) {
      setError("Não foi possível salvar as configurações da nuvem.");
    } finally {
      setSavingConfig(false);
    }
  };

  const handleSaveTasks = async () => {
    setSavingTasks(true);
    setError(null);
    try {
      const saved = await updateCloudTasks(tasks);
      if (Array.isArray(saved)) {
        setTasks(saved);
      }
    } catch (err) {
      setError("Não foi possível salvar as tarefas do cloud.");
    } finally {
      setSavingTasks(false);
    }
  };

  const handleSendVerificationMessage = async () => {
    if (!messageChannelId) {
      setMessageAlert({
        type: "error",
        text: "Selecione um canal antes de enviar a mensagem de verificação.",
      });
      return;
    }
    setSendingMessage(true);
    setMessageAlert(null);
    try {
      await sendCloudMessage({ channel_id: messageChannelId });
      setMessageAlert({
        type: "success",
        text: "Mensagem de verificação enviada com sucesso.",
      });
    } catch (err) {
      const text =
        err instanceof Error ? err.message : "Não foi possível enviar a mensagem de verificação.";
      setMessageAlert({ type: "error", text });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAddTask = () => {
    setTasks((prev) => [
      ...prev,
      {
        id: generateTaskId(),
        name: "Nova tarefa",
        type: "recover_members",
        status: "pending",
        channel_id: null,
        min_participants: 0,
        max_participants: 0,
        max_winners: 1,
        start_time: null,
        end_time: null,
      },
    ]);
  };

  const currentMessage = config.message_verify || buildDefaultMessage();
  const currentDefinitions = config.definitions || buildDefaultDefinitions();

  const handleRefresh = () => {
    loadConfig();
  };

  const logChannelLabel = logChannel ? `#${logChannel.name}` : "Nenhum canal definido";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">inkCloud</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gerencie credenciais, mensagens, tarefas e preferências do painel do bot.
        </p>
      </div>

      {error && (
        <GlassCard className="p-4 bg-red-500/10 border-red-500/40 text-sm text-destructive">
          {error}
        </GlassCard>
      )}

      <GlassCard className="p-5" hover={false}>
        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Status da integração</p>
            <p className="text-lg font-semibold">{isConfigured ? "Configurado" : "Não configurado"}</p>
            <p className="text-xs text-muted-foreground mt-1">Canal de logs: {logChannelLabel}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-muted-foreground">Tarefas</p>
              <p className="text-sm font-semibold">{taskStats.total}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-muted-foreground">Em andamento</p>
              <p className="text-sm font-semibold">{taskStats.running}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-muted-foreground">Finalizadas</p>
              <p className="text-sm font-semibold">{taskStats.finished}</p>
            </div>
            <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-muted-foreground">Estilo da mensagem</p>
              <p className="text-sm font-semibold capitalize">{currentMessage.message_style}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <GlassButton variant="ghost" onClick={handleRefresh} disabled={loading}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </GlassButton>
            <GlassButton variant="primary" onClick={handleSaveConfig} loading={savingConfig}>
              <Link2 className="w-4 h-4" />
              Salvar configurações
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/[0.03] border border-white/5 p-1 rounded-xl flex-wrap">
          <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-white/10">
            <Key className="w-4 h-4 mr-2" />
            Credenciais
          </TabsTrigger>
          <TabsTrigger value="messages" className="rounded-lg data-[state=active]:bg-white/10">
            <MessageSquare className="w-4 h-4 mr-2" />
            Mensagens
          </TabsTrigger>
          <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-white/10">
            <ListTodo className="w-4 h-4 mr-2" />
            Tarefas
          </TabsTrigger>
          <TabsTrigger value="preferences" className="rounded-lg data-[state=active]:bg-white/10">
            <Settings className="w-4 h-4 mr-2" />
            Preferências
          </TabsTrigger>
        </TabsList>

        <TabsContent value="settings">
          <GlassCard className="p-5" hover={false}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando dados...</p>
            ) : (
              <div className="space-y-5">
                <SettingsRow
                  label="Client ID"
                  description="Identificador do bot conectado ao inkCloud"
                  control={
                    <GlassInput
                      value={config.client_id || ""}
                      onChange={(event) => updateConfig({ client_id: event.target.value })}
                      className="min-w-[280px]"
                    />
                  }
                />
                <SettingsRow
                  label="Client Secret"
                  description="Secret responsável pela verificação com o WebSocket"
                  control={
                    <GlassInput
                      type="password"
                      value={config.client_secret || ""}
                      onChange={(event) => updateConfig({ client_secret: event.target.value })}
                    />
                  }
                />
                <SettingsRow
                  label="Token do bot"
                  description="Token utilizado pela conexão com o inkCloud"
                  control={
                    <GlassInput
                      type="password"
                      value={config.token || ""}
                      onChange={(event) => updateConfig({ token: event.target.value })}
                    />
                  }
                />
                <SettingsRow
                  label="Canal de logs"
                  description="Canal onde o inkCloud enviará as notificações"
                  control={
                    <GlassSelect
                      value={resolveChannelValue(config.log_channel_id)}
                      onValueChange={(value) =>
                        updateConfig({
                          log_channel_id: value === NONE_CHANNEL_VALUE ? null : value,
                        })
                      }
                    >
                      <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10">
                        <GlassSelectValue placeholder="Selecione um canal" />
                      </GlassSelectTrigger>
                      <GlassSelectContent>
                        <GlassSelectItem value={NONE_CHANNEL_VALUE}>Nenhum canal</GlassSelectItem>
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
                  label="Monitor de sorteios"
                  description="Habilita as tarefas automáticas do inkCloud"
                  control={
                    <Switch
                      checked={!!config.monitor_enabled}
                      onCheckedChange={(checked) => updateConfig({ monitor_enabled: checked })}
                    />
                  }
                />
              </div>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="messages">
          <GlassCard className="p-5" hover={false}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando dados...</p>
            ) : (
              <div className="space-y-5">
                <SettingsRow
                  label="Estilo da mensagem"
                  description="Escolha como o bot exibirá o botão de verificação"
                  control={
                    <GlassSelect
                      value={currentMessage.message_style || "embed"}
                      onValueChange={(value) =>
                        updateConfig({
                          message_verify: { ...currentMessage, message_style: value },
                        })
                      }
                    >
                      <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10">
                        <GlassSelectValue />
                      </GlassSelectTrigger>
                      <GlassSelectContent>
                        {MESSAGE_STYLES.map((style) => (
                          <GlassSelectItem key={style.value} value={style.value}>
                            {style.label}
                          </GlassSelectItem>
                        ))}
                      </GlassSelectContent>
                    </GlassSelect>
                  }
                />

                <div className="grid gap-4 md:grid-cols-3">
                  <GlassInput
                    label="Texto do botão"
                    value={currentMessage.button?.label || ""}
                    onChange={(event) =>
                      updateConfig({
                        message_verify: {
                          ...currentMessage,
                          button: { ...currentMessage.button, label: event.target.value },
                        },
                      })
                    }
                  />
                  <GlassInput
                    label="Emoji"
                    value={currentMessage.button?.emoji || ""}
                    onChange={(event) =>
                      updateConfig({
                        message_verify: {
                          ...currentMessage,
                          button: { ...currentMessage.button, emoji: event.target.value },
                        },
                      })
                    }
                  />
                  <GlassInput
                    label="Estilo"
                    value={currentMessage.button?.style || "green"}
                    onChange={(event) =>
                      updateConfig({
                        message_verify: {
                          ...currentMessage,
                          button: { ...currentMessage.button, style: event.target.value },
                        },
                      })
                    }
                  />
                </div>

                {currentMessage.message_style === "embed" && (
                  <div className="space-y-3">
                    <GlassInput
                      label="Título"
                      value={currentMessage.embed?.title || ""}
                      onChange={(event) =>
                        updateConfig({
                          message_verify: {
                            ...currentMessage,
                            embed: { ...currentMessage.embed, title: event.target.value },
                          },
                        })
                      }
                    />
                    <Textarea
                      className="w-full"
                      placeholder="Descrição"
                      value={currentMessage.embed?.description || ""}
                      onChange={(event) =>
                        updateConfig({
                          message_verify: {
                            ...currentMessage,
                            embed: { ...currentMessage.embed, description: event.target.value },
                          },
                        })
                      }
                    />
                    <GlassInput
                      label="Imagem/Banner"
                      value={currentMessage.embed?.image_url || ""}
                      onChange={(event) =>
                        updateConfig({
                          message_verify: {
                            ...currentMessage,
                            embed: { ...currentMessage.embed, image_url: event.target.value },
                          },
                        })
                      }
                    />
                    <GlassInput
                      label="Thumbnail"
                      value={currentMessage.embed?.thumbnail_url || ""}
                      onChange={(event) =>
                        updateConfig({
                          message_verify: {
                            ...currentMessage,
                            embed: { ...currentMessage.embed, thumbnail_url: event.target.value },
                          },
                        })
                      }
                    />
                    <GlassInput
                      label="Cor (hex)"
                      value={currentMessage.embed?.color || ""}
                      onChange={(event) =>
                        updateConfig({
                          message_verify: {
                            ...currentMessage,
                            embed: { ...currentMessage.embed, color: event.target.value },
                          },
                        })
                      }
                    />
                  </div>
                )}

                {currentMessage.message_style === "content" && (
                  <div className="space-y-3">
                    <Textarea
                      className="w-full"
                      placeholder="Conteúdo da mensagem"
                      value={currentMessage.content?.content || ""}
                      onChange={(event) =>
                        updateConfig({
                          message_verify: {
                            ...currentMessage,
                            content: { ...currentMessage.content, content: event.target.value },
                          },
                        })
                      }
                    />
                    <GlassInput
                      label="Imagem" 
                      value={currentMessage.content?.image_url || ""}
                      onChange={(event) =>
                        updateConfig({
                          message_verify: {
                            ...currentMessage,
                            content: { ...currentMessage.content, image_url: event.target.value },
                          },
                        })
                      }
                    />
                  </div>
                )}

                {currentMessage.message_style === "container" && (
                  <div className="space-y-3">
                    <Textarea
                      className="w-full"
                      placeholder="Conteúdo do container"
                      value={currentMessage.container?.content || ""}
                      onChange={(event) =>
                        updateConfig({
                          message_verify: {
                            ...currentMessage,
                            container: { ...currentMessage.container, content: event.target.value },
                          },
                        })
                      }
                    />
                    <GlassInput
                      label="Imagem"
                      value={currentMessage.container?.image_url || ""}
                      onChange={(event) =>
                        updateConfig({
                          message_verify: {
                            ...currentMessage,
                            container: { ...currentMessage.container, image_url: event.target.value },
                          },
                        })
                      }
                    />
                    <GlassInput
                      label="Thumbnail"
                      value={currentMessage.container?.thumbnail_url || ""}
                      onChange={(event) =>
                        updateConfig({
                          message_verify: {
                            ...currentMessage,
                            container: { ...currentMessage.container, thumbnail_url: event.target.value },
                          },
                        })
                      }
                    />
                    <GlassInput
                      label="Cor (hex)"
                      value={currentMessage.container?.color || ""}
                      onChange={(event) =>
                        updateConfig({
                          message_verify: {
                            ...currentMessage,
                            container: { ...currentMessage.container, color: event.target.value },
                          },
                        })
                      }
                      />
                    </div>
                  )}

                <div className="space-y-4 pt-4 border-t border-white/5">
                  {messageAlert && (
                    <GlassCard
                      className={cn(
                        "p-3 text-sm",
                        messageAlert.type === "success"
                          ? "bg-emerald-500/10 border-emerald-500/40 text-emerald-200"
                          : "bg-red-500/10 border-red-500/40 text-destructive"
                      )}
                      hover={false}
                    >
                      {messageAlert.text}
                    </GlassCard>
                  )}
                  <SettingsRow
                    label="Canal de envio"
                    description="Selecione o canal de texto onde o inkCloud deve publicar a mensagem de verificação."
                    control={
                      <GlassSelect
                        value={resolveChannelValue(messageChannelId)}
                        onValueChange={(value) =>
                          setMessageChannelId(value === NONE_CHANNEL_VALUE ? null : value)
                        }
                      >
                        <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10">
                          <GlassSelectValue placeholder="Selecione um canal" />
                        </GlassSelectTrigger>
                        <GlassSelectContent>
                          <GlassSelectItem value={NONE_CHANNEL_VALUE}>Nenhum canal</GlassSelectItem>
                          {textChannels.map((channel) => (
                            <GlassSelectItem key={channel.id} value={channel.id}>
                              #{channel.name}
                            </GlassSelectItem>
                          ))}
                        </GlassSelectContent>
                      </GlassSelect>
                    }
                  />
                  <div className="flex justify-end gap-2">
                    <GlassButton
                      variant="primary"
                      loading={sendingMessage}
                      disabled={!messageChannelId}
                      onClick={handleSendVerificationMessage}
                    >
                      <Send className="w-4 h-4" />
                      Enviar mensagem
                    </GlassButton>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <GlassButton variant="ghost" onClick={handleRefresh} disabled={loading}>
                    <Shield className="w-4 h-4" />
                    Recarregar
                  </GlassButton>
                  <GlassButton variant="primary" onClick={handleSaveConfig} loading={savingConfig}>
                    <MessageSquare className="w-4 h-4" />
                    Salvar mensagens
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="tasks">
          <GlassCard className="p-5" hover={false}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando tarefas...</p>
            ) : (
              <div className="space-y-5">
                <SectionHeader
                  title="Tarefas do inkCloud"
                  description="Cada tarefa representa um processo automático do bot"
                  actions={
                    <GlassButton variant="ghost" onClick={handleAddTask}>
                      <Plus className="w-4 h-4" />
                      Criar tarefa
                    </GlassButton>
                  }
                />
                <div className="space-y-4">
                  {tasks.map((task, index) => (
                    <div
                      key={task.id || index}
                      className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <GlassInput
                          value={task.name || ""}
                          onChange={(event) => {
                            const next = [...tasks];
                            next[index] = { ...next[index], name: event.target.value };
                            setTasks(next);
                          }}
                          placeholder="Nome da tarefa"
                        />
                        <GlassButton
                          variant="ghost"
                          onClick={() => setTasks((prev) => prev.filter((item) => item.id !== task.id))}
                        >
                          <Zap className="w-4 h-4" />
                          Remover
                        </GlassButton>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        <GlassSelect
                          value={task.status || "pending"}
                          onValueChange={(value) => {
                            const next = [...tasks];
                            next[index] = { ...next[index], status: value };
                            setTasks(next);
                          }}
                        >
                          <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10">
                            <GlassSelectValue />
                          </GlassSelectTrigger>
                          <GlassSelectContent>
                            {TASK_STATUSES.map((status) => (
                              <GlassSelectItem key={status.value} value={status.value}>
                                {status.label}
                              </GlassSelectItem>
                            ))}
                          </GlassSelectContent>
                        </GlassSelect>
                        <GlassSelect
                          value={task.type || "recover_members"}
                          onValueChange={(value) => {
                            const next = [...tasks];
                            next[index] = { ...next[index], type: value };
                            setTasks(next);
                          }}
                        >
                          <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10">
                            <GlassSelectValue />
                          </GlassSelectTrigger>
                          <GlassSelectContent>
                            {TASK_TYPES.map((type) => (
                              <GlassSelectItem key={type.value} value={type.value}>
                                {type.label}
                              </GlassSelectItem>
                            ))}
                          </GlassSelectContent>
                        </GlassSelect>
                        <GlassSelect
                          value={resolveChannelValue(task.channel_id)}
                          onValueChange={(value) => {
                            const next = [...tasks];
                            next[index] = {
                              ...next[index],
                              channel_id: value === NONE_CHANNEL_VALUE ? null : value,
                            };
                            setTasks(next);
                          }}
                        >
                          <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10">
                            <GlassSelectValue placeholder="Canal" />
                          </GlassSelectTrigger>
                          <GlassSelectContent>
                            <GlassSelectItem value={NONE_CHANNEL_VALUE}>Nenhum canal</GlassSelectItem>
                            {textChannels.map((channel) => (
                              <GlassSelectItem key={channel.id} value={channel.id}>
                                #{channel.name}
                              </GlassSelectItem>
                            ))}
                          </GlassSelectContent>
                        </GlassSelect>
                      </div>
                      <div className="grid gap-3 md:grid-cols-4">
                        <GlassInput
                          placeholder="Min participantes"
                          value={String(task.min_participants ?? 0)}
                          onChange={(event) => {
                            const next = [...tasks];
                            const value = Number.parseInt(event.target.value || "0", 10) || 0;
                            next[index] = { ...next[index], min_participants: value };
                            setTasks(next);
                          }}
                        />
                        <GlassInput
                          placeholder="Max participantes"
                          value={String(task.max_participants ?? 0)}
                          onChange={(event) => {
                            const next = [...tasks];
                            const value = Number.parseInt(event.target.value || "0", 10) || 0;
                            next[index] = { ...next[index], max_participants: value };
                            setTasks(next);
                          }}
                        />
                        <GlassInput
                          placeholder="Início (timestamp)"
                          value={task.start_time ? String(task.start_time) : ""}
                          onChange={(event) => {
                            const next = [...tasks];
                            const value = Number.parseInt(event.target.value || "0", 10);
                            next[index] = { ...next[index], start_time: value || null };
                            setTasks(next);
                          }}
                        />
                        <GlassInput
                          placeholder="Fim (timestamp)"
                          value={task.end_time ? String(task.end_time) : ""}
                          onChange={(event) => {
                            const next = [...tasks];
                            const value = Number.parseInt(event.target.value || "0", 10);
                            next[index] = { ...next[index], end_time: value || null };
                            setTasks(next);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  {tasks.length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhuma tarefa registrada.</p>
                  )}
                </div>
                <div className="flex justify-end gap-2">
                  <GlassButton variant="ghost" onClick={handleRefresh} disabled={loading}>
                    <RefreshCw className="w-4 h-4" />
                    Recarregar
                  </GlassButton>
                  <GlassButton variant="primary" onClick={handleSaveTasks} loading={savingTasks}>
                    <ListTodo className="w-4 h-4" />
                    Salvar tarefas
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>

        <TabsContent value="preferences">
          <GlassCard className="p-5" hover={false}>
            {loading ? (
              <p className="text-sm text-muted-foreground">Carregando preferências...</p>
            ) : (
              <div className="space-y-4">
                {PREFERENCE_OPTIONS.map((option) => (
                  <SettingsRow
                    key={option.key}
                    label={option.label}
                    description={option.description}
                    control={
                      <Switch
                        checked={!!currentDefinitions[option.key]}
                        onCheckedChange={(checked) =>
                          updateConfig({ definitions: { ...currentDefinitions, [option.key]: checked } })
                        }
                      />
                    }
                  />
                ))}
                <div className="flex justify-end gap-2">
                  <GlassButton variant="ghost" onClick={handleRefresh} disabled={loading}>
                    <Shield className="w-4 h-4" />
                    Recarregar
                  </GlassButton>
                  <GlassButton variant="primary" onClick={handleSaveConfig} loading={savingConfig}>
                    <Shield className="w-4 h-4" />
                    Salvar preferências
                  </GlassButton>
                </div>
              </div>
            )}
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
