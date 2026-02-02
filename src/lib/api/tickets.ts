import { getSelectedTenantId } from "@/lib/tenant";

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

export type TicketChannel = {
  id: string;
  name: string;
  type: number;
};

export type TicketRole = {
  id: string;
  name: string;
};

export type TicketsConfig = {
  panels?: Record<string, any>;
};

export async function fetchTicketsConfig(): Promise<TicketsConfig> {
  const response = await apiRequest("/api/tickets/config", { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tickets config error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config || {};
}

export async function updateTicketsConfig(config: TicketsConfig): Promise<{ status: string }> {
  const response = await apiRequest("/api/tickets/config", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tickets config update error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function fetchTicketsData(): Promise<any> {
  const response = await apiRequest("/api/tickets/data", { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tickets data error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.data || {};
}

export async function sendTicketsPanel(panel_id: string): Promise<{ status: string; message_id?: string }> {
  const response = await apiRequest("/api/tickets/panel/send", {
    method: "POST",
    body: JSON.stringify({ panel_id }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tickets panel send error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function fetchTicketChannels(includeCategories = true): Promise<TicketChannel[]> {
  const tenantId = getSelectedTenantId();
  const query = new URLSearchParams();
  if (includeCategories) query.set("include_categories", "true");
  if (tenantId) query.set("tenant_id", tenantId);
  const response = await apiRequest(`/api/store/channels?${query.toString()}`, { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tickets channels error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.channels || [];
}

export async function fetchTicketRoles(): Promise<TicketRole[]> {
  const tenantId = getSelectedTenantId();
  const query = new URLSearchParams();
  if (tenantId) query.set("tenant_id", tenantId);
  const response = await apiRequest(`/api/store/roles?${query.toString()}`, { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tickets roles error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.roles || [];
}

export type TicketImageTarget =
  | "embed_image"
  | "embed_thumb"
  | "content_image"
  | "container_image"
  | "container_thumb"
  | "open_embed_image"
  | "open_embed_thumb"
  | "open_content_image"
  | "open_container_image"
  | "open_container_thumb";

export async function uploadTicketImage(
  target: TicketImageTarget,
  file: File,
  panelId?: string,
  optionId?: string
): Promise<{ url: string }> {
  const url = new URL(`${getApiBaseUrl()}/api/tickets/image`);
  url.searchParams.set("target", target);
  if (panelId) url.searchParams.set("panel_id", panelId);
  if (optionId) url.searchParams.set("option_id", optionId);
  const form = new FormData();
  form.append("file", file);
  const response = await fetch(url.toString(), {
    method: "POST",
    credentials: "include",
    body: form,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ticket image upload error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}
