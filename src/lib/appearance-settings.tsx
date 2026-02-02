import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { mockAppearanceConfig } from "@/lib/mock-data";
import { fetchAppearanceSettings, persistAppearanceSettings } from "@/lib/api/appearance";
import type { AppearanceConfig } from "@/lib/types";

const STATUS_TYPES = ["online", "idle", "dnd", "invisible"] as const;
const ACTIVITY_TYPES = ["playing", "watching", "listening", "competing"] as const;
const MODE_OPTIONS = ["light", "dark", "auto"] as const;

const DEFAULT_COLOR_PALETTE = {
  primary: "#ffffff",
  secondary: "#888888",
  accent: "#666666",
  success: "#28a745",
  danger: "#dc3545",
  warning: "#ffc107",
};

type AppearanceSettingsStatus = "idle" | "loading" | "saving" | "success" | "error";

interface AppearanceSettingsContextValue {
  settings: AppearanceConfig | null;
  status: AppearanceSettingsStatus;
  errorMessage?: string;
  getSettings: () => AppearanceConfig | null;
  updateSetting: (path: string, value: unknown) => void;
  resetToDefault: () => void;
  loadFromStorage: () => Promise<void>;
  persistToStorage: () => Promise<void>;
  reloadSettings: () => Promise<void>;
  persistSettings: () => Promise<void>;
}

const AppearanceSettingsContext = createContext<AppearanceSettingsContextValue | null>(null);

function cloneConfig(config?: AppearanceConfig) {
  if (typeof structuredClone === "function") {
    return structuredClone(config ?? mockAppearanceConfig);
  }
  return JSON.parse(JSON.stringify(config ?? mockAppearanceConfig));
}

function normalizeHexColor(value: string | undefined, fallback: string) {
  const candidate = (value ?? "").trim().toUpperCase();
  return /^#[0-9A-F]{6}$/.test(candidate) ? candidate : fallback;
}

function sanitizeNamesForServer(names: string[], fallback: string) {
  const cleaned = names
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
  if (cleaned.length) {
    return Array.from(new Set(cleaned));
  }
  const fallbackText = String(fallback ?? "").trim();
  if (fallbackText) {
    return [fallbackText];
  }
  return [mockAppearanceConfig.status.activity];
}

