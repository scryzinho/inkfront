function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_INKCLOUD_API_URL as string | undefined)?.replace(/\/+$/, "");
  return envUrl || "http://localhost:9000";
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  return response;
}

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

export async function fetchEarnings(period: string) {
  const response = await apiRequest(`/api/earnings?period=${encodeURIComponent(period)}`, { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Earnings error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return {
    stats: (data.stats || {}) as EarningsStats,
    series: (data.series || []) as EarningsSeriesPoint[],
  };
}

export async function exportEarnings(): Promise<string> {
  const response = await apiRequest("/api/earnings/export", { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Earnings export error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.content || "";
}
