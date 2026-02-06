import { mockCustomers, mockEarningsData, mockProducts } from "@/lib/mock-data";
import { MOCK_AVATAR, MOCK_CHANNELS, MOCK_ROLES } from "@/lib/mock-shared";
import { readMock, writeMock, updateMock } from "@/lib/mock-storage";

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

const PRODUCTS_KEY = "inkcloud_mock_store_products";
const CUSTOMIZATION_KEY = "inkcloud_mock_store_customization";
const PREFS_KEY = "inkcloud_mock_store_preferences";
const SALDO_KEY = "inkcloud_mock_store_saldo";
const CASHBACK_KEY = "inkcloud_mock_store_cashback";
const SALDO_USERS_KEY = "inkcloud_mock_store_saldo_users";
const STOCK_KEY = "inkcloud_mock_store_stock";

function createObjectUrl(file: File): string {
  if (typeof URL !== "undefined" && URL.createObjectURL) {
    return URL.createObjectURL(file);
  }
  return "";
}

function buildStoreProducts(): StoreProduct[] {
  return mockProducts.map((product) => {
    const fieldId = `field_${product.id}`;
    return {
      id: product.id,
      name: product.name,
      info: {
        description: product.description,
        banner: MOCK_AVATAR,
        hex_color: "#5865F2",
        delivery_type: "automatic",
        active: product.active,
        buy_button: { label: "Comprar", emoji: "🛒" },
      },
      campos: {
        [fieldId]: {
          id: fieldId,
          name: "Padrão",
          emoji: "📦",
          pre_description: "",
          description: product.description,
          price: product.price,
          infinite_stock: { enabled: false, value: "" },
        },
      },
      categorias: { primary: product.category },
      messages: [],
      cupons: {},
      min_price: product.price,
      max_price: product.price,
      stock_total: product.stock,
      has_infinite_stock: false,
      updated_at: Date.now(),
    };
  });
}

function getProducts(): StoreProduct[] {
  return readMock<StoreProduct[]>(PRODUCTS_KEY, buildStoreProducts());
}

function saveProducts(products: StoreProduct[]) {
  writeMock(PRODUCTS_KEY, products);
}

function computeOverview(products: StoreProduct[]): StoreOverview {
  const products_total = products.length;
  const products_active = products.filter((p) => p.info?.active !== false).length;
  const products_inactive = products_total - products_active;
  const products_out_of_stock = products.filter((p) => (p.stock_total ?? 0) === 0).length;
  const revenue_total = mockEarningsData.reduce((sum, item) => sum + item.revenue, 0);
  return {
    products_total,
    products_active,
    products_inactive,
    products_out_of_stock,
    revenue_total,
  };
}

function computeMetrics(products: StoreProduct[]): StoreMetrics {
  const revenue_7d = mockEarningsData.reduce((sum, item) => sum + item.revenue, 0);
  const orders_7d = mockEarningsData.reduce((sum, item) => sum + item.orders, 0);
  const products_out_of_stock = products.filter((p) => (p.stock_total ?? 0) === 0).length;
  const products_low_stock = products.filter((p) => {
    const stock = p.stock_total ?? 0;
    return stock > 0 && stock <= 5;
  }).length;
  return {
    revenue_7d,
    orders_7d,
    revenue_by_day: mockEarningsData.map((entry) => ({ date: entry.date, amount: entry.revenue })),
    products_active: products.filter((p) => p.info?.active !== false).length,
    products_out_of_stock,
    products_low_stock,
    conversion_rate: 4.2,
    unique_customers_7d: mockCustomers.length,
  };
}

const DEFAULT_CUSTOMIZATION: StoreCustomization = {
  purchase_event: { color: "#5865F2", image: "" },
  feedback_incentive: { message: "Envie seu feedback e ganhe bônus.", button_text: "Avaliar" },
  doubt_button: {
    enabled: true,
    button_label: "Dúvidas",
    button_emoji: "❓",
    channel_id: MOCK_CHANNELS[1]?.id || "",
    message: "Fale com nossa equipe de suporte.",
  },
  qr_customization: {
    enabled: true,
    color: "#5865F2",
    background_color: "#0B0B0B",
    logo_url: MOCK_AVATAR,
    logo_size: 64,
    corner_style: "square",
  },
};

