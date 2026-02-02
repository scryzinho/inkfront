import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Power,
  RefreshCw,
  FileText,
  Server,
  Users,
  Hash,
  Sparkles,
  ShieldCheck,
  ShoppingBag,
  TrendingUp,
  Package,
  AlertTriangle,
  Ticket,
  Clock,
  Layout,
  Plus,
  CreditCard,
  Settings,
  Shield,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { StatCard } from "@/components/dashboard/StatCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { mockTicketStats, mockAlerts } from "@/lib/mock-data";
import { formatCurrency, formatRelativeTime, formatNumber, getStatusColor, getStatusBgColor } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  fetchDashboardOverview,
  type DashboardOverviewResponse,
  type DashboardGuildOverview,
} from "@/lib/api/dashboard";
import { fetchStoreMetrics, type StoreMetrics } from "@/lib/api/store";
import { useTenant } from "@/lib/tenant";

const DEFAULT_GUILD_PERMISSIONS = {
  admin: false,
  manageChannels: false,
  manageRoles: false,
  manageMessages: false,
};

const DEFAULT_GUILD_OVERVIEW: DashboardGuildOverview = {
  guild_id: "—",
  name: "Nenhum servidor conectado",
  icon: "https://cdn.discordapp.com/embed/avatars/0.png",
  members: 0,
  channels: 0,
  roles: 0,
  boosts: 0,
  permissions: DEFAULT_GUILD_PERMISSIONS,
};

const DEFAULT_BOT_AVATAR = "https://cdn.discordapp.com/embed/avatars/0.png";

