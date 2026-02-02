import { getSelectedTenantId } from "@/lib/tenant";

export type StoreOverview = {
  products_total: number;
  products_active: number;
  products_inactive: number;
  products_out_of_stock: number;
  revenue_total: number;
};

export type StoreProduct = {
  id: string;
  name: string;
  info: any;
  campos: Record<string, any>;
  categorias: Record<string, any>;
  messages: any[];
  cupons: Record<string, any>;
  min_price: number;
  max_price: number;
  stock_total: number | null;
  has_infinite_stock: boolean;
  updated_at: number | null;
};

export type StoreChannel = {
  id: string;
  name: string;
  type: number;
};

export type StoreRole = {
  id: string;
  name: string;
};

export type StoreCustomization = {
  purchase_event: {
    color: string;
    image: string;
  };
  feedback_incentive: {
    message: string;
    button_text: string;
  };
  doubt_button: {
    enabled: boolean;
    button_label: string;
    button_emoji: string;
    channel_id: string;
    message: string;
  };
  qr_customization: {
    enabled: boolean;
    color: string;
    background_color: string;
    logo_url: string;
    logo_size: number;
    corner_style: string;
  };
};

export type StoreMetrics = {
  revenue_7d: number;
  orders_7d: number;
  revenue_by_day: Array<{ date: string; amount: number }>;
  products_active: number;
  products_out_of_stock: number;
  products_low_stock: number;
  conversion_rate: number;
  unique_customers_7d: number;
};

export type StoreCustomer = {
  id: string;
  username: string;
  avatar: string | null;
  total_spent: number;
  total_purchases: number;
  first_purchase?: number | null;
  last_purchase?: number | null;
};

export type StoreSaldoConfig = {
  enabled: boolean;
  bonus: { type: "disabled" | "percentage" | "fixed"; value: number };
  rules: {
    max_usage_percentage: number;
    max_usage_amount: number | null;
    min_usage_amount: number;
    allow_partial_payment: boolean;
  };
  deposit_panel: {
    message_style: "embed" | "content" | "container";
    embed: {
      title: string;
      description: string;
      color: string;
      image_url: string | null;
      thumbnail_url: string | null;
    };
    content: {
      content: string;
      image_url: string | null;
    };
    container: {
      content: string;
      color: string;
      image_url: string | null;
      thumbnail_url: string | null;
    };
    button: {
      label: string;
      emoji: string | null;
      style: "green" | "grey" | "red" | "blue";
    };
    channel_id: string | null;
    message_id: string | null;
    category_id: string | null;
  };
  deposit_settings: {
    min_deposit: number;
    max_deposit: number;
    terms: string | null;
    notify_role_id: string | null;
  };
};

export type StoreCashbackConfig = {
  enabled: boolean;
  default_percentage: number;
  max_cashback: number | null;
  rules: Array<{ role_id: string; role_name?: string; multiplier: number }>;
};

export type StoreSaldoUser = {
  id: string;
  username: string;
  avatar: string | null;
  balance: number;
  total_deposited: number;
  total_used: number;
  last_transaction?: number | null;
};

export type StorePreferences = {
  cart_duration_minutes: number;
  office_hours: {
    enabled: boolean;
    start_time: string;
    end_time: string;
    off_days: string[];
    message: string;
  };
  terms: {
    enabled: boolean;
    text: string;
  };
  transcript_enabled: boolean;
  transcript_channel_id: string;
  stock_requests: {
    enabled: boolean;
    channel_id: string;
    role_id: string;
  };
  maintenance: {
    enabled: boolean;
    message: string;
    allow_admins: boolean;
  };
};

function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_INKCLOUD_API_URL as string | undefined)?.replace(/\/+$/, "");
  return envUrl || "http://localhost:9000";
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const baseUrl = getApiBaseUrl();
  const tenantId = getSelectedTenantId();
  const doFetch = () =>
    fetch(`${baseUrl}${path}`, {
      ...options,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
        ...(options.headers || {})
      }
    });
  try {
    return await doFetch();
  } catch (error) {
    // one fast retry for transient network errors
    await new Promise((resolve) => setTimeout(resolve, 200));
    return await doFetch();
  }
}

export async function fetchStoreOverview(): Promise<StoreOverview> {
  const response = await apiRequest("/api/store/overview", { method: "GET" });
  if (!response.ok) {
    throw new Error(`Store overview error (${response.status})`);
  }
  return response.json();
}

