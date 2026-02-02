import {
  MutableRefObject,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  fetchBlacklist,
  fetchNotificationsConfig,
  persistBlacklist,
  persistNotificationsConfig,
  type NotificationsConfig,
} from "@/lib/api/painel";

export type OperationStatus = "idle" | "loading" | "saving" | "success" | "error";

type PainelContextValue = {
  notifications: NotificationsConfig | null;
  notificationsStatus: OperationStatus;
  notificationsError?: string;
  blacklist: string[] | null;
  blacklistStatus: OperationStatus;
  blacklistError?: string;
  refresh: () => Promise<void>;
  toggleNotifications: (next: boolean) => Promise<void>;
  configureNotificationsNumber: (payload: {
    ddd: string | null;
    number: string | null;
  }) => Promise<void>;
  addBlacklistEntries: (entries: string[]) => Promise<void>;
  removeBlacklistEntries: (entries: string[]) => Promise<void>;
  clearBlacklist: () => Promise<void>;
};

const AUTO_REFRESH_INTERVAL_MS = 30_000;
const PainelContext = createContext<PainelContextValue | null>(null);

function scheduleStatusReset(
  setter: (value: OperationStatus) => void,
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (timerRef.current) {
    window.clearTimeout(timerRef.current);
  }
  timerRef.current = window.setTimeout(() => {
    setter("idle");
    timerRef.current = null;
  }, 1800);
}

function useMountedRef() {
  const ref = useRef(true);
  useEffect(() => {
    return () => {
      ref.current = false;
    };
  }, []);
  return ref;
}

export function PainelSettingsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<NotificationsConfig | null>(null);
  const [notificationsStatus, setNotificationsStatus] = useState<OperationStatus>("loading");
  const [notificationsError, setNotificationsError] = useState<string>();
  const [blacklist, setBlacklist] = useState<string[] | null>(null);
  const [blacklistStatus, setBlacklistStatus] = useState<OperationStatus>("loading");
  const [blacklistError, setBlacklistError] = useState<string>();

  const notificationsTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blacklistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useMountedRef();

  const refresh = useCallback(async () => {
    if (!isMountedRef.current) return;
    setNotificationsStatus("loading");
    setBlacklistStatus("loading");

    try {
      const config = await fetchNotificationsConfig();
      if (isMountedRef.current) {
        setNotifications(config);
        setNotificationsError(undefined);
        setNotificationsStatus("idle");
      }
    } catch (error) {
      if (isMountedRef.current) {
        setNotificationsStatus("error");
        setNotificationsError(error instanceof Error ? error.message : "Não foi possível carregar");
      }
    }

    try {
      const ids = await fetchBlacklist();
      if (isMountedRef.current) {
        setBlacklist(ids);
        setBlacklistError(undefined);
        setBlacklistStatus("idle");
      }
    } catch (error) {
      if (isMountedRef.current) {
        setBlacklistStatus("error");
        setBlacklistError(error instanceof Error ? error.message : "Não foi possível carregar");
      }
    }
  }, [isMountedRef]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncIfIdle = () => {
      if (notificationsStatus === "saving" || blacklistStatus === "saving") {
        return;
      }
      void refresh();
    };
    const interval = window.setInterval(syncIfIdle, AUTO_REFRESH_INTERVAL_MS);
    const onFocus = () => {
      syncIfIdle();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh, notificationsStatus, blacklistStatus]);

  const updateNotifications = useCallback(
    async (payload: Partial<NotificationsConfig>, nextStatus: OperationStatus = "saving") => {
      setNotificationsStatus(nextStatus);
      try {
        const updated = await persistNotificationsConfig(payload);
        if (!isMountedRef.current) return;
        setNotifications(updated);
        setNotificationsError(undefined);
        setNotificationsStatus("success");
        scheduleStatusReset(setNotificationsStatus, notificationsTimer);
      } catch (error) {
        if (isMountedRef.current) {
          setNotificationsStatus("error");
          setNotificationsError(error instanceof Error ? error.message : "Não foi possível salvar");
        }
      }
    },
    [isMountedRef],
  );

  const toggleNotifications = useCallback(
    async (next: boolean) => {
      await updateNotifications({ enabled: next });
    },
    [updateNotifications],
  );

  const configureNotificationsNumber = useCallback(
    async (payload: { ddd: string | null; number: string | null }) => {
      await updateNotifications(payload);
    },
    [updateNotifications],
  );

  const updateBlacklist = useCallback(
    async (next: string[]) => {
      setBlacklistStatus("saving");
      try {
        const updated = await persistBlacklist(next);
        if (!isMountedRef.current) return;
        setBlacklist(updated);
        setBlacklistError(undefined);
        setBlacklistStatus("success");
        scheduleStatusReset(setBlacklistStatus, blacklistTimer);
      } catch (error) {
        if (isMountedRef.current) {
          setBlacklistStatus("error");
          setBlacklistError(error instanceof Error ? error.message : "Não foi possível salvar");
        }
      }
    },
    [isMountedRef],
  );

  const addBlacklistEntries = useCallback(
    async (entries: string[]) => {
      if (!blacklist) return;
      const normalized = entries.map((entry) => entry.trim()).filter(Boolean);
      if (normalized.length === 0) return;
      const combined = Array.from(new Set([...blacklist, ...normalized]));
      await updateBlacklist(combined);
    },
    [blacklist, updateBlacklist],
  );

  const removeBlacklistEntries = useCallback(
    async (entries: string[]) => {
      if (!blacklist) return;
      const normalized = entries.map((entry) => entry.trim()).filter(Boolean);
      if (normalized.length === 0) return;
      const remaining = blacklist.filter((entry) => !normalized.includes(entry));
      await updateBlacklist(remaining);
    },
    [blacklist, updateBlacklist],
  );

  const clearBlacklist = useCallback(async () => {
    await updateBlacklist([]);
  }, [updateBlacklist]);

  const value = useMemo(
    () => ({
      notifications,
      notificationsStatus,
      notificationsError,
      blacklist,
      blacklistStatus,
      blacklistError,
      refresh,
      toggleNotifications,
      configureNotificationsNumber,
      addBlacklistEntries,
      removeBlacklistEntries,
      clearBlacklist,
    }),
    [
      notifications,
      notificationsStatus,
      notificationsError,
      blacklist,
      blacklistStatus,
      blacklistError,
      refresh,
      toggleNotifications,
      configureNotificationsNumber,
      addBlacklistEntries,
      removeBlacklistEntries,
      clearBlacklist,
    ],
  );

  return <PainelContext.Provider value={value}>{children}</PainelContext.Provider>;
}

export function usePainelSettings() {
  const context = useContext(PainelContext);
  if (!context) {
    throw new Error("usePainelSettings must be used within PainelSettingsProvider");
  }
  return context;
}
