import { readMock, writeMock } from "@/lib/mock-storage";

export type PaymentMethodsResponse = {
  payment_configs: Record<string, any>;
  payment_status: Record<string, boolean>;
};

const CONFIG_KEY = "inkcloud_mock_payment_configs";
const STATUS_KEY = "inkcloud_mock_payment_status";

const DEFAULT_CONFIGS: Record<string, any> = {
  pix_manual: { pix_key: "conta@inkcloud.demo", pix_key_type: "email" },
  pix_auto_gmail: {
    pix_key: "conta@inkcloud.demo",
    gmail_email: "pagamentos@inkcloud.demo",
    gmail_app_password_encrypted: "••••••••",
  },
  mercado_pago: { access_token: "MP_DEMO_TOKEN" },
  efibank: { client_id: "efi_demo", client_secret: "efi_secret", pix_key: "efi@demo" },
  pushinpay: { token_pushinpay: "pushin_demo" },
  misticpay: { client_id: "mistic_demo", client_secret: "mistic_secret" },
};

const DEFAULT_STATUS: Record<string, boolean> = {
  pix_manual: true,
  pix_auto_gmail: false,
  mercado_pago: false,
  efibank: false,
  pushinpay: false,
  misticpay: false,
};

export async function fetchPaymentMethods(): Promise<PaymentMethodsResponse> {
  return {
    payment_configs: readMock<Record<string, any>>(CONFIG_KEY, DEFAULT_CONFIGS),
    payment_status: readMock<Record<string, boolean>>(STATUS_KEY, DEFAULT_STATUS),
  };
}

export async function updatePaymentMethod(payload: {
  method: string;
  config?: Record<string, any>;
  enabled?: boolean;
}): Promise<{ status: string; method: string }> {
  const configs = readMock<Record<string, any>>(CONFIG_KEY, DEFAULT_CONFIGS);
  const status = readMock<Record<string, boolean>>(STATUS_KEY, DEFAULT_STATUS);
  if (payload.config) {
    configs[payload.method] = { ...(configs[payload.method] || {}), ...payload.config };
    writeMock(CONFIG_KEY, configs);
  }
  if (typeof payload.enabled === "boolean") {
    status[payload.method] = payload.enabled;
    writeMock(STATUS_KEY, status);
  }
  return { status: "ok", method: payload.method };
}