const DEFAULT_PREFERENCES: StorePreferences = {
  cart_duration_minutes: 30,
  office_hours: {
    enabled: false,
    start_time: "09:00",
    end_time: "18:00",
    off_days: ["saturday", "sunday"],
    message: "Estamos fora do horário de atendimento.",
  },
  terms: {
    enabled: true,
    text: "Ao finalizar a compra, você concorda com os termos de uso.",
  },
  transcript_enabled: true,
  transcript_channel_id: MOCK_CHANNELS[0]?.id || "",
  stock_requests: {
    enabled: true,
    channel_id: MOCK_CHANNELS[2]?.id || "",
    role_id: MOCK_ROLES[1]?.id || "",
  },
  maintenance: {
    enabled: false,
    message: "A loja está em manutenção programada.",
    allow_admins: true,
  },
};

const DEFAULT_SALDO_CONFIG: StoreSaldoConfig = {
  enabled: true,
  bonus: { type: "percentage", value: 5 },
  rules: {
    max_usage_percentage: 50,
    max_usage_amount: null,
    min_usage_amount: 5,
    allow_partial_payment: true,
  },
  deposit_panel: {
    message_style: "embed",
    embed: {
      title: "Adicionar saldo",
      description: "Escolha o valor e confirme seu depósito.",
      color: "#5865F2",
      image_url: null,
      thumbnail_url: null,
    },
    content: {
      content: "Adicione saldo e receba bônus automaticamente.",
      image_url: null,
    },
    container: {
      content: "Adicione saldo e receba bônus automaticamente.",
      color: "#5865F2",
      image_url: null,
      thumbnail_url: null,
    },
    button: {
      label: "Depositar",
      emoji: "💳",
      style: "green",
    },
    channel_id: MOCK_CHANNELS[0]?.id || null,
    message_id: null,
    category_id: null,
  },
  deposit_settings: {
    min_deposit: 10,
    max_deposit: 500,
    terms: "Sem reembolso após confirmação.",
    notify_role_id: MOCK_ROLES[0]?.id || null,
  },
};

const DEFAULT_CASHBACK_CONFIG: StoreCashbackConfig = {
  enabled: true,
  default_percentage: 2,
  max_cashback: 50,
  rules: [
    { role_id: MOCK_ROLES[2]?.id || "", role_name: MOCK_ROLES[2]?.name, multiplier: 1.5 },
  ],
};

function buildSaldoUsers(): StoreSaldoUser[] {
  return mockCustomers.map((customer) => ({
    id: customer.id,
    username: customer.username,
    avatar: customer.avatar || MOCK_AVATAR,
    balance: customer.balance,
    total_deposited: customer.totalSpent,
    total_used: Math.max(0, customer.totalSpent - customer.balance),
    last_transaction: customer.lastPurchase ? Math.floor(new Date(customer.lastPurchase).getTime() / 1000) : null,
  }));
}

type StockEntry = { items: string[]; is_infinite: boolean; infinite_value?: string | null };

function getStockStore(): Record<string, StockEntry> {
  return readMock<Record<string, StockEntry>>(STOCK_KEY, {});
}

function saveStockStore(store: Record<string, StockEntry>) {
  writeMock(STOCK_KEY, store);
}

function stockKey(productId: string, fieldId: string) {
  return `${productId}:${fieldId}`;
}

export async function fetchStoreOverview(): Promise<StoreOverview> {
  const products = getProducts();
  return computeOverview(products);
}

export async function fetchStoreMetrics(_tenantOverride?: string | null): Promise<StoreMetrics> {
  const products = getProducts();
  return computeMetrics(products);
}

