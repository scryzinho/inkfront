import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

function loadEnv() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim();
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnv();

const HOST = process.env.INKCLOUD_HOST || "127.0.0.1";
const PORT = Number(process.env.INKCLOUD_PORT || 9000);
const APP_URL = (process.env.INKCLOUD_APP_URL || "http://localhost:8080").replace(/\/+$/, "");
const API_URL = (process.env.INKCLOUD_API_URL || `http://${HOST}:${PORT}`).replace(/\/+$/, "");
const CORS_ORIGINS = (process.env.INKCLOUD_CORS_ORIGINS || APP_URL)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const PROVISIONER_URL = (process.env.PROVISIONER_URL || "http://localhost:8000").replace(/\/+$/, "");
const PROVISIONER_API_KEY = process.env.PROVISIONER_API_KEY || "";
const BOT_RUNTIME_SHARED_KEY = process.env.BOT_RUNTIME_SHARED_KEY || "";
const SHARDCLOUD_API_URL = (process.env.SHARDCLOUD_API_URL || "https://shardcloud.app/api").replace(/\/+$/, "");
const SHARDCLOUD_API_KEY = process.env.SHARDCLOUD_API_KEY || "";

const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID || "";
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET || "";
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${API_URL}/api/auth/discord/callback`;
const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || "";
const INKCLOUD_GUILD_ID = process.env.INKCLOUD_GUILD_ID || "";
const INKCLOUD_GUILD_INVITE_CHANNEL_ID = process.env.INKCLOUD_GUILD_INVITE_CHANNEL_ID || "";
const INKCLOUD_INVITE_URL =
  process.env.INKCLOUD_INVITE_URL || process.env.INKCLOUD_INVITE_FALLBACK_URL || "";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const SUPABASE_STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "inkcloud";
const SUPABASE_PRODUCT_IMAGES_BUCKET = process.env.SUPABASE_PRODUCT_IMAGES_BUCKET || "product-images";

const SESSION_SECRET = process.env.SESSION_SECRET || "";
const TOKEN_ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || "";
const BOT_TOKEN_ENCRYPTION_KEY = process.env.BOT_TOKEN_ENCRYPTION_KEY || "";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const rateLimit = new Map();
const botIdentityCache = new Map();
const BOT_IDENTITY_TTL = 5 * 60 * 1000;
const PROVISIONER_IDENTITY_TTL = 15 * 1000;
const PROVISIONER_GUILD_TTL = 15 * 1000;
const provisionerIdentityCache = new Map();
const provisionerGuildCache = new Map();
const inFlightProvisionerIdentity = new Map();
const inFlightProvisionerGuild = new Map();
const UPLOADS_DIR = path.join(projectRoot, "uploads");

function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

async function uploadToSupabaseStoragePath(buffer, objectPath, contentType, bucketName) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase não configurado");
  }
  const bucket = bucketName || SUPABASE_STORAGE_BUCKET;
  const url = `${SUPABASE_URL}/storage/v1/object/${bucket}/${objectPath}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": contentType || "application/octet-stream",
      "x-upsert": "true",
    },
    body: buffer,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase storage error ${response.status}: ${text}`);
  }
  const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${objectPath}`;
  return publicUrl;
}

async function uploadToSupabaseStorage(buffer, filename, contentType, tenantId) {
  const safeTenant = tenantId ? String(tenantId) : "public";
  const objectPath = `products/${safeTenant}/${filename}`;
  return uploadToSupabaseStoragePath(buffer, objectPath, contentType, SUPABASE_STORAGE_BUCKET);
}

async function ensureSupabaseBucket(bucketName, isPublic = true) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase não configurado");
  }
  const list = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  if (list.ok) {
    const buckets = await list.json();
    if (Array.isArray(buckets) && buckets.find((b) => b?.id === bucketName || b?.name === bucketName)) {
      return;
    }
  }
  const create = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: bucketName, name: bucketName, public: isPublic }),
  });
  if (!create.ok && create.status !== 409) {
    const text = await create.text();
    throw new Error(`Supabase bucket error ${create.status}: ${text}`);
  }
}

const TICKET_IMAGE_TARGETS = new Set([
  "embed_image",
  "embed_thumb",
  "content_image",
  "container_image",
  "container_thumb",
  "open_embed_image",
  "open_embed_thumb",
  "open_content_image",
  "open_container_image",
  "open_container_thumb",
]);

function parseMultipartFormData(buffer, boundary) {
  const boundaryMarker = Buffer.from(`--${boundary}`);
  const startIndex = buffer.indexOf(boundaryMarker);
  if (startIndex === -1) {
    return null;
  }
  const headerStart = startIndex + boundaryMarker.length + 2;
  const headerEnd = buffer.indexOf("\r\n\r\n", headerStart);
  if (headerEnd === -1) {
    return null;
  }

  const headers = buffer.slice(headerStart, headerEnd).toString("utf-8");
  const fieldNameMatch = /name="([^"]+)"/.exec(headers);
  const filenameMatch = /filename="([^"]+)"/.exec(headers);
  const contentTypeMatch = /Content-Type:\s*([^\r\n]+)/i.exec(headers);

  const bodyStart = headerEnd + 4;
  const boundaryDelimiter = Buffer.from(`\r\n--${boundary}`);
  let nextBoundaryIndex = buffer.indexOf(boundaryDelimiter, bodyStart);
  if (nextBoundaryIndex === -1) {
    nextBoundaryIndex = buffer.length;
  }
  let bodyEnd = nextBoundaryIndex;
  if (bodyEnd >= bodyStart + 2 && buffer[bodyEnd - 2] === 13 && buffer[bodyEnd - 1] === 10) {
    bodyEnd -= 2;
  }

  return {
    fieldName: fieldNameMatch ? fieldNameMatch[1] : null,
    filename: filenameMatch ? filenameMatch[1] : null,
    contentType: contentTypeMatch ? contentTypeMatch[1].trim() : "application/octet-stream",
    data: buffer.slice(bodyStart, bodyEnd),
  };
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return null;
  }
  return num;
}

function parseNumberOrFallback(value, fallback) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }
  const num = Number(value);
  if (Number.isNaN(num)) {
    return fallback;
  }
  return num;
}

function sanitizeAutoModPayload(autoMod) {
  if (!autoMod || typeof autoMod !== "object") {
    return {
      enabled: false,
      mode: "porcentagem",
      approval_threshold: 75,
      rejection_threshold: 25,
      approval_delay_hours: 24,
    };
  }
  return {
    enabled: Boolean(autoMod.enabled),
    mode: autoMod.mode === "quantidade" ? "quantidade" : "porcentagem",
    approval_threshold: parseNumberOrFallback(autoMod.approval_threshold, 75),
    rejection_threshold: parseNumberOrFallback(autoMod.rejection_threshold, 25),
    approval_delay_hours: parseNumberOrFallback(autoMod.approval_delay_hours, 24),
  };
}

function sanitizeSuggestionsPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  return {
    ...payload,
    channel: payload.channel ? String(payload.channel) : null,
    immune_role_id: payload.immune_role_id ? String(payload.immune_role_id) : null,
    auto_moderation: sanitizeAutoModPayload(payload.auto_moderation),
  };
}

function mapCallCounterForFrontend(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  return {
    enabled: Boolean(payload.enabled),
    channelId:
      payload.channel_id !== undefined && payload.channel_id !== null
        ? String(payload.channel_id)
        : null,
    message: typeof payload.message === "string" ? payload.message : "Chamadas hoje: {count}",
    count: Number(payload.count ?? 0),
  };
}

function sanitizeCallCounterPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return {};
  }
  const channelId =
    payload.channel_id ?? payload.channelId ?? payload.channel;
  return {
    enabled: Boolean(payload.enabled),
    channel_id: channelId ? toNumberOrNull(channelId) : null,
    message: typeof payload.message === "string" ? payload.message : "Chamadas hoje: {count}",
  };
}

function getClientIp(request) {
  const forwardedFor = request.headers["x-forwarded-for"];
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return request.socket?.remoteAddress || "unknown";
}

function setCorsHeaders(request, response) {
  const origin = request.headers.origin;
  if (origin && CORS_ORIGINS.includes(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
  }
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Tenant-Id");
  response.setHeader("Access-Control-Max-Age", "86400");
}

function checkRateLimit(key) {
  const now = Date.now();
  const record = rateLimit.get(key);
  if (!record || record.resetAt < now) {
    rateLimit.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (record.count >= RATE_LIMIT_MAX) return false;
  record.count += 1;
  return true;
}

function sendJson(response, status, payload) {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
}

function redirect(response, location) {
  response.statusCode = 302;
  response.setHeader("Location", location);
  response.end();
}

function isNumeric(value) {
  return /^\d+$/.test(value);
}

function base64UrlEncode(buffer) {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((value.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function parseCookies(request) {
  const header = request.headers.cookie || "";
  const entries = header.split(";").map((part) => part.trim()).filter(Boolean);
  const cookies = {};
  for (const entry of entries) {
    const index = entry.indexOf("=");
    if (index === -1) continue;
    const key = entry.slice(0, index);
    const value = entry.slice(index + 1);
    cookies[key] = decodeURIComponent(value);
  }
  return cookies;
}

function setCookie(response, name, value, options = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  parts.push(`Path=${options.path || "/"}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.sameSite) parts.push(`SameSite=${options.sameSite}`);
  if (options.secure) parts.push("Secure");
  if (options.maxAge) parts.push(`Max-Age=${options.maxAge}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  response.setHeader("Set-Cookie", [
    ...(Array.isArray(response.getHeader("Set-Cookie")) ? response.getHeader("Set-Cookie") : response.getHeader("Set-Cookie") ? [response.getHeader("Set-Cookie")] : []),
    parts.join("; ")
  ]);
}

function clearCookie(response, name) {
  setCookie(response, name, "", { maxAge: 0, path: "/" });
}

function getEncryptionKey() {
  if (!TOKEN_ENCRYPTION_KEY) return null;
  if (TOKEN_ENCRYPTION_KEY.length === 64) {
    return Buffer.from(TOKEN_ENCRYPTION_KEY, "hex");
  }
  try {
    const decoded = Buffer.from(TOKEN_ENCRYPTION_KEY, "base64");
    if (decoded.length === 32) return decoded;
  } catch {
    return null;
  }
  return null;
}

function encryptSecret(value) {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY inválida");
  }
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${base64UrlEncode(iv)}.${base64UrlEncode(tag)}.${base64UrlEncode(encrypted)}`;
}

function decryptSecret(value) {
  const key = getEncryptionKey();
  if (!key) {
    throw new Error("TOKEN_ENCRYPTION_KEY inválida");
  }
  const parts = String(value || "").split(".");
  if (parts.length !== 3) {
    throw new Error("secret inválido");
  }
  const iv = base64UrlDecode(parts[0]);
  const tag = base64UrlDecode(parts[1]);
  const encrypted = base64UrlDecode(parts[2]);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

function getFernetKeys() {
  const raw = BOT_TOKEN_ENCRYPTION_KEY || TOKEN_ENCRYPTION_KEY;
  if (!raw) return null;
  try {
    const key = base64UrlDecode(raw);
    if (key.length !== 32) {
      return null;
    }
    return {
      signingKey: key.subarray(0, 16),
      encryptionKey: key.subarray(16)
    };
  } catch {
    return null;
  }
}

function decryptFernetToken(token) {
  if (!token) return null;
  const keys = getFernetKeys();
  if (!keys) return null;
  try {
    const data = base64UrlDecode(token);
    if (data.length < 1 + 8 + 16 + 32) {
      return null;
    }
    if (data[0] !== 0x80) {
      return null;
    }
    const hmacStart = data.length - 32;
    const signed = data.subarray(0, hmacStart);
    const hmac = data.subarray(hmacStart);
    const expected = crypto.createHmac("sha256", keys.signingKey).update(signed).digest();
    if (expected.length !== hmac.length || !crypto.timingSafeEqual(expected, hmac)) {
      return null;
    }
    const iv = data.subarray(9, 25);
    const ciphertext = data.subarray(25, hmacStart);
    const decipher = crypto.createDecipheriv("aes-128-cbc", keys.encryptionKey, iv);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch {
    return null;
  }
}

async function refreshDiscordToken(refreshToken) {
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord token refresh error ${response.status}: ${text}`);
  }
  return response.json();
}

async function ensureValidAccessToken(user) {
  if (!user.encrypted_access_token) {
    throw new Error("Tokens ausentes");
  }
  try {
    const expiresAt = user.token_expires_at ? new Date(user.token_expires_at) : null;
    const now = Date.now();
    if (expiresAt && expiresAt.getTime() > now + 30000) {
      return decryptSecret(user.encrypted_access_token);
    }
  } catch {
    // proceed to refresh
  }

  if (!user.encrypted_refresh_token) {
    throw new Error("Refresh token ausente");
  }

  const refreshToken = decryptSecret(user.encrypted_refresh_token);
  const tokenData = await refreshDiscordToken(refreshToken);
  const accessToken = tokenData.access_token;
  const newRefreshToken = tokenData.refresh_token || refreshToken;
  const expiresIn = tokenData.expires_in || 0;
  const expiresAt = new Date(Date.now() + expiresIn * 1000);
  await upsertUser({
    discord_user_id: user.discord_user_id,
    encrypted_access_token: encryptSecret(accessToken),
    encrypted_refresh_token: encryptSecret(newRefreshToken),
    token_expires_at: expiresAt.toISOString()
  });
  return accessToken;
}

function hashSessionToken(token) {
  if (!SESSION_SECRET) {
    throw new Error("SESSION_SECRET não configurado");
  }
  return crypto.createHmac("sha256", SESSION_SECRET).update(token).digest("hex");
}

function generateRandomString(size = 32) {
  return base64UrlEncode(crypto.randomBytes(size));
}

function getCookieOptions() {
  const secure = APP_URL.startsWith("https://") || process.env.INKCLOUD_COOKIE_SECURE === "true";
  return { httpOnly: true, sameSite: "Lax", secure };
}

async function readJsonBody(request) {
  return await new Promise((resolve, reject) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function supabaseRequest(method, pathSuffix, body) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase não configurado");
  }
  const url = `${SUPABASE_URL}/rest/v1/${pathSuffix}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "return=representation"
    },
    body: body ? JSON.stringify(body) : undefined
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

function scopeBotDocId(tenantId, docId) {
  return `${tenantId}:${docId}`;
}

async function getBotDataDoc(tenantId, docId) {
  const scopedId = scopeBotDocId(tenantId, docId);
  const rows = await supabaseRequest(
    "GET",
    `bot_data?tenant_id=eq.${tenantId}&_id=eq.${encodeURIComponent(scopedId)}&select=_id,data&limit=1`
  );
  return rows?.[0]?.data || {};
}

async function upsertBotDataDoc(tenantId, docId, data) {
  const scopedId = scopeBotDocId(tenantId, docId);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/bot_data`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify({
      _id: scopedId,
      tenant_id: tenantId,
      data: data || {}
    })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }
  return response.json();
}

const STATUS_TYPES = ["online", "idle", "dnd", "invisible"];
const ACTIVITY_TYPES = ["playing", "watching", "listening", "competing"];
const MODE_OPTIONS = ["light", "dark", "auto"];

const DEFAULT_APPEARANCE_CONFIG = {
  status: {
    type: "online",
    activity: "inkCloud v2.4.1",
    activityType: "playing",
    names: ["inkCloud v2.4.1"],
  },
  info: {
    name: "inkCloud Bot",
    avatar: "https://cdn.discordapp.com/embed/avatars/0.png",
    banner: "",
  },
  mode: "dark",
  colors: {
    primary: "#ffffff",
    secondary: "#888888",
    accent: "#666666",
  },
  roles: {
    adminRoleId: "111111111111111111",
    modRoleId: "222222222222222222",
    memberRoleId: "333333333333333333",
    customerRoleId: "444444444444444444",
  },
  channels: {
    logsId: "555555555555555555",
    welcomeId: "666666666666666666",
    rulesId: "777777777777777777",
    announcementsId: "888888888888888888",
  },
  payments: {
    pix: true,
    card: false,
    mercadoPago: true,
    stripe: false,
  },
  notifications: {
    sales: true,
    tickets: true,
    alerts: true,
    updates: false,
  },
  blacklist: [],
  antiFake: {
    enabled: true,
    minAge: 7,
    requireAvatar: true,
    requireVerified: false,
  },
  extensions: {
    boost: true,
    visiongen: false,
  },
};

const DEFAULT_RUNTIME_COLORS = {
  primary: "#ffffff",
  secondary: "#888888",
  accent: "#666666",
  success: "#28a745",
  danger: "#dc3545",
  warning: "#ffc107",
};

function cloneAppearanceConfig() {
  return JSON.parse(JSON.stringify(DEFAULT_APPEARANCE_CONFIG));
}

function normalizeHexColor(value, fallback) {
  const candidate = (String(value ?? "") || "").trim();
  if (/^#[0-9A-Fa-f]{6}$/.test(candidate)) {
    return candidate.toUpperCase();
  }
  return fallback;
}

function sanitizeNames(names, fallback) {
  if (!Array.isArray(names)) {
    const fallbackText = String(fallback ?? "").trim();
    return fallbackText ? [fallbackText] : DEFAULT_APPEARANCE_CONFIG.status.names;
  }
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
  return DEFAULT_APPEARANCE_CONFIG.status.names;
}

function sanitizeBlacklist(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  const cleaned = list
    .map((entry) => String(entry ?? "").trim())
    .filter(Boolean);
  return Array.from(new Set(cleaned));
}

const BRAZILIAN_DDDS = [
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
];

const VALID_DISPLAY_MODES = ["embed", "components"];
const DEFAULT_CUSTOM_MODE = "components";

const DEFAULT_NOTIFICATIONS_CONFIG = {
  enabled: false,
  ddd: null,
  number: null,
};

function normalizeNotificationDDD(value) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 2) return null;
  return BRAZILIAN_DDDS.includes(digits) ? digits : null;
}