export async function fetchStoreMetrics(tenantOverride?: string | null): Promise<StoreMetrics> {
  const response = await apiRequest("/api/store/metrics", {
    method: "GET",
    headers: tenantOverride ? { "X-Tenant-Id": tenantOverride } : undefined
  });
  if (!response.ok) {
    throw new Error(`Store metrics error (${response.status})`);
  }
  return response.json();
}

export async function fetchStoreCustomization(): Promise<StoreCustomization> {
  const response = await apiRequest("/api/store/customization", { method: "GET" });
  if (!response.ok) {
    throw new Error(`Store customization error (${response.status})`);
  }
  return response.json();
}

export async function fetchStorePreferences(): Promise<StorePreferences> {
  const response = await apiRequest("/api/store/preferences", { method: "GET" });
  if (!response.ok) {
    throw new Error(`Store preferences error (${response.status})`);
  }
  return response.json();
}

export async function updateStorePreferences(
  payload: Partial<StorePreferences>
): Promise<StorePreferences> {
  const response = await apiRequest("/api/store/preferences", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Store preferences update error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function fetchStoreRoles(): Promise<StoreRole[]> {
  const response = await apiRequest("/api/store/roles", { method: "GET" });
  if (!response.ok) {
    throw new Error(`Roles error (${response.status})`);
  }
  const data = await response.json();
  return data.roles || [];
}

export async function updateStoreCustomization(
  payload: Partial<StoreCustomization>
): Promise<StoreCustomization> {
  const response = await apiRequest("/api/store/customization", {
    method: "PUT",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Store customization update error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function uploadStoreCustomizationImage(
  type: "purchase_event" | "qr_logo",
  file: File
): Promise<{ url: string }> {
  const baseUrl = getApiBaseUrl();
  const tenantId = getSelectedTenantId();
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${baseUrl}/api/store/customization/image?type=${encodeURIComponent(type)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {})
    },
    body: form
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload customization image error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function fetchStoreProducts(): Promise<StoreProduct[]> {
  const response = await apiRequest("/api/store/products", { method: "GET" });
  if (!response.ok) {
    throw new Error(`Store products error (${response.status})`);
  }
  const data = await response.json();
  return data.products || [];
}

export async function createStoreProduct(payload: {
  name: string;
  description?: string | null;
  banner?: string | null;
  hex_color?: string | null;
  delivery_type?: string | null;
  buy_button?: { label: string; emoji?: string | null };
  campos?: Record<string, any>;
}): Promise<StoreProduct> {
  const response = await apiRequest("/api/store/product", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Create product error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.product;
}

export async function updateStoreProduct(productId: string, product: any): Promise<StoreProduct> {
  const response = await apiRequest(`/api/store/product/${productId}`, {
    method: "PUT",
    body: JSON.stringify({ product })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Update product error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.product;
}

export async function deleteStoreProduct(productId: string): Promise<void> {
  const response = await apiRequest(`/api/store/product/${productId}`, { method: "DELETE" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Delete product error (${response.status}): ${text || "unknown"}`);
  }
}

export async function duplicateStoreProduct(productId: string, duplicateStock = true): Promise<StoreProduct> {
  const response = await apiRequest(`/api/store/product/${productId}/duplicate`, {
    method: "POST",
    body: JSON.stringify({ duplicate_stock: duplicateStock })
  });
  if (!response.ok) {
    throw new Error(`Duplicate product error (${response.status})`);
  }
  const data = await response.json();
  return data.product;
}

export async function fetchStoreChannels(includeCategories = false, includeVoice = false): Promise<StoreChannel[]> {
  const query = new URLSearchParams();
  if (includeCategories) query.set("include_categories", "true");
  if (includeVoice) query.set("include_voice", "true");
  const response = await apiRequest(`/api/store/channels?${query.toString()}`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Channels error (${response.status})`);
  }
  const data = await response.json();
  return data.channels || [];
}

export async function fetchStoreCustomers(): Promise<StoreCustomer[]> {
  const response = await apiRequest("/api/store/customers", { method: "GET" });
  if (!response.ok) {
    throw new Error(`Customers error (${response.status})`);
  }
  const data = await response.json();
  return data.customers || [];
}

export async function syncStoreCustomers(): Promise<{ status: string; customers: number }> {
  const response = await apiRequest("/api/store/customers/sync", { method: "POST" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Sync customers error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function fetchSaldoConfig(): Promise<StoreSaldoConfig> {
  const response = await apiRequest("/api/store/saldo-config", { method: "GET" });
  if (!response.ok) {
    throw new Error(`Saldo config error (${response.status})`);
  }
  return response.json();
}

export async function updateSaldoConfig(payload: Partial<StoreSaldoConfig>): Promise<StoreSaldoConfig> {
  const response = await apiRequest("/api/store/saldo-config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Saldo config update error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function fetchCashbackConfig(): Promise<StoreCashbackConfig> {
  const response = await apiRequest("/api/store/cashback-config", { method: "GET" });
  if (!response.ok) {
    throw new Error(`Cashback config error (${response.status})`);
  }
  return response.json();
}

export async function updateCashbackConfig(
  payload: Partial<StoreCashbackConfig>
): Promise<StoreCashbackConfig> {
  const response = await apiRequest("/api/store/cashback-config", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cashback config update error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function fetchSaldoUsers(): Promise<StoreSaldoUser[]> {
  const response = await apiRequest("/api/store/saldo-users", { method: "GET" });
  if (!response.ok) {
    throw new Error(`Saldo users error (${response.status})`);
  }
  const data = await response.json();
  return data.users || [];
}

export async function addSaldoAdmin(payload: {
  user_id: string;
  amount: number;
  bonus?: number;
  deposit_id?: string;
  payment_method?: string;
}): Promise<{ status: string }> {
  const response = await apiRequest("/api/store/saldo-admin/add", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Saldo add error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function removeSaldoAdmin(payload: {
  user_id: string;
  amount: number;
  description?: string;
  reference_id?: string;
}): Promise<{ status: string }> {
  const response = await apiRequest("/api/store/saldo-admin/remove", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Saldo remove error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function uploadSaldoImage(
  target: "embed_image" | "embed_thumb" | "content_image" | "container_image" | "container_thumb",
  file: File
): Promise<{ url: string }> {
  const baseUrl = getApiBaseUrl();
  const tenantId = getSelectedTenantId();
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${baseUrl}/api/store/saldo/image?target=${encodeURIComponent(target)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
    },
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload saldo image error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function sendSaldoDepositPanel(channel_id: string): Promise<{ status: string; message_id?: string }> {
  const response = await apiRequest("/api/store/saldo-deposit-panel/send", {
    method: "POST",
    body: JSON.stringify({ channel_id }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Send saldo panel error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function sendProductToChannel(payload: {
  product_id: string;
  channel_id: string;
  mode?: string;
  formatted_desc?: boolean;
  image_size?: string;
  image_inside?: boolean;
}): Promise<{ status: string; message_id?: string }> {
  const response = await apiRequest("/api/store/send", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Send product error (${response.status})`);
  }
  return response.json();
}

export async function uploadProductImageForProduct(
  productId: string,
  file: File
): Promise<{ image_url: string }> {
  const baseUrl = getApiBaseUrl();
  const tenantId = getSelectedTenantId();
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(`${baseUrl}/api/store/products/${productId}/image`, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {})
    },
    body: form
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Upload image error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function fetchStockItems(params: {
  product_id: string;
  field_id: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: string[]; total: number; is_infinite: boolean; infinite_value?: string | null }> {
  const query = new URLSearchParams();
  query.set("product_id", params.product_id);
  query.set("field_id", params.field_id);
  if (typeof params.limit === "number") query.set("limit", String(params.limit));
  if (typeof params.offset === "number") query.set("offset", String(params.offset));
  const response = await apiRequest(`/api/store/stock?${query.toString()}`, { method: "GET" });
  if (!response.ok) {
    throw new Error(`Stock fetch error (${response.status})`);
  }
  return response.json();
}

export async function addStockItems(payload: {
  product_id: string;
  field_id: string;
  items: string[];
}): Promise<{ status: string; added: number }> {
  const response = await apiRequest("/api/store/stock/add", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Stock add error (${response.status})`);
  }
  return response.json();
}

export async function setInfiniteStock(payload: {
  product_id: string;
  field_id: string;
  value: string;
}): Promise<{ status: string }> {
  const response = await apiRequest("/api/store/stock/infinite", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Stock infinite error (${response.status})`);
  }
  return response.json();
}

export async function clearStockItems(payload: {
  product_id: string;
  field_id: string;
}): Promise<{ status: string }> {
  const response = await apiRequest("/api/store/stock/clear", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Stock clear error (${response.status})`);
  }
  return response.json();
}

export async function pullStockItems(payload: {
  product_id: string;
  field_id: string;
  quantity: number;
}): Promise<{ items: string[] }> {
  const response = await apiRequest("/api/store/stock/pull", {
    method: "POST",
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    throw new Error(`Stock pull error (${response.status})`);
  }
  return response.json();
}
