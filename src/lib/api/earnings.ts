import { mockEarningsData, mockProducts } from "@/lib/mock-data";
import { readMock } from "@/lib/mock-storage";

export type EarningsSeriesPoint = {
  date: string;
  revenue: number;
  orders: number;
  refunds: number;
};

export type EarningsStats = {
  total_purchases: number;
  total_revenue: number;
  total_items_sold: number;
  unique_customers: number;
  average_ticket: number;
  payment_methods: Record<string, number>;
  products_sold: Record<string, { name: string; count: number; revenue: number }>;
};

const SERIES_KEY = "inkcloud_mock_earnings_series";

function buildStats(series: EarningsSeriesPoint[]): EarningsStats {
  const totalRevenue = series.reduce((sum, item) => sum + item.revenue, 0);
  const totalOrders = series.reduce((sum, item) => sum + item.orders, 0);
  const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const productsSold: EarningsStats["products_sold"] = {};
  mockProducts.forEach((product) => {
    productsSold[product.id] = {
      name: product.name,
      count: Math.max(1, Math.round(product.sales / 5)),
      revenue: Math.max(0, product.sales) * product.price,
    };
  });
  return {
    total_purchases: totalOrders,
    total_revenue: totalRevenue,
    total_items_sold: totalOrders,
    unique_customers: 42,
    average_ticket: averageTicket,
    payment_methods: { pix: 62, card: 31, balance: 7 },
    products_sold: productsSold,
  };
}

export async function fetchEarnings(_period: string) {
  const series = readMock<EarningsSeriesPoint[]>(SERIES_KEY, mockEarningsData);
  return {
    stats: buildStats(series),
    series,
  };
}

export async function exportEarnings(): Promise<string> {
  const series = readMock<EarningsSeriesPoint[]>(SERIES_KEY, mockEarningsData);
  const header = "date,revenue,orders,refunds";
  const rows = series.map((row) => `${row.date},${row.revenue},${row.orders},${row.refunds}`);
  return [header, ...rows].join("\n");
}