function formatUptime(seconds?: number | null) {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) {
    return "—";
  }
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const segments = [];
  if (days > 0) {
    segments.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    segments.push(`${hours}h`);
  }
  segments.push(`${minutes}m`);
  return segments.join(" ");
}

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { tenantId } = useTenant();
  const [overview, setOverview] = useState<DashboardOverviewResponse | null>(null);
  const [storeMetrics, setStoreMetrics] = useState<StoreMetrics | null>(null);
  const [overviewError, setOverviewError] = useState<string | null>(null);
  const refreshInFlight = useRef(false);

  useEffect(() => {
    if (!tenantId) return;
    let mounted = true;
    const currentTenant = tenantId;
    const refreshOverview = async () => {
      if (refreshInFlight.current) return;
      refreshInFlight.current = true;
      setOverviewError(null);
      try {
        const [data, metrics] = await Promise.all([
          fetchDashboardOverview(currentTenant),
          fetchStoreMetrics(currentTenant),
        ]);
        if (!mounted) return;
        if (currentTenant !== tenantId) return;
        setOverview(data);
        setStoreMetrics(metrics);
      } catch (error) {
        if (!mounted) return;
        if (currentTenant !== tenantId) return;
        console.error("[dashboard] overview", error);
        setOverviewError(
          error instanceof Error
            ? error.message
            : "Não foi possível carregar os dados do painel."
        );
        setOverview(null);
        setStoreMetrics(null);
      } finally {
        refreshInFlight.current = false;
      }
    };

    setOverview(null);
    setStoreMetrics(null);
    setOverviewError(null);
    refreshOverview();
    const intervalId = window.setInterval(refreshOverview, 20000);
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshOverview();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [tenantId]);

  const botStatus = overview?.bot || null;
  const alerts = mockAlerts.filter((a) => !a.dismissed);

  const guildSource = overview?.guild;
  const guildPermissions = guildSource?.permissions || DEFAULT_GUILD_PERMISSIONS;
  const guild = guildSource
    ? {
        id: guildSource.guild_id || DEFAULT_GUILD_OVERVIEW.guild_id,
        name: guildSource.name || DEFAULT_GUILD_OVERVIEW.name,
        icon: guildSource.icon || DEFAULT_GUILD_OVERVIEW.icon,
        members: guildSource.members ?? DEFAULT_GUILD_OVERVIEW.members,
        channels: guildSource.channels ?? DEFAULT_GUILD_OVERVIEW.channels,
        roles: guildSource.roles ?? DEFAULT_GUILD_OVERVIEW.roles,
        boosts: guildSource.boosts ?? DEFAULT_GUILD_OVERVIEW.boosts,
        permissions: guildPermissions,
      }
    : {
        id: DEFAULT_GUILD_OVERVIEW.guild_id,
        name: DEFAULT_GUILD_OVERVIEW.name,
        icon: DEFAULT_GUILD_OVERVIEW.icon,
        members: DEFAULT_GUILD_OVERVIEW.members,
        channels: DEFAULT_GUILD_OVERVIEW.channels,
        roles: DEFAULT_GUILD_OVERVIEW.roles,
        boosts: DEFAULT_GUILD_OVERVIEW.boosts,
        permissions: DEFAULT_GUILD_PERMISSIONS,
      };

  const botOnline = botStatus ? botStatus.online : false;
  const botAvatar = botStatus?.avatar ?? null;
  const botName = botStatus?.name ?? null;
  const botTitle = botName || "Bot";
  const botAvatarSrc = botAvatar || DEFAULT_BOT_AVATAR;
  const uptimeLabel = formatUptime(botStatus?.uptime_seconds);
  const versionLabel = botStatus?.version || "—";
  const heartbeatLabel = botStatus?.last_heartbeat
    ? formatRelativeTime(botStatus.last_heartbeat)
    : "—";
  const tokenStatusLabel = botStatus
    ? botStatus.token_valid
      ? "Válido"
      : "Inválido"
    : "Indisponível";
  const tokenColorClass = botStatus
    ? botStatus.token_valid
      ? "text-success"
      : "text-destructive"
    : "text-muted-foreground";

  const quickActions = [
    { label: "Criar produto", icon: Plus, route: "/dashboard/store" },
    { label: "Publicar painel", icon: Layout, route: "/dashboard/tickets" },
    { label: "Pagamentos", icon: CreditCard, route: "/dashboard/appearance" },
    { label: "Criar ticket", icon: Ticket, route: "/dashboard/tickets" },
    { label: "Proteção", icon: Shield, route: "/dashboard/protection" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Bem-vindo ao painel do seu bot inkCloud
        </p>
      </div>

      {/* Bot & Server Status Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Bot Status */}
        <GlassCard className="p-5" hover={false}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.04] overflow-hidden">
                <img
                  src={botAvatarSrc}
                  alt={botName || "Bot"}
                  className="w-full h-full object-cover"
                  onError={(event) => {
                    const target = event.currentTarget;
                    if (target.src !== DEFAULT_BOT_AVATAR) {
                      target.src = DEFAULT_BOT_AVATAR;
                    }
                  }}
                />
              </div>
              <div>
                <h3 className="font-medium">{botTitle}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      botOnline ? "bg-success" : "bg-destructive"
                    )}
                  />
                  <span className="text-sm text-muted-foreground">
                    {botOnline ? "Online" : "Offline"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <GlassButton size="sm" variant="ghost" aria-label="Reiniciar bot">
                <RefreshCw className="w-4 h-4" />
              </GlassButton>
              <GlassButton size="sm" variant="ghost" aria-label="Desligar bot">
                <Power className="w-4 h-4" />
              </GlassButton>
            </div>
          </div>

          {overviewError && (
            <p className="text-xs text-destructive mb-2">{overviewError}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-muted-foreground">Uptime</p>
              <p className="text-sm font-medium mt-0.5">{uptimeLabel}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-muted-foreground">Versão</p>
              <p className="text-sm font-medium mt-0.5">{versionLabel}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-muted-foreground">Heartbeat</p>
              <p className="text-sm font-medium mt-0.5">{heartbeatLabel}</p>
            </div>
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <p className="text-xs text-muted-foreground">Token</p>
              <p className={cn("text-sm font-medium mt-0.5", tokenColorClass)}>
                {tokenStatusLabel}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate("/dashboard/cloud")}
            className="flex items-center gap-2 mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <FileText className="w-4 h-4" />
            Ver logs
          </button>
        </GlassCard>

        {/* Server Status */}
        <GlassCard className="p-5" hover={false}>
          <div className="flex items-center gap-3 mb-4">
            <img
              src={guild.icon}
              alt=""
              className="w-10 h-10 rounded-xl"
            />
            <div>
              <h3 className="font-medium">{guild.name}</h3>
              <p className="text-sm text-muted-foreground">Servidor conectado</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <Users className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Membros</p>
                  <p className="text-sm font-medium">{formatNumber(guild.members ?? 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <Hash className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Canais</p>
                  <p className="text-sm font-medium">{formatNumber(guild.channels ?? 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <Server className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Cargos</p>
                  <p className="text-sm font-medium">{formatNumber(guild.roles ?? 0)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                <Sparkles className="w-4 h-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Boosts</p>
                  <p className="text-sm font-medium">{formatNumber(guild.boosts ?? 0)}</p>
                </div>
              </div>
          </div>

          {/* Permissions checklist */}
          <div className="flex flex-wrap gap-2">
            {Object.entries(guild.permissions).map(([key, value]) => (
              <div
                key={key}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs",
                  "bg-success/10 text-success"
                )}
              >
                <ShieldCheck className="w-3 h-3" />
                {key.replace(/([A-Z])/g, " $1").trim()}
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* Store Stats */}
      <div>
        <SectionHeader title="Loja" description="Métricas dos últimos 7 dias" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Receita (7d)"
            value={formatCurrency(storeMetrics?.revenue_7d || 0)}
            icon={TrendingUp}
          />
          <StatCard
            title="Pedidos"
            value={storeMetrics?.orders_7d ?? 0}
            icon={ShoppingBag}
          />
          <StatCard
            title="Produtos Ativos"
            value={storeMetrics?.products_active ?? 0}
            icon={Package}
          />
          <StatCard
            title="Estoque Baixo"
            value={storeMetrics?.products_low_stock ?? 0}
            icon={AlertTriangle}
            className={(storeMetrics?.products_low_stock ?? 0) > 0 ? "border-warning/30" : ""}
          />
          <StatCard
            title="Conversão"
            value={`${(storeMetrics?.conversion_rate ?? 0).toFixed(1)}%`}
            icon={TrendingUp}
          />
        </div>

        {/* Mini Revenue Chart */}
        <GlassCard className="p-5 mt-4" hover={false}>
          <h4 className="text-sm font-medium mb-4">Receita por dia</h4>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={storeMetrics?.revenue_by_day || []}>
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) =>
                    new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                  }
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => `R${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Receita"]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString("pt-BR")}
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>
      </div>

      {/* Tickets Stats */}
      <div>
        <SectionHeader title="Tickets" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Tickets Abertos"
            value={mockTicketStats.openTickets}
            icon={Ticket}
          />
          <StatCard
            title="Tempo Médio"
            value={mockTicketStats.avgResponseTime}
            icon={Clock}
          />
          <StatCard
            title="Painéis Ativos"
            value={mockTicketStats.activePanels}
            icon={Layout}
          />
          <StatCard
            title="Fechados Hoje"
            value={mockTicketStats.closedToday}
            icon={Ticket}
          />
        </div>
      </div>

      {/* Alerts & Quick Actions Row */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Alerts */}
        <GlassCard className="p-5" hover={false}>
          <SectionHeader
            title="Alertas & Recomendações"
            className="mb-4"
          />
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-xl",
                    getStatusBgColor(alert.type)
                  )}
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className={cn("w-4 h-4", getStatusColor(alert.type))} />
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                    </div>
                  </div>
                  <GlassButton
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(alert.actionRoute)}
                  >
                    {alert.action}
                  </GlassButton>
                </motion.div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum alerta no momento 🎉
            </p>
          )}
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard className="p-5" hover={false}>
          <SectionHeader title="Ações Rápidas" className="mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {quickActions.map((action) => (
              <motion.button
                key={action.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(action.route)}
                className="flex flex-col items-center gap-2 p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/10 transition-colors"
              >
                <action.icon className="w-5 h-5" />
                <span className="text-xs font-medium text-center">{action.label}</span>
              </motion.button>
            ))}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
