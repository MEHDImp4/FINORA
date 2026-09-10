import { SecureTokenStorage, UserPreferencesStorage } from "../storage";
import { StorageError } from "../../errors";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  AFTER_FIRST_UNLOCK: "AFTER_FIRST_UNLOCK"
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
}));

describe("SecureTokenStorage", () => {
  let storage: SecureTokenStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    storage = new SecureTokenStorage();
  });

  it("stores sensitive token via SecureStore", async () => {
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    await storage.setToken("auth_token", "secret-value-123");

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      "auth_token",
      "secret-value-123",
      expect.objectContaining({ keychainAccessible: "AFTER_FIRST_UNLOCK" })
    );
  });

  it("retrieves token from SecureStore", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue("secret-value-123");

    const token = await storage.getToken("auth_token");

    expect(token).toBe("secret-value-123");
    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("auth_token");
  });

  it("deletes token from SecureStore", async () => {
    (SecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);

    await storage.deleteToken("auth_token");

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("auth_token");
  });
});

describe("UserPreferencesStorage", () => {
  let prefs: UserPreferencesStorage;

  beforeEach(() => {
    jest.clearAllMocks();
    prefs = new UserPreferencesStorage();
  });

  it("prevents storing tokens/passwords and throws StorageError", async () => {
    await expect(prefs.setItem("user_token", "abc")).rejects.toThrow(StorageError);
    await expect(prefs.setItem("user_password", "pass123")).rejects.toThrow(StorageError);
    await expect(prefs.setItem("auth_secret", "secret")).rejects.toThrow(StorageError);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it("saves non-sensitive preference objects correctly", async () => {
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    await prefs.setItem("theme_settings", { darkMode: true, quality: "1080p" });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "theme_settings",
      JSON.stringify({ darkMode: true, quality: "1080p" })
    );
  });

  it("reads and deserializes preference objects", async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
      JSON.stringify({ darkMode: true, quality: "1080p" })
    );

    const result = await prefs.getItem<{ darkMode: boolean; quality: string }>("theme_settings");

    expect(result).toEqual({ darkMode: true, quality: "1080p" });
  });
});
