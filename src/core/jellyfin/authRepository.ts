import { Alert } from "react-native";
import { HttpClient } from "../network/httpClient";
import { jellyfinClient, JellyfinClient } from "./jellyfinClient";
import { normalizeServerUrlForCredentials } from "./serverDiscovery";
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

export type InsecureHttpConfirmer = (serverUrl: string) => Promise<boolean>;

export const ACTIVE_SESSION_STORAGE_KEY = "finora_active_session";

export function getAuthTokenStorageKey(serverId: string, userId: string): string {
  return `finora_auth_token_${serverId}_${userId}`;
}

/**
 * Native user-consent gate for LAN-only Jellyfin installations.
 * Public HTTP is rejected earlier by the transport policy; this prompt only
 * applies to private/local hosts that intentionally use cleartext HTTP.
 */
export function confirmLocalHttpConnection(serverUrl: string): Promise<boolean> {
  if (!Alert || typeof Alert.alert !== "function") {
    return Promise.resolve(false);
  }

  return new Promise<boolean>((resolve) => {
    let settled = false;
    const finish = (value: boolean) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    Alert.alert(
      "Connexion HTTP non chiffrée",
      `Le serveur ${serverUrl} utilise HTTP sur votre réseau local. Votre mot de passe, votre token Jellyfin et le trafic peuvent être visibles par d'autres appareils présents sur ce réseau. Continuez uniquement si vous faites confiance à ce réseau.`,
      [
        {
          text: "Annuler",
          style: "cancel",
          onPress: () => finish(false)
        },
        {
          text: "Continuer",
          style: "destructive",
          onPress: () => finish(true)
        }
      ],
      {
        cancelable: true,
        onDismiss: () => finish(false)
      }
    );
  });
}

export class AuthRepository {
  private client: JellyfinClient;
  private secureStorage: ISecureTokenStorage;
  private prefStorage: IUserPreferencesStorage;
  private confirmInsecureHttp: InsecureHttpConfirmer;

  constructor(
    client: JellyfinClient = jellyfinClient,
    secureStorage: ISecureTokenStorage = secureTokenStorage,
    prefStorage: IUserPreferencesStorage = userPreferencesStorage,
    confirmInsecureHttp: InsecureHttpConfirmer = confirmLocalHttpConnection
  ) {
    this.client = client;
    this.secureStorage = secureStorage;
    this.prefStorage = prefStorage;
    this.confirmInsecureHttp = confirmInsecureHttp;
  }

  public async authenticate(
    credentials: LoginCredentials,
    serverUrl: string,
    httpClient?: HttpClient
  ): Promise<AuthSession> {
    // Central security boundary: no UI path can bypass URL normalization or send
    // credentials over cleartext HTTP to a public Internet host.
    const normalized = normalizeServerUrlForCredentials(serverUrl);
    const targetUrl = normalized.url;

    // Local/private HTTP is supported for LAN-only Jellyfin deployments, but it
    // must be an explicit user decision before any password or token is sent.
    if (normalized.hasWarning) {
      const approved = await this.confirmInsecureHttp(targetUrl);
      if (!approved) {
        throw new AuthenticationError(
          "Connexion HTTP non chiffrée annulée. Utilisez HTTPS ou confirmez explicitement la connexion locale."
        );
      }
    }

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

      // Re-evaluate legacy saved sessions before placing the token on the wire.
      // A session saved by an older FINORA version may point at a public HTTP URL.
      let targetUrl: string;
      try {
        targetUrl = normalizeServerUrlForCredentials(descriptor.serverUrl).url;
      } catch {
        await this.prefStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        this.client.setAuthToken(null);
        return null;
      }

      if (typeof this.client.initialize === "function") {
        await this.client.initialize(targetUrl);
      } else {
        this.client.setServerUrl(targetUrl);
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
        serverUrl: targetUrl
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
