// ============================================
// inkCloud Dashboard Format Helpers
// ============================================

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d atrás`;
  if (hours > 0) return `${hours}h atrás`;
  if (minutes > 0) return `${minutes}min atrás`;
  return "agora";
}

export function formatDurationShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  if (diff <= 0) {
    return "0s";
  }
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) {
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }
  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${seconds}s`;
}

export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}...`;
}

export function maskToken(token: string): string {
  if (token.length <= 8) return "••••••••";
  return `${token.slice(0, 4)}${"•".repeat(16)}${token.slice(-4)}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    online: "text-success",
    offline: "text-destructive",
    idle: "text-warning",
    dnd: "text-destructive",
    active: "text-success",
    ended: "text-muted-foreground",
    cancelled: "text-destructive",
    pending: "text-warning",
    completed: "text-success",
    failed: "text-destructive",
    running: "text-primary",
    open: "text-success",
    closed: "text-muted-foreground",
    waiting: "text-warning",
    valid: "text-success",
    invalid: "text-destructive",
    expired: "text-warning",
  };
  return colors[status] || "text-foreground";
}

export function getStatusBgColor(status: string): string {
  const colors: Record<string, string> = {
    online: "bg-success/20",
    offline: "bg-destructive/20",
    active: "bg-success/20",
    pending: "bg-warning/20",
    completed: "bg-success/20",
    failed: "bg-destructive/20",
    cancelled: "bg-destructive/20",
    running: "bg-primary/20",
    open: "bg-success/20",
    closed: "bg-muted/50",
    waiting: "bg-warning/20",
    info: "bg-white/10",
    warning: "bg-warning/20",
    error: "bg-destructive/20",
    success: "bg-success/20",
  };
  return colors[status] || "bg-muted/50";
}
