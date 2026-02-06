import { readMock, writeMock } from "@/lib/mock-storage";

const BRAZILIAN_DDDS = [
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "21",
  "22",
  "24",
  "27",
  "28",
  "31",
  "32",
  "33",
  "34",
  "35",
  "37",
  "38",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "51",
  "53",
  "54",
  "55",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "71",
  "73",
  "74",
  "75",
  "77",
  "79",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99",
];

export type NotificationsConfig = {
  enabled: boolean;
  ddd: string | null;
  number: string | null;
};

export type DisplayMode = "embed" | "components";

const NOTIFICATIONS_KEY = "inkcloud_mock_notifications";
const BLACKLIST_KEY = "inkcloud_mock_blacklist";
const CUSTOM_MODE_KEY = "inkcloud_mock_custom_mode";

const DEFAULT_NOTIFICATIONS: NotificationsConfig = {
  enabled: false,
  ddd: null,
  number: null,
};

const DEFAULT_DISPLAY_MODE: DisplayMode = "components";

export async function fetchNotificationsConfig(): Promise<NotificationsConfig> {
  return readMock<NotificationsConfig>(NOTIFICATIONS_KEY, DEFAULT_NOTIFICATIONS);
}

export async function persistNotificationsConfig(
  payload: Partial<NotificationsConfig>,
): Promise<NotificationsConfig> {
  const current = readMock<NotificationsConfig>(NOTIFICATIONS_KEY, DEFAULT_NOTIFICATIONS);
  const next = {
    ...current,
    ...payload,
  };
  return writeMock<NotificationsConfig>(NOTIFICATIONS_KEY, next);
}

export async function fetchBlacklist(): Promise<string[]> {
  return readMock<string[]>(BLACKLIST_KEY, []);
}

export async function persistBlacklist(ids: string[]): Promise<string[]> {
  return writeMock<string[]>(BLACKLIST_KEY, ids);
}

const VALID_DISPLAY_MODES: DisplayMode[] = ["embed", "components"];

export async function fetchCustomMode(): Promise<DisplayMode> {
  const mode = readMock<DisplayMode>(CUSTOM_MODE_KEY, DEFAULT_DISPLAY_MODE);
  return VALID_DISPLAY_MODES.includes(mode) ? mode : DEFAULT_DISPLAY_MODE;
}

export async function persistCustomMode(mode: DisplayMode): Promise<DisplayMode> {
  const nextMode = VALID_DISPLAY_MODES.includes(mode) ? mode : DEFAULT_DISPLAY_MODE;
  return writeMock<DisplayMode>(CUSTOM_MODE_KEY, nextMode);
}

export { BRAZILIAN_DDDS };
