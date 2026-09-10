import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StorageError } from "../errors";

const SENSITIVE_KEY_PATTERNS = [/token/i, /password/i, /secret/i, /auth/i, /credential/i];

export interface ISecureTokenStorage {
  setToken(key: string, value: string): Promise<void>;
  getToken(key: string): Promise<string | null>;
  deleteToken(key: string): Promise<void>;
}

export interface IUserPreferencesStorage {
  setItem<T = unknown>(key: string, value: T): Promise<void>;
  getItem<T = unknown>(key: string): Promise<T | null>;
  removeItem(key: string): Promise<void>;
  clear(): Promise<void>;
}

export class SecureTokenStorage implements ISecureTokenStorage {
  async setToken(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value, {
        keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK
      });
    } catch (error) {
      throw new StorageError(
        `Failed to store secure token for key "${key}": ${(error as Error).message}`,
        "secure"
      );
    }
  }

  async getToken(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      throw new StorageError(
        `Failed to read secure token for key "${key}": ${(error as Error).message}`,
        "secure"
      );
    }
  }

  async deleteToken(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      throw new StorageError(
        `Failed to delete secure token for key "${key}": ${(error as Error).message}`,
        "secure"
      );
    }
  }
}

export class UserPreferencesStorage implements IUserPreferencesStorage {
  async setItem<T = unknown>(key: string, value: T): Promise<void> {
    for (const pattern of SENSITIVE_KEY_PATTERNS) {
      if (pattern.test(key)) {
        throw new StorageError(
          `Security violation: Key "${key}" contains sensitive keywords and must NOT be saved in unencrypted AsyncStorage. Use SecureTokenStorage instead.`,
          "async"
        );
      }
    }

    try {
      const serialized = JSON.stringify(value);
      await AsyncStorage.setItem(key, serialized);
    } catch (error) {
      if (error instanceof StorageError) throw error;
      throw new StorageError(
        `Failed to save preference for key "${key}": ${(error as Error).message}`,
        "async"
      );
    }
  }

  async getItem<T = unknown>(key: string): Promise<T | null> {
    try {
      const data = await AsyncStorage.getItem(key);
      if (data === null) return null;
      return JSON.parse(data) as T;
    } catch (error) {
      throw new StorageError(
        `Failed to read preference for key "${key}": ${(error as Error).message}`,
        "async"
      );
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      throw new StorageError(
        `Failed to remove preference for key "${key}": ${(error as Error).message}`,
        "async"
      );
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      throw new StorageError(`Failed to clear preferences: ${(error as Error).message}`, "async");
    }
  }
}

export const secureTokenStorage = new SecureTokenStorage();
export const userPreferencesStorage = new UserPreferencesStorage();