export async function fetchStoreCustomization(): Promise<StoreCustomization> {
  return readMock<StoreCustomization>(CUSTOMIZATION_KEY, DEFAULT_CUSTOMIZATION);
}

export async function fetchStorePreferences(): Promise<StorePreferences> {
  return readMock<StorePreferences>(PREFS_KEY, DEFAULT_PREFERENCES);
}

export async function updateStorePreferences(
  payload: Partial<StorePreferences>
): Promise<StorePreferences> {
  const current = readMock<StorePreferences>(PREFS_KEY, DEFAULT_PREFERENCES);
  const next = { ...current, ...payload };
  return writeMock<StorePreferences>(PREFS_KEY, next);
}

export async function fetchStoreRoles(): Promise<StoreRole[]> {
  return MOCK_ROLES as StoreRole[];
}

export async function updateStoreCustomization(
  payload: Partial<StoreCustomization>
): Promise<StoreCustomization> {
  const current = readMock<StoreCustomization>(CUSTOMIZATION_KEY, DEFAULT_CUSTOMIZATION);
  const next = { ...current, ...payload };
  return writeMock<StoreCustomization>(CUSTOMIZATION_KEY, next);
}

export async function uploadStoreCustomizationImage(
  _type: "purchase_event" | "qr_logo",
  file: File
): Promise<{ url: string }> {
  return { url: createObjectUrl(file) };
}

export async function fetchStoreProducts(): Promise<StoreProduct[]> {
  return getProducts();
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
  const products = getProducts();
  const id = `prod_${Date.now().toString(36)}`;
  const fieldId = `field_${id}`;
  const newProduct: StoreProduct = {
    id,
    name: payload.name,
    info: {
      description: payload.description || "",
      banner: payload.banner || MOCK_AVATAR,
      hex_color: payload.hex_color || "#5865F2",
      delivery_type: payload.delivery_type || "automatic",
      active: true,
      buy_button: payload.buy_button || { label: "Comprar", emoji: "🛒" },
    },
    campos: payload.campos || {
      [fieldId]: {
        id: fieldId,
        name: "Padrão",
        emoji: "📦",
        pre_description: "",
        description: payload.description || "",
        price: 0,
        infinite_stock: { enabled: false, value: "" },
      },
    },
    categorias: {},
    messages: [],
    cupons: {},
    min_price: 0,
    max_price: 0,
    stock_total: 0,
    has_infinite_stock: false,
    updated_at: Date.now(),
  };
  products.unshift(newProduct);
  saveProducts(products);
  return newProduct;
}

export async function updateStoreProduct(productId: string, product: any): Promise<StoreProduct> {
  const products = getProducts();
  const idx = products.findIndex((item) => item.id === productId);
  const updated: StoreProduct = {
    ...(idx >= 0 ? products[idx] : product),
    ...(product || {}),
    updated_at: Date.now(),
  };
  if (idx >= 0) {
    products[idx] = updated;
  } else {
    products.unshift(updated);
  }
  saveProducts(products);
  return updated;
}

export async function deleteStoreProduct(productId: string): Promise<void> {
  const products = getProducts().filter((item) => item.id !== productId);
  saveProducts(products);
}

export async function duplicateStoreProduct(productId: string, duplicateStock = true): Promise<StoreProduct> {
  const products = getProducts();
  const original = products.find((item) => item.id === productId);
  if (!original) {
    throw new Error("Produto não encontrado");
  }
  const id = `prod_${Date.now().toString(36)}`;
  const clone: StoreProduct = {
    ...original,
    id,
    name: `${original.name} (copia)`,
    updated_at: Date.now(),
  };
  products.unshift(clone);
  saveProducts(products);
  if (duplicateStock) {
    const stock = getStockStore();
    Object.entries(stock).forEach(([key, value]) => {
      if (key.startsWith(`${productId}:`)) {
        stock[key.replace(productId, id)] = { ...value, items: [...value.items] };
      }
    });
    saveStockStore(stock);
  }
  return clone;
}

