import { useEffect, useState } from "react";
import {
  TrendingUp,
  Download,
  Calendar,
  Filter,
  DollarSign,
  ShoppingCart,
  RotateCcw,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import { StatCard } from "@/components/dashboard/StatCard";
import { formatCurrency } from "@/lib/format";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { exportEarnings, fetchEarnings, type EarningsSeriesPoint, type EarningsStats } from "@/lib/api/earnings";

export default function EarningsPage() {
  const [period, setPeriod] = useState("7d");
  const [chartType, setChartType] = useState<"line" | "bar">("line");
  const [series, setSeries] = useState<EarningsSeriesPoint[]>([]);
  const [stats, setStats] = useState<EarningsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchEarnings(period)
      .then((data) => {
        if (!mounted) return;
        setSeries(data.series || []);
        setStats(data.stats || null);
      })
      .catch(() => {
        if (!mounted) return;
        setSeries([]);
        setStats(null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [period]);

  const totalRevenue = stats?.total_revenue || 0;
  const totalOrders = stats?.total_purchases || 0;
  const totalRefunds = 0;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const handleExport = async () => {
    try {
      setExporting(true);
      const content = await exportEarnings();
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rendimentos_export_${new Date().toISOString().replace(/[:.]/g, "-")}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rendimentos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Acompanhe seus ganhos e métricas financeiras
        </p>
      </div>

      {/* Filters */}
      <GlassCard className="p-4" hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Período:</span>
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              {["7d", "30d", "90d", "1a"].map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    period === p
                      ? "bg-white/10 text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : p === "90d" ? "90 dias" : "1 ano"}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setChartType("line")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  chartType === "line"
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Linha
              </button>
              <button
                onClick={() => setChartType("bar")}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  chartType === "bar"
                    ? "bg-white/10 text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Barras
              </button>
            </div>
            <GlassButton size="sm" onClick={handleExport}>
              <Download className="w-4 h-4" />
              {exporting ? "Exportando..." : "Exportar"}
            </GlassButton>
          </div>
        </div>
      </GlassCard>

      {/* Stats Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Receita Total"
          value={formatCurrency(totalRevenue)}
          icon={DollarSign}
          trend={{ value: 15.2, isPositive: true }}
        />
        <StatCard
          title="Total de Pedidos"
          value={totalOrders}
          icon={ShoppingCart}
          trend={{ value: 8.4, isPositive: true }}
        />
        <StatCard
          title="Ticket Médio"
          value={formatCurrency(avgOrderValue)}
          icon={TrendingUp}
          trend={{ value: 3.1, isPositive: true }}
        />
        <StatCard
          title="Reembolsos"
          value={totalRefunds}
          icon={RotateCcw}
          trend={{ value: 2.0, isPositive: false }}
        />
      </div>

      {/* Revenue Chart */}
      <GlassCard className="p-5" hover={false}>
        <SectionHeader
          title="Receita por Período"
          description={`Últimos ${period === "7d" ? "7 dias" : period === "30d" ? "30 dias" : period === "90d" ? "90 dias" : "12 meses"}`}
        />
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "line" ? (
              <LineChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => `R$${v}`}
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
                  dataKey="revenue"
                  stroke="hsl(var(--foreground))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--foreground))", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              <BarChart data={series}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={11}
                  tickFormatter={(v) => `R$${v}`}
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
                <Bar
                  dataKey="revenue"
                  fill="hsl(var(--foreground))"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </GlassCard>

      {/* Orders Chart */}
      <GlassCard className="p-5" hover={false}>
        <SectionHeader
          title="Pedidos por Período"
          description="Quantidade de pedidos realizados"
        />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
                tickFormatter={(v) => new Date(v).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={11}
              />
              <Tooltip
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
                formatter={(value: number, name: string) => [
                  value,
                  name === "orders" ? "Pedidos" : "Reembolsos",
                ]}
                labelFormatter={(label) => new Date(label).toLocaleDateString("pt-BR")}
              />
              <Bar
                dataKey="orders"
                fill="hsl(var(--foreground))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="refunds"
                fill="hsl(var(--destructive))"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </GlassCard>
    </div>
  );
}
