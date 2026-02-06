// ============================================
// inkCloud Dashboard Mock Data
// TODO: Replace with real API calls
// ============================================

import type {
  BotStatus,
  GuildOverview,
  Product,
  Order,
  Customer,
  TicketPanel,
  Ticket,
  AutomationConfig,
  ProtectionConfig,
  Giveaway,
  CloudTask,
  CloudCredential,
  CloudMessage,
  CloudLog,
  EarningsData,
  Alert,
  AppearanceConfig,
  StoreStats,
  TicketStats,
} from "./types";
import { MOCK_AVATAR } from "./mock-shared";

export const mockBotStatus: BotStatus = {
  online: true,
  lastHeartbeat: "2024-01-15T14:32:05Z",
  uptime: "3d 14h 23m",
  version: "2.4.1",
  tokenStatus: "valid",
};

export const mockGuilds: GuildOverview[] = [
  {
    id: "123456789",
    name: "inkCloud Community",
    icon: MOCK_AVATAR,
    members: 1542,
    channels: 24,
    roles: 18,
    boosts: 7,
    permissions: {
      admin: true,
      manageChannels: true,
      manageRoles: true,
      manageMessages: true,
    },
  },
  {
    id: "987654321",
    name: "Dev Server",
    icon: MOCK_AVATAR,
    members: 89,
    channels: 12,
    roles: 8,
    boosts: 0,
    permissions: {
      admin: true,
      manageChannels: true,
      manageRoles: true,
      manageMessages: true,
    },
  },
];

export const mockProducts: Product[] = [
  {
    id: "prod_1",
    name: "VIP Mensal",
    description: "Acesso VIP por 30 dias",
    price: 29.90,
    stock: 999,
    category: "Assinaturas",
    active: true,
    createdAt: "2024-01-01",
    sales: 156,
  },
  {
    id: "prod_2",
    name: "Nitro Classic",
    description: "Discord Nitro Classic - 1 mês",
    price: 19.90,
    stock: 12,
    category: "Discord",
    active: true,
    createdAt: "2024-01-05",
    sales: 89,
  },
  {
    id: "prod_3",
    name: "Curso Programação",
    description: "Acesso ao curso completo",
    price: 197.00,
    stock: 0,
    category: "Cursos",
    active: false,
    createdAt: "2024-01-10",
    sales: 23,
  },
  {
    id: "prod_4",
    name: "Pack de Emojis",
    description: "50 emojis exclusivos",
    price: 9.90,
    stock: 5,
    category: "Digital",
    active: true,
    createdAt: "2024-01-12",
    sales: 342,
  },
];

export const mockOrders: Order[] = [
  {
    id: "ord_1",
    productId: "prod_1",
    productName: "VIP Mensal",
    customerId: "user_1",
    customerName: "João#1234",
    amount: 29.90,
    status: "completed",
    createdAt: "2024-01-15T10:30:00Z",
    paymentMethod: "pix",
  },
  {
    id: "ord_2",
    productId: "prod_2",
    productName: "Nitro Classic",
    customerId: "user_2",
    customerName: "Maria#5678",
    amount: 19.90,
    status: "pending",
    createdAt: "2024-01-15T11:45:00Z",
    paymentMethod: "card",
  },
  {
    id: "ord_3",
    productId: "prod_4",
    productName: "Pack de Emojis",
    customerId: "user_3",
    customerName: "Pedro#9012",
    amount: 9.90,
    status: "completed",
    createdAt: "2024-01-15T09:15:00Z",
    paymentMethod: "pix",
  },
];

export const mockCustomers: Customer[] = [
  {
    id: "user_1",
    discordId: "123456789012345678",
    username: "João#1234",
    avatar: MOCK_AVATAR,
    totalSpent: 259.70,
    orders: 8,
    lastPurchase: "2024-01-15",
    balance: 15.00,
    cashback: 12.98,
  },
  {
    id: "user_2",
    discordId: "234567890123456789",
    username: "Maria#5678",
    avatar: MOCK_AVATAR,
    totalSpent: 89.70,
    orders: 3,
    lastPurchase: "2024-01-14",
    balance: 0,
    cashback: 4.49,
  },
];