export async function fetchStoreChannels(includeCategories = false, includeVoice = false): Promise<StoreChannel[]> {
  return (MOCK_CHANNELS as StoreChannel[]).filter((channel) => {
    if (!includeCategories && channel.type === 4) return false;
    if (!includeVoice && (channel.type === 2 || channel.type === 13)) return false;
    return true;
  });
}

export async function fetchStoreCustomers(): Promise<StoreCustomer[]> {
  return mockCustomers.map((customer) => ({
    id: customer.id,
    username: customer.username,
    avatar: customer.avatar || MOCK_AVATAR,
    total_spent: customer.totalSpent,
    total_purchases: customer.orders,
    first_purchase: customer.lastPurchase ? Math.floor(new Date(customer.lastPurchase).getTime() / 1000) - 86400 * 30 : null,
    last_purchase: customer.lastPurchase ? Math.floor(new Date(customer.lastPurchase).getTime() / 1000) : null,
  }));
}

export async function syncStoreCustomers(): Promise<{ status: string; customers: number }> {
  return { status: "ok", customers: mockCustomers.length };
}

export async function fetchSaldoConfig(): Promise<StoreSaldoConfig> {
  return readMock<StoreSaldoConfig>(SALDO_KEY, DEFAULT_SALDO_CONFIG);
}

export async function updateSaldoConfig(payload: Partial<StoreSaldoConfig>): Promise<StoreSaldoConfig> {
  const current = readMock<StoreSaldoConfig>(SALDO_KEY, DEFAULT_SALDO_CONFIG);
  const next = { ...current, ...payload };
  return writeMock<StoreSaldoConfig>(SALDO_KEY, next);
}

export async function fetchCashbackConfig(): Promise<StoreCashbackConfig> {
  return readMock<StoreCashbackConfig>(CASHBACK_KEY, DEFAULT_CASHBACK_CONFIG);
}

export async function updateCashbackConfig(
  payload: Partial<StoreCashbackConfig>
): Promise<StoreCashbackConfig> {
  const current = readMock<StoreCashbackConfig>(CASHBACK_KEY, DEFAULT_CASHBACK_CONFIG);
  const next = { ...current, ...payload };
  return writeMock<StoreCashbackConfig>(CASHBACK_KEY, next);
}

export async function fetchSaldoUsers(): Promise<StoreSaldoUser[]> {
  return readMock<StoreSaldoUser[]>(SALDO_USERS_KEY, buildSaldoUsers());
}

export async function addSaldoAdmin(payload: {
  user_id: string;
  amount: number;
  bonus?: number;
  deposit_id?: string;
  payment_method?: string;
}): Promise<{ status: string }> {
  updateMock<StoreSaldoUser[]>(SALDO_USERS_KEY, buildSaldoUsers(), (current) => {
    const next = [...current];
    const index = next.findIndex((user) => user.id === payload.user_id);
    const bonus = payload.bonus || 0;
    if (index >= 0) {
      next[index] = {
        ...next[index],
        balance: next[index].balance + payload.amount + bonus,
        total_deposited: next[index].total_deposited + payload.amount + bonus,
        last_transaction: Math.floor(Date.now() / 1000),
      };
    } else {
      next.push({
        id: payload.user_id,
        username: "Novo cliente",
        avatar: MOCK_AVATAR,
        balance: payload.amount + bonus,
        total_deposited: payload.amount + bonus,
        total_used: 0,
        last_transaction: Math.floor(Date.now() / 1000),
      });
    }
    return next;
  });
  return { status: "ok" };
}

export async function removeSaldoAdmin(payload: {
  user_id: string;
  amount: number;
  description?: string;
  reference_id?: string;
}): Promise<{ status: string }> {
  updateMock<StoreSaldoUser[]>(SALDO_USERS_KEY, buildSaldoUsers(), (current) => {
    const next = [...current];
    const index = next.findIndex((user) => user.id === payload.user_id);
    if (index >= 0) {
      next[index] = {
        ...next[index],
        balance: Math.max(0, next[index].balance - payload.amount),
        total_used: next[index].total_used + payload.amount,
        last_transaction: Math.floor(Date.now() / 1000),
      };
    }
    return next;
  });
  return { status: "ok" };
}

