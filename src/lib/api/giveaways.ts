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

export async function fetchGiveawaysData(): Promise<Record<string, any>> {
  const response = await apiRequest("/api/giveaways", { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Giveaways error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.data || {};
}

export async function updateGiveawaysData(dataPayload: Record<string, any>): Promise<Record<string, any>> {
  const response = await apiRequest("/api/giveaways", {
    method: "PUT",
    body: JSON.stringify({ data: dataPayload }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Giveaways update error (${response.status}): ${text || "unknown"}`);
  }
  const data = await response.json();
  return data.data || {};
}

export async function createGiveaway(name: string, mode: "real" | "falso"): Promise<any> {
  const response = await apiRequest("/api/giveaways/create", {
    method: "POST",
    body: JSON.stringify({ name, mode }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Giveaways create error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function deleteGiveaway(id: string): Promise<any> {
  const response = await apiRequest("/api/giveaways/delete", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Giveaways delete error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}

export async function sendGiveawayMessage(payload: {
  giveaway_id: string;
  task_id: string;
  resend?: boolean;
}): Promise<{ status: string; message_id: string; data: Record<string, any> }> {
  const response = await apiRequest("/api/giveaways/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Giveaway send error (${response.status}): ${text || "unknown"}`);
  }
  return response.json();
}