export const mockTicketPanels: TicketPanel[] = [
  {
    id: "panel_1",
    name: "Suporte Geral",
    channelId: "111111111111111111",
    categoryId: "222222222222222222",
    roles: ["mod", "admin"],
    active: true,
    ticketsCount: 45,
    options: [
      { id: "opt_1", emoji: "❓", label: "Dúvidas", description: "Tire suas dúvidas" },
      { id: "opt_2", emoji: "🛒", label: "Compras", description: "Problemas com compras" },
      { id: "opt_3", emoji: "🐛", label: "Bugs", description: "Reporte bugs" },
    ],
    createdAt: "2024-01-01",
  },
  {
    id: "panel_2",
    name: "Parcerias",
    channelId: "333333333333333333",
    categoryId: "222222222222222222",
    roles: ["admin"],
    active: true,
    ticketsCount: 12,
    options: [
      { id: "opt_4", emoji: "🤝", label: "Parceria", description: "Propostas de parceria" },
    ],
    createdAt: "2024-01-05",
  },
];

export const mockTickets: Ticket[] = [
  {
    id: "ticket_1",
    panelId: "panel_1",
    userId: "user_1",
    username: "João#1234",
    status: "open",
    createdAt: "2024-01-15T10:00:00Z",
    messages: 5,
  },
  {
    id: "ticket_2",
    panelId: "panel_1",
    userId: "user_2",
    username: "Maria#5678",
    status: "waiting",
    createdAt: "2024-01-15T09:30:00Z",
    messages: 12,
  },
  {
    id: "ticket_3",
    panelId: "panel_2",
    userId: "user_3",
    username: "Pedro#9012",
    status: "closed",
    createdAt: "2024-01-14T15:00:00Z",
    closedAt: "2024-01-14T16:30:00Z",
    messages: 8,
  },
];

export const mockAutomationConfig: AutomationConfig = {
  suggestions: {
    enabled: true,
    channelId: "444444444444444444",
    upvoteEmoji: "👍",
    downvoteEmoji: "👎",
    threshold: 10,
  },
  callCounter: {
    enabled: false,
    channelId: "",
    message: "Chamadas hoje: {count}",
    count: 0,
  },
  tosFilter: {
    enabled: true,
    keywords: ["spam", "scam", "hack"],
    action: "delete",
    logChannelId: "555555555555555555",
  },
  topics: {
    enabled: true,
    channels: ["666666666666666666"],
  },
  nuke: {
    enabled: true,
    protectedChannels: ["777777777777777777"],
    protectedRoles: ["888888888888888888"],
  },
};

export const mockProtectionConfig: ProtectionConfig = {
  internalPerms: {
    adminRoles: ["admin"],
    modRoles: ["mod"],
    bypassRoles: ["owner"],
  },
  general: {
    antiBan: true,
    antiKick: true,
    antiChannelDelete: true,
    antiRoleDelete: false,
    logChannelId: "999999999999999999",
    punishment: "removeRoles",
    immuneRoles: ["owner", "admin"],
  },
  privatizations: {
    roles: true,
    apps: false,
    urls: true,
    permissions: true,
    mentions: false,
  },
};

export const mockGiveaways: Giveaway[] = [
  {
    id: "giveaway_1",
    title: "Nitro Giveaway",
    description: "Concorra a 1 mês de Nitro!",
    prize: "Discord Nitro (1 mês)",
    winners: 1,
    participants: 234,
    endsAt: "2024-01-20T23:59:59Z",
    status: "active",
    createdAt: "2024-01-15T00:00:00Z",
    channelId: "101010101010101010",
  },
  {
    id: "giveaway_2",
    title: "VIP Grátis",
    description: "Ganhe VIP no servidor!",
    prize: "Cargo VIP (1 mês)",
    winners: 3,
    participants: 156,
    endsAt: "2024-01-18T20:00:00Z",
    status: "active",
    createdAt: "2024-01-14T12:00:00Z",
    channelId: "101010101010101010",
  },
];

export const mockCloudTasks: CloudTask[] = [
  {
    id: "task_1",
    name: "Backup diário",
    type: "backup",
    status: "completed",
    progress: 100,
    createdAt: "2024-01-15T03:00:00Z",
    completedAt: "2024-01-15T03:05:00Z",
  },
  {
    id: "task_2",
    name: "Sincronizar produtos",
    type: "sync",
    status: "running",
    progress: 65,
    createdAt: "2024-01-15T14:00:00Z",
  },
];

export const mockCloudCredentials: CloudCredential[] = [
  {
    id: "cred_1",
    name: "Mercado Pago",
    type: "api_key",
    lastUsed: "2024-01-15T14:30:00Z",
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "cred_2",
    name: "Webhook Discord",
    type: "webhook",
    lastUsed: "2024-01-15T12:00:00Z",
    createdAt: "2024-01-02T00:00:00Z",
  },
];

