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
  localUrl?: string;
  remoteUrl?: string;
  userId: string;
  userName: string;
  lastUsedAt: number;
}

export interface SavedServer {
  id: string;
  name: string;
  url: string;
  localUrl?: string;
  remoteUrl?: string;
  lastUsedAt: number;
}

export const SAVED_ACCOUNTS_STORAGE_KEY = "finora_saved_accounts";
export const SAVED_SERVERS_STORAGE_KEY = "finora_saved_servers";

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

  public async getSavedServers(): Promise<SavedServer[]> {
    const saved = await this.prefStorage.getItem<SavedServer[]>(SAVED_SERVERS_STORAGE_KEY);
    if (saved && saved.length > 0) {
      return [...saved].sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    }

    // Auto-migration from saved accounts if no dedicated server list exists yet
    const accounts = await this.getSavedAccounts();
    const map = new Map<string, SavedServer>();
    for (const acc of accounts) {
      const normalizedUrl = acc.serverUrl ? acc.serverUrl.replace(/\/+$/, "") : "";
      if (normalizedUrl && !map.has(normalizedUrl)) {
        map.set(normalizedUrl, {
          id: acc.serverId || normalizedUrl,
          name: acc.serverName || "Jellyfin Server",
          url: acc.serverUrl,
          lastUsedAt: acc.lastUsedAt || Date.now()
        });
      }
    }
    const migrated = Array.from(map.values()).sort((a, b) => b.lastUsedAt - a.lastUsedAt);
    if (migrated.length > 0) {
      await this.prefStorage.setItem(SAVED_SERVERS_STORAGE_KEY, migrated);
    }
    return migrated;
  }

  public async saveServer(server: SavedServer): Promise<void> {
    const servers = await this.getSavedServers();
    const normalizedTarget = server.url.replace(/\/+$/, "");
    const existingIndex = servers.findIndex(
      (s) => s.id === server.id || (s.url && s.url.replace(/\/+$/, "") === normalizedTarget)
    );

    const updatedServer: SavedServer = {
      ...server,
      url: server.url,
      lastUsedAt: Date.now()
    };

    if (existingIndex >= 0) {
      servers[existingIndex] = updatedServer;
    } else {
      servers.unshift(updatedServer);
    }

    await this.prefStorage.setItem(SAVED_SERVERS_STORAGE_KEY, servers);
  }

  public async removeServer(serverId: string): Promise<void> {
    const servers = await this.getSavedServers();
    const target = servers.find((s) => s.id === serverId || s.url.replace(/\/+$/, "") === serverId.replace(/\/+$/, ""));
    const filteredServers = servers.filter(
      (s) => s.id !== serverId && s.url.replace(/\/+$/, "") !== serverId.replace(/\/+$/, "")
    );
    await this.prefStorage.setItem(SAVED_SERVERS_STORAGE_KEY, filteredServers);

    // Remove accounts associated with this server
    const targetUrlNorm = target?.url ? target.url.replace(/\/+$/, "") : serverId.replace(/\/+$/, "");
    const accounts = await this.getSavedAccounts();
    const remainingAccounts: SavedAccount[] = [];
    for (const acc of accounts) {
      const isAssociated =
        (target && acc.serverId === target.id) ||
        (acc.serverUrl && acc.serverUrl.replace(/\/+$/, "") === targetUrlNorm);
      if (isAssociated) {
        const tokenKey = getAuthTokenStorageKey(acc.serverId, acc.userId);
        await this.secureStorage.deleteToken(tokenKey);
      } else {
        remainingAccounts.push(acc);
      }
    }
    await this.prefStorage.setItem(SAVED_ACCOUNTS_STORAGE_KEY, remainingAccounts);

    const active = await this.prefStorage.getItem<{ serverId: string; serverUrl?: string }>(
      ACTIVE_SESSION_STORAGE_KEY
    );
    if (
      active &&
      (active.serverId === serverId ||
        (targetUrlNorm && active.serverUrl && active.serverUrl.replace(/\/+$/, "") === targetUrlNorm))
    ) {
      await this.prefStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      this.client.setAuthToken(null);
    }
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

    // Synchronize server into saved servers list
    if (account.serverUrl) {
      await this.saveServer({
        id: account.serverId,
        name: account.serverName,
        url: account.serverUrl,
        localUrl: account.localUrl,
        remoteUrl: account.remoteUrl,
        lastUsedAt: Date.now()
      });
    }
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
