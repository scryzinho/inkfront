import { getSelectedTenantId } from "@/lib/tenant";

const DDD_ENV = (import.meta.env.VITE_BRAZILIAN_DDDS as string | undefined)
  ?.split(",")
  .map((value) => value.trim())
  .filter(Boolean);

const BRAZILIAN_DDDS =
  DDD_ENV && DDD_ENV.length > 0
    ? DDD_ENV
    : [
        "11",
        "12",
        "13",
        "14",
        "15",
        "16",
        "17",
        "18",
        "19",
        "21",
        "22",
        "24",
        "27",
        "28",
        "31",
        "32",
        "33",
        "34",
        "35",
        "37",
        "38",
        "41",
        "42",
        "43",
        "44",
        "45",
        "46",
        "47",
        "48",
        "49",
        "51",
        "53",
        "54",
        "55",
        "61",
        "62",
        "63",
        "64",
        "65",
        "66",
        "67",
        "68",
        "69",
        "71",
        "73",
        "74",
        "75",
        "77",
        "79",
        "81",
        "82",
        "83",
        "84",
        "85",
        "86",
        "87",
        "88",
        "89",
        "91",
        "92",
        "93",
        "94",
        "95",
        "96",
        "97",
        "98",
        "99",
      ];

type RequestHeaders = Record<string, string>;

function getApiBaseUrl() {
  const custom = (import.meta.env.VITE_INKCLOUD_API_URL as string | undefined)?.replace(/\/+$/, "");
  return custom || "http://localhost:9000";
}

function mergeHeaders(existing: RequestInit["headers"], target: RequestHeaders) {
  if (existing instanceof Headers) {
    existing.forEach((value, key) => {
      target[key] = value;
    });
  } else if (typeof existing === "object" && existing !== null) {
    Object.entries(existing).forEach(([key, value]) => {
      if (typeof value === "string") {
        target[key] = value;
      }
    });
  }
}

async function apiRequest(path: string, options: RequestInit = {}) {
  const baseUrl = getApiBaseUrl();
  const tenantId = getSelectedTenantId();
  const headers: RequestHeaders = {};

  if (options.headers) {
    mergeHeaders(options.headers, headers);
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(`${baseUrl}${path}`, {
    credentials: "include",
    ...options,
    headers: {
      ...headers,
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {}),
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Painel request failed (${response.status}): ${text || "sem detalhes"}`);
  }

  return response;
}

export type NotificationsConfig = {
  enabled: boolean;
  ddd: string | null;
  number: string | null;
};

export type DisplayMode = "embed" | "components";

export async function fetchNotificationsConfig(): Promise<NotificationsConfig> {
  const response = await apiRequest("/api/settings/notifications", { method: "GET" });
  const data = await response.json();
  if (data && typeof data === "object" && typeof data.config === "object") {
    return {
      enabled: Boolean(data.config.enabled),
      ddd: data.config.ddd ?? null,
      number: data.config.number ?? null,
    };
  }
  return { enabled: false, ddd: null, number: null };
}

export async function persistNotificationsConfig(
  payload: Partial<NotificationsConfig>,
): Promise<NotificationsConfig> {
  const response = await apiRequest("/api/settings/notifications", {
    method: "POST",
    body: JSON.stringify({ config: payload }),
  });
  const data = await response.json();
  if (data && typeof data === "object" && typeof data.config === "object") {
    return {
      enabled: Boolean(data.config.enabled),
      ddd: data.config.ddd ?? null,
      number: data.config.number ?? null,
    };
  }
  return {
    enabled: Boolean(payload.enabled ?? false),
    ddd: payload.ddd ?? null,
    number: payload.number ?? null,
  };
}

export async function fetchBlacklist(): Promise<string[]> {
  const response = await apiRequest("/api/settings/blacklist", { method: "GET" });
  const data = await response.json();
  if (data && Array.isArray(data.ids)) {
    return data.ids.map((entry) => String(entry ?? "")).filter(Boolean);
  }
  return [];
}

export async function persistBlacklist(ids: string[]): Promise<string[]> {
  const response = await apiRequest("/api/settings/blacklist", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
  const data = await response.json();
  if (data && Array.isArray(data.ids)) {
    return data.ids.map((entry) => String(entry ?? "")).filter(Boolean);
  }
  return ids;
}

const VALID_DISPLAY_MODES: DisplayMode[] = ["embed", "components"];
const DEFAULT_DISPLAY_MODE: DisplayMode = "components";

export async function fetchCustomMode(): Promise<DisplayMode> {
  const response = await apiRequest("/api/custom_mode", { method: "GET" });
  const data = await response.json();
  const mode =
    typeof data?.mode === "string" && VALID_DISPLAY_MODES.includes(data.mode as DisplayMode)
      ? (data.mode as DisplayMode)
      : DEFAULT_DISPLAY_MODE;
  return mode;
}

export async function persistCustomMode(mode: DisplayMode): Promise<DisplayMode> {
  const response = await apiRequest("/api/custom_mode", {
    method: "POST",
    body: JSON.stringify({ mode }),
  });
  const data = await response.json();
  const nextMode =
    typeof data?.mode === "string" && VALID_DISPLAY_MODES.includes(data.mode as DisplayMode)
      ? (data.mode as DisplayMode)
      : DEFAULT_DISPLAY_MODE;
  return nextMode;
}

export { BRAZILIAN_DDDS };
