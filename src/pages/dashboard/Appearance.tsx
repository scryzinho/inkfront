import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Palette,
  Users,
  Hash,
  CreditCard,
  Bell,
  Ban,
  ShieldAlert,
  Sparkles,
  Circle,
  Moon,
  EyeOff,
  Ghost,
  Gamepad2,
  Tv,
  Headphones,
  Trophy,
  Sun,
  ChevronDown,
  ChevronUp,
  Trash,
  Plus,
  Save,
} from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { GlassInput } from "@/components/ui/GlassInput";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { SettingsRow } from "@/components/dashboard/SettingsRow";
import { Switch } from "@/components/ui/switch";
import { ColorPicker } from "@/components/ui/ColorPicker";
import {
  GlassSelect,
  GlassSelectTrigger,
  GlassSelectValue,
  GlassSelectContent,
  GlassSelectItem,
} from "@/components/ui/GlassSelect";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  AppearanceSettingsProvider,
  useAppearanceSettings,
} from "@/lib/appearance-settings";
import { BRAZILIAN_DDDS, type DisplayMode } from "@/lib/api/painel";
import { PainelSettingsProvider, usePainelSettings, type OperationStatus } from "@/lib/painel-settings";
import { useCustomMode } from "@/lib/custom-mode";
import {
  fetchStoreChannels,
  fetchStoreRoles,
  type StoreChannel,
  type StoreRole,
} from "@/lib/api/store";
import { PaymentGatewayConfig } from "@/components/dashboard/PaymentGatewayConfig";

const inputClassName =
  "w-full px-4 py-3 text-sm rounded-xl bg-white/[0.03] border border-white/10 outline-none focus:border-white/20 transition-colors";

const CHANNEL_TYPE_LABELS: Record<number, string> = {
  0: "Texto",
  1: "Mensagem direta",
  2: "Voz",
  4: "Categoria",
  5: "Anúncios",
 13: "Palco",
};

function getChannelTypeLabel(type: number) {
  return CHANNEL_TYPE_LABELS[type] ?? "Canal";
}

const VALID_DDDS = new Set(BRAZILIAN_DDDS);

const displayModeOptions: Array<{ value: DisplayMode; label: string; description: string }> = [
  { value: "embed", label: "Componentes V1", description: "Embed (modo herdado) com componentes V1" },
  { value: "components", label: "Componentes V2", description: "Containers e componentes V2 que o painel usa hoje" },
];

export default function AppearancePage() {
  return (
    <AppearanceSettingsProvider>
      <PainelSettingsProvider>
        <AppearancePageContent />
      </PainelSettingsProvider>
    </AppearanceSettingsProvider>
  );
}