function normalizeSettingValue(path: string, value: unknown, state: AppearanceConfig) {
  switch (path) {
    case "status.type": {
      const candidate = String(value ?? "").trim().toLowerCase();
      return STATUS_TYPES.includes(candidate as typeof STATUS_TYPES[number])
        ? (candidate as AppearanceConfig["status"]["type"])
        : state.status.type;
    }
    case "status.activityType": {
      const candidate = String(value ?? "").trim().toLowerCase();
      return ACTIVITY_TYPES.includes(candidate as typeof ACTIVITY_TYPES[number])
        ? (candidate as AppearanceConfig["status"]["activityType"])
        : state.status.activityType;
    }
    case "status.activity": {
      const candidate = String(value ?? "").trim();
      return candidate || state.status.activity;
    }
    case "info.name": {
      const candidate = String(value ?? "").trim();
      return candidate || state.info.name;
    }
    case "info.avatar": {
      const candidate = String(value ?? "").trim();
      return candidate || state.info.avatar;
    }
    case "info.banner": {
      const candidate = String(value ?? "").trim();
      return candidate || state.info.banner;
    }
    case "mode": {
      const candidate = String(value ?? "").trim().toLowerCase();
      return MODE_OPTIONS.includes(candidate as typeof MODE_OPTIONS[number])
        ? (candidate as AppearanceConfig["mode"])
        : state.mode;
    }
    case "colors.primary":
      return normalizeHexColor(String(value ?? state.colors.primary), state.colors.primary);
    case "colors.secondary":
      return normalizeHexColor(String(value ?? state.colors.secondary), state.colors.secondary);
    case "colors.accent":
      return normalizeHexColor(String(value ?? state.colors.accent), state.colors.accent);
    case "roles.adminRoleId":
      return String(value ?? state.roles.adminRoleId).trim() || state.roles.adminRoleId;
    case "roles.modRoleId":
      return String(value ?? state.roles.modRoleId).trim() || state.roles.modRoleId;
    case "roles.memberRoleId":
      return String(value ?? state.roles.memberRoleId).trim() || state.roles.memberRoleId;
    case "roles.customerRoleId":
      return String(value ?? state.roles.customerRoleId).trim() || state.roles.customerRoleId;
    case "channels.logsId":
      return String(value ?? state.channels.logsId).trim() || state.channels.logsId;
    case "channels.welcomeId":
      return String(value ?? state.channels.welcomeId).trim() || state.channels.welcomeId;
    case "channels.rulesId":
      return String(value ?? state.channels.rulesId).trim() || state.channels.rulesId;
    case "channels.announcementsId":
      return String(value ?? state.channels.announcementsId).trim() || state.channels.announcementsId;
    case "payments.pix":
    case "payments.card":
    case "payments.mercadoPago":
    case "payments.stripe":
      return Boolean(value);
    case "notifications.sales":
    case "notifications.tickets":
    case "notifications.alerts":
    case "notifications.updates":
      return Boolean(value);
    case "blacklist":
      if (!Array.isArray(value)) return state.blacklist;
      return Array.from(new Set(value.map((entry) => String(entry ?? "").trim())).values()).filter(Boolean);
    case "antiFake.enabled":
    case "antiFake.requireAvatar":
    case "antiFake.requireVerified":
      return Boolean(value);
    case "antiFake.minAge": {
      const candidate = Number(value);
      if (Number.isNaN(candidate)) {
        return state.antiFake.minAge;
      }
      return Math.max(0, Math.min(365, Math.floor(candidate)));
    }
    case "extensions.boost":
    case "extensions.visiongen":
      return Boolean(value);
    case "status.names":
      if (!Array.isArray(value)) return state.status.names;
      return value.map((entry) => String(entry ?? ""));
    default:
      console.warn(`[AppearanceSettings] Unsupported path "${path}"`);
      return undefined;
  }
}

function setValueAtPath(state: AppearanceConfig, path: string, value: unknown) {
  const segments = path.split(".");
  if (segments.length === 0) {
    return state;
  }
  const next = cloneConfig(state);
  let cursor: any = next;
  for (let i = 0; i < segments.length - 1; i += 1) {
    const segment = segments[i];
    const existing = cursor[segment];
    cursor[segment] = Array.isArray(existing) ? [...existing] : { ...existing };
    cursor = cursor[segment];
  }
  const last = segments[segments.length - 1];
  cursor[last] = value;
  return next;
}

