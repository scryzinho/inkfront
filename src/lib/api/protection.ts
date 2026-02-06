import { readMock, writeMock } from "@/lib/mock-storage";

export async function fetchProtectionConfig(section: string): Promise<any> {
  return readMock<any>(`inkcloud_mock_protection_${section}`, {});
}

export async function updateProtectionConfig(section: string, config: any): Promise<any> {
  return writeMock<any>(`inkcloud_mock_protection_${section}`, config || {});
}
