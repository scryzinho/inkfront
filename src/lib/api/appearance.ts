import type { AppearanceConfig } from "@/lib/types";
import { getSelectedTenantId } from "@/lib/tenant";

type RequestHeaders = Record<string, string>;

function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_INKCLOUD_API_URL as string | undefined)?.replace(/\/+$/, "");
  return envUrl || "http://localhost:9000";
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
    throw new Error(`Appearance request failed (${response.status}): ${text || "sem detalhes"}`);
  }

  return response;
}

export async function fetchAppearanceSettings(): Promise<AppearanceConfig> {
  const response = await apiRequest("/api/settings/appearance", { method: "GET" });
  return response.json();
}

export async function persistAppearanceSettings(config: AppearanceConfig): Promise<AppearanceConfig> {
  const response = await apiRequest("/api/settings/appearance", {
    method: "POST",
    body: JSON.stringify(config),
  });
  const data = await response.json();
  return (data?.config as AppearanceConfig) || config;
}
