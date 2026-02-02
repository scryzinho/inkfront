import { useEffect, useMemo, useState } from "react";
import { Lock, RefreshCw, Save, Shield, Users } from "lucide-react";
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
import { fetchStoreChannels, fetchStoreRoles, type StoreChannel, type StoreRole } from "@/lib/api/store";
import { fetchProtectionConfig, updateProtectionConfig } from "@/lib/api/protection";
import { useTenant } from "@/lib/tenant";

const CHANNEL_NONE = "__none";
const ROLE_NONE = "__none";

const PUNISHMENT_LABELS: Record<string, string> = {
  ban: "Banimento",
  kick: "Expulsão",
  timeout_30d: "Castigo de 30 dias",
  remover_cargos: "Remoção de Cargos",
  remove_roles: "Remoção dos Cargos",
  revert_action: "Reversão da Ação",
  none: "Nenhuma",
};

const PUNISHMENT_OPTIONS: Record<string, string[]> = {
  protecaogeral_canais: ["ban", "kick", "timeout_30d", "remover_cargos", "revert_action", "none"],
  protecaogeral_cargos: ["ban", "kick", "timeout_30d", "remover_cargos", "revert_action", "none"],
  protecaogeral_webhooks: ["ban", "kick", "timeout_30d", "remove_roles", "none"],
  protecaogeral_comandosext: ["ban", "kick", "timeout_30d", "remover_cargos", "none"],
  protecaogeral_banimentos: ["ban", "kick", "timeout_30d", "remove_roles", "revert_action", "none"],
  protecaogeral_expulsoes: ["ban", "kick", "timeout_30d", "remove_roles", "none"],
  privatizacoes_cargos: ["ban", "kick", "timeout_30d", "remove_roles", "none"],
  privatizacoes_perms: ["ban", "kick", "timeout_30d", "remove_roles", "none"],
  privatizacoes_mencoes: ["ban", "kick", "timeout_30d", "remove_roles", "none"],
  privatizacoes_apps: ["ban", "kick", "timeout_30d", "remove_roles", "none"],
  privatizacoes_urls: ["ban", "kick", "timeout_30d", "remove_roles", "none"],
  privatizacoes_persistencia: ["ban", "kick", "timeout_30d", "remove_roles", "none"],
};

const DEFAULTS: Record<string, any> = {
  protecaogeral_canais: {
    criacao: { limite: 3, intervalo: 10, ativado: false },
    edicao: { limite: 5, intervalo: 15, ativado: false },
    exclusao: { limite: 2, intervalo: 5, ativado: false },
    canais_avancado: { punicao: "none", cargos_imunes: [], categorias_imunes: [], canal_logs: null },
  },
  protecaogeral_cargos: {
    criacao: { limite: 3, intervalo: 10, ativado: false },
    edicao: { limite: 5, intervalo: 15, ativado: false },
    exclusao: { limite: 2, intervalo: 5, ativado: false },
    cargos_avancado: { punicao: "none", cargos_imunes: [], canal_logs: null },
  },
  protecaogeral_webhooks: {
    webhooks: { limite: 2, intervalo: 5, ativado: true },
    webhooks_avancado: { punicao: "ban", cargos_imunes: [], canal_logs: null },
  },
  protecaogeral_comandosext: {
    comandosext: { limite: 5, intervalo: 15, ativado: false },
    comandosext_avancado: { punicao: "none", bots_permitidos: [], canal_logs: null },
  },
  protecaogeral_banimentos: {
    banimento: { limite: 2, intervalo: 10, ativado: false },
    banimentos_avancado: { punicao: "none", cargos_imunes: [], canal_logs: null },
  },
  protecaogeral_expulsoes: {
    expulsoes: { limite: 3, intervalo: 10, ativado: false },
    expulsoes_avancado: { punicao: "none", cargos_imunes: [], canal_logs: null },
  },
  privatizacoes_cargos: {
    privatizacao_cargos: { ativado: false },
    privatizacao_cargos_avancado: {
      punicao: "none",
      cargos_privados: [],
      cargos_imunes: [],
      canal_logs: null,
    },
  },
  privatizacoes_perms: {
    privatizacao_permissoes: { ativado: false },
    privatizacao_permissoes_avancado: { punicao: "none", cargos_imunes: [], canal_logs: null },
  },
  privatizacoes_mencoes: {
    privatizacao_mencoes: { ativado: false },
    privatizacao_mencoes_avancado: { punicao: "none", cargos_imunes: [], canal_logs: null },
  },
  privatizacoes_apps: {
    privatizacao_apps: { ativado: false },
    privatizacao_apps_avancado: { punicao: "none", cargos_imunes: [], canal_logs: null },
  },
  privatizacoes_urls: {
    privatizacao_urls: { ativado: false },
    privatizacao_urls_avancado: { punicao: "none", cargos_imunes: [], canal_logs: null },
  },
  privatizacoes_persistencia: {
    persistencia_canais: { ativado: false },
    persistencia_canais_avancado: {
      punicao: "none",
      cargos_imunes: [],
      categorias_imunes: [],
      canal_logs: null,
    },
  },
};