export function AppearanceSettingsProvider({ children }: { children: React.ReactNode }) {

  const [settings, setSettings] = useState<AppearanceConfig>(() => cloneConfig());
  const [status, setStatus] = useState<AppearanceSettingsStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isHydrated, setIsHydrated] = useState(false);

  const isMountedRef = useRef(true);
  const settingsRef = useRef(settings);
  const saveTimeoutRef = useRef<number>();
  const successTimeoutRef = useRef<number>();

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (typeof window !== "undefined") {
        if (saveTimeoutRef.current) {
          window.clearTimeout(saveTimeoutRef.current);
        }
        if (successTimeoutRef.current) {
          window.clearTimeout(successTimeoutRef.current);
        }
      }
    };
  }, []);

  const finalizeSuccess = useCallback(() => {
    if (!isMountedRef.current) return;
    setStatus("success");
    if (typeof window !== "undefined") {
      if (successTimeoutRef.current) {
        window.clearTimeout(successTimeoutRef.current);
      }
      successTimeoutRef.current = window.setTimeout(() => {
        if (isMountedRef.current) {
          setStatus("idle");
        }
      }, 1800);
    }
  }, []);

  const persistToStorage = useCallback(async () => {
    if (!settingsRef.current) {
      return;
    }
    setStatus("saving");
    try {
      const payload = cloneConfig(settingsRef.current);
      const sanitizedNames = sanitizeNamesForServer(payload.status.names, payload.status.activity);
      payload.status.names = sanitizedNames;
      payload.status.activity = sanitizedNames[0] ?? payload.status.activity;
      const response = await persistAppearanceSettings(payload);
      if (!isMountedRef.current) return;
      const normalized = cloneConfig(response);
      setSettings(normalized);
      setErrorMessage(undefined);
      finalizeSuccess();
    } catch (error) {
      console.error("[AppearanceSettings] persist error", error);
      if (!isMountedRef.current) return;
      setErrorMessage("Não foi possível salvar as configurações.");
      setStatus("error");
    }
  }, [finalizeSuccess]);

  const schedulePersist = useCallback(() => {
    if (!isHydrated || typeof window === "undefined") return;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      void persistToStorage();
      saveTimeoutRef.current = undefined;
    }, 650);
  }, [isHydrated, persistToStorage]);

  const loadFromStorage = useCallback(async () => {
    setIsHydrated(false);
    setStatus("loading");
    try {
      const data = await fetchAppearanceSettings();
      setSettings(cloneConfig(data));
      setErrorMessage(undefined);
      setStatus("idle");
    } catch (error) {
      console.error("[AppearanceSettings] load error", error);
      if (!isMountedRef.current) return;
      setSettings(cloneConfig());
      setErrorMessage("Não foi possível carregar as configurações.");
      setStatus("error");
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    void loadFromStorage();
  }, [loadFromStorage]);

  const updateSetting = useCallback(
    (path: string, value: unknown) => {
      setSettings((prev) => {
        if (!prev) return prev;
        const normalized = normalizeSettingValue(path, value, prev);
        if (normalized === undefined) {
          return prev;
        }
        if (path === "status.activity") {
          const nextActivity = String(normalized).trim();
          const nextNames = [...prev.status.names];
          nextNames[0] = nextActivity;
          if (nextNames.length === 0) {
            nextNames.push(nextActivity);
          }
          return setValueAtPath(
            setValueAtPath(prev, "status.names", nextNames),
            "status.activity",
            nextActivity || prev.status.activity,
          );
        }
        if (path === "status.names" && Array.isArray(normalized)) {
          const nextNames = [...normalized];
          const firstNonEmpty = nextNames.find((item) => String(item).trim()) ?? prev.status.activity;
          return setValueAtPath(
            setValueAtPath(prev, "status.names", nextNames),
            "status.activity",
            String(firstNonEmpty).trim() || prev.status.activity,
          );
        }
        return setValueAtPath(prev, path, normalized);
      });
      schedulePersist();
    },
    [schedulePersist],
  );

  const resetToDefault = useCallback(() => {
    setSettings(cloneConfig());
    setErrorMessage(undefined);
    setStatus("saving");
    schedulePersist();
  }, [schedulePersist]);

  const getSettings = useCallback(() => settings, [settings]);

  const value = useMemo(
    () => ({
      settings,
      status,
      errorMessage,
      getSettings,
      updateSetting,
      resetToDefault,
      reloadSettings: loadFromStorage,
      loadFromStorage,
      persistSettings: persistToStorage,
      persistToStorage,
    }),
    [
      settings,
      status,
      errorMessage,
      getSettings,
      updateSetting,
      resetToDefault,
      loadFromStorage,
      persistToStorage,
    ],
  );

  return (
    <AppearanceSettingsContext.Provider value={value}>
      {children}
    </AppearanceSettingsContext.Provider>
  );
}

export function useAppearanceSettings() {
  const context = useContext(AppearanceSettingsContext);
  if (!context) {
    throw new Error("useAppearanceSettings must be used within AppearanceSettingsProvider");
  }
  return context;
}
