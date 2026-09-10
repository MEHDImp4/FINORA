import * as Crypto from "expo-crypto";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { ISecureTokenStorage } from "../security/storage";

export const CLIENT_NAME = "FINORA";
export const CLIENT_VERSION = Constants.expoConfig?.version || "1.0.0";
export const DEVICE_ID_STORAGE_KEY = "finora_device_installation_id";

export function getDeviceName(): string {
  const os = Platform.OS === "ios" ? "iOS" : Platform.OS === "android" ? "Android" : "Web";
  return `FINORA on ${os}`;
}

export async function getOrCreateDeviceId(storage: ISecureTokenStorage): Promise<string> {
  const existingId = await storage.getToken(DEVICE_ID_STORAGE_KEY);
  if (existingId && existingId.trim().length > 0) {
    return existingId.trim();
  }

  const newId = Crypto.randomUUID();
  await storage.setToken(DEVICE_ID_STORAGE_KEY, newId);
  return newId;
}

export function formatAuthorizationHeader(deviceId: string, token?: string): string {
  const deviceName = getDeviceName();
  let header = `MediaBrowser Client="${CLIENT_NAME}", Device="${deviceName}", DeviceId="${deviceId}", Version="${CLIENT_VERSION}"`;
  if (token && token.trim().length > 0) {
    header += `, Token="${token.trim()}"`;
  }
  return header;
}
