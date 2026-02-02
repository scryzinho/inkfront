// ============================================
// inkCloud Dashboard Types
// ============================================

export interface BotStatus {
  online: boolean;
  lastHeartbeat: string;
  uptime: string;
  version: string;
  tokenStatus: "valid" | "invalid" | "expired";
}

export interface GuildOverview {
  id: string;
  name: string;
  icon: string;
  members: number;
  channels: number;
  roles: number;
  boosts: number;
  permissions: {
    admin: boolean;
    manageChannels: boolean;
    manageRoles: boolean;
    manageMessages: boolean;
  };
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  category: string;
  active: boolean;
  createdAt: string;
  sales: number;
}

export interface Order {
  id: string;
  productId: string;
  productName: string;
  customerId: string;
  customerName: string;
  amount: number;
  status: "pending" | "completed" | "cancelled" | "refunded";
  createdAt: string;
  paymentMethod: string;
}

export interface Customer {
  id: string;
  discordId: string;
  username: string;
  avatar: string;
  totalSpent: number;
  orders: number;
  lastPurchase: string;
  balance: number;
  cashback: number;
}

export interface TicketPanel {
  id: string;
  name: string;
  channelId: string;
  categoryId: string;
  roles: string[];
  active: boolean;
  ticketsCount: number;
  options: TicketOption[];
  createdAt: string;
}

export interface TicketOption {
  id: string;
  emoji: string;
  label: string;
  description: string;
}

export interface Ticket {
  id: string;
  panelId: string;
  userId: string;
  username: string;
  status: "open" | "closed" | "waiting";
  createdAt: string;
  closedAt?: string;
  messages: number;
}

export interface AutomationConfig {
  suggestions: {
    enabled: boolean;
    channelId: string;
    upvoteEmoji: string;
    downvoteEmoji: string;
    threshold: number;
  };
  callCounter: {
    enabled: boolean;
    channelId: string;
    message: string;
    count: number;
  };
  tosFilter: {
    enabled: boolean;
    keywords: string[];
    action: "warn" | "delete" | "mute" | "kick" | "ban";
    logChannelId: string;
  };
  topics: {
    enabled: boolean;
    channels: string[];
  };
  nuke: {
    enabled: boolean;
    protectedChannels: string[];
    protectedRoles: string[];
  };
}

export interface ProtectionConfig {
  internalPerms: {
    adminRoles: string[];
    modRoles: string[];
    bypassRoles: string[];
  };
  general: {
    antiBan: boolean;
    antiKick: boolean;
    antiChannelDelete: boolean;
    antiRoleDelete: boolean;
    logChannelId: string;
    punishment: "warn" | "kick" | "ban" | "removeRoles";
    immuneRoles: string[];
  };
  privatizations: {
    roles: boolean;
    apps: boolean;
    urls: boolean;
    permissions: boolean;
    mentions: boolean;
  };
}

export interface Giveaway {
  id: string;
  title: string;
  description: string;
  prize: string;
  winners: number;
  participants: number;
  endsAt: string;
  status: "active" | "ended" | "cancelled";
  createdAt: string;
  channelId: string;
}

export interface CloudTask {
  id: string;
  name: string;
  type: "backup" | "sync" | "export" | "import";
  status: "pending" | "running" | "completed" | "failed";
  progress: number;
  createdAt: string;
  completedAt?: string;
}

export interface CloudCredential {
  id: string;
  name: string;
  type: "api_key" | "webhook" | "token";
  lastUsed: string;
  createdAt: string;
}

export interface CloudMessage {
  id: string;
  name: string;
  content: string;
  variables: string[];
  createdAt: string;
}

export interface CloudLog {
  id: string;
  type: "info" | "warning" | "error" | "success";
  message: string;
  timestamp: string;
  source: string;
}

export interface EarningsData {
  date: string;
  revenue: number;
  orders: number;
  refunds: number;
}

export interface Alert {
  id: string;
  type: "warning" | "error" | "info" | "success";
  title: string;
  description: string;
  action: string;
  actionRoute: string;
  dismissed: boolean;
}

export type AppearanceRoleMap = Record<string, string> & {
  adminRoleId: string;
  modRoleId: string;
  memberRoleId: string;
  customerRoleId: string;
};

export type AppearanceChannelMap = Record<string, string> & {
  logsId: string;
  welcomeId: string;
  rulesId: string;
  announcementsId: string;
};

export interface AppearanceConfig {
  status: {
    type: "online" | "idle" | "dnd" | "invisible";
    activity: string;
    activityType: "playing" | "watching" | "listening" | "competing";
    names: string[];
  };
  info: {
    name: string;
    avatar: string;
    banner: string;
  };
  mode: "light" | "dark" | "auto";
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  roles: AppearanceRoleMap;
  channels: AppearanceChannelMap;
  payments: {
    pix: boolean;
    card: boolean;
    mercadoPago: boolean;
    stripe: boolean;
  };
  notifications: {
    sales: boolean;
    tickets: boolean;
    alerts: boolean;
    updates: boolean;
  };
  blacklist: string[];
  antiFake: {
    enabled: boolean;
    minAge: number;
    requireAvatar: boolean;
    requireVerified: boolean;
  };
  extensions: {
    boost: boolean;
    visiongen: boolean;
  };
}

export interface StoreStats {
  revenue7d: number;
  revenue30d: number;
  orders7d: number;
  orders30d: number;
  activeProducts: number;
  lowStock: number;
  conversionRate: number;
  revenueByDay: { date: string; amount: number }[];
}

export interface TicketStats {
  openTickets: number;
  avgResponseTime: string;
  activePanels: number;
  closedToday: number;
}

export interface SidebarItem {
  id: string;
  label: string;
  icon: string;
  route: string;
  badge?: string;
  comingSoon?: boolean;
}