export async function uploadSaldoImage(
  _target: "embed_image" | "embed_thumb" | "content_image" | "container_image" | "container_thumb",
  file: File
): Promise<{ url: string }> {
  return { url: createObjectUrl(file) };
}

export async function sendSaldoDepositPanel(_channel_id: string): Promise<{ status: string; message_id?: string }> {
  return { status: "ok", message_id: `msg_${Date.now().toString(36)}` };
}

export async function sendProductToChannel(_payload: {
  product_id: string;
  channel_id: string;
  mode?: string;
  formatted_desc?: boolean;
  image_size?: string;
  image_inside?: boolean;
}): Promise<{ status: string; message_id?: string }> {
  return { status: "ok", message_id: `msg_${Date.now().toString(36)}` };
}

export async function uploadProductImageForProduct(
  productId: string,
  file: File
): Promise<{ image_url: string }> {
  const url = createObjectUrl(file);
  const products = getProducts();
  const idx = products.findIndex((item) => item.id === productId);
  if (idx >= 0) {
    products[idx] = {
      ...products[idx],
      info: { ...products[idx].info, banner: url },
      updated_at: Date.now(),
    };
    saveProducts(products);
  }
  return { image_url: url };
}

export async function fetchStockItems(params: {
  product_id: string;
  field_id: string;
  limit?: number;
  offset?: number;
}): Promise<{ items: string[]; total: number; is_infinite: boolean; infinite_value?: string | null }> {
  const store = getStockStore();
  const key = stockKey(params.product_id, params.field_id);
  const entry = store[key] || { items: [], is_infinite: false, infinite_value: null };
  const offset = params.offset || 0;
  const limit = params.limit || entry.items.length;
  return {
    items: entry.items.slice(offset, offset + limit),
    total: entry.items.length,
    is_infinite: entry.is_infinite,
    infinite_value: entry.infinite_value ?? null,
  };
}

export async function addStockItems(payload: {
  product_id: string;
  field_id: string;
  items: string[];
}): Promise<{ status: string; added: number }> {
  const store = getStockStore();
  const key = stockKey(payload.product_id, payload.field_id);
  const entry = store[key] || { items: [], is_infinite: false, infinite_value: null };
  entry.items = [...entry.items, ...(payload.items || [])];
  store[key] = entry;
  saveStockStore(store);
  return { status: "ok", added: payload.items?.length || 0 };
}

export async function setInfiniteStock(payload: {
  product_id: string;
  field_id: string;
  value: string;
}): Promise<{ status: string }> {
  const store = getStockStore();
  const key = stockKey(payload.product_id, payload.field_id);
  const entry = store[key] || { items: [], is_infinite: false, infinite_value: null };
  entry.is_infinite = true;
  entry.infinite_value = payload.value;
  store[key] = entry;
  saveStockStore(store);
  return { status: "ok" };
}

export async function clearStockItems(payload: {
  product_id: string;
  field_id: string;
}): Promise<{ status: string }> {
  const store = getStockStore();
  const key = stockKey(payload.product_id, payload.field_id);
  store[key] = { items: [], is_infinite: false, infinite_value: null };
  saveStockStore(store);
  return { status: "ok" };
}

export async function pullStockItems(payload: {
  product_id: string;
  field_id: string;
  quantity: number;
}): Promise<{ items: string[] }> {
  const store = getStockStore();
  const key = stockKey(payload.product_id, payload.field_id);
  const entry = store[key] || { items: [], is_infinite: false, infinite_value: null };
  const items = entry.items.splice(0, payload.quantity || 0);
  store[key] = entry;
  saveStockStore(store);
  return { items };
}