function normalizeNotificationNumber(value) {
  if (typeof value !== "string") return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits;
}

async function loadNotificationsConfig(tenantId) {
  const document = await getBotDataDoc(tenantId, "notifications_config");
  return {
    ...DEFAULT_NOTIFICATIONS_CONFIG,
    enabled: Boolean(document.enabled ?? DEFAULT_NOTIFICATIONS_CONFIG.enabled),
    ddd: typeof document.ddd === "string" ? document.ddd : null,
    number: typeof document.number === "string" ? document.number : null,
  };
}

async function persistNotificationsConfig(tenantId, payload) {
  const normalizedPayload = payload && typeof payload === "object" ? payload : {};
  const current = await loadNotificationsConfig(tenantId);
  const next = {
    ...current,
    enabled:
      typeof normalizedPayload.enabled === "boolean"
        ? normalizedPayload.enabled
        : current.enabled,
    ddd: current.ddd,
    number: current.number,
  };

  if (Object.prototype.hasOwnProperty.call(normalizedPayload, "ddd")) {
    next.ddd = normalizeNotificationDDD(normalizedPayload.ddd);
  }

  if (Object.prototype.hasOwnProperty.call(normalizedPayload, "number")) {
    next.number = normalizeNotificationNumber(normalizedPayload.number);
  }

  if (!next.ddd) {
    next.number = null;
  }

  await upsertBotDataDoc(tenantId, "notifications_config", next);
  return next;
}

async function loadCustomMode(tenantId) {
  const doc = await getBotDataDoc(tenantId, "custom_mode");
  const mode = typeof doc.mode === "string" && VALID_DISPLAY_MODES.includes(doc.mode)
    ? doc.mode
    : DEFAULT_CUSTOM_MODE;
  return { mode };
}

async function persistCustomMode(tenantId, payload) {
  const nextMode =
    payload && typeof payload.mode === "string" && VALID_DISPLAY_MODES.includes(payload.mode)
      ? payload.mode
      : DEFAULT_CUSTOM_MODE;
  await upsertBotDataDoc(tenantId, "custom_mode", { mode: nextMode });
  return { mode: nextMode };
}

function mergeAppearanceConfig(payload) {
  const result = cloneAppearanceConfig();
  if (!payload || typeof payload !== "object") {
    return result;
  }
  const partial = payload;

  if (partial.status) {
    const statusPatch = partial.status;
    if (statusPatch.type && STATUS_TYPES.includes(statusPatch.type)) {
      result.status.type = statusPatch.type;
    }
    if (statusPatch.activityType && ACTIVITY_TYPES.includes(statusPatch.activityType)) {
      result.status.activityType = statusPatch.activityType;
    }
    if (typeof statusPatch.activity === "string") {
      const value = statusPatch.activity.trim();
      if (value) {
        result.status.activity = value;
      }
    }
    if (statusPatch.names) {
      result.status.names = sanitizeNames(statusPatch.names, result.status.activity);
      result.status.activity = result.status.names[0];
    }
  }

  if (partial.info) {
    result.info = {
      ...result.info,
      ...(partial.info.name ? { name: partial.info.name.trim() } : undefined),
      ...(partial.info.avatar ? { avatar: partial.info.avatar.trim() } : undefined),
      ...(partial.info.banner ? { banner: partial.info.banner.trim() } : undefined),
    };
  }

  if (partial.mode && MODE_OPTIONS.includes(partial.mode)) {
    result.mode = partial.mode;
  }

  if (partial.colors) {
    result.colors = {
      primary: normalizeHexColor(partial.colors.primary, result.colors.primary),
      secondary: normalizeHexColor(partial.colors.secondary, result.colors.secondary),
      accent: normalizeHexColor(partial.colors.accent, result.colors.accent),
    };
  }

  if (partial.roles) {
    result.roles = {
      ...result.roles,
      ...(partial.roles.adminRoleId ? { adminRoleId: partial.roles.adminRoleId.trim() } : undefined),
      ...(partial.roles.modRoleId ? { modRoleId: partial.roles.modRoleId.trim() } : undefined),
      ...(partial.roles.memberRoleId ? { memberRoleId: partial.roles.memberRoleId.trim() } : undefined),
      ...(partial.roles.customerRoleId ? { customerRoleId: partial.roles.customerRoleId.trim() } : undefined),
    };
  }

  if (partial.channels) {
    result.channels = {
      ...result.channels,
      ...(partial.channels.logsId ? { logsId: partial.channels.logsId.trim() } : undefined),
      ...(partial.channels.welcomeId ? { welcomeId: partial.channels.welcomeId.trim() } : undefined),
      ...(partial.channels.rulesId ? { rulesId: partial.channels.rulesId.trim() } : undefined),
      ...(partial.channels.announcementsId
        ? { announcementsId: partial.channels.announcementsId.trim() }
        : undefined),
    };
  }

  if (partial.payments) {
    result.payments = {
      ...result.payments,
      pix: Boolean(partial.payments.pix ?? result.payments.pix),
      card: Boolean(partial.payments.card ?? result.payments.card),
      mercadoPago: Boolean(partial.payments.mercadoPago ?? result.payments.mercadoPago),
      stripe: Boolean(partial.payments.stripe ?? result.payments.stripe),
    };
  }

  if (partial.notifications) {
    result.notifications = {
      ...result.notifications,
      sales: Boolean(partial.notifications.sales ?? result.notifications.sales),
      tickets: Boolean(partial.notifications.tickets ?? result.notifications.tickets),
      alerts: Boolean(partial.notifications.alerts ?? result.notifications.alerts),
      updates: Boolean(partial.notifications.updates ?? result.notifications.updates),
    };
  }

  if (partial.blacklist) {
    result.blacklist = sanitizeBlacklist(partial.blacklist);
  }

  if (partial.antiFake) {
    result.antiFake = {
      ...result.antiFake,
      enabled: Boolean(partial.antiFake.enabled ?? result.antiFake.enabled),
      minAge:
        typeof partial.antiFake.minAge === "number"
          ? Math.max(0, Math.min(365, Math.floor(partial.antiFake.minAge)))
          : result.antiFake.minAge,
      requireAvatar: Boolean(partial.antiFake.requireAvatar ?? result.antiFake.requireAvatar),
      requireVerified: Boolean(partial.antiFake.requireVerified ?? result.antiFake.requireVerified),
    };
  }

  if (partial.extensions) {
    result.extensions = {
      ...result.extensions,
      boost: Boolean(partial.extensions.boost ?? result.extensions.boost),
      visiongen: Boolean(partial.extensions.visiongen ?? result.extensions.visiongen),
    };
  }

  return result;
}

function buildRuntimeStatusDoc(config) {
  const sanitizedNames = sanitizeNames(config.status.names, config.status.activity);
  return {
    type: STATUS_TYPES.includes(config.status.type) ? config.status.type : DEFAULT_APPEARANCE_CONFIG.status.type,
    names: sanitizedNames,
  };
}

function buildRuntimeColorsDoc(config) {
  return {
    primary: normalizeHexColor(config.colors.primary, DEFAULT_RUNTIME_COLORS.primary),
    secondary: normalizeHexColor(config.colors.secondary, DEFAULT_RUNTIME_COLORS.secondary),
    accent: normalizeHexColor(config.colors.accent, DEFAULT_RUNTIME_COLORS.accent),
    success: DEFAULT_RUNTIME_COLORS.success,
    danger: DEFAULT_RUNTIME_COLORS.danger,
    warning: DEFAULT_RUNTIME_COLORS.warning,
  };
}

function buildRuntimeInfoDoc(config) {
  return {
    name: String(config.info.name || DEFAULT_APPEARANCE_CONFIG.info.name),
    avatar: String(config.info.avatar || DEFAULT_APPEARANCE_CONFIG.info.avatar),
    banner: String(config.info.banner || DEFAULT_APPEARANCE_CONFIG.info.banner),
  };
}

async function persistRuntimeAppearance(tenantId, config) {
  await Promise.all([
    upsertBotDataDoc(tenantId, "custom_status", buildRuntimeStatusDoc(config)),
    upsertBotDataDoc(tenantId, "custom_colors", buildRuntimeColorsDoc(config)),
    upsertBotDataDoc(tenantId, "custom_info", buildRuntimeInfoDoc(config)),
  ]);
}

async function resolveRuntimeUrlForTenant(tenantId) {
  if (!tenantId) return null;
  try {
    const rows = await supabaseRequest(
      "GET",
      `bot_instances?tenant_id=eq.${tenantId}&select=metadata&limit=1`
    );
    const metadata = rows?.[0]?.metadata || {};
    const runtimeUrl =
      metadata.http_url ||
      metadata.runtime_url ||
      metadata.internal_url ||
      metadata.url ||
      null;
    if (!runtimeUrl) return null;
    return String(runtimeUrl).trim().replace(/\/+$/, "");
  } catch (error) {
    console.error(`[store] runtime url resolve failed for ${tenantId}`, error);
    return null;
  }
}

async function getUserByDiscordId(discordUserId) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?discord_user_id=eq.${discordUserId}&select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data?.[0] || null;
}

async function upsertUser(user) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/users?on_conflict=discord_user_id`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      Prefer: "resolution=merge-duplicates,return=representation"
    },
    body: JSON.stringify(user)
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data?.[0] || null;
}

async function getTenantForUser(discordUserId) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/tenants?owner_id=eq.${discordUserId}&select=id,status,guilds(guild_id,guild_name)&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data?.[0] || null;
}

async function getTenantForUserById(discordUserId, tenantId) {
  if (!tenantId) return null;
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(tenantId)) return null;
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/tenants?owner_id=eq.${discordUserId}&id=eq.${tenantId}` +
      `&select=id,status,guilds(guild_id,guild_name)&limit=1`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data?.[0] || null;
}

async function resolveTenantForRequest(request, user) {
  const requestedTenantId = String(request.headers["x-tenant-id"] || "").trim();
  if (requestedTenantId) {
    const tenantData = await getTenantForUserById(user.discord_user_id, requestedTenantId);
    if (tenantData) return tenantData;
  }
  return await getTenantForUser(user.discord_user_id);
}

async function getGuildForTenant(tenantId) {
  if (!tenantId) return null;
  const rows = await supabaseRequest(
    "GET",
    `guilds?tenant_id=eq.${tenantId}&select=guild_id,guild_name&limit=1`
  );
  return rows?.[0] || null;
}

async function resolveGuildIdForTenant(tenantId, fallbackGuildId) {
  if (!tenantId) return fallbackGuildId || null;
  const guild = await getGuildForTenant(tenantId);
  return guild?.guild_id || fallbackGuildId || null;
}

 

function canManageGuild(guild) {
  const permissions = Number(guild.permissions || 0);
  return (
    guild.owner === true ||
    (permissions & 0x8) === 0x8 ||
    (permissions & 0x20) === 0x20
  );
}

function getUtcDayStart(timestampMs) {
  const date = new Date(timestampMs);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function getPurchaseTimestampMs(purchase) {
  if (!purchase) return null;
  const ts = purchase.timestamp;
  if (typeof ts === "number") {
    return ts * 1000;
  }
  const createdAt = purchase.created_at || purchase.createdAt || purchase.date;
  if (typeof createdAt === "number") {
    return createdAt > 1e12 ? createdAt : createdAt * 1000;
  }
  if (typeof createdAt === "string") {
    const parsed = Date.parse(createdAt);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

async function fetchDiscordGuilds(accessToken) {
  const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord guilds error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return (Array.isArray(data) ? data : [])
    .filter(canManageGuild)
    .map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128` : null,
      owner: guild.owner === true,
      permissions: Number(guild.permissions || 0)
    }));
}

async function createSession(userId, expiresAt) {
  const rawToken = generateRandomString(32);
  const tokenHash = hashSessionToken(rawToken);
  await supabaseRequest("POST", "auth_sessions", {
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString()
  });
  return rawToken;
}

async function getSessionFromToken(rawToken) {
  const tokenHash = hashSessionToken(rawToken);
  const response = await fetch(`${SUPABASE_URL}/rest/v1/auth_sessions?token_hash=eq.${tokenHash}&select=*`, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }
  const data = await response.json();
  return data?.[0] || null;
}

async function deleteSession(rawToken) {
  const tokenHash = hashSessionToken(rawToken);
  await supabaseRequest("DELETE", `auth_sessions?token_hash=eq.${tokenHash}`);
}

function buildDiscordAuthUrl(state, codeChallenge) {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: "identify email guilds guilds.join",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    prompt: "consent"
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code, codeVerifier) {
  const body = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    client_secret: DISCORD_CLIENT_SECRET,
    grant_type: "authorization_code",
    code,
    redirect_uri: DISCORD_REDIRECT_URI,
    code_verifier: codeVerifier
  });
  const response = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord token error ${response.status}: ${text}`);
  }
  return response.json();
}

async function fetchDiscordUser(accessToken) {
  const response = await fetch("https://discord.com/api/v10/users/@me", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Discord user error ${response.status}: ${text}`);
  }
  return response.json();
}

async function checkGuildMembership(discordUserId) {
  const response = await fetch(
    `https://discord.com/api/v10/guilds/${INKCLOUD_GUILD_ID}/members/${discordUserId}`,
    {
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`
      }
    }
  );
  if (response.status === 200) {
    return true;
  }
  if (response.status === 404) {
    return false;
  }
  const text = await response.text();
  throw new Error(`Discord guild check error ${response.status}: ${text}`);
}

async function addUserToGuild(discordUserId, accessToken) {
  const response = await fetch(
    `https://discord.com/api/v10/guilds/${INKCLOUD_GUILD_ID}/members/${discordUserId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ access_token: accessToken })
    }
  );
  if (response.status === 201 || response.status === 204 || response.status === 200) {
    return true;
  }
  const text = await response.text();
  throw new Error(`Discord guild join error ${response.status}: ${text}`);
}

async function createGuildInvite() {
  if (!INKCLOUD_GUILD_INVITE_CHANNEL_ID) return null;
  const response = await fetch(
    `https://discord.com/api/v10/channels/${INKCLOUD_GUILD_INVITE_CHANNEL_ID}/invites`,
    {
      method: "POST",
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        max_age: 86400,
        max_uses: 1,
        unique: true
      })
    }
  );
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  return data?.code ? `https://discord.gg/${data.code}` : null;
}

