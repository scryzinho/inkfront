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
import { fetchCustomMode, persistCustomMode, type DisplayMode } from "@/lib/api/painel";

export type CustomModeStatus = "idle" | "loading" | "saving" | "success" | "error";

const AUTO_REFRESH_INTERVAL_MS = 30_000;

type CustomModeContextValue = {
  mode: DisplayMode | null;
  status: CustomModeStatus;
  error?: string;
  refresh: () => Promise<void>;
  setMode: (mode: DisplayMode) => Promise<void>;
};

const CustomModeContext = createContext<CustomModeContextValue | null>(null);

function useMountedRef() {
  const ref = useRef(true);
  useEffect(() => {
    return () => {
      ref.current = false;
    };
  }, []);
  return ref;
}

function scheduleReset(
  setter: (value: CustomModeStatus) => void,
  timerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>,
) {
  if (timerRef.current) {
    clearTimeout(timerRef.current);
  }
  if (typeof window === "undefined") {
    setter("idle");
    return;
  }
  timerRef.current = window.setTimeout(() => {
    setter("idle");
    timerRef.current = null;
  }, 1600);
}

export function CustomModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<DisplayMode | null>(null);
  const [status, setStatus] = useState<CustomModeStatus>("loading");
  const [error, setError] = useState<string>();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useMountedRef();

  const refresh = useCallback(async () => {
    setStatus("loading");
    try {
      const value = await fetchCustomMode();
      if (!isMountedRef.current) return;
      setModeState(value);
      setError(undefined);
      setStatus("idle");
    } catch (err) {
      if (!isMountedRef.current) return;
      setStatus("error");
      setError(err instanceof Error ? err.message : "Não foi possível carregar o modo");
    }
  }, [isMountedRef]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const syncIfIdle = () => {
      if (status === "saving") return;
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
  }, [refresh, status]);

  const setMode = useCallback(
    async (next: DisplayMode) => {
      if (mode === next || status === "saving") return;
      setStatus("saving");
      try {
        const updated = await persistCustomMode(next);
        if (!isMountedRef.current) return;
        setModeState(updated);
        setError(undefined);
        setStatus("success");
        scheduleReset(setStatus, timerRef);
      } catch (err) {
        if (!isMountedRef.current) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Não foi possível salvar o modo");
      }
    },
    [isMountedRef, mode, status],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const value = useMemo(
    () => ({ mode, status, error, refresh, setMode }),
    [mode, status, error, refresh, setMode],
  );

  return <CustomModeContext.Provider value={value}>{children}</CustomModeContext.Provider>;
}

export function useCustomMode() {
  const context = useContext(CustomModeContext);
  if (!context) {
    throw new Error("useCustomMode must be used within CustomModeProvider");
  }
  return context;
}
