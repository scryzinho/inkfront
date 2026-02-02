import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Mail,
  KeyRound,
  CreditCard,
  Upload,
  Check,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Building2,
  Hash,
  Eye,
  EyeOff,
  Trash2,
  FileKey,
  Bitcoin,
  Lock,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { GlassButton } from "@/components/ui/GlassButton";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { fetchPaymentMethods, updatePaymentMethod } from "@/lib/api/payments";

type PixKeyType = "email" | "cpf" | "telefone" | "cnpj" | "aleatoria";
type PaymentCategory = "pix" | "cartao" | "bitcoin";

interface PaymentGateway {
  id: string;
  name: string;
  description: string;
  icon: ReactNode;
  enabled: boolean;
  configured: boolean;
}

interface PixManualConfig {
  pixKey: string;
  keyType: PixKeyType;
}

interface PicPayConfig {
  pixKey: string;
  gmail: string;
  appPassword: string;
}

interface MercadoPagoConfig {
  accessToken: string;
}

interface EfiBankConfig {
  clientId: string;
  clientSecret: string;
  pixKey: string;
  certificateFile: File | null;
  certificateName: string;
}

interface PushinPayConfig {
  apiToken: string;
}

interface MisticPayConfig {
  clientId: string;
  clientSecret: string;
}

interface PaymentConfigs {
  pixManual: PixManualConfig;
  picpay: PicPayConfig;
  mercadoPago: MercadoPagoConfig;
  efiBank: EfiBankConfig;
  pushinPay: PushinPayConfig;
  misticPay: MisticPayConfig;
}

type PaymentMethodConfig = Record<string, string | boolean | undefined>;

interface PaymentGatewayConfigProps {
  onRefresh?: () => Promise<void> | void;
}

const initialConfigs: PaymentConfigs = {
  pixManual: { pixKey: "", keyType: "email" },
  picpay: { pixKey: "", gmail: "", appPassword: "" },
  mercadoPago: { accessToken: "" },
  efiBank: { clientId: "", clientSecret: "", pixKey: "", certificateFile: null, certificateName: "" },
  pushinPay: { apiToken: "" },
  misticPay: { clientId: "", clientSecret: "" },
};

const pixKeyTypes: { value: PixKeyType; label: string; icon: ReactNode }[] = [
  { value: "email", label: "E-mail", icon: <Mail className="w-4 h-4" /> },
  { value: "cpf", label: "CPF", icon: <Hash className="w-4 h-4" /> },
  { value: "telefone", label: "Telefone", icon: <Smartphone className="w-4 h-4" /> },
  { value: "cnpj", label: "CNPJ", icon: <Building2 className="w-4 h-4" /> },
  { value: "aleatoria", label: "Aleatória", icon: <KeyRound className="w-4 h-4" /> },
];

const paymentCategories: { id: PaymentCategory; name: string; icon: ReactNode; available: boolean }[] = [
  { id: "pix", name: "Pix", icon: <QrCode className="w-5 h-5" />, available: true },
  { id: "cartao", name: "Cartão", icon: <CreditCard className="w-5 h-5" />, available: false },
  { id: "bitcoin", name: "Bitcoin", icon: <Bitcoin className="w-5 h-5" />, available: false },
];

