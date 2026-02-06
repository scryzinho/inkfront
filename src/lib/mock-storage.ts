const memoryStore = new Map<string, string>();

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function clone<T>(value: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function readRaw(key: string): string | null {
  const storage = getStorage();
  if (storage) {
    return storage.getItem(key);
  }
  return memoryStore.get(key) ?? null;
}

function writeRaw(key: string, value: string) {
  const storage = getStorage();
  if (storage) {
    storage.setItem(key, value);
    return;
  }
  memoryStore.set(key, value);
}

export function readMock<T>(key: string, fallback: T): T {
  const raw = readRaw(key);
  if (!raw) {
    return clone(fallback);
  }
  try {
    return clone(JSON.parse(raw) as T);
  } catch {
    return clone(fallback);
  }
}

export function writeMock<T>(key: string, value: T): T {
  writeRaw(key, JSON.stringify(value));
  return clone(value);
}

export function updateMock<T>(key: string, fallback: T, updater: (current: T) => T): T {
  const current = readMock(key, fallback);
  const next = updater(current);
  return writeMock(key, next);
}
