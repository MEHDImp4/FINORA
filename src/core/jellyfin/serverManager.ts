import {
  ISecureTokenStorage,
  IUserPreferencesStorage,
  secureTokenStorage,
  userPreferencesStorage
} from "../security/storage";
import { jellyfinClient, JellyfinClient } from "./jellyfinClient";
import { getAuthTokenStorageKey, AuthSession, ACTIVE_SESSION_STORAGE_KEY } from "./authRepository";
import { normalizeServerUrlForCredentials } from "./serverDiscovery";
import { FinoraError } from "../errors";

export interface SavedAccount {
  serverId: string;
  serverName: string;
  serverUrl: string;
  userId: string;
  userName: string;
  lastUsedAt: number;
}

export const SAVED_ACCOUNTS_STORAGE_KEY = "finora_saved_accounts";

export class ServerManager {
  private client: JellyfinClient;
  private secureStorage: ISecureTokenStorage;
  private prefStorage: IUserPreferencesStorage;

  constructor(
    client: JellyfinClient = jellyfinClient,
    secureStorage: ISecureTokenStorage = secureTokenStorage,
    prefStorage: IUserPreferencesStorage = userPreferencesStorage
  ) {
    this.client = client;
    this.secureStorage = secureStorage;
    this.prefStorage = prefStorage;
  }

  public async getSavedAccounts(): Promise<SavedAccount[]> {
    const accounts = await this.prefStorage.getItem<SavedAccount[]>(SAVED_ACCOUNTS_STORAGE_KEY);
    return accounts || [];
  }

  public async saveAccount(account: SavedAccount): Promise<void> {
    const accounts = await this.getSavedAccounts();
    const existingIndex = accounts.findIndex(
      (a) => a.serverId === account.serverId && a.userId === account.userId
    );

    if (existingIndex >= 0) {
      accounts[existingIndex] = { ...account, lastUsedAt: Date.now() };
    } else {
      accounts.push({ ...account, lastUsedAt: Date.now() });
    }

    await this.prefStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, accounts);
  }

  public async switchAccount(serverId: string, userId: string): Promise<AuthSession> {
    const accounts = await this.getSavedAccounts();
    const account = accounts.find((a) => a.serverId === serverId && a.userId === userId);

    if (!account) {
      throw new FinoraError("Account not found in registered accounts list", "ACCOUNT_NOT_FOUND");
    }

    // Validate the saved URL before touching the active-session descriptor. This
    // prevents an account created by an older FINORA version from reactivating a
    // public cleartext endpoint or corrupting the current session on failure.
    const safeServerUrl = normalizeServerUrlForCredentials(account.serverUrl).url;

    const tokenKey = getAuthTokenStorageKey(serverId, userId);
    const token = await this.secureStorage.getToken(tokenKey);

    if (!token) {
      throw new FinoraError("No authentication token found for target account", "AUTH_TOKEN_MISSING");
    }

    // Persist the target identity first. If storage fails, the singleton client
    // remains untouched and the caller can safely restore the previous UI session.
    await this.prefStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, {
      userId: account.userId,
      userName: account.userName,
      serverId: account.serverId,
      serverUrl: safeServerUrl,
      lastActiveAt: Date.now()
    });

    await this.saveAccount({ ...account, serverUrl: safeServerUrl });

    // Commit the runtime switch only after persistence succeeded.
    this.client.setServerUrl(safeServerUrl);
    this.client.setAuthToken(token);

    return {
      token,
      userId: account.userId,
      userName: account.userName,
      serverId: account.serverId,
      serverUrl: safeServerUrl
    };
  }

  public async removeAccount(serverId: string, userId: string): Promise<void> {
    const tokenKey = getAuthTokenStorageKey(serverId, userId);
    await this.secureStorage.deleteToken(tokenKey);

    const accounts = await this.getSavedAccounts();
    const filtered = accounts.filter(
      (a) => !(a.serverId === serverId && a.userId === userId)
    );
    await this.prefStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, filtered);

    const active = await this.prefStorage.getItem<{ serverId: string; userId: string }>(
      ACTIVE_SESSION_STORAGE_KEY
    );
    if (active && active.serverId === serverId && active.userId === userId) {
      await this.prefStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      this.client.setAuthToken(null);
    }
  }
}

export const serverManager = new ServerManager();
