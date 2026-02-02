import { getSelectedTenantId } from "@/lib/tenant";

function getApiBaseUrl() {
  const envUrl = (import.meta.env.VITE_INKCLOUD_API_URL as string | undefined)?.replace(/\/+$/, "");
  return envUrl || "http://localhost:9000";
}

export type PaymentMethodsResponse = {
  payment_configs: Record<string, any>;
  payment_status: Record<string, boolean>;
};

export async function fetchPaymentMethods(): Promise<PaymentMethodsResponse> {
  const baseUrl = getApiBaseUrl();
  const tenantId = getSelectedTenantId();
  const response = await fetch(`${baseUrl}/api/settings/payments`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {})
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Payments fetch error (${response.status})`);
  }
  return response.json();
}

export async function updatePaymentMethod(payload: {
  method: string;
  config?: Record<string, any>;
  enabled?: boolean;
}): Promise<{ status: string; method: string }> {
  const baseUrl = getApiBaseUrl();
  const tenantId = getSelectedTenantId();
  const response = await fetch(`${baseUrl}/api/settings/payment-method`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(tenantId ? { "X-Tenant-Id": tenantId } : {})
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Payment update error (${response.status})`);
  }
  return response.json();
}