async function fetchGuildInfoFromProvisioner(guildId, tenantId) {
  if (!PROVISIONER_URL || !guildId) return null;
  const cacheKey = tenantId ? `${tenantId}:${guildId}` : guildId;
  const cached = provisionerGuildCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < PROVISIONER_GUILD_TTL) {
    return cached.data;
  }
  const inflight = inFlightProvisionerGuild.get(cacheKey);
  if (inflight) {
    return inflight;
  }
  const params = new URLSearchParams({ guild_id: guildId });
  if (tenantId) params.set("tenant_id", tenantId);
  try {
    const requestPromise = (async () => {
      const response = await fetch(`${PROVISIONER_URL}/internal/bot/guild?${params.toString()}`, {
        headers: {
          "Content-Type": "application/json",
          ...(PROVISIONER_API_KEY ? { "X-API-Key": PROVISIONER_API_KEY } : {})
        }
      });
      if (!response.ok) {
        const text = await response.text();
        if (response.status !== 404) {
          console.error(`[provisioner] guild error ${response.status}: ${text}`);
        }
        provisionerGuildCache.set(cacheKey, { data: null, timestamp: Date.now() });
        return null;
      }
      const data = await response.json();
      const info = {
        name: data.name || null,
        icon: data.icon || null,
        member_count: data.members ?? null,
        role_count: data.roles ?? null,
        boost_count: data.boosts ?? null,
        channels_count: data.channels ?? null,
        permissions: data.permissions || DEFAULT_GUILD_PERMISSIONS
      };
      provisionerGuildCache.set(cacheKey, { data: info, timestamp: Date.now() });
      return info;
    })();
    inFlightProvisionerGuild.set(cacheKey, requestPromise);
    const result = await requestPromise;
    return result;
  } catch (error) {
    console.error(`[provisioner] guild request failed`, error);
    return null;
  } finally {
    inFlightProvisionerGuild.delete(cacheKey);
  }
}

async function fetchGuildInfo(guildId, tenantId = null) {
  const provisionerInfo = await fetchGuildInfoFromProvisioner(guildId, tenantId);
  if (provisionerInfo) {
    return provisionerInfo;
  }
  if (!DISCORD_BOT_TOKEN) {
    return null;
  }
  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}?with_counts=true`, {
      headers: {
        Authorization: `Bot ${DISCORD_BOT_TOKEN}`
      }
    });
    if (!response.ok) return null;
    const data = await response.json();
    let channelsCount = null;
    try {
      const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`
        }
      });
      if (channelsResponse.ok) {
        const channelsData = await channelsResponse.json();
        if (Array.isArray(channelsData)) {
          channelsCount = channelsData.length;
        }
      }
    } catch {
      channelsCount = null;
    }
    const permissions = await fetchGuildPermissions(guildId);

    return {
      name: data.name || null,
      icon: data.icon ? `https://cdn.discordapp.com/icons/${guildId}/${data.icon}.png?size=128` : null,
      member_count: data.approximate_member_count ?? null,
      role_count: Array.isArray(data.roles) ? data.roles.length : null,
      boost_count: data.premium_subscription_count ?? null,
      channels_count: channelsCount ?? null,
      permissions
    };
  } catch {
    return null;
  }
}

const PERMISSION_FLAGS = {
  admin: 0x00000008n,
  manageChannels: 0x00000010n,
  manageRoles: 0x10000000n,
  manageMessages: 0x00002000n,
};

const DEFAULT_GUILD_PERMISSIONS = {
  admin: false,
  manageChannels: false,
  manageRoles: false,
  manageMessages: false,
};

async function fetchGuildPermissions(guildId) {
  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/@me`,
      {
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`
        }
      }
    );
    if (!response.ok) {
      return DEFAULT_GUILD_PERMISSIONS;
    }
    const data = await response.json();
    const rawMask = data?.permissions;
    if (rawMask === undefined || rawMask === null) {
      return DEFAULT_GUILD_PERMISSIONS;
    }
    const mask = typeof rawMask === "string" ? BigInt(rawMask) : BigInt(rawMask);
    return {
      admin: Boolean(mask & PERMISSION_FLAGS.admin),
      manageChannels: Boolean(mask & PERMISSION_FLAGS.manageChannels),
      manageRoles: Boolean(mask & PERMISSION_FLAGS.manageRoles),
      manageMessages: Boolean(mask & PERMISSION_FLAGS.manageMessages),
    };
  } catch {
    return DEFAULT_GUILD_PERMISSIONS;
  }
}

function toNullableNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const num = Number(value);
  return Number.isNaN(num) ? null : num;
}

async function getTenantIdForGuild(guildId) {
  if (!guildId) {
    return null;
  }
  try {
    const rows = await supabaseRequest(
      "GET",
      `guilds?guild_id=eq.${guildId}&select=tenant_id&limit=1`
    );
    return rows?.[0]?.tenant_id || null;
  } catch (error) {
    console.error(`[guild] failed to resolve tenant for guild ${guildId}`, error);
    return null;
  }
}

async function fetchGuildCache(guildId) {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  try {
    const cacheUrl = `${SUPABASE_URL}/rest/v1/guild_cache?guild_id=eq.${guildId}&select=guild_id,name,icon,members,channels,roles,boosts,permissions&limit=1`;
    const response = await fetch(cacheUrl, {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    });
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) {
      return null;
    }
    return data[0];
  } catch (error) {
    return null;
  }
}

async function fetchGuildOverviewData(guildId, fallbackName, tenantId = null) {
  if (!guildId) {
    return null;
  }
  const cached = await fetchGuildCache(guildId);
  if (cached) {
    return {
      guild_id: guildId,
      name: cached.name || null,
      icon: cached.icon || null,
      members: toNullableNumber(cached.members),
      channels: toNullableNumber(cached.channels),
      roles: toNullableNumber(cached.roles),
      boosts: toNullableNumber(cached.boosts),
      permissions: cached.permissions || DEFAULT_GUILD_PERMISSIONS
    };
  }
  const info = await fetchGuildInfo(guildId, tenantId);
  if (!info) {
    if (fallbackName !== undefined && fallbackName !== null) {
      return {
        guild_id: guildId,
        name: fallbackName,
        icon: null,
        members: null,
        channels: null,
        roles: null,
        boosts: null,
        permissions: DEFAULT_GUILD_PERMISSIONS
      };
    }
    return null;
  }
  return {
    guild_id: guildId,
    name: info.name || null,
    icon: info.icon || null,
    members: info.member_count ?? null,
    channels: info.channels_count ?? null,
    roles: info.role_count ?? null,
    boosts: info.boost_count ?? null,
    permissions: info.permissions || DEFAULT_GUILD_PERMISSIONS
  };
}

function parseShardUptime(data) {
  if (!data) return null;
  const candidate =
    data.uptime_seconds ??
    data.uptime ??
    data.uptimeSeconds ??
    data.run_time ??
    null;
  if (candidate === null || candidate === undefined) {
    return null;
  }
  const num = Number(candidate);
  if (Number.isNaN(num)) {
    return null;
  }
  return Math.max(0, Math.floor(num));
}

function parseShardVersion(data) {
  if (!data) return null;
  return (
    data.version ||
    data.current_version ||
    data.app_version ||
    data.desired_version ||
    null
  );
}

