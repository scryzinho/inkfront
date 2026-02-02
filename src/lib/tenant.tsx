import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { fetchBots } from "@/lib/api/bots";

const STORAGE_KEY = "inkcloud_selected_bot";
const TENANT_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
let currentTenantId: string | null = null;

type TenantContextValue = {
  tenantId: string | null;
  setTenantId: (tenantId: string | null) => void;
};

const TenantContext = createContext<TenantContextValue | null>(null);

function readInitialTenant(): string | null {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored || !TENANT_ID_RE.test(stored)) {
      if (stored) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
      return null;
    }
    return stored;
  } catch {
    return null;
  }
}

export function TenantProvider({ children }: { children: React.ReactNode }) {
  const [tenantId, setTenantIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    const initial = readInitialTenant();
    currentTenantId = initial;
    return initial;
  });

  useEffect(() => {
    let mounted = true;
    if (tenantId) return;
    fetchBots()
      .then((bots) => {
        if (!mounted || bots.length === 0) return;
        const firstTenantId = bots[0].tenant_id;
        if (!tenantId || !bots.some((bot) => bot.tenant_id === tenantId)) {
          currentTenantId = firstTenantId;
          setTenantIdState(firstTenantId);
          try {
            window.localStorage.setItem(STORAGE_KEY, firstTenantId);
          } catch {
            // ignore storage errors
          }
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [tenantId]);

  const setTenantId = (nextId: string | null) => {
    const normalized = nextId && TENANT_ID_RE.test(nextId) ? nextId : null;
    currentTenantId = normalized;
    setTenantIdState(normalized);
    try {
      if (normalized) {
        window.localStorage.setItem(STORAGE_KEY, normalized);
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY) return;
      const nextValue = event.newValue && TENANT_ID_RE.test(event.newValue) ? event.newValue : null;
      currentTenantId = nextValue;
      setTenantIdState(nextValue);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const value = useMemo(() => ({ tenantId, setTenantId }), [tenantId]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within TenantProvider");
  }
  return context;
}

export function getSelectedTenantId(): string | null {
  if (currentTenantId) return currentTenantId;
  if (typeof window === "undefined") return null;
  const stored = readInitialTenant();
  currentTenantId = stored;
  return stored;
}