function AppearancePageContent() {
  const [activeTab, setActiveTab] = useState("personalization");
  const [roles, setRoles] = useState<StoreRole[]>([]);
  const [channels, setChannels] = useState<StoreChannel[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [rolesError, setRolesError] = useState<string | null>(null);
  const [channelsError, setChannelsError] = useState<string | null>(null);
  const {
    settings,
    status,
    errorMessage,
    updateSetting,
    resetToDefault,
    loadFromStorage,
    persistToStorage,
  } = useAppearanceSettings();
  const { toast } = useToast();
  const prevStatus = useRef(status);
  const {
    refresh: refreshPainel,
    notificationsStatus,
    blacklistStatus,
  } = usePainelSettings();
  const {
    mode,
    status: displayModeStatus,
    error: displayModeError,
    setMode,
  } = useCustomMode();
  const [pendingMode, setPendingMode] = useState<DisplayMode | null>(null);

  useEffect(() => {
    if (prevStatus.current === "saving" && status === "success") {
      toast({
        title: "Configurações salvas",
        description: "As alterações foram persistidas automaticamente.",
      });
    }
    if (status === "error" && errorMessage) {
      toast({
        title: "Erro nas configurações",
        description: errorMessage,
        variant: "destructive",
      });
    }
    prevStatus.current = status;
  }, [status, errorMessage, toast]);

  const isBusy = status === "loading" || status === "saving";
  const painelBusy = notificationsStatus === "loading" || blacklistStatus === "loading";
  const disableRefresh = isBusy || painelBusy;

  const statusLabel = useMemo(() => {
    switch (status) {
      case "loading":
        return "Carregando configurações...";
      case "saving":
        return "Salvando alterações...";
      case "success":
        return "Tudo salvo";
      case "error":
        return errorMessage ? `Erro: ${errorMessage}` : "Não foi possível sincronizar";
      default:
        return "Sincronizado";
    }
  }, [status, errorMessage]);

  const statusClasses = useMemo(() => {
    switch (status) {
      case "loading":
        return "bg-background/60 text-muted-foreground";
      case "saving":
        return "bg-amber-500/10 text-amber-400";
      case "success":
        return "bg-emerald-500/10 text-emerald-400";
      case "error":
        return "bg-destructive/10 text-destructive";
      default:
        return "bg-white/5 text-muted-foreground";
    }
  }, [status]);


  const handleAddStatusName = useCallback(() => {
    if (!settings) return;
    updateSetting("status.names", [...settings.status.names, ""]);
  }, [settings, updateSetting]);

  const handleNameChange = useCallback(
    (index: number, value: string) => {
      if (!settings) return;
      const next = [...settings.status.names];
      next[index] = value;
      updateSetting("status.names", next);
    },
    [settings, updateSetting],
  );

  const handleMoveStatusName = useCallback(
    (index: number, direction: "up" | "down") => {
      if (!settings) return;
      const next = [...settings.status.names];
      const target = direction === "up" ? index - 1 : index + 1;
      if (target < 0 || target >= next.length) {
        return;
      }
      [next[index], next[target]] = [next[target], next[index]];
      updateSetting("status.names", next);
    },
    [settings, updateSetting],
  );

  const handleRemoveStatusName = useCallback(
    (index: number) => {
      if (!settings) return;
      if (settings.status.names.length === 1) {
        updateSetting("status.names", [""]);
        return;
      }
      const next = settings.status.names.filter((_, idx) => idx !== index);
      updateSetting("status.names", next);
    },
    [settings, updateSetting],
  );

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    setRolesError(null);
    try {
      const data = await fetchStoreRoles();
      setRoles(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível carregar cargos";
      setRolesError(message);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const loadChannels = useCallback(async () => {
    setChannelsLoading(true);
    setChannelsError(null);
    try {
      const data = await fetchStoreChannels(true);
      setChannels(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Não foi possível carregar canais";
      setChannelsError(message);
    } finally {
      setChannelsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoles();
    loadChannels();
  }, [loadRoles, loadChannels]);

  const renderRoleOptions = useCallback(
    (selectedId: string) => {
      const items = roles.map((role) => (
        <GlassSelectItem key={role.id} value={role.id}>
          <div className="flex items-center justify-between gap-2">
            <span className="truncate">{role.name}</span>
            <span className="text-[11px] text-muted-foreground">#{role.id}</span>
          </div>
        </GlassSelectItem>
      ));
      if (selectedId && !roles.some((role) => role.id === selectedId)) {
        items.unshift(
          <GlassSelectItem key={`fallback-role-${selectedId}`} value={selectedId}>
            ID {selectedId}
          </GlassSelectItem>,
        );
      }
      if (!items.length) {
        items.push(
          <GlassSelectItem key="roles-empty" value="">
            {rolesLoading ? "Carregando cargos..." : "Nenhum cargo disponível"}
          </GlassSelectItem>,
        );
      }
      return items;
    },
    [roles, rolesLoading],
  );

  const renderChannelOptions = useCallback(
    (selectedId: string) => {
      const items = channels.map((channel) => (
        <GlassSelectItem key={channel.id} value={channel.id}>
          <div className="flex flex-col">
            <span className="truncate">{channel.name}</span>
            <span className="text-[11px] text-muted-foreground">
              {getChannelTypeLabel(channel.type)} · #{channel.id}
            </span>
          </div>
        </GlassSelectItem>
      ));
      if (selectedId && !channels.some((channel) => channel.id === selectedId)) {
        items.unshift(
          <GlassSelectItem key={`fallback-channel-${selectedId}`} value={selectedId}>
            ID {selectedId}
          </GlassSelectItem>,
        );
      }
      if (!items.length) {
        items.push(
          <GlassSelectItem key="channels-empty" value="">
            {channelsLoading ? "Carregando canais..." : "Nenhum canal disponível"}
          </GlassSelectItem>,
        );
      }
      return items;
    },
    [channels, channelsLoading],
  );

  if (!settings) {
    return (
      <div className="h-64 w-full rounded-2xl border border-white/5 bg-white/5 animate-pulse" />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Aparência & Configurações</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Personalize o bot e mantenha todas as preferências sincronizadas com o painel do Discord.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 font-medium tracking-wide",
                statusClasses,
              )}
            >
              {statusLabel}
            </span>
            {errorMessage && (
              <span className="text-xs text-destructive">{errorMessage}</span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <GlassButton
            size="sm"
            variant="ghost"
            onClick={() => {
              void loadFromStorage();
              void refreshPainel();
            }}
            disabled={disableRefresh}
          >
            Recarregar
          </GlassButton>
          <GlassButton size="sm" variant="ghost" onClick={resetToDefault} disabled={isBusy}>
            Restaurar padrão
          </GlassButton>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/[0.03] border border-white/5 p-1 rounded-xl flex-wrap">
          <TabsTrigger value="personalization" className="rounded-lg data-[state=active]:bg-white/10">
            <Palette className="w-4 h-4 mr-2" />
            Personalização
          </TabsTrigger>
          <TabsTrigger value="roles" className="rounded-lg data-[state=active]:bg-white/10">
            <Users className="w-4 h-4 mr-2" />
            Cargos
          </TabsTrigger>
          <TabsTrigger value="channels" className="rounded-lg data-[state=active]:bg-white/10">
            <Hash className="w-4 h-4 mr-2" />
            Canais
          </TabsTrigger>
          <TabsTrigger value="payments" className="rounded-lg data-[state=active]:bg-white/10">
            <CreditCard className="w-4 h-4 mr-2" />
            Pagamentos
          </TabsTrigger>
          <TabsTrigger value="notifications" className="rounded-lg data-[state=active]:bg-white/10">
            <Bell className="w-4 h-4 mr-2" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="blacklist" className="rounded-lg data-[state=active]:bg-white/10">
            <Ban className="w-4 h-4 mr-2" />
            Blacklist
          </TabsTrigger>
          <TabsTrigger value="antifake" className="rounded-lg data-[state=active]:bg-white/10">
            <ShieldAlert className="w-4 h-4 mr-2" />
            Anti-fake
          </TabsTrigger>
          <TabsTrigger value="extensions" className="rounded-lg data-[state=active]:bg-white/10">
            <Sparkles className="w-4 h-4 mr-2" />
            Extensões
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personalization">
          <div className="grid lg:grid-cols-2 gap-6">
            <GlassCard className="p-5" hover={false}>
              <SectionHeader
                title="Status do bot"
                description="Defina como o seu bot aparece para os servidores conectados."
              />
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de status</label>
                  <GlassSelect
                    value={settings.status.type}
                    onValueChange={(value) => updateSetting("status.type", value)}
                  >
                    <GlassSelectTrigger>
                      <GlassSelectValue placeholder="Selecione" />
                    </GlassSelectTrigger>
                    <GlassSelectContent>
                      <GlassSelectItem value="online" icon={<Circle className="w-3 h-3 fill-emerald-500" />}>
                        Online
                      </GlassSelectItem>
                      <GlassSelectItem value="idle" icon={<Moon className="w-4 h-4" />}>
                        Ausente
                      </GlassSelectItem>
                      <GlassSelectItem value="dnd" icon={<EyeOff className="w-4 h-4" />}>
                        Não perturbe
                      </GlassSelectItem>
                      <GlassSelectItem value="invisible" icon={<Ghost className="w-4 h-4" />}>
                        Invisível
                      </GlassSelectItem>
                    </GlassSelectContent>
                  </GlassSelect>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Tipo de atividade</label>
                  <GlassSelect
                    value={settings.status.activityType}
                    onValueChange={(value) => updateSetting("status.activityType", value)}
                  >
                    <GlassSelectTrigger>
                      <GlassSelectValue placeholder="Selecione" />
                    </GlassSelectTrigger>
                    <GlassSelectContent>
                      <GlassSelectItem value="playing" icon={<Gamepad2 className="w-4 h-4" />}>
                        Jogando
                      </GlassSelectItem>
                      <GlassSelectItem value="watching" icon={<Tv className="w-4 h-4" />}>
                        Assistindo
                      </GlassSelectItem>
                      <GlassSelectItem value="listening" icon={<Headphones className="w-4 h-4" />}>
                        Ouvindo
                      </GlassSelectItem>
                      <GlassSelectItem value="competing" icon={<Trophy className="w-4 h-4" />}>
                        Competindo
                      </GlassSelectItem>
                    </GlassSelectContent>
                  </GlassSelect>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Atividade</label>
                  <input
                    type="text"
                    value={settings.status.activity}
                    onChange={(event) => updateSetting("status.activity", event.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div className="space-y-2 pt-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Atividades rotativas</p>
                    <GlassButton
                      size="sm"
                      variant="ghost"
                      onClick={handleAddStatusName}
                      disabled={!settings}
                    >
                      <Plus className="w-3 h-3" />
                      Adicionar
                    </GlassButton>
                  </div>
                  <div className="space-y-2">
                    {settings.status.names.map((name, index) => (
                      <div
                        key={`${name}-${index}`}
                        className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2"
                      >
                        <input
                          type="text"
                          value={name}
                          onChange={(event) => handleNameChange(index, event.target.value)}
                          className="flex-1 px-3 py-2 text-sm rounded-lg bg-white/[0.03] border border-white/10 outline-none focus:border-white/20 transition-colors"
                        />
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <button
                            type="button"
                            onClick={() => handleMoveStatusName(index, "up")}
                            disabled={index === 0}
                            className="rounded-full p-1 hover:bg-white/10"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveStatusName(index, "down")}
                            disabled={index === settings.status.names.length - 1}
                            className="rounded-full p-1 hover:bg-white/10"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveStatusName(index)}
                            className="rounded-full p-1 text-destructive hover:bg-destructive/10"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5" hover={false}>
              <SectionHeader
                title="Informações do bot"
                description="Configure o nome, avatar e banner usados no painel."
              />
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Nome do bot</label>
                  <input
                    type="text"
                    value={settings.info.name}
                    onChange={(event) => updateSetting("info.name", event.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Avatar</label>
                  <input
                    type="text"
                    value={settings.info.avatar}
                    onChange={(event) => updateSetting("info.avatar", event.target.value)}
                    className={inputClassName}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Banner</label>
                  <input
                    type="text"
                    value={settings.info.banner}
                    onChange={(event) => updateSetting("info.banner", event.target.value)}
                    className={inputClassName}
                  />
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-5" hover={false}>
              <SectionHeader
                title="Modo de Exibição"
                description="Espelha exatamente o painel do bot (Personalização → Modo de Exibição)."
              />
              <div className="rounded-2xl border border-white/5 bg-white/5 p-3 space-y-3 mt-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Modo de Exibição
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Painel &gt; Personalização &gt; Modo de Exibição
                    </p>
                  </div>
                  <span className="text-[10px] rounded-full border border-white/10 px-2 py-1 text-muted-foreground uppercase">
                    {mode ? (mode === "embed" ? "Componentes V1" : "Componentes V2") : "Carregando"}
                  </span>
                </div>
                <div className="grid gap-2">
                  {displayModeOptions.map((option) => {
                    const isActive = mode === option.value;
                    const isBusy = displayModeStatus === "saving" && pendingMode === option.value;
                    return (
                      <GlassButton
                        key={option.value}
                        size="sm"
                        variant={isActive ? "primary" : "ghost"}
                        className="flex flex-col items-start text-left"
                        onClick={async () => {
                          setPendingMode(option.value);
                          await setMode(option.value);
                          setPendingMode(null);
                        }}
                        disabled={
                          displayModeStatus === "loading" ||
                          displayModeStatus === "saving" ||
                          isActive
                        }
                        loading={isBusy}
                      >
                        <span className="text-sm font-semibold">{option.label}</span>
                        <span className="text-[11px] text-muted-foreground">{option.description}</span>
                      </GlassButton>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {displayModeStatus === "loading"
                    ? "Carregando modo..."
                    : displayModeStatus === "error"
                    ? `Erro ao sincronizar${displayModeError ? `: ${displayModeError}` : ""}`
                    : displayModeStatus === "success"
                    ? "Modo atualizado com sucesso"
                    : "Sincronizado com o bot"}
                </p>
              </div>
            </GlassCard>

            <GlassCard className="p-5 lg:col-span-2" hover={false}>
              <SectionHeader
                title="Modo e cores"
                description="Controle o tema do painel e as cores primárias."
              />
              <div className="grid gap-6 mt-5 md:grid-cols-3">
                <div className="md:col-span-2 space-y-3">
                  <label className="text-sm font-medium mb-2 block">Modo do painel</label>
                  <GlassSelect
                    value={settings.mode}
                    onValueChange={(value) => updateSetting("mode", value)}
                  >
                    <GlassSelectTrigger>
                      <GlassSelectValue placeholder="Selecione" />
                    </GlassSelectTrigger>
                    <GlassSelectContent>
                      <GlassSelectItem value="light" icon={<Sun className="w-4 h-4" />}>
                        Claro
                      </GlassSelectItem>
                      <GlassSelectItem value="dark" icon={<Moon className="w-4 h-4" />}>
                        Escuro
                      </GlassSelectItem>
                      <GlassSelectItem value="auto" icon={<Circle className="w-4 h-4" />}>
                        Automático
                      </GlassSelectItem>
                    </GlassSelectContent>
                  </GlassSelect>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium mb-2 block">Cor primária</label>
                  <ColorPicker
                    value={settings.colors.primary}
                    onChange={(value) => updateSetting("colors.primary", value)}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium mb-2 block">Cor secundária</label>
                  <ColorPicker
                    value={settings.colors.secondary}
                    onChange={(value) => updateSetting("colors.secondary", value)}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-medium mb-2 block">Cor de destaque</label>
                  <ColorPicker
                    value={settings.colors.accent}
                    onChange={(value) => updateSetting("colors.accent", value)}
                  />
                </div>
              </div>
            </GlassCard>
          </div>
        </TabsContent>

        <TabsContent value="roles">
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Cargos"
              description="Selecione os cargos diretamente do Discord."
            />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Atualize os cargos para garantir que as opções reflitam o servidor.
              </p>
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => void loadRoles()}
                disabled={rolesLoading}
              >
                {rolesLoading ? "Atualizando..." : "Atualizar cargos"}
              </GlassButton>
            </div>
            {rolesError && <p className="text-xs text-destructive mt-2">{rolesError}</p>}
            <div className="space-y-4 mt-4">
              <SettingsRow
                label="Cargo de Admin"
                description="Cargo com acesso total ao bot"
                control={
                  <GlassSelect
                    value={settings.roles.adminRoleId}
                    onValueChange={(value) => updateSetting("roles.adminRoleId", value)}
                  >
                    <GlassSelectTrigger className="w-40">
                      <GlassSelectValue placeholder="Selecionar" />
                    </GlassSelectTrigger>
                    <GlassSelectContent>{renderRoleOptions(settings.roles.adminRoleId)}</GlassSelectContent>
                  </GlassSelect>
                }
              />
              <SettingsRow
                label="Cargo de Moderador"
                description="Cargo com permissões de moderação"
                control={
                  <GlassSelect
                    value={settings.roles.modRoleId}
                    onValueChange={(value) => updateSetting("roles.modRoleId", value)}
                  >
                    <GlassSelectTrigger className="w-40">
                      <GlassSelectValue placeholder="Selecionar" />
                    </GlassSelectTrigger>
                    <GlassSelectContent>{renderRoleOptions(settings.roles.modRoleId)}</GlassSelectContent>
                  </GlassSelect>
                }
              />
              <SettingsRow
                label="Cargo de Membro"
                description="Cargo padrão para membros"
                control={
                  <GlassSelect
                    value={settings.roles.memberRoleId}
                    onValueChange={(value) => updateSetting("roles.memberRoleId", value)}
                  >
                    <GlassSelectTrigger className="w-40">
                      <GlassSelectValue placeholder="Selecionar" />
                    </GlassSelectTrigger>
                    <GlassSelectContent>{renderRoleOptions(settings.roles.memberRoleId)}</GlassSelectContent>
                  </GlassSelect>
                }
              />
              <SettingsRow
                label="Cargo de Cliente"
                description="Aplicado após a compra do cliente"
                control={
                  <GlassSelect
                    value={settings.roles.customerRoleId}
                    onValueChange={(value) => updateSetting("roles.customerRoleId", value)}
                  >
                    <GlassSelectTrigger className="w-40">
                      <GlassSelectValue placeholder="Selecionar" />
                    </GlassSelectTrigger>
                    <GlassSelectContent>{renderRoleOptions(settings.roles.customerRoleId)}</GlassSelectContent>
                  </GlassSelect>
                }
              />
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="channels">
          <GlassCard className="p-5" hover={false}>
            <SectionHeader title="Canais" description="Selecione canais por nome, não apenas IDs." />
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
              <p className="text-sm text-muted-foreground">
                Atualize a lista para garantir que todos os canais estejam disponíveis.
              </p>
              <GlassButton
                size="sm"
                variant="ghost"
                onClick={() => void loadChannels()}
                disabled={channelsLoading}
              >
                {channelsLoading ? "Atualizando..." : "Atualizar canais"}
              </GlassButton>
            </div>
            {channelsError && <p className="text-xs text-destructive mt-2">{channelsError}</p>}
            <div className="space-y-4 mt-4">
              <SettingsRow
                label="Logs"
                description="Canal que receberá os logs do bot"
                control={
                  <GlassSelect
                    value={settings.channels.logsId}
                    onValueChange={(value) => updateSetting("channels.logsId", value)}
                  >
                    <GlassSelectTrigger className="w-44">
                      <GlassSelectValue placeholder="Selecionar" />
                    </GlassSelectTrigger>
                    <GlassSelectContent>{renderChannelOptions(settings.channels.logsId)}</GlassSelectContent>
                  </GlassSelect>
                }
              />
              <SettingsRow
                label="Boas-vindas"
                description="Canal usado para mensagens de boas-vindas"
                control={
                  <GlassSelect
                    value={settings.channels.welcomeId}
                    onValueChange={(value) => updateSetting("channels.welcomeId", value)}
                  >
                    <GlassSelectTrigger className="w-44">
                      <GlassSelectValue placeholder="Selecionar" />
                    </GlassSelectTrigger>
                    <GlassSelectContent>{renderChannelOptions(settings.channels.welcomeId)}</GlassSelectContent>
                  </GlassSelect>
                }
              />
              <SettingsRow
                label="Regras"
                description="Canal que exibe as regras do servidor"
                control={
                  <GlassSelect
                    value={settings.channels.rulesId}
                    onValueChange={(value) => updateSetting("channels.rulesId", value)}
                  >
                    <GlassSelectTrigger className="w-44">
                      <GlassSelectValue placeholder="Selecionar" />
                    </GlassSelectTrigger>
                    <GlassSelectContent>{renderChannelOptions(settings.channels.rulesId)}</GlassSelectContent>
                  </GlassSelect>
                }
              />
              <SettingsRow
                label="Anúncios"
                description="Canal reservado para anúncios do bot"
                control={
                  <GlassSelect
                    value={settings.channels.announcementsId}
                    onValueChange={(value) => updateSetting("channels.announcementsId", value)}
                  >
                    <GlassSelectTrigger className="w-44">
                      <GlassSelectValue placeholder="Selecionar" />
                    </GlassSelectTrigger>
                    <GlassSelectContent>{renderChannelOptions(settings.channels.announcementsId)}</GlassSelectContent>
                  </GlassSelect>
                }
              />
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="payments">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Gateways de Pagamento</h2>
              <p className="text-sm text-muted-foreground">
                Configure os métodos de pagamento aceitos no seu servidor.
              </p>
            </div>
            <PaymentGatewayConfig onRefresh={loadFromStorage} />
          </div>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationsSection />
        </TabsContent>

        <TabsContent value="blacklist">
          <BlacklistSection />
        </TabsContent>

        <TabsContent value="antifake">
          <AntiFakeSection />
        </TabsContent>

        <TabsContent value="extensions">
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Extensões"
              description="Ative funcionalidades adicionais do inK Bot."
            />
            <div className="space-y-3 mt-5">
              <SettingsRow
                label="Boost Tracker"
                description="Detecta quem dá boost e dispara eventos."
                control={
                  <Switch
                    checked={settings.extensions.boost}
                    onCheckedChange={(checked) => updateSetting("extensions.boost", checked)}
                  />
                }
              />
              <SettingsRow
                label="VisionGen"
                description="Gera imagens com IA dentro do painel."
                control={
                  <Switch
                    checked={settings.extensions.visiongen}
                    onCheckedChange={(checked) => updateSetting("extensions.visiongen", checked)}
                  />
                }
              />
            </div>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface StatusBadgeProps {
  status: OperationStatus;
  error?: string;
}

function AntiFakeSection() {
  const {
    settings,
    status,
    errorMessage,
    updateSetting,
    loadFromStorage,
    persistToStorage,
  } = useAppearanceSettings();

  const busy = status === "loading" || status === "saving";
  const handleReload = useCallback(() => {
    void loadFromStorage();
  }, [loadFromStorage]);
  const handleSave = useCallback(() => {
    void persistToStorage();
  }, [persistToStorage]);

  if (!settings) {
    return (
      <GlassCard className="p-5" hover={false}>
        <div className="h-24 w-full rounded-2xl border border-white/5 bg-white/5 animate-pulse" />
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5" hover={false}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <SectionHeader
            title="Anti-fake"
            description="Bloqueie contas falsas ou suspeitas como no /painel do bot."
          />
          <p className="text-sm text-muted-foreground mt-2">
            Painel &gt; Configurações &gt; Anti-fake
          </p>
        </div>
        <OperationStatusBadge status={status} error={errorMessage} />
      </div>
      <div className="space-y-4 mt-5">
        <SettingsRow
          label="Ativar anti-fake"
          description="Analisa contas novas e bloqueia suspeitas automaticamente."
          control={
            <Switch
              checked={settings.antiFake.enabled}
              onCheckedChange={(checked) =>
                updateSetting("antiFake.enabled", Boolean(checked))
              }
            />
          }
        />
        <SettingsRow
          label="Idade mínima"
          description="Dias desde a criação da conta."
          control={
            <input
              type="number"
              min={0}
              max={365}
              value={settings.antiFake.minAge}
              onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isNaN(value)) {
                  return;
                }
                updateSetting("antiFake.minAge", Math.max(0, Math.min(365, value)));
              }}
              className="w-20 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-white/20"
            />
          }
        />
        <SettingsRow
          label="Exigir avatar"
          description="Bloqueia contas sem foto de perfil."
          control={
            <Switch
              checked={settings.antiFake.requireAvatar}
              onCheckedChange={(checked) =>
                updateSetting("antiFake.requireAvatar", Boolean(checked))
              }
            />
          }
        />
        <SettingsRow
          label="Exigir verificação"
          description="Bloqueia contas sem e-mail ou telefone verificado."
          control={
            <Switch
              checked={settings.antiFake.requireVerified}
              onCheckedChange={(checked) =>
                updateSetting("antiFake.requireVerified", Boolean(checked))
              }
            />
          }
        />
      </div>
      <div className="flex flex-wrap gap-2 justify-end mt-6 pt-6 border-t border-white/5">
        <GlassButton variant="ghost" onClick={handleReload} disabled={busy}>
          Recarregar
        </GlassButton>
        <GlassButton variant="primary" onClick={handleSave} disabled={busy}>
          <Save className="w-4 h-4" />
          Salvar
        </GlassButton>
      </div>
    </GlassCard>
  );
}

function OperationStatusBadge({ status, error }: StatusBadgeProps) {
  const { label, className } = getStatusBadge(status, error);
  return (
    <span
      className={`text-xs font-semibold uppercase tracking-wide px-3 py-1 rounded-full ${className}`}
      title={status === "error" ? error : undefined}
    >
      {label}
    </span>
  );
}

function getStatusBadge(status: OperationStatus, error?: string) {
  switch (status) {
    case "loading":
      return { label: "Carregando...", className: "bg-background/60 text-muted-foreground" };
    case "saving":
      return { label: "Salvando...", className: "bg-amber-500/10 text-amber-400" };
    case "success":
      return { label: "Tudo salvo", className: "bg-emerald-500/10 text-emerald-400" };
    case "error":
      return {
        label: error ? `Erro: ${error}` : "Erro",
        className: "bg-destructive/10 text-destructive",
      };
    default:
      return { label: "Sincronizado", className: "bg-white/5 text-muted-foreground" };
  }
}

function NotificationsSection() {
  const {
    notifications,
    notificationsStatus,
    notificationsError,
    toggleNotifications,
    configureNotificationsNumber,
  } = usePainelSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dddInput, setDddInput] = useState("");
  const [numberInput, setNumberInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!notifications) return;
    setDddInput(notifications.ddd ?? "");
    setNumberInput(notifications.number ?? "");
  }, [notifications]);

  const statusEmoji = notifications?.enabled ? "🟢" : "⚪";
  const statusLabel = notifications?.enabled ? "Ativado" : "Desativado";
  const phoneDisplay =
    notifications?.ddd && notifications?.number
      ? `(${notifications.ddd}) ${notifications.number}`
      : "Nenhum número configurado";

  const handleSaveNumber = useCallback(async () => {
    const trimmedDDD = dddInput.trim();
    const sanitizedNumber = numberInput.replace(/\D/g, "");
    if (trimmedDDD && !VALID_DDDS.has(trimmedDDD)) {
      setFormError("Informe um DDD válido (ex: 11, 21, 31).");
      return;
    }
    if (trimmedDDD && sanitizedNumber && sanitizedNumber.length < 8) {
      setFormError("Número inválido (mínimo 8 dígitos).");
      return;
    }
    try {
      await configureNotificationsNumber({
        ddd: trimmedDDD ? trimmedDDD : null,
        number: trimmedDDD && sanitizedNumber ? sanitizedNumber : null,
      });
      setFormError(null);
      setDialogOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar");
    }
  }, [configureNotificationsNumber, dddInput, numberInput]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setFormError(null);
  }, []);

  return (
    <GlassCard className="p-5" hover={false}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <SectionHeader
            title="Notificações"
            description="Ative ou desative a transmissão de alertas via WhatsApp."
          />
          <p className="text-sm text-muted-foreground mt-2">
            {`Painel > Configurações > Notificações`}
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            <span className="font-semibold mr-1">Status:</span>
            <span className="mr-2">
              {statusEmoji} {statusLabel}
            </span>
            <br />
            <span className="font-semibold mr-1">Número:</span> {phoneDisplay}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Configure aqui o número para receber notificações via WhatsApp.
          </p>
        </div>
        <OperationStatusBadge status={notificationsStatus} error={notificationsError} />
      </div>

      <div className="flex flex-wrap gap-3 mt-6">
        <GlassButton
          variant="primary"
          onClick={() => void toggleNotifications(!notifications?.enabled)}
          disabled={
            !notifications ||
            notificationsStatus === "loading" ||
            notificationsStatus === "saving"
          }
        >
          {notifications?.enabled ? "Desativar" : "Ativar"}
        </GlassButton>
        <GlassButton
          variant="secondary"
          onClick={() => setDialogOpen(true)}
          disabled={
            !notifications?.enabled ||
            notificationsStatus === "loading" ||
            notificationsStatus === "saving"
          }
        >
          Configurar Número
        </GlassButton>
      </div>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : handleDialogClose())}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurar Celular</DialogTitle>
            <DialogDescription>
              Informe DDD e número em formato nacional. Deixe em branco para remover a configuração.
            </DialogDescription>
          </DialogHeader>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">DDD</label>
              <GlassInput
                type="text"
                inputMode="numeric"
                maxLength={2}
                value={dddInput}
                onChange={(event) => setDddInput(event.target.value.replace(/\D/g, ""))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Número</label>
              <GlassInput
                type="tel"
                pattern="[0-9]*"
                value={numberInput}
                onChange={(event) => setNumberInput(event.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            DDDs válidos: {BRAZILIAN_DDDS.slice(0, 5).join(", ")}…
          </p>
          {formError && <p className="text-xs text-destructive mt-2">{formError}</p>}
          <DialogFooter className="mt-4">
            <GlassButton variant="ghost" onClick={handleDialogClose}>
              Cancelar
            </GlassButton>
            <GlassButton
              variant="primary"
              onClick={handleSaveNumber}
              disabled={notificationsStatus === "saving"}
            >
              Salvar
            </GlassButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}

function BlacklistSection() {
  const {
    blacklist,
    blacklistStatus,
    blacklistError,
    addBlacklistEntries,
    removeBlacklistEntries,
    clearBlacklist,
  } = usePainelSettings();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [entryInput, setEntryInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const totalBlocked = blacklist?.length ?? 0;
  const busy = blacklistStatus === "loading" || blacklistStatus === "saving";

  const handleAddEntries = useCallback(async () => {
    const entries = entryInput
      .split(/[\s,;]+/)
      .map((value) => value.trim())
      .filter(Boolean);
    if (entries.length === 0) {
      setFormError("Informe ao menos um ID válido.");
      return;
    }
    try {
      await addBlacklistEntries(entries);
      setEntryInput("");
      setFormError(null);
      setDialogOpen(false);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Não foi possível salvar");
    }
  }, [addBlacklistEntries, entryInput]);

  const handleDialogClose = useCallback(() => {
    setDialogOpen(false);
    setFormError(null);
  }, []);

  return (
    <GlassCard className="p-5" hover={false}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <SectionHeader
            title="Blacklist"
            description="Gerencie os usuários que não podem interagir com o bot."
          />
          <p className="text-sm text-muted-foreground mt-2">
            Painel &gt; Configurações &gt; <strong>Blacklist</strong>
          </p>
          <p className="text-sm text-muted-foreground mt-3">
            {`Usuários na blacklist não poderão interagir com comandos ou botões.`}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-semibold">Bloqueados:</span> {totalBlocked}
          </p>
        </div>
        <OperationStatusBadge status={blacklistStatus} error={blacklistError} />
      </div>

      <div className="space-y-3 mt-5">
        {blacklist && blacklist.length > 0 ? (
          <div className="space-y-2">
            {blacklist.map((entry) => (
              <div
                key={entry}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/5 bg-white/[0.02] px-4 py-3"
              >
                <span className="text-sm font-mono truncate">{entry}</span>
                <button
                  type="button"
                  onClick={() => void removeBlacklistEntries([entry])}
                  disabled={busy}
                  className="text-sm text-destructive hover:text-destructive/80"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum usuário bloqueado.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mt-4">
        <GlassButton
          variant="secondary"
          onClick={() => setDialogOpen(true)}
          disabled={busy}
        >
          Adicionar por ID
        </GlassButton>
        <GlassButton
          variant="secondary"
          onClick={() => void clearBlacklist()}
          disabled={!totalBlocked || busy}
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          Desbloquear Geral
        </GlassButton>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleDialogClose();
            setEntryInput("");
          } else {
            setDialogOpen(true);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar à Blacklist</DialogTitle>
            <DialogDescription>
              Adicione IDs separados por vírgula, espaço ou nova linha.
            </DialogDescription>
          </DialogHeader>
          <div>
            <textarea
              className={`${inputClassName} h-32 resize-none`}
              value={entryInput}
              onChange={(event) => setEntryInput(event.target.value)}
              placeholder="Ex: 123456789012345678"
            />
            {formError && <p className="text-xs text-destructive mt-2">{formError}</p>}
          </div>
          <DialogFooter className="mt-4">
            <GlassButton variant="ghost" onClick={handleDialogClose}>
              Cancelar
            </GlassButton>
            <GlassButton variant="primary" onClick={handleAddEntries} disabled={busy}>
              Salvar
            </GlassButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassCard>
  );
}