const GENERAL_SECTIONS = [
  { key: "protecaogeral_canais", label: "Canais", description: "Limites para criação, edição e exclusão de canais." },
  { key: "protecaogeral_cargos", label: "Cargos", description: "Limites para criação, edição e exclusão de cargos." },
  { key: "protecaogeral_webhooks", label: "Webhooks", description: "Controle de criação/exclusão de webhooks." },
  { key: "protecaogeral_comandosext", label: "Comandos externos", description: "Bloqueie comandos executados por bots externos." },
  { key: "protecaogeral_banimentos", label: "Banimentos", description: "Proteção contra banimentos em massa." },
  { key: "protecaogeral_expulsoes", label: "Expulsões", description: "Proteção contra expulsões em massa." },
];

const PRIV_SECTIONS = [
  { key: "privatizacoes_cargos", label: "Cargos privados", description: "Proteja cargos marcados como privados." },
  { key: "privatizacoes_perms", label: "Permissões", description: "Bloqueie concessões de permissões perigosas." },
  { key: "privatizacoes_mencoes", label: "Menções", description: "Bloqueie @everyone e @here." },
  { key: "privatizacoes_apps", label: "Apps/Bots", description: "Bloqueie a adição de novos apps." },
  { key: "privatizacoes_urls", label: "URLs", description: "Bloqueie links externos no servidor." },
  { key: "privatizacoes_persistencia", label: "Persistência", description: "Proteja canais contra exclusão por persistência." },
];

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
  return list
    .map((item) => (item === null || item === undefined ? "" : String(item)))
    .filter((item) => item.trim().length > 0);
};

const parseIdList = (value: string) => {
  if (!value) return [] as string[];
  const matches = value.match(/\d+/g) || [];
  return matches.map((item) => item.trim());
};