async function fetchShardCloudStats(appId) {
  if (!appId || !SHARDCLOUD_API_KEY) return null;
  try {
    const response = await fetch(`${SHARDCLOUD_API_URL}/apps/${appId}/stats`, {
      headers: {
        Authorization: `Bearer ${SHARDCLOUD_API_KEY}`,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      const text = await response.text();
      console.error(`[shardcloud] stats error ${response.status}: ${text}`);
      return null;
    }
    return response.json();
  } catch (error) {
    console.error(`[shardcloud] stats request failed for ${appId}`, error);
    return null;
  }
}

async function fetchBotIdentityFromDiscord(tenantId) {
  const secrets = await supabaseRequest(
    "GET",
    `bot_secrets?tenant_id=eq.${tenantId}&select=encrypted_token&limit=1`
  );
  const encrypted = secrets?.[0]?.encrypted_token || null;
  const decrypted = decryptFernetToken(encrypted);
  const token = decrypted || encrypted;
  if (!token) return null;
  const response = await fetch("https://discord.com/api/v10/users/@me", {
    headers: {
      Authorization: `Bot ${token}`
    }
  });
  if (!response.ok) {
    return null;
  }
  const userData = await response.json();
  return {
    id: userData.id || null,
    name: userData.username || null,
    avatar: userData.avatar
      ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png?size=128`
      : null,
    tag: null
  };
}

async function fetchBotIdentityFromProvisioner(tenantId) {
  if (!PROVISIONER_URL || !tenantId) return null;
  const cached = provisionerIdentityCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < PROVISIONER_IDENTITY_TTL) {
    return cached.data;
  }
  const inflight = inFlightProvisionerIdentity.get(tenantId);
  if (inflight) {
    return inflight;
  }
  try {
    const requestPromise = (async () => {
      const response = await fetch(
        `${PROVISIONER_URL}/internal/bot/identity?tenant_id=${encodeURIComponent(tenantId)}`,
        {
          headers: {
            "Content-Type": "application/json",
            ...(PROVISIONER_API_KEY ? { "X-API-Key": PROVISIONER_API_KEY } : {})
          }
        }
      );
      if (!response.ok) {
        const text = await response.text();
        console.error(`[provisioner] identity error ${response.status}: ${text}`);
        return null;
      }
      const data = await response.json();
      const identity = {
        id: data.id || null,
        name: data.name || null,
        avatar: data.avatar || null,
        tag: null
      };
      provisionerIdentityCache.set(tenantId, { data: identity, timestamp: Date.now() });
      return identity;
    })();
    inFlightProvisionerIdentity.set(tenantId, requestPromise);
    const result = await requestPromise;
    return result;
  } catch (error) {
    console.error(`[provisioner] identity request failed`, error);
    return null;
  } finally {
    inFlightProvisionerIdentity.delete(tenantId);
  }
}

async function fetchBotTokenForTenant(tenantId) {
  const secrets = await supabaseRequest(
    "GET",
    `bot_secrets?tenant_id=eq.${tenantId}&select=encrypted_token&limit=1`
  );
  const encrypted = secrets?.[0]?.encrypted_token || null;
  const decrypted = decryptFernetToken(encrypted);
  return decrypted || encrypted || null;
}

async function fetchBotIdentity(tenantId) {
  if (!tenantId) return null;
  const cached = botIdentityCache.get(tenantId);
  if (cached && Date.now() - cached.timestamp < BOT_IDENTITY_TTL) {
    return cached.data;
  }
  try {
    const provisionerIdentity = await fetchBotIdentityFromProvisioner(tenantId);
    if (provisionerIdentity?.name) {
      botIdentityCache.set(tenantId, { data: provisionerIdentity, timestamp: Date.now() });
      return provisionerIdentity;
    }
    const rows = await supabaseRequest(
      "GET",
      `bot_identity?tenant_id=eq.${tenantId}&select=bot_id,bot_name,bot_avatar_url,updated_at&order=updated_at.desc&limit=1`
    );
    const record = rows?.[0] || null;
    if (record?.bot_name) {
      const identity = {
        id: record.bot_id || null,
        name: record.bot_name || null,
        avatar: record.bot_avatar_url || null,
        tag: null
      };
      botIdentityCache.set(tenantId, { data: identity, timestamp: Date.now() });
      return identity;
    }
    const fallback = await fetchBotIdentityFromDiscord(tenantId);
    if (fallback) {
      botIdentityCache.set(tenantId, { data: fallback, timestamp: Date.now() });
      return fallback;
    }
    return null;
  } catch (error) {
    console.error(`[bot/identity] failed for tenant ${tenantId}`, error);
    return null;
  }
}

function normalizeVersion(version) {
  if (!version) {
    return null;
  }
  return version.startsWith("v") ? version : `v${version}`;
}

function computeUptimeSeconds(createdAt, lastHeartbeat) {
  const reference = createdAt || lastHeartbeat;
  if (!reference) {
    return null;
  }
  const parsed = new Date(reference);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 1000));
}

function isHeartbeatOnline(lastHeartbeat) {
  if (!lastHeartbeat) return false;
  const parsed = new Date(lastHeartbeat);
  if (Number.isNaN(parsed.getTime())) return false;
  return Date.now() - parsed.getTime() < 120000;
}

function mapBotFromInstance(instance, shardData = null) {
  if (!instance) return null;
  const lastHeartbeat = instance.last_heartbeat || null;
  const shardVersion = normalizeVersion(parseShardVersion(shardData));
  const baseVersion = normalizeVersion(instance.current_version || instance.desired_version || null);
  const version = shardVersion || baseVersion;
  const shardUptime = parseShardUptime(shardData);
  const uptimeSeconds = shardUptime ?? computeUptimeSeconds(instance.created_at, lastHeartbeat);
  const shardOnline = shardData?.status === "running";
  const shardRuntimeStatus = shardData?.status || instance.runtime_status || instance.status || null;
  const runtimeStatus = shardRuntimeStatus;
  const online = shardOnline || isHeartbeatOnline(lastHeartbeat);
  const tokenValid = online;
  return {
    online,
    uptime_seconds: uptimeSeconds,
    version,
    last_heartbeat: lastHeartbeat,
    token_valid: tokenValid
  };
}

function mapGuildFromInstance(instance, guildId, fallbackName) {
  if (!instance) return null;
  return {
    guild_id: instance.guild_id || guildId || null,
    name: instance.guild_name || fallbackName || null,
    icon: instance.guild_icon || null,
    members: toNullableNumber(instance.guild_member_count),
    channels: toNullableNumber(instance.guild_channels_count),
    roles: toNullableNumber(instance.guild_roles_count),
    boosts: toNullableNumber(instance.guild_boost_count),
    permissions: instance.guild_permissions || DEFAULT_GUILD_PERMISSIONS
  };
}

async function fetchBotStatusForGuild(guildId, tenantId = null) {
  if (!guildId) {
    return null;
  }
  const resolvedTenantId = tenantId || (await getTenantIdForGuild(guildId));
  if (!resolvedTenantId) {
    return null;
  }
  try {
    const rows = await supabaseRequest(
      "GET",
      `bot_instances?tenant_id=eq.${resolvedTenantId}&select=tenant_id,runtime_status,status,current_version,desired_version,last_heartbeat,last_error,created_at&limit=1`
    );
    const instance = (rows || [])[0] || null;
    if (!instance) {
      return null;
    }
    const shardStats =
      instance.shard_app_id && SHARDCLOUD_API_KEY
        ? await fetchShardCloudStats(instance.shard_app_id)
        : null;
    const mapped = mapBotFromInstance(instance, shardStats);
    return mapped;
  } catch (error) {
    console.error(`[bot/status] failed to fetch status for guild ${guildId}`, error);
    return null;
  }
}

async function buildBotsPayload(user) {
  const responseData = await fetch(
    `${SUPABASE_URL}/rest/v1/tenants?owner_id=eq.${user.discord_user_id}` +
      `&select=id,status,created_at,metadata,` +
      `guilds(guild_id,guild_name),` +
      `bot_instances(shard_app_id,status,last_heartbeat,current_version,desired_version,last_error),` +
      `subscriptions(status,current_period_end,provider)`,
    {
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
      }
    }
  );
  if (!responseData.ok) {
    const text = await responseData.text();
    throw new Error(`Supabase error ${responseData.status}: ${text}`);
  }
  const data = await responseData.json();
  const guildInfoCache = new Map();
  const bots = [];
  for (const tenant of data || []) {
    const tenantStatus = String(tenant.status || "").toLowerCase();
    if (["deleted", "inactive", "disabled", "archived"].includes(tenantStatus)) {
      continue;
    }
    const guildId = tenant.guilds?.[0]?.guild_id || null;
    const storedGuildName = tenant.guilds?.[0]?.guild_name || null;
    let guildInfo = null;
    if (guildId) {
      if (guildInfoCache.has(guildId)) {
        guildInfo = guildInfoCache.get(guildId);
      } else {
        guildInfo = await fetchGuildInfo(guildId, tenant.id);
        guildInfoCache.set(guildId, guildInfo);
      }
    }
    const instanceStatus = String(tenant.bot_instances?.[0]?.status || "").toLowerCase();
    if (["deleted", "removed", "disabled"].includes(instanceStatus)) {
      continue;
    }
    const identity =
      (await fetchBotIdentityFromProvisioner(tenant.id)) ||
      (await fetchBotIdentityFromDiscord(tenant.id));
    bots.push({
      tenant_id: tenant.id,
      status: tenant.status,
      created_at: tenant.created_at,
      guild_id: guildId,
      guild_name: storedGuildName || guildInfo?.name || null,
      guild_icon: guildInfo?.icon || null,
      bot_name: identity?.name || null,
      bot_avatar: identity?.avatar || null,
      guild_member_count: guildInfo?.member_count ?? null,
      guild_roles_count: guildInfo?.role_count ?? null,
      guild_channels_count: guildInfo?.channels_count ?? null,
      guild_boost_count: guildInfo?.boost_count ?? null,
      guild_permissions: guildInfo?.permissions || DEFAULT_GUILD_PERMISSIONS,
      bot_status: tenant.bot_instances?.[0]?.status || "pending",
      shard_app_id: tenant.bot_instances?.[0]?.shard_app_id || null,
      last_heartbeat: tenant.bot_instances?.[0]?.last_heartbeat || null,
      current_version: tenant.bot_instances?.[0]?.current_version || null,
      desired_version: tenant.bot_instances?.[0]?.desired_version || null,
      last_error: tenant.bot_instances?.[0]?.last_error || null,
      subscription_status: tenant.subscriptions?.[0]?.status || null,
      subscription_end: tenant.subscriptions?.[0]?.current_period_end || null
    });
  }
  return {
    owner_id: user.discord_user_id,
    bots
  };
}

async function requireSession(request, response) {
  const cookies = parseCookies(request);
  const rawToken = cookies["inkcloud_session"];
  if (!rawToken) {
    sendJson(response, 401, { error: "unauthorized" });
    return null;
  }
  const session = await getSessionFromToken(rawToken);
  if (!session) {
    sendJson(response, 401, { error: "unauthorized" });
    return null;
  }
  const expiresAt = session.expires_at ? new Date(session.expires_at) : null;
  if (expiresAt && expiresAt.getTime() < Date.now()) {
    await deleteSession(rawToken);
    sendJson(response, 401, { error: "session_expired" });
    return null;
  }
  const user = await supabaseRequest("GET", `users?id=eq.${session.user_id}&select=*`);
  return user?.[0] || null;
}

async function buildMePayload(user, request) {
  const tenantData = await resolveTenantForRequest(request, user);
  let guild = tenantData?.guilds?.[0];
  if (!guild && tenantData?.id) {
    guild = await getGuildForTenant(tenantData.id);
  }
  return {
    id: user.id,
    discord_user_id: user.discord_user_id,
    username: user.username,
    email: user.email,
    avatar: user.avatar,
    is_in_inkcloud_guild: user.is_in_inkcloud_guild,
    needs_invite: user.needs_invite,
    tenant_id: tenantData?.id || null,
    selected_guild_id: guild?.guild_id || null,
    selected_guild_name: guild?.guild_name || null,
    has_selected_guild: Boolean(guild)
  };
}

const server = http.createServer(async (request, response) => {
  const { method } = request;
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const pathname = url.pathname;

  setCorsHeaders(request, response);

  if (method === "OPTIONS") {
    response.statusCode = 204;
    return response.end();
  }

  if (pathname === "/api/health") {
    return sendJson(response, 200, { status: "ok" });
  }

  if (pathname === "/api/auth/discord/login" && method === "GET") {
    const state = generateRandomString(16);
    const verifier = generateRandomString(32);
    const challenge = base64UrlEncode(crypto.createHash("sha256").update(verifier).digest());
    const redirectTo = url.searchParams.get("redirect") || "/checkout";
    const cookieOptions = getCookieOptions();
    setCookie(response, "inkcloud_oauth_state", state, { ...cookieOptions, maxAge: 600 });
    setCookie(response, "inkcloud_oauth_verifier", verifier, { ...cookieOptions, maxAge: 600 });
    setCookie(response, "inkcloud_oauth_redirect", redirectTo, { ...cookieOptions, maxAge: 600 });
    const authUrl = buildDiscordAuthUrl(state, challenge);
    return redirect(response, authUrl);
  }

  if (pathname === "/api/auth/discord/callback" && method === "GET") {
    try {
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      if (!code || !state) {
        return redirect(response, `${APP_URL}/login?error=missing_code`);
      }
      const cookies = parseCookies(request);
      const expectedState = cookies["inkcloud_oauth_state"];
      const verifier = cookies["inkcloud_oauth_verifier"];
      const redirectTo = cookies["inkcloud_oauth_redirect"] || "/dashboard";

      if (!expectedState || expectedState !== state || !verifier) {
        return redirect(response, `${APP_URL}/login?error=invalid_state`);
      }

      const tokenData = await exchangeCodeForToken(code, verifier);
      const accessToken = tokenData.access_token;
      const refreshToken = tokenData.refresh_token;
      const expiresIn = tokenData.expires_in || 0;

      const discordUser = await fetchDiscordUser(accessToken);
      const expiresAt = new Date(Date.now() + expiresIn * 1000);
      const encryptedAccess = encryptSecret(accessToken);
      const encryptedRefresh = encryptSecret(refreshToken || "");

      const userRecord = await upsertUser({
        discord_user_id: discordUser.id,
        username: discordUser.username,
        email: discordUser.email,
        avatar: discordUser.avatar
          ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png?size=256`
          : null,
        encrypted_access_token: encryptedAccess,
        encrypted_refresh_token: encryptedRefresh,
        token_expires_at: expiresAt.toISOString(),
        is_in_inkcloud_guild: false,
        needs_invite: false
      });

      const tenantData = await getTenantForUser(discordUser.id);
      const hasSelectedGuild = Boolean(tenantData?.guilds?.length);

      let inGuild = false;
      let needsInvite = false;
      if (INKCLOUD_GUILD_ID && DISCORD_BOT_TOKEN) {
        try {
          inGuild = await checkGuildMembership(discordUser.id);
          if (!inGuild) {
            try {
              await addUserToGuild(discordUser.id, accessToken);
              inGuild = true;
            } catch {
              needsInvite = true;
            }
          }
        } catch {
          needsInvite = true;
        }
      } else {
        needsInvite = true;
      }

      await upsertUser({
        discord_user_id: discordUser.id,
        is_in_inkcloud_guild: inGuild,
        needs_invite: needsInvite
      });

      const sessionToken = await createSession(userRecord.id, expiresAt);
      const cookieOptions = getCookieOptions();
      setCookie(response, "inkcloud_session", sessionToken, {
        ...cookieOptions,
        maxAge: expiresIn || 3600
      });
      clearCookie(response, "inkcloud_oauth_state");
      clearCookie(response, "inkcloud_oauth_verifier");
      clearCookie(response, "inkcloud_oauth_redirect");

      let nextPath = "/dashboard";
      if (needsInvite) {
        nextPath = "/join-inkcloud";
      } else if (!hasSelectedGuild) {
        nextPath = "/checkout";
      } else if (redirectTo && redirectTo !== "/select-server") {
        nextPath = redirectTo;
      }

      return redirect(response, `${APP_URL}${nextPath}`);
    } catch (error) {
      console.error("[auth] callback error", error);
      return redirect(response, `${APP_URL}/login?error=callback_failed`);
    }
  }

  if (pathname === "/api/me" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const payload = await buildMePayload(user, request);
      return sendJson(response, 200, payload);
    } catch (error) {
      console.error("[me] error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/auth/me" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const payload = await buildMePayload(user, request);
      return sendJson(response, 200, payload);
    } catch (error) {
      console.error("[auth] me error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/auth/logout" && method === "POST") {
    try {
      const cookies = parseCookies(request);
      const rawToken = cookies["inkcloud_session"];
      if (rawToken) {
        await deleteSession(rawToken);
      }
      clearCookie(response, "inkcloud_session");
      return sendJson(response, 200, { status: "ok" });
    } catch (error) {
      console.error("[auth] logout error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/auth/discord/invite" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      if (user.is_in_inkcloud_guild) {
        return sendJson(response, 200, { in_guild: true });
      }
      let inviteUrl = await createGuildInvite();
      if (!inviteUrl) {
        inviteUrl = INKCLOUD_INVITE_URL;
      }
      await upsertUser({
        discord_user_id: user.discord_user_id,
        needs_invite: true
      });
      return sendJson(response, 200, { in_guild: false, invite_url: inviteUrl });
    } catch (error) {
      console.error("[auth] invite error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/auth/discord/revalidate-guild" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      if (!INKCLOUD_GUILD_ID || !DISCORD_BOT_TOKEN) {
        return sendJson(response, 400, { error: "guild_not_configured" });
      }
      const isMember = await checkGuildMembership(user.discord_user_id);
      await upsertUser({
        discord_user_id: user.discord_user_id,
        is_in_inkcloud_guild: isMember,
        needs_invite: !isMember
      });
      return sendJson(response, 200, { is_in_guild: isMember });
    } catch (error) {
      console.error("[auth] revalidate error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/bot/identity" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 200, { name: null, avatar: null });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 200, { name: null, avatar: null });
      }
      const identity = await fetchBotIdentity(tenantId);
      if (!identity) {
        return sendJson(response, 200, { name: null, avatar: null });
      }
      return sendJson(response, 200, { name: identity.name || null, avatar: identity.avatar || null });
    } catch (error) {
      console.error("[bot/identity] error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/overview" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 200, { products_total: 0, products_active: 0, products_inactive: 0, products_out_of_stock: 0, revenue_total: 0 });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 200, { products_total: 0, products_active: 0, products_inactive: 0, products_out_of_stock: 0, revenue_total: 0 });
      }
      const [productsDoc, stockDoc, buysDoc] = await Promise.all([
        getBotDataDoc(tenantId, "loja_products"),
        getBotDataDoc(tenantId, "loja_stock"),
        getBotDataDoc(tenantId, "loja_buys"),
      ]);
      const products = productsDoc || {};
      const stock = stockDoc || {};
      const productList = Object.values(products);
      let activeCount = 0;
      let outOfStock = 0;
      let lowStock = 0;
      for (const product of productList) {
        const info = product?.info || {};
        const isActive = info.active !== false;
        if (isActive) activeCount += 1;
        const campos = product?.campos || {};
        const campoList = Object.values(campos);
        if (campoList.length === 0) {
          outOfStock += 1;
          continue;
        }
        let hasStock = false;
        let productStockCount = 0;
        for (const campo of campoList) {
          if (campo?.infinite_stock?.enabled) {
            hasStock = true;
            break;
          }
          const productStock = stock?.[product.id] || {};
          const fieldStock = productStock?.[campo.id] || [];
          if (Array.isArray(fieldStock) && fieldStock.length > 0) {
            hasStock = true;
            productStockCount += fieldStock.length;
          }
        }
        if (!hasStock) {
          outOfStock += 1;
          continue;
        }
        if (productStockCount > 0 && productStockCount < 10) {
          lowStock += 1;
        }
      }
      let revenue = 0;
      const purchases = buysDoc?.purchases || {};
      for (const userPurchases of Object.values(purchases)) {
        if (!Array.isArray(userPurchases)) continue;
        for (const purchase of userPurchases) {
          const finalPrice = purchase?.pricing?.final_price;
          if (typeof finalPrice === "number") revenue += finalPrice;
        }
      }
      return sendJson(response, 200, {
        products_total: productList.length,
        products_active: activeCount,
        products_inactive: Math.max(productList.length - activeCount, 0),
        products_out_of_stock: outOfStock,
        revenue_total: revenue,
      });
    } catch (error) {
      console.error("[store] overview error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/customization" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 200, {
          purchase_event: { color: "", image: "" },
          feedback_incentive: {
            message:
              "**Obrigado pela sua compra!** 🎉\n\nQue tal deixar uma avaliação sobre sua experiência?\n-# Seu feedback é muito importante para nós!",
            button_text: "Deixar Avaliação",
          },
          doubt_button: {
            enabled: false,
            button_label: "Dúvidas",
            button_emoji: "❓",
            channel_id: "",
            message: "",
          },
          qr_customization: {
            enabled: false,
            color: "#000000",
            background_color: "#FFFFFF",
            logo_url: "",
            logo_size: 0.3,
            corner_style: "square",
          },
        });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (PROVISIONER_URL && PROVISIONER_API_KEY) {
        const params = new URLSearchParams({
          guild_id: targetGuildId,
          tenant_id: tenantId,
        });
        const provResponse = await fetch(
          `${PROVISIONER_URL}/internal/bot/store-customization?${params.toString()}`,
          { headers: { "X-API-Key": PROVISIONER_API_KEY } }
        );
        if (!provResponse.ok) {
          const text = await provResponse.text();
          return sendJson(response, 502, { error: "provisioner_error", details: text });
        }
        const data = await provResponse.json();
        return sendJson(response, 200, data);
      }
      return sendJson(response, 503, { error: "provisioner_unavailable" });
    } catch (error) {
      console.error("[store] customization error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/preferences" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 200, {
          cart_duration_minutes: 30,
          office_hours: {
            enabled: false,
            start_time: "",
            end_time: "",
            off_days: [],
            message: "",
          },
          terms: {
            enabled: false,
            text: "",
          },
          transcript_enabled: false,
          transcript_channel_id: "",
          stock_requests: {
            enabled: false,
            channel_id: "",
            role_id: "",
          },
          maintenance: {
            enabled: false,
            message: "Olá, {user} a loja está em manutenção, tente novamente mais tarde.",
            allow_admins: true,
          },
        });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        tenant_id: tenantId,
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/store-preferences?${params.toString()}`,
        { headers: { "X-API-Key": PROVISIONER_API_KEY } }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] preferences error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/preferences" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        tenant_id: tenantId,
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/store-preferences?${params.toString()}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] preferences update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/roles" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 200, { roles: [] });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        tenant_id: tenantId,
      });
      const provResponse = await fetch(`${PROVISIONER_URL}/internal/bot/roles?${params.toString()}`, {
        headers: { "X-API-Key": PROVISIONER_API_KEY },
      });
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] roles error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/customers" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 200, { customers: [] });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        tenant_id: tenantId,
      });
      const provResponse = await fetch(`${PROVISIONER_URL}/internal/bot/customers?${params.toString()}`, {
        headers: { "X-API-Key": PROVISIONER_API_KEY },
      });
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] customers error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/customers/sync" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        tenant_id: tenantId,
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/customers/sync?${params.toString()}`,
        {
          method: "POST",
          headers: { "X-API-Key": PROVISIONER_API_KEY },
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] customers sync error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/saldo-config" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 200, {
          enabled: false,
          bonus: { type: "disabled", value: 0 },
          rules: {
            max_usage_percentage: 100,
            max_usage_amount: null,
            min_usage_amount: 0,
            allow_partial_payment: true,
          },
          deposit_panel: {
            message_style: "embed",
            embed: {
              title: "Depositar Saldo",
              description: "Clique no botão abaixo para fazer um depósito de saldo.",
              color: "#5c5ef0",
              image_url: null,
              thumbnail_url: null,
            },
            content: { content: "Clique no botão abaixo para fazer um depósito de saldo.", image_url: null },
            container: {
              content: "Clique no botão abaixo para fazer um depósito de saldo.",
              color: "#5c5ef0",
              image_url: null,
              thumbnail_url: null,
            },
            button: { label: "Depositar", emoji: null, style: "green" },
            channel_id: null,
            message_id: null,
            category_id: null,
          },
          deposit_settings: {
            min_deposit: 5,
            max_deposit: 1000,
            terms: null,
            notify_role_id: null,
          },
        });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(`${PROVISIONER_URL}/internal/bot/saldo-config?${params.toString()}`, {
        headers: { "X-API-Key": PROVISIONER_API_KEY },
      });
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] saldo config error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/saldo-config" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(`${PROVISIONER_URL}/internal/bot/saldo-config?${params.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
        body: JSON.stringify(payload),
      });
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] saldo config update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/cashback-config" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 200, {
          enabled: false,
          default_percentage: 5,
          max_cashback: null,
          rules: [],
        });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(`${PROVISIONER_URL}/internal/bot/cashback-config?${params.toString()}`, {
        headers: { "X-API-Key": PROVISIONER_API_KEY },
      });
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] cashback config error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/cashback-config" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(`${PROVISIONER_URL}/internal/bot/cashback-config?${params.toString()}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
        body: JSON.stringify(payload),
      });
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] cashback config update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/saldo-users" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 200, { users: [] });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(`${PROVISIONER_URL}/internal/bot/saldo-users?${params.toString()}`, {
        headers: { "X-API-Key": PROVISIONER_API_KEY },
      });
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] saldo users error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/saldo-admin/add" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(`${PROVISIONER_URL}/internal/bot/saldo-admin/add?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
        body: JSON.stringify(payload),
      });
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] saldo add error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/saldo-admin/remove" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(`${PROVISIONER_URL}/internal/bot/saldo-admin/remove?${params.toString()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
        body: JSON.stringify(payload),
      });
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] saldo remove error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/saldo/image" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const target = String(url.searchParams.get("target") || "").trim();
      const allowedTargets = [
        "embed_image",
        "embed_thumb",
        "content_image",
        "container_image",
        "container_thumb",
      ];
      if (!allowedTargets.includes(target)) {
        return sendJson(response, 400, { error: "invalid_target" });
      }
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }

      const contentType = request.headers["content-type"] || "";
      const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);
      if (!boundaryMatch) {
        return sendJson(response, 400, { error: "invalid_multipart" });
      }
      const boundary = boundaryMatch[1];
      const chunks = [];
      let totalSize = 0;
      await new Promise((resolve, reject) => {
        request.on("data", (chunk) => {
          totalSize += chunk.length;
          if (totalSize > 3 * 1024 * 1024) {
            reject(new Error("file_too_large"));
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        request.on("end", resolve);
        request.on("error", reject);
      });
      const buffer = Buffer.concat(chunks);
      const filePart = parseMultipartFormData(buffer, boundary);
      if (!filePart || filePart.fieldName !== "file") {
        return sendJson(response, 400, { error: "file_missing" });
      }
      const filename = filePart.filename || "upload";
      const mimeType = filePart.contentType || "";
      if (!["image/png", "image/jpeg", "image/webp", "image/gif"].includes(mimeType)) {
        return sendJson(response, 400, { error: "invalid_type" });
      }
      const extensionMatch = filename.match(/\.([a-zA-Z0-9]+)$/);
      const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "png";
      const path = `${tenantId}/saldo/${Date.now()}_${Math.random().toString(36).slice(2)}.${extension}`;

      const publicUrl = await uploadToSupabaseStoragePath(
        filePart.data,
        path,
        mimeType,
        SUPABASE_PRODUCT_IMAGES_BUCKET
      );
      if (!publicUrl) {
        return sendJson(response, 500, { error: "upload_failed" });
      }
      return sendJson(response, 200, { url: publicUrl });
    } catch (error) {
      if (String(error?.message || "").includes("file_too_large")) {
        return sendJson(response, 413, { error: "file_too_large" });
      }
      console.error("[store] saldo image error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/saldo-deposit-panel/send" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/saldo-deposit-panel/send?${params.toString()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
          body: JSON.stringify(payload),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] saldo panel send error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/suggestions-config" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/suggestions-config?${params.toString()}`,
        {
          headers: { "X-API-Key": PROVISIONER_API_KEY },
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[automations] suggestions config get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/suggestions-config" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const configPayload = payload?.config ?? payload;
      if (!configPayload || typeof configPayload !== "object") {
        return sendJson(response, 400, { error: "config_missing" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const normalizedConfig = sanitizeSuggestionsPayload(configPayload);
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/suggestions-config?${params.toString()}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY,
          },
          body: JSON.stringify(normalizedConfig),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[automations] suggestions config update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/ai-moderator-config" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/ai-moderator-config?${params.toString()}`,
        {
          headers: { "X-API-Key": PROVISIONER_API_KEY },
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[automations] ai moderator config get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/ai-moderator-config" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const configPayload = payload?.config ?? payload;
      if (!configPayload || typeof configPayload !== "object") {
        return sendJson(response, 400, { error: "config_missing" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/ai-moderator-config?${params.toString()}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY,
          },
          body: JSON.stringify({ config: configPayload }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[automations] ai moderator config update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/topics-config" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/topics-config?${params.toString()}`,
        {
          headers: { "X-API-Key": PROVISIONER_API_KEY },
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[automations] topics config get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/topics-config" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const configPayload = payload?.config ?? payload;
      if (!configPayload || typeof configPayload !== "object") {
        return sendJson(response, 400, { error: "config_missing" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/topics-config?${params.toString()}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY,
          },
          body: JSON.stringify({ config: configPayload }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[automations] topics config update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/nuke-config" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/nuke-config?${params.toString()}`,
        {
          headers: { "X-API-Key": PROVISIONER_API_KEY },
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[automations] nuke config get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/nuke-config" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const configPayload = payload?.config;
      if (!configPayload || typeof configPayload !== "object") {
        return sendJson(response, 400, { error: "config_missing" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/nuke-config?${params.toString()}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY,
          },
          body: JSON.stringify({ config: configPayload }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[automations] nuke config update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/call-counter-config" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/call-counter-config?${params.toString()}`,
        {
          headers: { "X-API-Key": PROVISIONER_API_KEY },
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      const mapped = mapCallCounterForFrontend(data.config);
      return sendJson(response, 200, { config: mapped || {} });
    } catch (error) {
      console.error("[automations] call counter config get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/call-counter-config" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const configPayload = payload?.config;
      if (!configPayload || typeof configPayload !== "object") {
        return sendJson(response, 400, { error: "config_missing" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const normalizedConfig = sanitizeCallCounterPayload(configPayload);
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/call-counter-config?${params.toString()}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY,
          },
          body: JSON.stringify({ config: normalizedConfig }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      const mapped = mapCallCounterForFrontend(data.config);
      return sendJson(response, 200, { config: mapped || {} });
    } catch (error) {
      console.error("[automations] call counter config update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/cont-members-call-config" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/cont-members-call-config?${params.toString()}`,
        {
          headers: { "X-API-Key": PROVISIONER_API_KEY },
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[automations] cont members call config get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/automations/cont-members-call-config" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const configPayload = payload?.config;
      if (!configPayload || typeof configPayload !== "object") {
        return sendJson(response, 400, { error: "config_missing" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/cont-members-call-config?${params.toString()}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY,
          },
          body: JSON.stringify({ config: configPayload }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[automations] cont members call config update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/protection/config" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const section = (url.searchParams.get("section") || "").trim();
      if (!section) {
        return sendJson(response, 400, { error: "section_missing" });
      }
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        section,
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/protection-config?${params.toString()}`,
        { headers: { "X-API-Key": PROVISIONER_API_KEY } }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[protection] config get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/protection/config" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const section = (payload.section || url.searchParams.get("section") || "").trim();
      if (!section) {
        return sendJson(response, 400, { error: "section_missing" });
      }
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const configPayload = payload?.config ?? payload;
      if (!configPayload || typeof configPayload !== "object") {
        return sendJson(response, 400, { error: "config_missing" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        section,
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/protection-config?${params.toString()}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
          body: JSON.stringify({ config: configPayload }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[protection] config update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/earnings" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const period = (url.searchParams.get("period") || "7d").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) return sendJson(response, 400, { error: "guild_id_missing" });
      if (!isNumeric(targetGuildId)) return sendJson(response, 400, { error: "guild_id_invalid" });
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        period,
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/earnings?${params.toString()}`,
        { headers: { "X-API-Key": PROVISIONER_API_KEY } }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[earnings] get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/earnings/export" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) return sendJson(response, 400, { error: "guild_id_missing" });
      if (!isNumeric(targetGuildId)) return sendJson(response, 400, { error: "guild_id_invalid" });
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/earnings/export?${params.toString()}`,
        { headers: { "X-API-Key": PROVISIONER_API_KEY } }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[earnings] export error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/giveaways" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) return sendJson(response, 400, { error: "guild_id_missing" });
      if (!isNumeric(targetGuildId)) return sendJson(response, 400, { error: "guild_id_invalid" });
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/giveaways-data?${params.toString()}`,
        { headers: { "X-API-Key": PROVISIONER_API_KEY } }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { data: data.data || {} });
    } catch (error) {
      console.error("[giveaways] get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/giveaways" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) return sendJson(response, 400, { error: "guild_id_missing" });
      if (!isNumeric(targetGuildId)) return sendJson(response, 400, { error: "guild_id_invalid" });
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const dataPayload = payload?.data;
      if (!dataPayload || typeof dataPayload !== "object") {
        return sendJson(response, 400, { error: "data_missing" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/giveaways-data?${params.toString()}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
          body: JSON.stringify({ data: dataPayload }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { data: data.data || {} });
    } catch (error) {
      console.error("[giveaways] update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/giveaways/create" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) return sendJson(response, 400, { error: "guild_id_missing" });
      if (!isNumeric(targetGuildId)) return sendJson(response, 400, { error: "guild_id_invalid" });
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/giveaways-create?${params.toString()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
          body: JSON.stringify({ name: payload?.name, mode: payload?.mode, author_id: user?.id }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[giveaways] create error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/giveaways/delete" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) return sendJson(response, 400, { error: "guild_id_missing" });
      if (!isNumeric(targetGuildId)) return sendJson(response, 400, { error: "guild_id_invalid" });
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/giveaways-delete?${params.toString()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
          body: JSON.stringify({ id: payload?.id }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[giveaways] delete error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/giveaways/send" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const giveawayId = (payload.giveaway_id || "").trim();
      const taskId = (payload.task_id || "").trim();
      if (!giveawayId || !taskId) {
        return sendJson(response, 400, { error: "giveaway_id_or_task_id_missing" });
      }
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) return sendJson(response, 400, { error: "guild_id_missing" });
      if (!isNumeric(targetGuildId)) return sendJson(response, 400, { error: "guild_id_invalid" });
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/giveaways-send?${params.toString()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
          body: JSON.stringify({
            giveaway_id: giveawayId,
            task_id: taskId,
            resend: Boolean(payload.resend),
          }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[giveaways] send error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/cloud/config" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) return sendJson(response, 400, { error: "guild_id_missing" });
      if (!isNumeric(targetGuildId)) return sendJson(response, 400, { error: "guild_id_invalid" });
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/cloud-config?${params.toString()}`,
        { headers: { "X-API-Key": PROVISIONER_API_KEY } }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[cloud] config get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/cloud/config" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) return sendJson(response, 400, { error: "guild_id_missing" });
      if (!isNumeric(targetGuildId)) return sendJson(response, 400, { error: "guild_id_invalid" });
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const configPayload = payload?.config;
      if (!configPayload || typeof configPayload !== "object") {
        return sendJson(response, 400, { error: "config_missing" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/cloud-config?${params.toString()}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
          body: JSON.stringify({ config: configPayload }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[cloud] config update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/cloud/tasks" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) return sendJson(response, 400, { error: "guild_id_missing" });
      if (!isNumeric(targetGuildId)) return sendJson(response, 400, { error: "guild_id_invalid" });
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tasksPayload = payload?.tasks;
      if (!Array.isArray(tasksPayload)) {
        return sendJson(response, 400, { error: "tasks_missing" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/cloud-tasks?${params.toString()}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
          body: JSON.stringify({ tasks: tasksPayload }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[cloud] tasks update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/cloud/send" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) return sendJson(response, 400, { error: "guild_id_missing" });
      if (!isNumeric(targetGuildId)) return sendJson(response, 400, { error: "guild_id_invalid" });
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const channelId = (payload.channel_id || "").trim();
      if (!channelId) {
        return sendJson(response, 400, { error: "channel_id_missing" });
      }
      if (!isNumeric(channelId)) {
        return sendJson(response, 400, { error: "channel_id_invalid" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/cloud-send?${params.toString()}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-Key": PROVISIONER_API_KEY },
          body: JSON.stringify({ channel_id: channelId }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[cloud] send error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/tickets/config" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/tickets-config?${params.toString()}`,
        { headers: { "X-API-Key": PROVISIONER_API_KEY } }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { config: data.config || {} });
    } catch (error) {
      console.error("[tickets] config get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/tickets/config" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/tickets-config?${params.toString()}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY,
          },
          body: JSON.stringify({ config: payload.config }),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[tickets] config update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/tickets/data" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/tickets-data?${params.toString()}`,
        { headers: { "X-API-Key": PROVISIONER_API_KEY } }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { data: data.data || {} });
    } catch (error) {
      console.error("[tickets] data get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/tickets/panel/send" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const params = new URLSearchParams({ guild_id: targetGuildId, tenant_id: tenantId });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/tickets-panel/send?${params.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[tickets] panel send error", error);
      return sendJson(response, 500, { error: "server_error" });
      }
    }

    if (pathname === "/api/tickets/image" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const target = (url.searchParams.get("target") || "").trim();
      if (!target || !TICKET_IMAGE_TARGETS.has(target)) {
        return sendJson(response, 400, { error: "invalid_target" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(me.selected_guild_id));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const contentType = request.headers["content-type"] || "";
      const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);
      if (!boundaryMatch) {
        return sendJson(response, 400, { error: "invalid_multipart" });
      }
      const boundary = boundaryMatch[1];
      const chunks = [];
      let totalSize = 0;
      await new Promise((resolve, reject) => {
        request.on("data", (chunk) => {
          totalSize += chunk.length;
          if (totalSize > 4 * 1024 * 1024) {
            reject(new Error("file_too_large"));
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        request.on("end", resolve);
        request.on("error", reject);
      });
      const buffer = Buffer.concat(chunks);
      const filePart = parseMultipartFormData(buffer, boundary);
      if (!filePart || filePart.fieldName !== "file") {
        return sendJson(response, 400, { error: "file_missing" });
      }
      const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
      if (filePart.contentType && !allowedTypes.has(filePart.contentType.toLowerCase())) {
        return sendJson(response, 400, { error: "invalid_type" });
      }
      const extensionMatch = filePart.filename?.match(/\\.([a-zA-Z0-9]+)$/);
      const extension = extensionMatch ? extensionMatch[1].toLowerCase() : "png";
      const timestamp = Date.now();
      const random = Math.random().toString(36).slice(2, 8);
      const panelId = (url.searchParams.get("panel_id") || "").trim() || "global";
      const optionId = (url.searchParams.get("option_id") || "").trim();
      const segments = ["tickets", tenantId, target];
      if (panelId) segments.push(panelId);
      if (optionId) segments.push(optionId);
      const objectPath = `${segments.join("/")}/${timestamp}_${random}.${extension}`;
      const publicUrl = await uploadToSupabaseStoragePath(
        filePart.data,
        objectPath,
        filePart.contentType || "application/octet-stream",
        SUPABASE_PRODUCT_IMAGES_BUCKET
      );
      return sendJson(response, 200, { url: publicUrl });
    } catch (error) {
      if (String(error?.message || "").includes("file_too_large")) {
        return sendJson(response, 413, { error: "file_too_large" });
      }
      console.error("[tickets] image upload error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/customization" && method === "PUT") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }

      if (!PROVISIONER_URL || !PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        tenant_id: tenantId,
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/store-customization?${params.toString()}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY,
          },
          body: JSON.stringify(payload),
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] customization update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/customization/image" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const type = String(url.searchParams.get("type") || "").trim();
      if (!["purchase_event", "qr_logo"].includes(type)) {
        return sendJson(response, 400, { error: "invalid_type" });
      }
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const contentType = request.headers["content-type"] || "";
      const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);
      if (!boundaryMatch) {
        return sendJson(response, 400, { error: "invalid_multipart" });
      }
      const boundary = boundaryMatch[1];
      const chunks = [];
      let totalSize = 0;
      await new Promise((resolve, reject) => {
        request.on("data", (chunk) => {
          totalSize += chunk.length;
          if (totalSize > 3 * 1024 * 1024) {
            reject(new Error("file_too_large"));
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        request.on("end", resolve);
        request.on("error", reject);
      });
      const buffer = Buffer.concat(chunks);
      const filePart = parseMultipartFormData(buffer, boundary);
      if (!filePart || filePart.fieldName !== "file") {
        return sendJson(response, 400, { error: "file_missing" });
      }
      const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
      if (filePart.contentType && !allowedTypes.has(filePart.contentType.toLowerCase())) {
        return sendJson(response, 400, { error: "invalid_file_type" });
      }
      const extByType = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
      };
      const originalExt = path.extname(filePart.filename || "").toLowerCase();
      const ext =
        extByType[filePart.contentType?.toLowerCase?.()] ||
        ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(originalExt) ? originalExt : "");
      if (!ext) {
        return sendJson(response, 400, { error: "invalid_file_type" });
      }
      const timestamp = Date.now();
      const random = crypto.randomBytes(6).toString("hex");
      const safeTenant = String(tenantId);
      const objectPath = `${safeTenant}/store/${type}/${timestamp}_${random}${ext}`;
      await ensureSupabaseBucket(SUPABASE_PRODUCT_IMAGES_BUCKET, true);
      let publicUrl;
      try {
        publicUrl = await uploadToSupabaseStoragePath(
          filePart.data,
          objectPath,
          filePart.contentType || "application/octet-stream",
          SUPABASE_PRODUCT_IMAGES_BUCKET
        );
      } catch (uploadError) {
        if (String(uploadError?.message || "").includes("Bucket not found")) {
          await ensureSupabaseBucket(SUPABASE_PRODUCT_IMAGES_BUCKET, true);
          publicUrl = await uploadToSupabaseStoragePath(
            filePart.data,
            objectPath,
            filePart.contentType || "application/octet-stream",
            SUPABASE_PRODUCT_IMAGES_BUCKET
          );
        } else {
          throw uploadError;
        }
      }

      if (type === "purchase_event") {
        const personalization = (await getBotDataDoc(tenantId, "loja_personalization")) || {};
        personalization.purchase_event = {
          ...(personalization.purchase_event || {}),
          image: publicUrl,
        };
        await upsertBotDataDoc(tenantId, "loja_personalization", personalization);
      } else {
        const qrDoc = (await getBotDataDoc(tenantId, "loja_qr_customization")) || {};
        qrDoc.logo_url = publicUrl;
        await upsertBotDataDoc(tenantId, "loja_qr_customization", qrDoc);
      }

      if (PROVISIONER_URL && PROVISIONER_API_KEY) {
        const params = new URLSearchParams({
          guild_id: targetGuildId,
          tenant_id: tenantId,
        });
        await fetch(
          `${PROVISIONER_URL}/internal/bot/store-customization/image?${params.toString()}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": PROVISIONER_API_KEY,
            },
            body: JSON.stringify({ type, url: publicUrl }),
          }
        );
      }

      return sendJson(response, 200, { url: publicUrl });
    } catch (error) {
      if (error?.message === "file_too_large") {
        return sendJson(response, 413, { error: "file_too_large" });
      }
      console.error("[store] customization image error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/metrics" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(
        me.tenant_id,
        requestedGuildId || me.selected_guild_id
      );
      if (!targetGuildId) {
        return sendJson(response, 200, {
          revenue_7d: 0,
          orders_7d: 0,
          revenue_by_day: [],
          products_active: 0,
          products_out_of_stock: 0,
        });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 200, {
          revenue_7d: 0,
          orders_7d: 0,
          revenue_by_day: [],
          products_active: 0,
          products_out_of_stock: 0,
        });
      }

      const [productsDoc, stockDoc, buysDoc] = await Promise.all([
        getBotDataDoc(tenantId, "loja_products"),
        getBotDataDoc(tenantId, "loja_stock"),
        getBotDataDoc(tenantId, "loja_buys"),
      ]);

      const products = productsDoc || {};
      const stock = stockDoc || {};
      const productList = Object.values(products);
      let activeCount = 0;
      let outOfStock = 0;
      let lowStock = 0;
      for (const product of productList) {
        const info = product?.info || {};
        const isActive = info.active !== false;
        if (isActive) activeCount += 1;
        const campos = product?.campos || {};
        const campoList = Object.values(campos);
        if (campoList.length === 0) {
          outOfStock += 1;
          continue;
        }
        let hasStock = false;
        let productStockCount = 0;
        for (const campo of campoList) {
          if (campo?.infinite_stock?.enabled) {
            hasStock = true;
            break;
          }
          const productStock = stock?.[product.id] || {};
          const fieldStock = productStock?.[campo.id] || [];
          if (Array.isArray(fieldStock) && fieldStock.length > 0) {
            hasStock = true;
            productStockCount += fieldStock.length;
          }
        }
        if (!hasStock) {
          outOfStock += 1;
          continue;
        }
        if (productStockCount > 0 && productStockCount < 10) {
          lowStock += 1;
        }
      }

      const now = Date.now();
      const startDay = getUtcDayStart(now - 6 * 86400000);
      const dayBuckets = new Map();
      for (let i = 0; i < 7; i += 1) {
        const dayKey = startDay + i * 86400000;
        dayBuckets.set(dayKey, 0);
      }

      let revenue7d = 0;
      let orders7d = 0;
      const buyers7d = new Set();
      const purchases = buysDoc?.purchases || {};
      for (const userPurchases of Object.values(purchases)) {
        if (!Array.isArray(userPurchases)) continue;
        for (const purchase of userPurchases) {
          const tsMs = getPurchaseTimestampMs(purchase);
          if (!tsMs) continue;
          const dayKey = getUtcDayStart(tsMs);
          if (dayKey < startDay || dayKey > startDay + 6 * 86400000) continue;
          const finalPrice = purchase?.pricing?.final_price;
          const amount = typeof finalPrice === "number" ? finalPrice : 0;
          revenue7d += amount;
          orders7d += 1;
          if (purchase?.metadata?.buyer_id) {
            buyers7d.add(String(purchase.metadata.buyer_id));
          } else if (purchase?.buyer_id) {
            buyers7d.add(String(purchase.buyer_id));
          }
          dayBuckets.set(dayKey, (dayBuckets.get(dayKey) || 0) + amount);
        }
      }

      const uniqueCustomers7d = buyers7d.size;
      const conversionRate = uniqueCustomers7d > 0 ? (orders7d / uniqueCustomers7d) * 100 : 0;

      const revenueByDay = Array.from(dayBuckets.entries()).map(([dayKey, amount]) => ({
        date: new Date(dayKey).toISOString(),
        amount,
      }));

      return sendJson(response, 200, {
        revenue_7d: revenue7d,
        orders_7d: orders7d,
        revenue_by_day: revenueByDay,
        products_active: activeCount,
        products_out_of_stock: outOfStock,
        products_low_stock: lowStock,
        conversion_rate: conversionRate,
        unique_customers_7d: uniqueCustomers7d,
      });
    } catch (error) {
      console.error("[store] metrics error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/upload-image" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const contentType = request.headers["content-type"] || "";
      const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);
      if (!boundaryMatch) {
        return sendJson(response, 400, { error: "invalid_multipart" });
      }
      const boundary = boundaryMatch[1];
      const chunks = [];
      let totalSize = 0;
      await new Promise((resolve, reject) => {
        request.on("data", (chunk) => {
          totalSize += chunk.length;
          if (totalSize > 8 * 1024 * 1024) {
            reject(new Error("file_too_large"));
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        request.on("end", resolve);
        request.on("error", reject);
      });
      const buffer = Buffer.concat(chunks);
      const filePart = parseMultipartFormData(buffer, boundary);
      if (!filePart || filePart.fieldName !== "file") {
        return sendJson(response, 400, { error: "file_missing" });
      }
      const ext = path.extname(filePart.filename || "").toLowerCase();
      const allowed = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp"]);
      if (!allowed.has(ext)) {
        return sendJson(response, 400, { error: "invalid_file_type" });
      }
      const filename = `${crypto.randomBytes(16).toString("hex")}${ext}`;
      const url = await uploadToSupabaseStorage(filePart.data, filename, filePart.contentType, tenantId);
      return sendJson(response, 200, { url });
    } catch (error) {
      if (error?.message === "file_too_large") {
        return sendJson(response, 413, { error: "file_too_large" });
      }
      console.error("[store] upload image error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname.startsWith("/api/store/products/") && pathname.endsWith("/image") && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const parts = pathname.split("/").filter(Boolean);
      const productId = parts[3] || "";
      if (!productId) {
        return sendJson(response, 400, { error: "product_id_missing" });
      }
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const contentType = request.headers["content-type"] || "";
      const boundaryMatch = /boundary=([^;]+)/i.exec(contentType);
      if (!boundaryMatch) {
        return sendJson(response, 400, { error: "invalid_multipart" });
      }
      const boundary = boundaryMatch[1];
      const chunks = [];
      let totalSize = 0;
      await new Promise((resolve, reject) => {
        request.on("data", (chunk) => {
          totalSize += chunk.length;
          if (totalSize > 3 * 1024 * 1024) {
            reject(new Error("file_too_large"));
            request.destroy();
            return;
          }
          chunks.push(chunk);
        });
        request.on("end", resolve);
        request.on("error", reject);
      });
      const buffer = Buffer.concat(chunks);
      const filePart = parseMultipartFormData(buffer, boundary);
      if (!filePart || filePart.fieldName !== "file") {
        return sendJson(response, 400, { error: "file_missing" });
      }
      const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
      if (filePart.contentType && !allowedTypes.has(filePart.contentType.toLowerCase())) {
        return sendJson(response, 400, { error: "invalid_file_type" });
      }
      const extByType = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
        "image/gif": ".gif",
      };
      const originalExt = path.extname(filePart.filename || "").toLowerCase();
      const ext =
        extByType[filePart.contentType?.toLowerCase?.()] ||
        ([".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(originalExt) ? originalExt : "");
      if (!ext) {
        return sendJson(response, 400, { error: "invalid_file_type" });
      }
      const products = await getBotDataDoc(tenantId, "loja_products");
      const product = products?.[productId];
      if (!product) {
        return sendJson(response, 404, { error: "product_not_found" });
      }
      const timestamp = Date.now();
      const random = crypto.randomBytes(6).toString("hex");
      const safeTenant = String(tenantId);
      const objectPath = `${safeTenant}/products/${productId}/${timestamp}_${random}${ext}`;
      await ensureSupabaseBucket(SUPABASE_PRODUCT_IMAGES_BUCKET, true);
      let publicUrl;
      try {
        publicUrl = await uploadToSupabaseStoragePath(
          filePart.data,
          objectPath,
          filePart.contentType || "application/octet-stream",
          SUPABASE_PRODUCT_IMAGES_BUCKET
        );
      } catch (uploadError) {
        if (String(uploadError?.message || "").includes("Bucket not found")) {
          await ensureSupabaseBucket(SUPABASE_PRODUCT_IMAGES_BUCKET, true);
          publicUrl = await uploadToSupabaseStoragePath(
            filePart.data,
            objectPath,
            filePart.contentType || "application/octet-stream",
            SUPABASE_PRODUCT_IMAGES_BUCKET
          );
        } else {
          throw uploadError;
        }
      }
      const now = Math.floor(Date.now() / 1000);
      const nextProduct = {
        ...product,
        info: {
          ...(product.info || {}),
          banner: publicUrl,
          updated_at: now,
        },
      };
      products[productId] = nextProduct;
      await upsertBotDataDoc(tenantId, "loja_products", products);
      return sendJson(response, 200, { image_url: publicUrl });
    } catch (error) {
      if (error?.message === "file_too_large") {
        return sendJson(response, 413, { error: "file_too_large" });
      }
      console.error("[store] product image error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname.startsWith("/uploads/") && method === "GET") {
    try {
      const fileName = decodeURIComponent(pathname.replace("/uploads/", ""));
      const filePath = path.join(UPLOADS_DIR, fileName);
      if (!filePath.startsWith(UPLOADS_DIR)) {
        return sendJson(response, 400, { error: "invalid_path" });
      }
      if (!fs.existsSync(filePath)) {
        response.statusCode = 404;
        return response.end("Not found");
      }
      const ext = path.extname(filePath).toLowerCase();
      const mime = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".gif": "image/gif",
        ".webp": "image/webp",
      }[ext] || "application/octet-stream";
      response.setHeader("Content-Type", mime);
      const stream = fs.createReadStream(filePath);
      stream.pipe(response);
    } catch (error) {
      console.error("[uploads] serve error", error);
      response.statusCode = 500;
      response.end("Server error");
    }
    return;
  }

  if (pathname === "/api/store/products" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 200, { products: [] });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 200, { products: [] });
      }
      const [productsDoc, stockDoc] = await Promise.all([
        getBotDataDoc(tenantId, "loja_products"),
        getBotDataDoc(tenantId, "loja_stock"),
      ]);
      const products = productsDoc || {};
      const stock = stockDoc || {};
      const productList = Object.values(products).map((product) => {
        const campos = product?.campos || {};
        const campoList = Object.values(campos);
        const prices = campoList.map((campo) => Number(campo?.price || 0)).filter((v) => !Number.isNaN(v));
        const minPrice = prices.length ? Math.min(...prices) : 0;
        const maxPrice = prices.length ? Math.max(...prices) : 0;
        let stockCount = 0;
        let hasInfinite = false;
        for (const campo of campoList) {
          if (campo?.infinite_stock?.enabled) {
            hasInfinite = true;
            continue;
          }
          const productStock = stock?.[product.id] || {};
          const fieldStock = productStock?.[campo.id] || [];
          if (Array.isArray(fieldStock)) {
            stockCount += fieldStock.length;
          }
        }
        return {
          id: product.id,
          name: product.name,
          info: product.info || {},
          campos: product.campos || {},
          categorias: product.categorias || {},
          messages: product.messages || [],
          cupons: product.cupons || {},
          min_price: minPrice,
          max_price: maxPrice,
          stock_total: hasInfinite ? null : stockCount,
          has_infinite_stock: hasInfinite,
          updated_at: product?.info?.updated_at || null,
        };
      });
      return sendJson(response, 200, { products: productList });
    } catch (error) {
      console.error("[store] products error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/product" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const products = await getBotDataDoc(tenantId, "loja_products");
      const now = Math.floor(Date.now() / 1000);
      const productId = generateRandomString(8);
      const name = String(payload.name || "").trim();
      if (!name) {
        return sendJson(response, 400, { error: "name_required" });
      }
      const description = payload.description ?? null;
      const banner = payload.banner || null;
      const hexColor = payload.hex_color || null;
      const deliveryType = payload.delivery_type || "automatic";
      const buyButton = payload.buy_button || { label: "Comprar", emoji: "🛒" };
      const camposPayload = payload.campos && typeof payload.campos === "object" ? payload.campos : {};
      const product = {
        id: productId,
        name,
        info: {
          description,
          banner,
          hex_color: hexColor,
          delivery_type: deliveryType,
          created_at: now,
          updated_at: now,
          purchasesIds: [],
          total_paid: 0,
          display_preferences: {
            show_sales: true,
            show_options: true,
            show_stock: true,
            cart_duration_minutes: 30,
            store_hours: "",
            transcript_enabled: false
          },
          buy_button: buyButton
        },
        campos: camposPayload,
        categorias: {},
        messages: [],
        cupons: {}
      };
      products[productId] = product;
      await upsertBotDataDoc(tenantId, "loja_products", products);
      return sendJson(response, 201, { product });
    } catch (error) {
      console.error("[store] create product error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname.startsWith("/api/store/product/") && pathname.endsWith("/duplicate") && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const parts = pathname.split("/").filter(Boolean);
      const productId = parts[3] || null;
      if (!productId) {
        return sendJson(response, 400, { error: "product_id_missing" });
      }
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const [products, stock] = await Promise.all([
        getBotDataDoc(tenantId, "loja_products"),
        getBotDataDoc(tenantId, "loja_stock"),
      ]);
      const sourceProduct = products[productId];
      if (!sourceProduct) {
        return sendJson(response, 404, { error: "product_not_found" });
      }
      const duplicateStock = payload.duplicate_stock !== false;
      const newId = generateRandomString(8);
      const now = Math.floor(Date.now() / 1000);
      const duplicated = JSON.parse(JSON.stringify(sourceProduct));
      duplicated.id = newId;
      duplicated.name = `${sourceProduct.name || "Produto"} (Cópia)`;
      duplicated.info = duplicated.info || {};
      duplicated.info.created_at = now;
      duplicated.info.updated_at = now;
      duplicated.messages = [];
      products[newId] = duplicated;
      if (duplicateStock) {
        const sourceProductStock = stock?.[productId] || null;
        if (sourceProductStock) {
          if (!stock[newId]) {
            stock[newId] = {};
          }
          for (const [fieldId, fieldStock] of Object.entries(sourceProductStock)) {
            if (Array.isArray(fieldStock)) {
              stock[newId][fieldId] = [...fieldStock];
            } else if (fieldStock && typeof fieldStock === "object") {
              stock[newId][fieldId] = { ...fieldStock };
            }
          }
          await upsertBotDataDoc(tenantId, "loja_stock", stock);
        }
      }
      await upsertBotDataDoc(tenantId, "loja_products", products);
      return sendJson(response, 200, { product: duplicated });
    } catch (error) {
      console.error("[store] duplicate product error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/channels" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const includeCategories = ["1", "true", "yes"].includes(
        (url.searchParams.get("include_categories") || "").toLowerCase()
      );
      const includeVoice = ["1", "true", "yes"].includes(
        (url.searchParams.get("include_voice") || "").toLowerCase()
      );
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 200, { channels: [] });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      if (!PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_key_missing" });
      }
      const tenantId = me.tenant_id;
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {}),
        ...(includeCategories ? { include_categories: "true" } : {}),
        ...(includeVoice ? { include_voice: "true" } : {}),
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/channels?${params.toString()}`,
        {
          headers: {
            "X-API-Key": PROVISIONER_API_KEY
          }
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, { channels: data.channels || [] });
    } catch (error) {
      console.error("[store] channels error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }


  if (pathname === "/api/store/send" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      if (!PROVISIONER_API_KEY) {
        return sendJson(response, 503, { error: "provisioner_key_missing" });
      }
      const tenantId = me.tenant_id;
      const params = new URLSearchParams({
        guild_id: targetGuildId,
        ...(tenantId ? { tenant_id: tenantId } : {})
      });
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/send-product?${params.toString()}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY
          },
          body: JSON.stringify({
            product_id: payload.product_id,
            channel_id: payload.channel_id,
            mode: payload.mode || "legacy",
            formatted_desc: payload.formatted_desc !== false,
            image_size: payload.image_size || "normal",
            wait_seconds: 12
          })
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[store] send error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/settings/appearance") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const tenantId = me.tenant_id;
      if (!tenantId) {
        return sendJson(response, 400, { error: "tenant_id_missing" });
      }

      if (method === "GET") {
        const storedDoc = await getBotDataDoc(tenantId, "appearance_settings");
        let config = mergeAppearanceConfig(storedDoc);

        const statusOverride = await getBotDataDoc(tenantId, "custom_status");
        if (statusOverride && typeof statusOverride === "object") {
          if (statusOverride.type && STATUS_TYPES.includes(statusOverride.type)) {
            config.status.type = statusOverride.type;
          }
          if (Array.isArray(statusOverride.names) && statusOverride.names.length) {
            config.status.names = sanitizeNames(statusOverride.names, config.status.activity);
            config.status.activity = config.status.names[0];
          }
        }

        const colorsOverride = await getBotDataDoc(tenantId, "custom_colors");
        if (colorsOverride && typeof colorsOverride === "object") {
          config.colors = {
            primary: normalizeHexColor(colorsOverride.primary, config.colors.primary),
            secondary: normalizeHexColor(colorsOverride.secondary, config.colors.secondary),
            accent: normalizeHexColor(colorsOverride.accent, config.colors.accent),
          };
        }

        const infoOverride = await getBotDataDoc(tenantId, "custom_info");
        if (infoOverride && typeof infoOverride === "object") {
          config.info = {
            ...config.info,
            ...(typeof infoOverride.name === "string" ? { name: infoOverride.name.trim() } : undefined),
            ...(typeof infoOverride.avatar === "string" ? { avatar: infoOverride.avatar.trim() } : undefined),
            ...(typeof infoOverride.banner === "string" ? { banner: infoOverride.banner.trim() } : undefined),
          };
        }

        return sendJson(response, 200, config);
      }

      if (method === "POST") {
        const payload = await readJsonBody(request);
        const incoming = payload?.config || payload || {};
        const sanitized = mergeAppearanceConfig(incoming);
        await upsertBotDataDoc(tenantId, "appearance_settings", sanitized);
        await persistRuntimeAppearance(tenantId, sanitized);
        return sendJson(response, 200, { config: sanitized });
      }

      return sendJson(response, 405, { error: "method_not_allowed" });
    } catch (error) {
      console.error("[settings] appearance error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/settings/notifications") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const tenantId = me.tenant_id;
      if (!tenantId) {
        return sendJson(response, 400, { error: "tenant_id_missing" });
      }

      if (method === "GET") {
        const config = await loadNotificationsConfig(tenantId);
        return sendJson(response, 200, { config });
      }

      if (method === "POST") {
        const payload = await readJsonBody(request);
        const incoming = payload?.config || payload || {};
        const updated = await persistNotificationsConfig(tenantId, incoming);
        return sendJson(response, 200, { config: updated });
      }

      return sendJson(response, 405, { error: "method_not_allowed" });
    } catch (error) {
      console.error("[settings] notifications error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

    if (pathname === "/api/settings/blacklist") {
      try {
        const user = await requireSession(request, response);
        if (!user) return;
        const me = await buildMePayload(user, request);
      const tenantId = me.tenant_id;
      if (!tenantId) {
        return sendJson(response, 400, { error: "tenant_id_missing" });
      }

      if (method === "GET") {
        const doc = await getBotDataDoc(tenantId, "blacklist");
        const ids = sanitizeBlacklist(doc.ids);
        return sendJson(response, 200, { ids });
      }

      if (method === "POST") {
        const payload = await readJsonBody(request);
        const ids = sanitizeBlacklist(Array.isArray(payload?.ids) ? payload.ids : []);
        await upsertBotDataDoc(tenantId, "blacklist", { ids });
        return sendJson(response, 200, { ids });
      }

      return sendJson(response, 405, { error: "method_not_allowed" });
      } catch (error) {
        console.error("[settings] blacklist error", error);
        return sendJson(response, 500, { error: "server_error" });
      }
    }

    if (pathname === "/api/custom_mode") {
      try {
        const user = await requireSession(request, response);
        if (!user) return;
        const me = await buildMePayload(user, request);
        const tenantId = me.tenant_id;
        if (!tenantId) {
          return sendJson(response, 400, { error: "tenant_id_missing" });
        }

        if (method === "GET") {
          const doc = await loadCustomMode(tenantId);
          return sendJson(response, 200, doc);
        }

        if (method === "POST") {
          const payload = await readJsonBody(request);
          const next = await persistCustomMode(tenantId, payload);
          return sendJson(response, 200, next);
        }

        return sendJson(response, 405, { error: "method_not_allowed" });
      } catch (error) {
        console.error("[settings] custom_mode error", error);
        return sendJson(response, 500, { error: "server_error" });
      }
    }

    if (pathname === "/api/settings/payments" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/payment-methods?guild_id=${encodeURIComponent(targetGuildId)}`,
        {
          headers: {
            "X-API-Key": PROVISIONER_API_KEY
          }
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[settings] payments error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/settings/payment-method" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      if (!PROVISIONER_URL) {
        return sendJson(response, 503, { error: "provisioner_unavailable" });
      }
      const provResponse = await fetch(
        `${PROVISIONER_URL}/internal/bot/payment-method?guild_id=${encodeURIComponent(targetGuildId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": PROVISIONER_API_KEY
          },
          body: JSON.stringify({
            method: payload.method,
            config: payload.config,
            enabled: payload.enabled
          })
        }
      );
      if (!provResponse.ok) {
        const text = await provResponse.text();
        return sendJson(response, 502, { error: "provisioner_error", details: text });
      }
      const data = await provResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      console.error("[settings] payment update error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/stock" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const productId = (url.searchParams.get("product_id") || "").trim();
      const fieldId = (url.searchParams.get("field_id") || "").trim();
      if (!productId || !fieldId) {
        return sendJson(response, 400, { error: "missing_params" });
      }
      const limit = Math.max(Number(url.searchParams.get("limit") || 200), 1);
      const offset = Math.max(Number(url.searchParams.get("offset") || 0), 0);
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const [productsDoc, stockDoc] = await Promise.all([
        getBotDataDoc(tenantId, "loja_products"),
        getBotDataDoc(tenantId, "loja_stock"),
      ]);
      const products = productsDoc || {};
      const product = products[productId];
      if (!product) {
        return sendJson(response, 404, { error: "product_not_found" });
      }
      const field = product?.campos?.[fieldId];
      if (!field) {
        return sendJson(response, 404, { error: "field_not_found" });
      }
      if (field?.infinite_stock?.enabled) {
        return sendJson(response, 200, {
          items: [],
          total: 0,
          is_infinite: true,
          infinite_value: field?.infinite_stock?.value || null,
        });
      }
      const stock = stockDoc || {};
      const items = Array.isArray(stock?.[productId]?.[fieldId]) ? stock[productId][fieldId] : [];
      const sliced = items.slice(offset, offset + limit);
      return sendJson(response, 200, { items: sliced, total: items.length, is_infinite: false });
    } catch (error) {
      console.error("[store] stock get error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/stock/add" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const productId = String(payload.product_id || "").trim();
      const fieldId = String(payload.field_id || "").trim();
      const rawItems = Array.isArray(payload.items) ? payload.items : [];
      if (!productId || !fieldId) {
        return sendJson(response, 400, { error: "missing_params" });
      }
      const items = rawItems
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .slice(0, 1000)
        .map((item) => (item.length > 2000 ? item.slice(0, 2000) : item));
      if (!items.length) {
        return sendJson(response, 400, { error: "items_required" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const [productsDoc, stockDoc] = await Promise.all([
        getBotDataDoc(tenantId, "loja_products"),
        getBotDataDoc(tenantId, "loja_stock"),
      ]);
      const products = productsDoc || {};
      const product = products[productId];
      if (!product) {
        return sendJson(response, 404, { error: "product_not_found" });
      }
      const campos = product.campos || {};
      const field = campos[fieldId];
      if (!field) {
        return sendJson(response, 404, { error: "field_not_found" });
      }
      const stock = stockDoc || {};
      if (!stock[productId]) stock[productId] = {};
      if (!Array.isArray(stock[productId][fieldId])) stock[productId][fieldId] = [];
      stock[productId][fieldId].push(...items);
      const now = Math.floor(Date.now() / 1000);
      const stockInfo = field.stock_info || {};
      if (field?.infinite_stock?.enabled) {
        field.infinite_stock = { enabled: false, disabled_at: now };
        stockInfo.is_infinite = false;
      }
      stockInfo.last = now;
      field.stock_info = stockInfo;
      field.updated_at = now;
      campos[fieldId] = field;
      product.campos = campos;
      product.info = product.info || {};
      product.info.updated_at = now;
      products[productId] = product;
      await Promise.all([
        upsertBotDataDoc(tenantId, "loja_stock", stock),
        upsertBotDataDoc(tenantId, "loja_products", products),
      ]);
      return sendJson(response, 200, { status: "ok", added: items.length });
    } catch (error) {
      console.error("[store] stock add error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/stock/infinite" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const productId = String(payload.product_id || "").trim();
      const fieldId = String(payload.field_id || "").trim();
      const value = String(payload.value || "").trim();
      if (!productId || !fieldId || !value) {
        return sendJson(response, 400, { error: "missing_params" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const [productsDoc, stockDoc] = await Promise.all([
        getBotDataDoc(tenantId, "loja_products"),
        getBotDataDoc(tenantId, "loja_stock"),
      ]);
      const products = productsDoc || {};
      const product = products[productId];
      if (!product) {
        return sendJson(response, 404, { error: "product_not_found" });
      }
      const campos = product.campos || {};
      const field = campos[fieldId];
      if (!field) {
        return sendJson(response, 404, { error: "field_not_found" });
      }
      const stock = stockDoc || {};
      if (!stock[productId]) stock[productId] = {};
      stock[productId][fieldId] = [];
      const now = Math.floor(Date.now() / 1000);
      field.infinite_stock = { enabled: true, value, configured_at: now };
      const stockInfo = field.stock_info || {};
      stockInfo.is_infinite = true;
      stockInfo.last = now;
      field.stock_info = stockInfo;
      field.updated_at = now;
      campos[fieldId] = field;
      product.campos = campos;
      product.info = product.info || {};
      product.info.updated_at = now;
      products[productId] = product;
      await Promise.all([
        upsertBotDataDoc(tenantId, "loja_stock", stock),
        upsertBotDataDoc(tenantId, "loja_products", products),
      ]);
      return sendJson(response, 200, { status: "ok" });
    } catch (error) {
      console.error("[store] stock infinite error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/stock/clear" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const productId = String(payload.product_id || "").trim();
      const fieldId = String(payload.field_id || "").trim();
      if (!productId || !fieldId) {
        return sendJson(response, 400, { error: "missing_params" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const [productsDoc, stockDoc] = await Promise.all([
        getBotDataDoc(tenantId, "loja_products"),
        getBotDataDoc(tenantId, "loja_stock"),
      ]);
      const products = productsDoc || {};
      const product = products[productId];
      if (!product) {
        return sendJson(response, 404, { error: "product_not_found" });
      }
      const campos = product.campos || {};
      const field = campos[fieldId];
      if (!field) {
        return sendJson(response, 404, { error: "field_not_found" });
      }
      const stock = stockDoc || {};
      const now = Math.floor(Date.now() / 1000);
      if (field?.infinite_stock?.enabled) {
        delete field.infinite_stock;
        const stockInfo = field.stock_info || {};
        stockInfo.is_infinite = false;
        stockInfo.last = now;
        field.stock_info = stockInfo;
      } else {
        if (!stock[productId]) stock[productId] = {};
        stock[productId][fieldId] = [];
        const stockInfo = field.stock_info || {};
        stockInfo.last = now;
        field.stock_info = stockInfo;
      }
      field.updated_at = now;
      campos[fieldId] = field;
      product.campos = campos;
      product.info = product.info || {};
      product.info.updated_at = now;
      products[productId] = product;
      await Promise.all([
        upsertBotDataDoc(tenantId, "loja_stock", stock),
        upsertBotDataDoc(tenantId, "loja_products", products),
      ]);
      return sendJson(response, 200, { status: "ok" });
    } catch (error) {
      console.error("[store] stock clear error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/store/stock/pull" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const payload = await readJsonBody(request);
      const requestedGuildId = (payload.guild_id || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const productId = String(payload.product_id || "").trim();
      const fieldId = String(payload.field_id || "").trim();
      const quantity = Number(payload.quantity || 0);
      if (!productId || !fieldId || !Number.isFinite(quantity) || quantity <= 0) {
        return sendJson(response, 400, { error: "missing_params" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const [productsDoc, stockDoc] = await Promise.all([
        getBotDataDoc(tenantId, "loja_products"),
        getBotDataDoc(tenantId, "loja_stock"),
      ]);
      const products = productsDoc || {};
      const product = products[productId];
      if (!product) {
        return sendJson(response, 404, { error: "product_not_found" });
      }
      const campos = product.campos || {};
      const field = campos[fieldId];
      if (!field) {
        return sendJson(response, 404, { error: "field_not_found" });
      }
      const now = Math.floor(Date.now() / 1000);
      if (field?.infinite_stock?.enabled) {
        const value = field?.infinite_stock?.value || "Item de estoque infinito";
        const items = Array.from({ length: quantity }, () => value);
        const stockInfo = field.stock_info || {};
        stockInfo.last = now;
        field.stock_info = stockInfo;
        field.updated_at = now;
        campos[fieldId] = field;
        product.campos = campos;
        product.info = product.info || {};
        product.info.updated_at = now;
        products[productId] = product;
        await upsertBotDataDoc(tenantId, "loja_products", products);
        return sendJson(response, 200, { items });
      }
      const stock = stockDoc || {};
      const list = Array.isArray(stock?.[productId]?.[fieldId]) ? stock[productId][fieldId] : [];
      if (list.length < quantity) {
        return sendJson(response, 400, { error: "insufficient_stock" });
      }
      const items = list.slice(0, quantity);
      stock[productId] = stock[productId] || {};
      stock[productId][fieldId] = list.slice(quantity);
      const stockInfo = field.stock_info || {};
      stockInfo.last = now;
      field.stock_info = stockInfo;
      field.updated_at = now;
      campos[fieldId] = field;
      product.campos = campos;
      product.info = product.info || {};
      product.info.updated_at = now;
      products[productId] = product;
      await Promise.all([
        upsertBotDataDoc(tenantId, "loja_stock", stock),
        upsertBotDataDoc(tenantId, "loja_products", products),
      ]);
      return sendJson(response, 200, { items });
    } catch (error) {
      console.error("[store] stock pull error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/runtime/status" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      if (!tenantId) {
        return sendJson(response, 404, { error: "tenant_not_found" });
      }
      const [instances, identityDoc, channelsDoc] = await Promise.all([
        supabaseRequest(
          "GET",
          `bot_instances?tenant_id=eq.${tenantId}&select=runtime_status,last_heartbeat,current_version,updated_at&limit=1`
        ),
        supabaseRequest(
          "GET",
          `bot_identity?tenant_id=eq.${tenantId}&select=bot_id,bot_name,updated_at&limit=1`
        ),
        getBotDataDoc(tenantId, "discord_channels"),
      ]);
      const instance = instances?.[0] || null;
      const identity = identityDoc?.[0] || null;
      const channels = Array.isArray(channelsDoc?.channels) ? channelsDoc.channels : [];
      return sendJson(response, 200, {
        tenant_id: tenantId,
        runtime_status: instance?.runtime_status || null,
        last_heartbeat: instance?.last_heartbeat || null,
        current_version: instance?.current_version || null,
        instance_updated_at: instance?.updated_at || null,
        identity_present: Boolean(identity?.bot_id && identity?.bot_name),
        identity_updated_at: identity?.updated_at || null,
        channels_count: channels.length,
      });
    } catch (error) {
      console.error("[runtime] status error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname.startsWith("/api/store/product/")) {
    const parts = pathname.split("/").filter(Boolean);
    const productId = parts[3] || null;
    if (!productId) {
      return sendJson(response, 400, { error: "product_id_missing" });
    }
    if (method === "PUT") {
      try {
        const user = await requireSession(request, response);
        if (!user) return;
        const me = await buildMePayload(user, request);
        const payload = await readJsonBody(request);
        const requestedGuildId = (payload.guild_id || "").trim();
        const targetGuildId = requestedGuildId || me.selected_guild_id;
        if (!targetGuildId) {
          return sendJson(response, 400, { error: "guild_id_missing" });
        }
        if (!isNumeric(targetGuildId)) {
          return sendJson(response, 400, { error: "guild_id_invalid" });
        }
        if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
          return sendJson(response, 403, { error: "forbidden" });
        }
        const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
        if (!tenantId) {
          return sendJson(response, 404, { error: "tenant_not_found" });
        }
        const products = await getBotDataDoc(tenantId, "loja_products");
        const existing = products[productId];
        if (!existing) {
          return sendJson(response, 404, { error: "product_not_found" });
        }
        const nextProduct = payload.product && typeof payload.product === "object" ? payload.product : {};
        nextProduct.id = productId;
        nextProduct.info = nextProduct.info || {};
        nextProduct.info.updated_at = Math.floor(Date.now() / 1000);
        products[productId] = nextProduct;
        await upsertBotDataDoc(tenantId, "loja_products", products);
        return sendJson(response, 200, { product: nextProduct });
      } catch (error) {
        console.error("[store] update product error", error);
        return sendJson(response, 500, { error: "server_error" });
      }
    }

    if (method === "DELETE") {
      try {
        const user = await requireSession(request, response);
        if (!user) return;
        const me = await buildMePayload(user, request);
        const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
        const targetGuildId = requestedGuildId || me.selected_guild_id;
        if (!targetGuildId) {
          return sendJson(response, 400, { error: "guild_id_missing" });
        }
        if (!isNumeric(targetGuildId)) {
          return sendJson(response, 400, { error: "guild_id_invalid" });
        }
        if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
          return sendJson(response, 403, { error: "forbidden" });
        }
        const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
        if (!tenantId) {
          return sendJson(response, 404, { error: "tenant_not_found" });
        }
        if (!PROVISIONER_URL) {
          return sendJson(response, 503, { error: "provisioner_unavailable" });
        }
        const provResponse = await fetch(
          `${PROVISIONER_URL}/internal/bot/delete-product?guild_id=${encodeURIComponent(targetGuildId)}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": PROVISIONER_API_KEY
            },
            body: JSON.stringify({ product_id: productId, tenant_id: tenantId })
          }
        );
        if (!provResponse.ok) {
          const text = await provResponse.text();
          return sendJson(response, 502, { error: "provisioner_error", details: text });
        }
        const data = await provResponse.json();
        return sendJson(response, 200, data);
      } catch (error) {
        console.error("[store] delete product error", error);
        return sendJson(response, 500, { error: "server_error" });
      }
    }
  }

  if (pathname === "/api/bot/status" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const status = await fetchBotStatusForGuild(targetGuildId);
      if (!status) {
        return sendJson(response, 404, { error: "bot_not_found" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const identity = tenantId ? await fetchBotIdentity(tenantId) : null;
      const payload = identity
        ? { ...status, name: identity.name, avatar: identity.avatar, tag: identity.tag }
        : status;
      return sendJson(response, 200, payload);
    } catch (error) {
      console.error("[bot/status] error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/discord/guild/overview" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const requestedGuildId = (url.searchParams.get("guild_id") || "").trim();
      const targetGuildId = await resolveGuildIdForTenant(me.tenant_id, requestedGuildId || me.selected_guild_id);
      if (!targetGuildId) {
        return sendJson(response, 400, { error: "guild_id_missing" });
      }
      if (!isNumeric(targetGuildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }
      if (requestedGuildId && targetGuildId && requestedGuildId !== targetGuildId) {
        return sendJson(response, 403, { error: "forbidden" });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(targetGuildId));
      const overview = await fetchGuildOverviewData(targetGuildId, me.selected_guild_name, tenantId);
      if (!overview) {
        return sendJson(response, 404, { error: "guild_not_found" });
      }
      return sendJson(response, 200, overview);
    } catch (error) {
      console.error("[discord/guild/overview] error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/discord/guilds" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const accessToken = await ensureValidAccessToken(user);
      const guilds = await fetchDiscordGuilds(accessToken);
      return sendJson(response, 200, { guilds });
    } catch (error) {
      console.error("[discord] guilds error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/select-guild" && method === "POST") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;

      const payload = await readJsonBody(request);
      const guildId = String(payload.guild_id || "").trim();
      if (!guildId || !isNumeric(guildId)) {
        return sendJson(response, 400, { error: "guild_id_invalid" });
      }

      const accessToken = await ensureValidAccessToken(user);
      const availableGuilds = await fetchDiscordGuilds(accessToken);
      const desiredGuild = availableGuilds.find((g) => g.id === guildId);
      if (!desiredGuild) {
        return sendJson(response, 403, { error: "guild_not_allowed" });
      }
      return sendJson(response, 200, {
        guild_id: desiredGuild.id,
        guild_name: desiredGuild.name,
        guild_icon: desiredGuild.icon || null
      });
    } catch (error) {
      console.error("[select-guild] error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/bots/update-guild-name" && method === "POST") {
    const runtimeKey = request.headers["x-bot-runtime-key"];
    if (!runtimeKey || runtimeKey !== BOT_RUNTIME_SHARED_KEY) {
      return sendJson(response, 403, { error: "forbidden" });
    }

    let payload;
    try {
      payload = await readJsonBody(request);
    } catch {
      return sendJson(response, 400, { error: "invalid_json" });
    }

    const tenantId = String(payload.tenant_id || "").trim();
    const guildId = String(payload.guild_id || "").trim();
    const guildName = String(payload.guild_name || "").trim();

    if (!tenantId || !guildId || !guildName) {
      return sendJson(response, 400, { error: "missing_fields" });
    }

    try {
      await supabaseRequest("POST", `guilds?on_conflict=guild_id`, {
        tenant_id: tenantId,
        guild_id: guildId,
        guild_name: guildName
      });
      return sendJson(response, 200, { status: "ok" });
    } catch (error) {
      console.error("[runtime] failed to store guild name", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/bots" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const payload = await buildBotsPayload(user);
      return sendJson(response, 200, payload);
    } catch (error) {
      console.error("[bots] list error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/dashboard/overview" && method === "GET") {
    try {
      const user = await requireSession(request, response);
      if (!user) return;
      const me = await buildMePayload(user, request);
      const guildId = me.selected_guild_id;
      if (!guildId) {
        return sendJson(response, 200, { bot: null, guild: null });
      }
      const tenantId = me.tenant_id || (await getTenantIdForGuild(guildId));
      const [bot, guild, identity] = await Promise.all([
        fetchBotStatusForGuild(guildId, tenantId),
        fetchGuildOverviewData(guildId, me.selected_guild_name, tenantId),
        tenantId ? fetchBotIdentity(tenantId) : Promise.resolve(null)
      ]);
      let finalBot = bot
        ? {
            ...bot,
            name: identity?.name || null,
            avatar: identity?.avatar || null,
            tag: identity?.tag || null
          }
        : null;
      let finalGuild = guild;
      if (finalGuild && (!finalGuild.name || !finalGuild.icon)) {
        try {
          const accessToken = await ensureValidAccessToken(user);
          const userGuilds = await fetchDiscordGuilds(accessToken);
          const matched = userGuilds.find((g) => g.id === guildId);
          if (matched) {
            finalGuild = {
              ...finalGuild,
              name: finalGuild.name || matched.name,
              icon: finalGuild.icon || matched.icon
            };
          }
        } catch (error) {
          console.error("[dashboard] guild fallback error", error);
        }
      }
      if (!finalBot || !finalGuild) {
        const fallback = await buildBotsPayload(user);
        const fallbackInstance = fallback.bots?.[0] || null;
        if (fallbackInstance) {
          if (!finalBot) {
            finalBot = {
              ...mapBotFromInstance(fallbackInstance),
              name: identity?.name || null,
              avatar: identity?.avatar || null,
              tag: identity?.tag || null
            };
          }
          if (!finalGuild) {
            finalGuild = mapGuildFromInstance(fallbackInstance, guildId, me.selected_guild_name);
          }
        }
      }
      return sendJson(response, 200, { bot: finalBot || null, guild: finalGuild || null });
    } catch (error) {
      console.error("[dashboard] overview error", error);
      return sendJson(response, 500, { error: "server_error" });
    }
  }

  if (pathname === "/api/provision" && method === "POST") {
    const clientIp = getClientIp(request);
    if (!checkRateLimit(clientIp)) {
      return sendJson(response, 429, { error: "rate_limited" });
    }

    let payload;
    try {
      payload = await readJsonBody(request);
    } catch {
      return sendJson(response, 400, { error: "invalid_json" });
    }

    const token = (payload.discord_bot_token || "").trim();
    const guildId = String(payload.guild_id || "").trim();
    const ownerId = String(payload.owner_id || "").trim();
    const adminIds = Array.isArray(payload.admin_ids) ? payload.admin_ids : [];

    if (!token || token.length < 50) {
      return sendJson(response, 400, { error: "discord_bot_token_invalid" });
    }
    if (!isNumeric(guildId)) {
      return sendJson(response, 400, { error: "guild_id_invalid" });
    }
    if (!isNumeric(ownerId)) {
      return sendJson(response, 400, { error: "owner_id_invalid" });
    }
    if (adminIds.some((id) => !isNumeric(String(id)))) {
      return sendJson(response, 400, { error: "admin_ids_invalid" });
    }

    let serverName;
    try {
      const guildInfo = await fetchGuildInfo(guildId);
      serverName = guildInfo?.name;
    } catch {
      serverName = undefined;
    }

    try {
      const provisionerResponse = await fetch(`${PROVISIONER_URL}/provision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(PROVISIONER_API_KEY ? { "X-API-Key": PROVISIONER_API_KEY } : {})
        },
        body: JSON.stringify({
          discord_bot_token: token,
          guild_id: guildId,
          owner_id: ownerId,
          admin_ids: adminIds,
          plan: payload.plan || "monthly",
          server_name: serverName || undefined
        })
      });

      if (!provisionerResponse.ok) {
        const text = await provisionerResponse.text();
        return sendJson(response, 502, {
          error: "provisioner_error",
          status: provisionerResponse.status,
          details: text
        });
      }

      const data = await provisionerResponse.json();
      return sendJson(response, 200, data);
    } catch (error) {
      return sendJson(response, 502, { error: "provisioner_unreachable", details: String(error) });
    }
  }

  response.statusCode = 404;
  response.end("Not Found");
});

server.listen(PORT, HOST, () => {
  console.log(`[inkcloud-server] listening on http://${HOST}:${PORT}`);
});
