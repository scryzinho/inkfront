import { mockTicketPanels, mockTickets } from "@/lib/mock-data";
import { MOCK_CHANNELS, MOCK_ROLES } from "@/lib/mock-shared";
import { readMock, writeMock } from "@/lib/mock-storage";

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

const CONFIG_KEY = "inkcloud_mock_tickets_config";
const DATA_KEY = "inkcloud_mock_tickets_data";

function buildInitialConfig(): TicketsConfig {
  const panels: Record<string, any> = {};
  mockTicketPanels.forEach((panel) => {
    panels[panel.id] = {
      name: panel.name,
      enabled: panel.active,
      mode: "channel",
      message_style: "embed",
      channel_id: panel.channelId,
      category_id: panel.categoryId,
      roles: { mention: panel.roles || [] },
      options: (panel.options || []).map((opt) => ({
        id: opt.id,
        name: opt.label,
        description: opt.description,
        emoji: opt.emoji,
      })),
    };
  });
  return { panels };
}

function buildInitialData() {
  const data: Record<string, any> = { panels: {} };
  mockTickets.forEach((ticket) => {
    const panelId = ticket.panelId;
    if (!data.panels[panelId]) {
      data.panels[panelId] = {};
    }
    if (!data.panels[panelId][ticket.userId]) {
      data.panels[panelId][ticket.userId] = [];
    }
    data.panels[panelId][ticket.userId].push({
      ticket_id: ticket.id,
      status: ticket.status,
      created_at: Math.floor(new Date(ticket.createdAt).getTime() / 1000),
    });
  });
  return data;
}

const DEFAULT_CONFIG = buildInitialConfig();
const DEFAULT_DATA = buildInitialData();

export async function fetchTicketsConfig(): Promise<TicketsConfig> {
  return readMock<TicketsConfig>(CONFIG_KEY, DEFAULT_CONFIG);
}

export async function updateTicketsConfig(config: TicketsConfig): Promise<{ status: string }> {
  writeMock<TicketsConfig>(CONFIG_KEY, config);
  return { status: "ok" };
}

export async function fetchTicketsData(): Promise<any> {
  return readMock<any>(DATA_KEY, DEFAULT_DATA);
}

export async function sendTicketsPanel(_panel_id: string): Promise<{ status: string; message_id?: string }> {
  return { status: "ok", message_id: `msg_${Date.now().toString(36)}` };
}

export async function fetchTicketChannels(includeCategories = true): Promise<TicketChannel[]> {
  return (MOCK_CHANNELS as TicketChannel[]).filter((channel) => {
    if (!includeCategories && channel.type === 4) return false;
    return true;
  });
}

export async function fetchTicketRoles(): Promise<TicketRole[]> {
  return MOCK_ROLES as TicketRole[];
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
  _target: TicketImageTarget,
  file: File,
  _panelId?: string,
  _optionId?: string,
): Promise<{ url: string }> {
  const url = typeof URL !== "undefined" && URL.createObjectURL ? URL.createObjectURL(file) : "";
  return { url };
}
