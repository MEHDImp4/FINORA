import { HttpClient } from "../network/httpClient";
import { jellyfinClient, JellyfinClient } from "./jellyfinClient";
import {
  ISecureTokenStorage,
  IUserPreferencesStorage,
  secureTokenStorage,
  userPreferencesStorage
} from "../security/storage";
import { AuthenticationError, FinoraError } from "../errors";

export interface LoginCredentials {
  username: string;
  password?: string;
}

export interface UserSummary {
  id: string;
  name: string;
  serverId: string;
  hasPassword?: boolean;
}

export interface AuthSession {
  token: string;
  userId: string;
  userName: string;
  serverId: string;
  serverUrl: string;
}

export interface ActiveSessionDescriptor {
  userId: string;
  userName: string;
  serverId: string;
  serverUrl: string;
  lastActiveAt: number;
}

export const ACTIVE_SESSION_STORAGE_KEY = "finora_active_session";

export function getAuthTokenStorageKey(serverId: string, userId: string): string {
  return `finora_auth_token_${serverId}_${userId}`;
}

export class AuthRepository {
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

  public async authenticate(
    credentials: LoginCredentials,
    serverUrl: string,
    httpClient?: HttpClient
  ): Promise<AuthSession> {
    const targetUrl = serverUrl.replace(/\/+$/, "");
    await this.client.initialize(targetUrl);
    this.client.setAuthToken(null);
    const clientHttp = httpClient || this.client.getHttpClient();

    // Prepare payload and ensure password variable can be cleared
    let pw = credentials.password || "";
    const username = credentials.username.trim();

    try {
      const response = await clientHttp.request<{
        AccessToken: string;
        ServerId: string;
        User: {
          Id: string;
          Name: string;
        };
      }>(`${targetUrl}/Users/AuthenticateByName`, {
        method: "POST",
        body: JSON.stringify({
          Username: username,
          Pw: pw
        })
      });

      // Clear password immediately post-call
      pw = "";

      if (!response.AccessToken || !response.User?.Id) {
        throw new AuthenticationError("Authentication response missing required session data");
      }

      const session: AuthSession = {
        token: response.AccessToken,
        userId: response.User.Id,
        userName: response.User.Name,
        serverId: response.ServerId || "unknown_server",
        serverUrl: targetUrl
      };

      // Store sensitive token strictly in SecureStore
      const tokenKey = getAuthTokenStorageKey(session.serverId, session.userId);
      await this.secureStorage.setToken(tokenKey, session.token);

      // Store non-sensitive session descriptor in preferences
      const descriptor: ActiveSessionDescriptor = {
        userId: session.userId,
        userName: session.userName,
        serverId: session.serverId,
        serverUrl: session.serverUrl,
        lastActiveAt: Date.now()
      };
      await this.prefStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, descriptor);

      // Configure client with the token
      this.client.setAuthToken(session.token);

      return session;
    } catch (error) {
      // Ensure password variable is cleared on error as well
      pw = "";
      if (error instanceof FinoraError) {
        throw error;
      }
      throw new AuthenticationError(`Authentication failed: ${(error as Error).message}`);
    }
  }

  public async restoreSession(httpClient?: HttpClient): Promise<AuthSession | null> {
    try {
      const descriptor = await this.prefStorage.getItem<ActiveSessionDescriptor>(
        ACTIVE_SESSION_STORAGE_KEY
      );

      if (!descriptor || !descriptor.serverId || !descriptor.userId) {
        return null;
      }

      const tokenKey = getAuthTokenStorageKey(descriptor.serverId, descriptor.userId);
      const token = await this.secureStorage.getToken(tokenKey);

      if (!token) {
        await this.prefStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        return null;
      }

      if (typeof this.client.initialize === "function") {
        await this.client.initialize(descriptor.serverUrl);
      } else {
        this.client.setServerUrl(descriptor.serverUrl);
      }
      this.client.setAuthToken(token);
      const clientHttp = httpClient || this.client.getHttpClient();

      // Verify token validity against /System/Info or /Users/{userId} with fast timeout
      try {
        await clientHttp.request(`/System/Info`, { timeoutMs: 2500, retries: 0 });
      } catch (error) {
        if (error instanceof AuthenticationError) {
          // Token invalid or expired on server (401/403)
          await this.logout(descriptor.serverId, descriptor.userId);
          return null;
        }
        // Transient network error or offline - preserve session
      }

      return {
        token,
        userId: descriptor.userId,
        userName: descriptor.userName,
        serverId: descriptor.serverId,
        serverUrl: descriptor.serverUrl
      };
    } catch (error) {
      return null;
    }
  }

  public async logout(serverId: string, userId: string, httpClient?: HttpClient): Promise<void> {
    const clientHttp = httpClient || this.client.getHttpClient();

    try {
      const targetUrl = this.client.getServerUrl();
      if (targetUrl) {
        await clientHttp.request(`${targetUrl}/Sessions/Logout`, { method: "POST" });
      }
    } catch {
      // Ignore network errors during logout to guarantee local wipe
    } finally {
      const tokenKey = getAuthTokenStorageKey(serverId, userId);
      await this.secureStorage.deleteToken(tokenKey);
      await this.prefStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      this.client.setAuthToken(null);
    }
  }
}

export const authRepository = new AuthRepository();