export const mockCloudMessages: CloudMessage[] = [
  {
    id: "msg_1",
    name: "Mensagem de Boas-vindas",
    content: "Bem-vindo ao servidor, {user}! 🎉",
    variables: ["user", "server"],
    createdAt: "2024-01-01T00:00:00Z",
  },
  {
    id: "msg_2",
    name: "Confirmação de Compra",
    content: "Obrigado pela compra, {user}! Seu produto: {product}",
    variables: ["user", "product", "price"],
    createdAt: "2024-01-05T00:00:00Z",
  },
];

export const mockCloudLogs: CloudLog[] = [
  { id: "log_1", type: "success", message: "Bot conectado ao servidor", timestamp: "2024-01-15T14:32:05Z", source: "bot" },
  { id: "log_2", type: "info", message: "Comando /help executado", timestamp: "2024-01-15T14:30:12Z", source: "commands" },
  { id: "log_3", type: "warning", message: "Rate limit atingido", timestamp: "2024-01-15T14:28:45Z", source: "api" },
  { id: "log_4", type: "error", message: "Falha ao enviar DM", timestamp: "2024-01-15T14:15:22Z", source: "messages" },
  { id: "log_5", type: "success", message: "Backup concluído", timestamp: "2024-01-15T03:05:00Z", source: "cloud" },
];

export const mockEarningsData: EarningsData[] = [
  { date: "2024-01-09", revenue: 145.80, orders: 5, refunds: 0 },
  { date: "2024-01-10", revenue: 289.70, orders: 12, refunds: 1 },
  { date: "2024-01-11", revenue: 178.50, orders: 8, refunds: 0 },
  { date: "2024-01-12", revenue: 432.20, orders: 18, refunds: 2 },
  { date: "2024-01-13", revenue: 267.90, orders: 11, refunds: 0 },
  { date: "2024-01-14", revenue: 356.40, orders: 15, refunds: 1 },
  { date: "2024-01-15", revenue: 198.60, orders: 9, refunds: 0 },
];

export const mockAlerts: Alert[] = [
  {
    id: "alert_1",
    type: "warning",
    title: "Configure pagamentos",
    description: "Adicione um método de pagamento para começar a vender.",
    action: "Configurar",
    actionRoute: "/dashboard/appearance",
    dismissed: false,
  },
  {
    id: "alert_2",
    type: "error",
    title: "Estoque crítico",
    description: "3 produtos estão com estoque abaixo de 5 unidades.",
    action: "Ver produtos",
    actionRoute: "/dashboard/store",
    dismissed: false,
  },
  {
    id: "alert_3",
    type: "info",
    title: "Assinatura expira em 7 dias",
    description: "Renove sua assinatura para continuar usando o inkCloud.",
    action: "Renovar",
    actionRoute: "/checkout",
    dismissed: false,
  },
];

export const mockAppearanceConfig: AppearanceConfig = {
  status: {
    type: "online",
    activity: "inkCloud v2.4.1",
    activityType: "playing",
    names: ["inkCloud v2.4.1"],
  },
  info: {
    name: "inkCloud Bot",
    avatar: MOCK_AVATAR,
    banner: "",
  },
  mode: "dark",
  colors: {
    primary: "#ffffff",
    secondary: "#888888",
    accent: "#666666",
  },
  roles: {
    adminRoleId: "111111111111111111",
    modRoleId: "222222222222222222",
    memberRoleId: "333333333333333333",
    customerRoleId: "444444444444444444",
  },
  channels: {
    logsId: "555555555555555555",
    welcomeId: "666666666666666666",
    rulesId: "777777777777777777",
    announcementsId: "888888888888888888",
  },
  payments: {
    pix: true,
    card: false,
    mercadoPago: true,
    stripe: false,
  },
  notifications: {
    sales: true,
    tickets: true,
    alerts: true,
    updates: false,
  },
  blacklist: ["spam_user#0001", "toxic#1234"],
  antiFake: {
    enabled: true,
    minAge: 7,
    requireAvatar: true,
    requireVerified: false,
  },
  extensions: {
    boost: true,
    visiongen: false,
  },
};

export const mockStoreStats: StoreStats = {
  revenue7d: 1868.10,
  revenue30d: 7452.80,
  orders7d: 78,
  orders30d: 312,
  activeProducts: 3,
  lowStock: 2,
  conversionRate: 4.2,
  revenueByDay: mockEarningsData.map((d) => ({ date: d.date, amount: d.revenue })),
};

export const mockTicketStats: TicketStats = {
  openTickets: 2,
  avgResponseTime: "12min",
  activePanels: 2,
  closedToday: 5,
};