export default function ProtectionPage() {
  const [activeTab, setActiveTab] = useState("general");
  const [generalTab, setGeneralTab] = useState(GENERAL_SECTIONS[0].key);
  const [privTab, setPrivTab] = useState(PRIV_SECTIONS[0].key);
  const [channels, setChannels] = useState<StoreChannel[]>([]);
  const [roles, setRoles] = useState<StoreRole[]>([]);
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const { tenantId } = useTenant();

  const channelOptions = useMemo(
    () => channels.filter((channel) => channel.type === 0 || channel.type === 5),
    [channels]
  );
  const categoryOptions = useMemo(
    () => channels.filter((channel) => channel.type === 4),
    [channels]
  );

  const loadSection = async (section: string) => {
    try {
      setLoading((prev) => ({ ...prev, [section]: true }));
      setErrors((prev) => ({ ...prev, [section]: null }));
      const data = await fetchProtectionConfig(section);
      setConfigs((prev) => ({ ...prev, [section]: data }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, [section]: "Não foi possível carregar as configurações." }));
    } finally {
      setLoading((prev) => ({ ...prev, [section]: false }));
    }
  };

  const saveSection = async (section: string) => {
    try {
      setSaving((prev) => ({ ...prev, [section]: true }));
      setErrors((prev) => ({ ...prev, [section]: null }));
      const data = await updateProtectionConfig(section, configs[section] || DEFAULTS[section]);
      setConfigs((prev) => ({ ...prev, [section]: data }));
    } catch (error) {
      setErrors((prev) => ({ ...prev, [section]: "Não foi possível salvar as configurações." }));
    } finally {
      setSaving((prev) => ({ ...prev, [section]: false }));
    }
  };

  useEffect(() => {
    const loadBase = async () => {
      try {
        const [channelsData, rolesData] = await Promise.all([
          fetchStoreChannels(true, true),
          fetchStoreRoles(),
        ]);
        setChannels(channelsData);
        setRoles(rolesData);
      } catch (error) {
        setChannels([]);
        setRoles([]);
      }
    };
    loadBase();
  }, [tenantId]);

  useEffect(() => {
    loadSection(generalTab);
  }, [generalTab]);

  useEffect(() => {
    loadSection(privTab);
  }, [privTab]);

  const updateSectionConfig = (section: string, updater: (current: any) => any) => {
    setConfigs((prev) => {
      const current = deepMerge(DEFAULTS[section], prev[section] || {});
      const next = updater(current);
      return { ...prev, [section]: next };
    });
  };

  const getConfig = (section: string) => deepMerge(DEFAULTS[section], configs[section] || {});

  const roleName = (roleId: string) => {
    const role = roles.find((item) => item.id === roleId);
    return role ? role.name : roleId;
  };

  const categoryName = (categoryId: string) => {
    const category = categoryOptions.find((item) => item.id === categoryId);
    return category ? category.name : categoryId;
  };

  const renderPunishmentSelect = (section: string, value: string, onChange: (value: string) => void) => {
    const options = PUNISHMENT_OPTIONS[section] || [];
    return (
      <GlassSelect value={value} onValueChange={onChange}>
        <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
          <GlassSelectValue />
        </GlassSelectTrigger>
        <GlassSelectContent>
          {options.map((option) => (
            <GlassSelectItem key={option} value={option}>
              {PUNISHMENT_LABELS[option] || option}
            </GlassSelectItem>
          ))}
        </GlassSelectContent>
      </GlassSelect>
    );
  };

  const renderRoleMultiSelect = (
    label: string,
    description: string,
    values: string[],
    onChange: (next: string[]) => void
  ) => (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {values.length === 0 && (
          <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-muted-foreground">
            Nenhum cargo selecionado
          </span>
        )}
        {values.map((roleId) => (
          <button
            key={roleId}
            type="button"
            className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sm"
            onClick={() => onChange(values.filter((item) => item !== roleId))}
          >
            {roleName(roleId)}
          </button>
        ))}
      </div>
      <GlassSelect
        value={ROLE_NONE}
        onValueChange={(value) => {
          if (!value || value === ROLE_NONE) return;
          if (!values.includes(value)) onChange([...values, value]);
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
    </div>
  );

  const renderCategoryMultiSelect = (
    label: string,
    description: string,
    values: string[],
    onChange: (next: string[]) => void
  ) => (
    <div>
      <label className="text-sm font-medium mb-2 block">{label}</label>
      <p className="text-xs text-muted-foreground mb-2">{description}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {values.length === 0 && (
          <span className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-xs text-muted-foreground">
            Nenhuma categoria selecionada
          </span>
        )}
        {values.map((categoryId) => (
          <button
            key={categoryId}
            type="button"
            className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-sm"
            onClick={() => onChange(values.filter((item) => item !== categoryId))}
          >
            {categoryName(categoryId)}
          </button>
        ))}
      </div>
      <GlassSelect
        value={CHANNEL_NONE}
        onValueChange={(value) => {
          if (!value || value === CHANNEL_NONE) return;
          if (!values.includes(value)) onChange([...values, value]);
        }}
      >
        <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
          <GlassSelectValue placeholder="Adicionar categoria" />
        </GlassSelectTrigger>
        <GlassSelectContent>
          <GlassSelectItem value={CHANNEL_NONE}>Selecione uma categoria</GlassSelectItem>
          {categoryOptions.map((category) => (
            <GlassSelectItem key={category.id} value={category.id}>
              {category.name}
            </GlassSelectItem>
          ))}
        </GlassSelectContent>
      </GlassSelect>
    </div>
  );

  const renderLogsSelect = (value: string | null, onChange: (value: string | null) => void) => (
    <GlassSelect
      value={value || CHANNEL_NONE}
      onValueChange={(selected) => onChange(selected === CHANNEL_NONE ? null : selected)}
    >
      <GlassSelectTrigger className="px-3 py-2 text-sm rounded-lg bg-white/5 border border-white/10 outline-none">
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
  );

  const renderLimitIntervalBlock = (
    label: string,
    description: string,
    values: { limite: number; intervalo: number; ativado: boolean },
    onChange: (next: { limite: number; intervalo: number; ativado: boolean }) => void
  ) => (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-muted-foreground">Limite</label>
          <GlassInput
            value={String(values.limite ?? 0)}
            onChange={(event) =>
              onChange({
                ...values,
                limite: Number.parseInt(event.target.value || "0", 10) || 0,
              })
            }
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground">Intervalo (min)</label>
          <GlassInput
            value={String(values.intervalo ?? 0)}
            onChange={(event) =>
              onChange({
                ...values,
                intervalo: Number.parseInt(event.target.value || "0", 10) || 0,
              })
            }
          />
        </div>
        <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Ativado</p>
            <p className="text-xs text-muted-foreground">Monitorar este evento</p>
          </div>
          <Switch checked={values.ativado} onCheckedChange={(checked) => onChange({ ...values, ativado: checked })} />
        </div>
      </div>
    </div>
  );

  const renderGeneralSection = (section: string) => {
    const config = getConfig(section);
    const isLoading = loading[section];
    const isSaving = saving[section];
    const error = errors[section];

    if (section === "protecaogeral_canais") {
      const advanced = config.canais_avancado || {};
      return (
        <div className="space-y-6">
          {renderLimitIntervalBlock("Criação", "Limite de criação de canais.", config.criacao, (next) =>
            updateSectionConfig(section, (current) => ({ ...current, criacao: next }))
          )}
          {renderLimitIntervalBlock("Edição", "Limite de edição de canais.", config.edicao, (next) =>
            updateSectionConfig(section, (current) => ({ ...current, edicao: next }))
          )}
          {renderLimitIntervalBlock("Exclusão", "Limite de exclusão de canais.", config.exclusao, (next) =>
            updateSectionConfig(section, (current) => ({ ...current, exclusao: next }))
          )}
          <SettingsRow
            label="Punição"
            description="Ação ao detectar infração"
            control={renderPunishmentSelect(section, advanced.punicao || "none", (value) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                canais_avancado: { ...current.canais_avancado, punicao: value },
              }))
            )}
          />
          {renderRoleMultiSelect(
            "Cargos imunes",
            "Cargos que não serão punidos",
            toIdList(advanced.cargos_imunes),
            (next) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                canais_avancado: { ...current.canais_avancado, cargos_imunes: next },
              }))
          )}
          {renderCategoryMultiSelect(
            "Categorias imunes",
            "Categorias que ignoram a proteção",
            toIdList(advanced.categorias_imunes),
            (next) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                canais_avancado: { ...current.canais_avancado, categorias_imunes: next },
              }))
          )}
          <SettingsRow
            label="Canal de logs"
            description="Onde enviar os registros"
            control={renderLogsSelect(
              advanced.canal_logs ? String(advanced.canal_logs) : null,
              (value) =>
                updateSectionConfig(section, (current) => ({
                  ...current,
                  canais_avancado: { ...current.canais_avancado, canal_logs: value },
                }))
            )}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => loadSection(section)} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </GlassButton>
            <GlassButton variant="primary" onClick={() => saveSection(section)} disabled={isSaving}>
              <Save className="w-4 h-4" />
              Salvar
            </GlassButton>
          </div>
        </div>
      );
    }

    if (section === "protecaogeral_cargos") {
      const advanced = config.cargos_avancado || {};
      return (
        <div className="space-y-6">
          {renderLimitIntervalBlock("Criação", "Limite de criação de cargos.", config.criacao, (next) =>
            updateSectionConfig(section, (current) => ({ ...current, criacao: next }))
          )}
          {renderLimitIntervalBlock("Edição", "Limite de edição de cargos.", config.edicao, (next) =>
            updateSectionConfig(section, (current) => ({ ...current, edicao: next }))
          )}
          {renderLimitIntervalBlock("Exclusão", "Limite de exclusão de cargos.", config.exclusao, (next) =>
            updateSectionConfig(section, (current) => ({ ...current, exclusao: next }))
          )}
          <SettingsRow
            label="Punição"
            description="Ação ao detectar infração"
            control={renderPunishmentSelect(section, advanced.punicao || "none", (value) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                cargos_avancado: { ...current.cargos_avancado, punicao: value },
              }))
            )}
          />
          {renderRoleMultiSelect(
            "Cargos imunes",
            "Cargos que não serão punidos",
            toIdList(advanced.cargos_imunes),
            (next) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                cargos_avancado: { ...current.cargos_avancado, cargos_imunes: next },
              }))
          )}
          <SettingsRow
            label="Canal de logs"
            description="Onde enviar os registros"
            control={renderLogsSelect(
              advanced.canal_logs ? String(advanced.canal_logs) : null,
              (value) =>
                updateSectionConfig(section, (current) => ({
                  ...current,
                  cargos_avancado: { ...current.cargos_avancado, canal_logs: value },
                }))
            )}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => loadSection(section)} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </GlassButton>
            <GlassButton variant="primary" onClick={() => saveSection(section)} disabled={isSaving}>
              <Save className="w-4 h-4" />
              Salvar
            </GlassButton>
          </div>
        </div>
      );
    }

    if (section === "protecaogeral_webhooks") {
      const advanced = config.webhooks_avancado || {};
      return (
        <div className="space-y-6">
          {renderLimitIntervalBlock("Webhooks", "Limite de criação/remoção de webhooks.", config.webhooks, (next) =>
            updateSectionConfig(section, (current) => ({ ...current, webhooks: next }))
          )}
          <SettingsRow
            label="Punição"
            description="Ação ao detectar infração"
            control={renderPunishmentSelect(section, advanced.punicao || "ban", (value) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                webhooks_avancado: { ...current.webhooks_avancado, punicao: value },
              }))
            )}
          />
          {renderRoleMultiSelect(
            "Cargos imunes",
            "Cargos que não serão punidos",
            toIdList(advanced.cargos_imunes),
            (next) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                webhooks_avancado: { ...current.webhooks_avancado, cargos_imunes: next },
              }))
          )}
          <SettingsRow
            label="Canal de logs"
            description="Onde enviar os registros"
            control={renderLogsSelect(
              advanced.canal_logs ? String(advanced.canal_logs) : null,
              (value) =>
                updateSectionConfig(section, (current) => ({
                  ...current,
                  webhooks_avancado: { ...current.webhooks_avancado, canal_logs: value },
                }))
            )}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => loadSection(section)} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </GlassButton>
            <GlassButton variant="primary" onClick={() => saveSection(section)} disabled={isSaving}>
              <Save className="w-4 h-4" />
              Salvar
            </GlassButton>
          </div>
        </div>
      );
    }

    if (section === "protecaogeral_comandosext") {
      const advanced = config.comandosext_avancado || {};
      const botsValue = toIdList(advanced.bots_permitidos).join(", ");
      return (
        <div className="space-y-6">
          {renderLimitIntervalBlock("Comandos externos", "Limite de comandos externos executados.", config.comandosext, (next) =>
            updateSectionConfig(section, (current) => ({ ...current, comandosext: next }))
          )}
          <SettingsRow
            label="Punição"
            description="Ação ao detectar infração"
            control={renderPunishmentSelect(section, advanced.punicao || "none", (value) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                comandosext_avancado: { ...current.comandosext_avancado, punicao: value },
              }))
            )}
          />
          <div>
            <label className="text-sm font-medium mb-2 block">Bots permitidos</label>
            <p className="text-xs text-muted-foreground mb-2">IDs dos bots que podem executar comandos</p>
            <GlassInput
              value={botsValue}
              onChange={(event) => {
                const next = parseIdList(event.target.value || "");
                updateSectionConfig(section, (current) => ({
                  ...current,
                  comandosext_avancado: { ...current.comandosext_avancado, bots_permitidos: next },
                }));
              }}
              placeholder="Ex: 123456789, 987654321"
            />
          </div>
          <SettingsRow
            label="Canal de logs"
            description="Onde enviar os registros"
            control={renderLogsSelect(
              advanced.canal_logs ? String(advanced.canal_logs) : null,
              (value) =>
                updateSectionConfig(section, (current) => ({
                  ...current,
                  comandosext_avancado: { ...current.comandosext_avancado, canal_logs: value },
                }))
            )}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => loadSection(section)} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </GlassButton>
            <GlassButton variant="primary" onClick={() => saveSection(section)} disabled={isSaving}>
              <Save className="w-4 h-4" />
              Salvar
            </GlassButton>
          </div>
        </div>
      );
    }

    if (section === "protecaogeral_banimentos") {
      const advanced = config.banimentos_avancado || {};
      return (
        <div className="space-y-6">
          {renderLimitIntervalBlock("Banimentos", "Limite de banimentos por período.", config.banimento, (next) =>
            updateSectionConfig(section, (current) => ({ ...current, banimento: next }))
          )}
          <SettingsRow
            label="Punição"
            description="Ação ao detectar infração"
            control={renderPunishmentSelect(section, advanced.punicao || "none", (value) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                banimentos_avancado: { ...current.banimentos_avancado, punicao: value },
              }))
            )}
          />
          {renderRoleMultiSelect(
            "Cargos imunes",
            "Cargos que não serão punidos",
            toIdList(advanced.cargos_imunes),
            (next) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                banimentos_avancado: { ...current.banimentos_avancado, cargos_imunes: next },
              }))
          )}
          <SettingsRow
            label="Canal de logs"
            description="Onde enviar os registros"
            control={renderLogsSelect(
              advanced.canal_logs ? String(advanced.canal_logs) : null,
              (value) =>
                updateSectionConfig(section, (current) => ({
                  ...current,
                  banimentos_avancado: { ...current.banimentos_avancado, canal_logs: value },
                }))
            )}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => loadSection(section)} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </GlassButton>
            <GlassButton variant="primary" onClick={() => saveSection(section)} disabled={isSaving}>
              <Save className="w-4 h-4" />
              Salvar
            </GlassButton>
          </div>
        </div>
      );
    }

    if (section === "protecaogeral_expulsoes") {
      const advanced = config.expulsoes_avancado || {};
      return (
        <div className="space-y-6">
          {renderLimitIntervalBlock("Expulsões", "Limite de expulsões por período.", config.expulsoes, (next) =>
            updateSectionConfig(section, (current) => ({ ...current, expulsoes: next }))
          )}
          <SettingsRow
            label="Punição"
            description="Ação ao detectar infração"
            control={renderPunishmentSelect(section, advanced.punicao || "none", (value) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                expulsoes_avancado: { ...current.expulsoes_avancado, punicao: value },
              }))
            )}
          />
          {renderRoleMultiSelect(
            "Cargos imunes",
            "Cargos que não serão punidos",
            toIdList(advanced.cargos_imunes),
            (next) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                expulsoes_avancado: { ...current.expulsoes_avancado, cargos_imunes: next },
              }))
          )}
          <SettingsRow
            label="Canal de logs"
            description="Onde enviar os registros"
            control={renderLogsSelect(
              advanced.canal_logs ? String(advanced.canal_logs) : null,
              (value) =>
                updateSectionConfig(section, (current) => ({
                  ...current,
                  expulsoes_avancado: { ...current.expulsoes_avancado, canal_logs: value },
                }))
            )}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => loadSection(section)} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </GlassButton>
            <GlassButton variant="primary" onClick={() => saveSection(section)} disabled={isSaving}>
              <Save className="w-4 h-4" />
              Salvar
            </GlassButton>
          </div>
        </div>
      );
    }

    return null;
  };

  const renderPrivSection = (section: string) => {
    const config = getConfig(section);
    const isLoading = loading[section];
    const isSaving = saving[section];
    const error = errors[section];

    if (section === "privatizacoes_cargos") {
      const advanced = config.privatizacao_cargos_avancado || {};
      return (
        <div className="space-y-6">
          <SettingsRow
            label="Ativar proteção"
            description="Protege cargos marcados como privados"
            control={
              <Switch
                checked={Boolean(config.privatizacao_cargos?.ativado)}
                onCheckedChange={(checked) =>
                  updateSectionConfig(section, (current) => ({
                    ...current,
                    privatizacao_cargos: { ...current.privatizacao_cargos, ativado: checked },
                  }))
                }
              />
            }
          />
          <SettingsRow
            label="Punição"
            description="Ação ao detectar infração"
            control={renderPunishmentSelect(section, advanced.punicao || "none", (value) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                privatizacao_cargos_avancado: { ...current.privatizacao_cargos_avancado, punicao: value },
              }))
            )}
          />
          {renderRoleMultiSelect(
            "Cargos privados",
            "Cargos que não podem ser atribuídos",
            toIdList(advanced.cargos_privados),
            (next) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                privatizacao_cargos_avancado: { ...current.privatizacao_cargos_avancado, cargos_privados: next },
              }))
          )}
          {renderRoleMultiSelect(
            "Cargos imunes",
            "Cargos que não serão punidos",
            toIdList(advanced.cargos_imunes),
            (next) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                privatizacao_cargos_avancado: { ...current.privatizacao_cargos_avancado, cargos_imunes: next },
              }))
          )}
          <SettingsRow
            label="Canal de logs"
            description="Onde enviar os registros"
            control={renderLogsSelect(
              advanced.canal_logs ? String(advanced.canal_logs) : null,
              (value) =>
                updateSectionConfig(section, (current) => ({
                  ...current,
                  privatizacao_cargos_avancado: { ...current.privatizacao_cargos_avancado, canal_logs: value },
                }))
            )}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => loadSection(section)} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </GlassButton>
            <GlassButton variant="primary" onClick={() => saveSection(section)} disabled={isSaving}>
              <Save className="w-4 h-4" />
              Salvar
            </GlassButton>
          </div>
        </div>
      );
    }

    if (
      section === "privatizacoes_perms" ||
      section === "privatizacoes_mencoes" ||
      section === "privatizacoes_apps" ||
      section === "privatizacoes_urls"
    ) {
      const baseKey = section.replace("privatizacoes_", "privatizacao_");
      const advancedKey = `${baseKey}_avancado`;
      const advanced = config[advancedKey] || {};
      const toggle = config[baseKey] || {};
      return (
        <div className="space-y-6">
          <SettingsRow
            label="Ativar proteção"
            description="Bloqueia ações desta categoria"
            control={
              <Switch
                checked={Boolean(toggle.ativado)}
                onCheckedChange={(checked) =>
                  updateSectionConfig(section, (current) => ({
                    ...current,
                    [baseKey]: { ...current[baseKey], ativado: checked },
                  }))
                }
              />
            }
          />
          <SettingsRow
            label="Punição"
            description="Ação ao detectar infração"
            control={renderPunishmentSelect(section, advanced.punicao || "none", (value) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                [advancedKey]: { ...current[advancedKey], punicao: value },
              }))
            )}
          />
          {renderRoleMultiSelect(
            "Cargos imunes",
            "Cargos que não serão punidos",
            toIdList(advanced.cargos_imunes),
            (next) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                [advancedKey]: { ...current[advancedKey], cargos_imunes: next },
              }))
          )}
          <SettingsRow
            label="Canal de logs"
            description="Onde enviar os registros"
            control={renderLogsSelect(
              advanced.canal_logs ? String(advanced.canal_logs) : null,
              (value) =>
                updateSectionConfig(section, (current) => ({
                  ...current,
                  [advancedKey]: { ...current[advancedKey], canal_logs: value },
                }))
            )}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => loadSection(section)} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </GlassButton>
            <GlassButton variant="primary" onClick={() => saveSection(section)} disabled={isSaving}>
              <Save className="w-4 h-4" />
              Salvar
            </GlassButton>
          </div>
        </div>
      );
    }

    if (section === "privatizacoes_persistencia") {
      const advanced = config.persistencia_canais_avancado || {};
      return (
        <div className="space-y-6">
          <SettingsRow
            label="Ativar proteção"
            description="Protege canais contra exclusão"
            control={
              <Switch
                checked={Boolean(config.persistencia_canais?.ativado)}
                onCheckedChange={(checked) =>
                  updateSectionConfig(section, (current) => ({
                    ...current,
                    persistencia_canais: { ...current.persistencia_canais, ativado: checked },
                  }))
                }
              />
            }
          />
          <SettingsRow
            label="Punição"
            description="Ação ao detectar infração"
            control={renderPunishmentSelect(section, advanced.punicao || "none", (value) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                persistencia_canais_avancado: { ...current.persistencia_canais_avancado, punicao: value },
              }))
            )}
          />
          {renderRoleMultiSelect(
            "Cargos imunes",
            "Cargos que não serão punidos",
            toIdList(advanced.cargos_imunes),
            (next) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                persistencia_canais_avancado: { ...current.persistencia_canais_avancado, cargos_imunes: next },
              }))
          )}
          {renderCategoryMultiSelect(
            "Categorias imunes",
            "Categorias que ignoram a proteção",
            toIdList(advanced.categorias_imunes),
            (next) =>
              updateSectionConfig(section, (current) => ({
                ...current,
                persistencia_canais_avancado: { ...current.persistencia_canais_avancado, categorias_imunes: next },
              }))
          )}
          <SettingsRow
            label="Canal de logs"
            description="Onde enviar os registros"
            control={renderLogsSelect(
              advanced.canal_logs ? String(advanced.canal_logs) : null,
              (value) =>
                updateSectionConfig(section, (current) => ({
                  ...current,
                  persistencia_canais_avancado: { ...current.persistencia_canais_avancado, canal_logs: value },
                }))
            )}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <GlassButton variant="ghost" onClick={() => loadSection(section)} disabled={isLoading}>
              <RefreshCw className="w-4 h-4" />
              Atualizar
            </GlassButton>
            <GlassButton variant="primary" onClick={() => saveSection(section)} disabled={isSaving}>
              <Save className="w-4 h-4" />
              Salvar
            </GlassButton>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Proteção</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Configure proteções e permissões do servidor
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-white/[0.03] border border-white/5 p-1 rounded-xl">
          <TabsTrigger value="internal" className="rounded-lg data-[state=active]:bg-white/10">
            <Users className="w-4 h-4 mr-2" />
            Permissões Internas
          </TabsTrigger>
          <TabsTrigger value="general" className="rounded-lg data-[state=active]:bg-white/10">
            <Shield className="w-4 h-4 mr-2" />
            Proteção Geral
          </TabsTrigger>
          <TabsTrigger value="privatizations" className="rounded-lg data-[state=active]:bg-white/10">
            <Lock className="w-4 h-4 mr-2" />
            Privatizações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internal">
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Permissões Internas"
              description="Este módulo ainda será liberado no painel do bot."
            />
            <div className="text-sm text-muted-foreground">
              Em breve você poderá configurar permissões internas diretamente pelo dashboard.
            </div>
          </GlassCard>
        </TabsContent>

        <TabsContent value="general">
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Proteção Geral"
              description="Proteja o servidor contra ações maliciosas"
            />
            <Tabs value={generalTab} onValueChange={setGeneralTab} className="space-y-4">
              <TabsList className="bg-white/[0.03] border border-white/5 p-1 rounded-xl">
                {GENERAL_SECTIONS.map((item) => (
                  <TabsTrigger key={item.key} value={item.key} className="rounded-lg data-[state=active]:bg-white/10">
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {GENERAL_SECTIONS.map((item) => (
                <TabsContent key={item.key} value={item.key}>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    {renderGeneralSection(item.key)}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </GlassCard>
        </TabsContent>

        <TabsContent value="privatizations">
          <GlassCard className="p-5" hover={false}>
            <SectionHeader
              title="Privatizações"
              description="Controle o que pode ser alterado no servidor"
            />
            <Tabs value={privTab} onValueChange={setPrivTab} className="space-y-4">
              <TabsList className="bg-white/[0.03] border border-white/5 p-1 rounded-xl">
                {PRIV_SECTIONS.map((item) => (
                  <TabsTrigger key={item.key} value={item.key} className="rounded-lg data-[state=active]:bg-white/10">
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {PRIV_SECTIONS.map((item) => (
                <TabsContent key={item.key} value={item.key}>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.description}</p>
                    </div>
                    {renderPrivSection(item.key)}
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </GlassCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
