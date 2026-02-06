import type { AppearanceConfig } from "@/lib/types";
import { mockAppearanceConfig } from "@/lib/mock-data";
import { readMock, writeMock } from "@/lib/mock-storage";

const STORAGE_KEY = "inkcloud_mock_appearance";

export async function fetchAppearanceSettings(): Promise<AppearanceConfig> {
  return readMock<AppearanceConfig>(STORAGE_KEY, mockAppearanceConfig);
}

export async function persistAppearanceSettings(config: AppearanceConfig): Promise<AppearanceConfig> {
  return writeMock<AppearanceConfig>(STORAGE_KEY, config);
}
