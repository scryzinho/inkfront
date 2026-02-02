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

export async function fetchProtectionConfig(section: string): Promise<any> {
  const response = await apiRequest(`/api/protection/config?section=${encodeURIComponent(section)}`, {
    method: "GET",
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Protection config error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config || {};
}

export async function updateProtectionConfig(section: string, config: any): Promise<any> {
  const response = await apiRequest(`/api/protection/config?section=${encodeURIComponent(section)}`, {
    method: "PUT",
    body: JSON.stringify({ section, config }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Protection config update error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config || {};
}