export function PaymentGatewayConfig({ onRefresh }: PaymentGatewayConfigProps) {
  const [selectedCategory, setSelectedCategory] = useState<PaymentCategory>("pix");
  const [gateways, setGateways] = useState<PaymentGateway[]>([
    {
      id: "pix_manual",
      name: "Pix Manual",
      description: "Configure sua chave Pix diretamente",
      icon: <QrCode className="w-5 h-5" />,
      enabled: false,
      configured: false,
    },
    {
      id: "pix_auto_gmail",
      name: "PicPay IMAP",
      description: "Integração via notificação por email",
      icon: <Mail className="w-5 h-5" />,
      enabled: false,
      configured: false,
    },
    {
      id: "mercado_pago",
      name: "Mercado Pago",
      description: "Gateway de pagamento Mercado Pago",
      icon: <CreditCard className="w-5 h-5" />,
      enabled: false,
      configured: false,
    },
    {
      id: "efibank",
      name: "Efi Bank",
      description: "API Pix da Gerencianet/Efi",
      icon: <Building2 className="w-5 h-5" />,
      enabled: false,
      configured: false,
    },
    {
      id: "pushinpay",
      name: "PushinPay",
      description: "Gateway de pagamento PushinPay",
      icon: <KeyRound className="w-5 h-5" />,
      enabled: false,
      configured: false,
    },
    {
      id: "misticpay",
      name: "MisticPay",
      description: "Gateway de pagamento MisticPay",
      icon: <CreditCard className="w-5 h-5" />,
      enabled: false,
      configured: false,
    },
  ]);

  const [expandedGateway, setExpandedGateway] = useState<string | null>(null);
  const [configs, setConfigs] = useState<PaymentConfigs>(initialConfigs);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [remoteConfigs, setRemoteConfigs] = useState<Record<string, PaymentMethodConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyGateway, setBusyGateway] = useState<string | null>(null);

  const refreshSettings = useCallback(async () => {
    if (!onRefresh) return;
    try {
      await onRefresh();
    } catch (refreshError) {
      console.error("[payments] refresh error", refreshError);
    }
  }, [onRefresh]);

  const toggleGateway = async (id: string) => {
    if (busyGateway) return;
    setError(null);
    const current = gateways.find((g) => g.id === id);
    if (!current) return;
    const nextEnabled = !current.enabled;
    const disableIds = gateways.filter((g) => g.id !== id).map((g) => g.id);
    setGateways((prev) =>
      prev.map((g) =>
        g.id === id ? { ...g, enabled: nextEnabled } : { ...g, enabled: nextEnabled ? false : g.enabled }
      )
    );
    try {
      setBusyGateway(id);
      await updatePaymentMethod({ method: id, enabled: nextEnabled });
      if (nextEnabled) {
        for (const other of disableIds) {
          await updatePaymentMethod({ method: other, enabled: false });
        }
      }
      await refreshSettings();
    } catch (err) {
      console.error("[payments] toggle", err);
      setError("Não foi possível atualizar o método de pagamento.");
      setGateways((prev) =>
        prev.map((g) =>
          g.id === id ? { ...g, enabled: current.enabled } : g
        )
      );
    } finally {
      setBusyGateway(null);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedGateway((prev) => (prev === id ? null : id));
  };

  const togglePasswordVisibility = (field: string) => {
    setShowPasswords((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".p12")) {
      setConfigs((prev) => ({
        ...prev,
        efiBank: { ...prev.efiBank, certificateFile: file, certificateName: file.name },
      }));
    }
  };

  const removeCertificate = () => {
    setConfigs((prev) => ({
      ...prev,
      efiBank: { ...prev.efiBank, certificateFile: null, certificateName: "" },
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const saveConfig = async (gatewayId: string) => {
    if (busyGateway) return;
    setError(null);
    const existing = remoteConfigs[gatewayId] || {};
    const nextConfig: PaymentMethodConfig = { ...existing };
    if (gatewayId === "pix_manual") {
      nextConfig.pix_key = configs.pixManual.pixKey;
      nextConfig.pix_key_type = configs.pixManual.keyType;
    } else if (gatewayId === "pix_auto_gmail") {
      nextConfig.gmail_email = configs.picpay.gmail;
      nextConfig.pix_key = configs.picpay.pixKey;
      if (configs.picpay.appPassword) {
        nextConfig.gmail_app_password = configs.picpay.appPassword;
      }
    } else if (gatewayId === "mercado_pago") {
      nextConfig.access_token = configs.mercadoPago.accessToken;
    } else if (gatewayId === "efibank") {
      nextConfig.client_id = configs.efiBank.clientId;
      nextConfig.client_secret = configs.efiBank.clientSecret;
      nextConfig.pix_key = configs.efiBank.pixKey;
    } else if (gatewayId === "pushinpay") {
      nextConfig.token_pushinpay = configs.pushinPay.apiToken;
    } else if (gatewayId === "misticpay") {
      nextConfig.client_id = configs.misticPay.clientId;
      nextConfig.client_secret = configs.misticPay.clientSecret;
      if (!nextConfig.client_id || !nextConfig.client_secret) {
        setError("Informe Client ID e Client Secret do MisticPay.");
        return;
      }
    }
    try {
      setBusyGateway(gatewayId);
      const enabledValue = true;
      await updatePaymentMethod({ method: gatewayId, config: nextConfig, enabled: enabledValue });
      setRemoteConfigs((prev) => ({ ...prev, [gatewayId]: nextConfig }));
      setGateways((prev) =>
        prev.map((g) => (g.id === gatewayId ? { ...g, configured: true, enabled: enabledValue } : g))
      );
      const disableIds = gateways.filter((g) => g.id !== gatewayId).map((g) => g.id);
      for (const other of disableIds) {
        await updatePaymentMethod({ method: other, enabled: false });
      }
      setGateways((prev) =>
        prev.map((g) =>
          disableIds.includes(g.id) ? { ...g, enabled: false } : g
        )
      );
      await refreshSettings();
      setExpandedGateway(null);
    } catch (err) {
      console.error("[payments] save", err);
      setError("Não foi possível salvar a configuração.");
    } finally {
      setBusyGateway(null);
    }
  };

  useEffect(() => {
    let mounted = true;
    fetchPaymentMethods()
      .then((data) => {
        if (!mounted) return;
        const paymentConfigs = (data.payment_configs || {}) as Record<string, PaymentMethodConfig>;
        const paymentStatus = (data.payment_status || {}) as Record<string, boolean>;
        setRemoteConfigs(paymentConfigs);
        setGateways((prev) =>
          prev.map((g) => {
            const cfg = paymentConfigs[g.id] || {};
            const enabled = Boolean(paymentStatus[g.id]);
            let configured = false;
            if (g.id === "pix_manual") {
              configured = Boolean(cfg.pix_key && cfg.pix_key_type);
            } else if (g.id === "pix_auto_gmail") {
              configured = Boolean(cfg.gmail_email && cfg.pix_key && cfg.gmail_app_password_encrypted);
            } else if (g.id === "mercado_pago") {
              configured = Boolean(cfg.access_token);
            } else if (g.id === "efibank") {
              configured = Boolean(cfg.client_id && cfg.client_secret && cfg.pix_key);
            } else if (g.id === "pushinpay") {
              configured = Boolean(cfg.token_pushinpay);
            } else if (g.id === "misticpay") {
              configured = Boolean(cfg.client_id && cfg.client_secret);
            }
            return { ...g, enabled, configured };
          })
        );
        setConfigs((prev) => ({
          ...prev,
          pixManual: {
            pixKey: paymentConfigs.pix_manual?.pix_key || "",
            keyType: paymentConfigs.pix_manual?.pix_key_type || "email",
          },
          picpay: {
            pixKey: paymentConfigs.pix_auto_gmail?.pix_key || "",
            gmail: paymentConfigs.pix_auto_gmail?.gmail_email || "",
            appPassword: "",
          },
          mercadoPago: {
            accessToken: paymentConfigs.mercado_pago?.access_token || "",
          },
          efiBank: {
            ...prev.efiBank,
            clientId: paymentConfigs.efibank?.client_id || "",
            clientSecret: paymentConfigs.efibank?.client_secret || "",
            pixKey: paymentConfigs.efibank?.pix_key || "",
          },
          pushinPay: {
            apiToken: paymentConfigs.pushinpay?.token_pushinpay || "",
          },
          misticPay: {
            clientId: paymentConfigs.misticpay?.client_id || "",
            clientSecret: paymentConfigs.misticpay?.client_secret || "",
          },
        }));
      })
      .catch((err) => {
        console.error("[payments] load", err);
        if (mounted) setError("Não foi possível carregar os métodos de pagamento.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const inputClasses =
    "w-full px-3 py-2.5 text-sm rounded-lg bg-white/5 border border-white/10 outline-none focus:border-primary/50 transition-colors placeholder:text-muted-foreground";

  const labelClasses = "text-sm font-medium text-foreground/80 mb-1.5 block";

  const currentCategory = paymentCategories.find((c) => c.id === selectedCategory);

  return (
    <div className="space-y-6">
      {loading && (
        <div className="text-sm text-muted-foreground">Carregando métodos de pagamento...</div>
      )}
      {error && (
        <div className="text-sm text-destructive">{error}</div>
      )}
      {/* Category Selector */}
      <div className="grid grid-cols-3 gap-3">
        {paymentCategories.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => category.available && setSelectedCategory(category.id)}
            disabled={!category.available}
            className={cn(
              "relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all",
              category.available
                ? selectedCategory === category.id
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-white/5 border-white/10 text-foreground/80 hover:border-white/20 hover:bg-white/10"
                : "bg-white/[0.02] border-white/5 text-muted-foreground/50 cursor-not-allowed"
            )}
          >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                category.available
                  ? selectedCategory === category.id
                    ? "bg-primary/20"
                    : "bg-white/10"
                  : "bg-white/5"
              )}
            >
              {category.icon}
            </div>
            <span className="font-medium text-sm">{category.name}</span>
            {!category.available && (
              <div className="absolute top-2 right-2">
                <Lock className="w-3.5 h-3.5 text-muted-foreground/50" />
              </div>
            )}
            {!category.available && (
              <span className="text-[10px] text-muted-foreground/50 mt-1">Em breve</span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Category Content */}
      <AnimatePresence mode="wait">
        {selectedCategory === "pix" && (
          <motion.div
            key="pix-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <QrCode className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-sm">Configurações do Pix</h3>
                <p className="text-xs text-muted-foreground">
                  Escolha e configure seu gateway de pagamento Pix
                </p>
              </div>
            </div>

            {/* Gateway List */}
            <div className="space-y-3">
              {gateways.map((gateway, index) => (
                <motion.div
                  key={gateway.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard
                    className={cn(
                      "overflow-hidden transition-all",
                      expandedGateway === gateway.id && "ring-1 ring-primary/30"
                    )}
                    hover={false}
                  >
                    {/* Gateway Header */}
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer"
                      onClick={() => toggleExpand(gateway.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                            gateway.enabled
                              ? "bg-primary/20 text-primary"
                              : "bg-white/5 text-muted-foreground"
                          )}
                        >
                          {gateway.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{gateway.name}</span>
                            {gateway.configured && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-emerald-500/20 text-emerald-400">
                                Configurado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{gateway.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={gateway.enabled}
                          onCheckedChange={() => toggleGateway(gateway.id)}
                          onClick={(e) => e.stopPropagation()}
                          disabled={Boolean(busyGateway)}
                        />
                        {expandedGateway === gateway.id ? (
                          <ChevronUp className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Gateway Config Panel */}
                    <AnimatePresence>
                      {expandedGateway === gateway.id && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 pt-0 border-t border-white/5">
                            {/* Pix Manual */}
                            {gateway.id === "pix_manual" && (
                              <div className="space-y-4 pt-4">
                                <div>
                                  <label className={labelClasses}>Tipo de Chave Pix</label>
                                  <div className="grid grid-cols-5 gap-2">
                                    {pixKeyTypes.map((type) => (
                                      <button
                                        key={type.value}
                                        onClick={() =>
                                          setConfigs((prev) => ({
                                            ...prev,
                                            pixManual: { ...prev.pixManual, keyType: type.value },
                                          }))
                                        }
                                        className={cn(
                                          "flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all",
                                          configs.pixManual.keyType === type.value
                                            ? "bg-primary/20 border-primary/50 text-primary"
                                            : "bg-white/5 border-white/10 text-muted-foreground hover:border-white/20"
                                        )}
                                      >
                                        {type.icon}
                                        <span className="text-xs">{type.label}</span>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <label className={labelClasses}>Chave Pix</label>
                                  <input
                                    type="text"
                                    value={configs.pixManual.pixKey}
                                    onChange={(e) =>
                                      setConfigs((prev) => ({
                                        ...prev,
                                        pixManual: { ...prev.pixManual, pixKey: e.target.value },
                                      }))
                                    }
                                    placeholder={
                                      configs.pixManual.keyType === "email"
                                        ? "seuemail@exemplo.com"
                                        : configs.pixManual.keyType === "cpf"
                                        ? "000.000.000-00"
                                        : configs.pixManual.keyType === "telefone"
                                        ? "+55 11 99999-9999"
                                        : configs.pixManual.keyType === "cnpj"
                                        ? "00.000.000/0001-00"
                                        : "Chave aleatória"
                                    }
                                    className={inputClasses}
                                  />
                                </div>
                              </div>
                            )}

                            {/* PicPay IMAP */}
                            {gateway.id === "pix_auto_gmail" && (
                              <div className="space-y-4 pt-4">
                                <div>
                                  <label className={labelClasses}>Chave Pix</label>
                                  <input
                                    type="text"
                                    value={configs.picpay.pixKey}
                                    onChange={(e) =>
                                      setConfigs((prev) => ({
                                        ...prev,
                                        picpay: { ...prev.picpay, pixKey: e.target.value },
                                      }))
                                    }
                                    placeholder="Sua chave Pix do PicPay"
                                    className={inputClasses}
                                  />
                                </div>
                                <div>
                                  <label className={labelClasses}>Gmail para notificações</label>
                                  <input
                                    type="email"
                                    value={configs.picpay.gmail}
                                    onChange={(e) =>
                                      setConfigs((prev) => ({
                                        ...prev,
                                        picpay: { ...prev.picpay, gmail: e.target.value },
                                      }))
                                    }
                                    placeholder="seuemail@gmail.com"
                                    className={inputClasses}
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Email que receberá as notificações do banco
                                  </p>
                                </div>
                                <div>
                                  <label className={labelClasses}>Senha de App</label>
                                  <div className="relative">
                                    <input
                                      type={showPasswords["picpay-password"] ? "text" : "password"}
                                      value={configs.picpay.appPassword}
                                      onChange={(e) =>
                                        setConfigs((prev) => ({
                                          ...prev,
                                          picpay: { ...prev.picpay, appPassword: e.target.value },
                                        }))
                                      }
                                      placeholder="••••••••••••••••"
                                      className={cn(inputClasses, "pr-10")}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => togglePasswordVisibility("picpay-password")}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                      {showPasswords["picpay-password"] ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                  <p className="text-xs text-amber-400/80 mt-1">
                                    ⚠️ Requer 2FA ativado no Gmail para gerar senha de app
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Mercado Pago */}
                            {gateway.id === "mercado_pago" && (
                              <div className="space-y-4 pt-4">
                                <div>
                                  <label className={labelClasses}>Access Token</label>
                                  <div className="relative">
                                    <input
                                      type={showPasswords["mp-token"] ? "text" : "password"}
                                      value={configs.mercadoPago.accessToken}
                                      onChange={(e) =>
                                        setConfigs((prev) => ({
                                          ...prev,
                                          mercadoPago: { accessToken: e.target.value },
                                        }))
                                      }
                                      placeholder="APP_USR-0000000000000000-000000-..."
                                      className={cn(inputClasses, "pr-10")}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => togglePasswordVisibility("mp-token")}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                      {showPasswords["mp-token"] ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Encontre seu token em: Mercado Pago → Seu negócio → Configurações → Credenciais
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Efi Bank */}
                            {gateway.id === "efibank" && (
                              <div className="space-y-4 pt-4">
                                <div className="grid sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className={labelClasses}>Client ID</label>
                                    <input
                                      type="text"
                                      value={configs.efiBank.clientId}
                                      onChange={(e) =>
                                        setConfigs((prev) => ({
                                          ...prev,
                                          efiBank: { ...prev.efiBank, clientId: e.target.value },
                                        }))
                                      }
                                      placeholder="Client_Id_xxxxxxxxx"
                                      className={inputClasses}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelClasses}>Client Secret</label>
                                    <div className="relative">
                                      <input
                                        type={showPasswords["efi-secret"] ? "text" : "password"}
                                        value={configs.efiBank.clientSecret}
                                        onChange={(e) =>
                                          setConfigs((prev) => ({
                                            ...prev,
                                            efiBank: { ...prev.efiBank, clientSecret: e.target.value },
                                          }))
                                        }
                                        placeholder="Client_Secret_xxxxxxxxx"
                                        className={cn(inputClasses, "pr-10")}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility("efi-secret")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                      >
                                        {showPasswords["efi-secret"] ? (
                                          <EyeOff className="w-4 h-4" />
                                        ) : (
                                          <Eye className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <label className={labelClasses}>Chave Pix Aleatória</label>
                                  <input
                                    type="text"
                                    value={configs.efiBank.pixKey}
                                    onChange={(e) =>
                                      setConfigs((prev) => ({
                                        ...prev,
                                        efiBank: { ...prev.efiBank, pixKey: e.target.value },
                                      }))
                                    }
                                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                    className={inputClasses}
                                  />
                                </div>
                                <div>
                                  <label className={labelClasses}>Certificado (.p12)</label>
                                  <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".p12"
                                    onChange={handleFileUpload}
                                    className="hidden"
                                  />
                                  {configs.efiBank.certificateName ? (
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10">
                                      <FileKey className="w-5 h-5 text-primary" />
                                      <span className="text-sm flex-1 truncate">
                                        {configs.efiBank.certificateName}
                                      </span>
                                      <button
                                        onClick={removeCertificate}
                                        className="p-1.5 rounded-lg hover:bg-white/10 text-destructive"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => fileInputRef.current?.click()}
                                      className="w-full p-4 rounded-xl border-2 border-dashed border-white/10 hover:border-primary/30 transition-colors flex flex-col items-center gap-2 text-muted-foreground hover:text-foreground"
                                    >
                                      <Upload className="w-6 h-6" />
                                      <span className="text-sm">
                                        Clique para fazer upload do certificado .p12
                                      </span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* PushinPay */}
                            {gateway.id === "pushinpay" && (
                              <div className="space-y-4 pt-4">
                                <div>
                                  <label className={labelClasses}>API Token</label>
                                  <div className="relative">
                                    <input
                                      type={showPasswords["pushin-token"] ? "text" : "password"}
                                      value={configs.pushinPay.apiToken}
                                      onChange={(e) =>
                                        setConfigs((prev) => ({
                                          ...prev,
                                          pushinPay: { apiToken: e.target.value },
                                        }))
                                      }
                                      placeholder="pk_live_xxxxxxxxxxxxxxxxx"
                                      className={cn(inputClasses, "pr-10")}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => togglePasswordVisibility("pushin-token")}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                      {showPasswords["pushin-token"] ? (
                                        <EyeOff className="w-4 h-4" />
                                      ) : (
                                        <Eye className="w-4 h-4" />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* MisticPay */}
                            {gateway.id === "misticpay" && (
                              <div className="space-y-4 pt-4">
                                <div className="grid sm:grid-cols-2 gap-4">
                                  <div>
                                    <label className={labelClasses}>Client ID</label>
                                    <input
                                      type="text"
                                      value={configs.misticPay.clientId}
                                      onChange={(e) =>
                                        setConfigs((prev) => ({
                                          ...prev,
                                          misticPay: { ...prev.misticPay, clientId: e.target.value },
                                        }))
                                      }
                                      placeholder="mistic_id_xxxxxxxxx"
                                      className={inputClasses}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelClasses}>Client Secret</label>
                                    <div className="relative">
                                      <input
                                        type={showPasswords["mistic-secret"] ? "text" : "password"}
                                        value={configs.misticPay.clientSecret}
                                        onChange={(e) =>
                                          setConfigs((prev) => ({
                                            ...prev,
                                            misticPay: { ...prev.misticPay, clientSecret: e.target.value },
                                          }))
                                        }
                                        placeholder="mistic_secret_xxxxxxxxx"
                                        className={cn(inputClasses, "pr-10")}
                                      />
                                      <button
                                        type="button"
                                        onClick={() => togglePasswordVisibility("mistic-secret")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                      >
                                        {showPasswords["mistic-secret"] ? (
                                          <EyeOff className="w-4 h-4" />
                                        ) : (
                                          <Eye className="w-4 h-4" />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Save Button */}
                            <div className="flex justify-end pt-4 mt-4 border-t border-white/5">
                              <GlassButton
                                variant="primary"
                                size="sm"
                                onClick={() => saveConfig(gateway.id)}
                                disabled={Boolean(busyGateway)}
                                loading={busyGateway === gateway.id}
                              >
                                <Check className="w-4 h-4" />
                                Salvar configuração
                              </GlassButton>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Cartão - Coming Soon */}
        {selectedCategory === "cartao" && (
          <motion.div
            key="cartao-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <GlassCard className="p-8 text-center" hover={false}>
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-lg mb-2">Pagamento via Cartão</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Em breve você poderá aceitar pagamentos com cartão de crédito e débito. 
                Estamos trabalhando para trazer essa funcionalidade.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>Em desenvolvimento</span>
              </div>
            </GlassCard>
          </motion.div>
        )}

        {/* Bitcoin - Coming Soon */}
        {selectedCategory === "bitcoin" && (
          <motion.div
            key="bitcoin-content"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            <GlassCard className="p-8 text-center" hover={false}>
              <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                <Bitcoin className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-medium text-lg mb-2">Pagamento via Bitcoin</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Em breve você poderá aceitar pagamentos em Bitcoin e outras criptomoedas.
                Estamos trabalhando para trazer essa funcionalidade.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-sm text-muted-foreground">
                <Lock className="w-4 h-4" />
                <span>Em desenvolvimento</span>
              </div>
            </GlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
