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

export async function fetchCloudConfig(): Promise<{ config: Record<string, any>; tasks: any[] }> {
  const response = await apiRequest("/api/cloud/config", { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloud config error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return { config: data.config || {}, tasks: data.tasks || [] };
}

export async function updateCloudConfig(config: Record<string, any>): Promise<Record<string, any>> {
  const response = await apiRequest("/api/cloud/config", {
    method: "PUT",
    body: JSON.stringify({ config }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloud config update error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.config || {};
}

export async function updateCloudTasks(tasks: any[]): Promise<any[]> {
  const response = await apiRequest("/api/cloud/tasks", {
    method: "PUT",
    body: JSON.stringify({ tasks }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloud tasks update error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.tasks || [];
}

export async function sendCloudMessage(payload: { channel_id: string }): Promise<void> {
  const response = await apiRequest("/api/cloud/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Cloud send error (${response.status}): ${text || "unknown"}`);
  }
}
