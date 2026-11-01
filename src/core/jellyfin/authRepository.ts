import { Alert } from "react-native";
import { HttpClient } from "../network/httpClient";
import { jellyfinClient, JellyfinClient } from "./jellyfinClient";
import {
  autoDetectServerConnection,
  normalizeServerUrlForCredentials,
  ServerUrlValidationResult
} from "./serverDiscovery";
import {
  ISecureTokenStorage,
  IUserPreferencesStorage,
  secureTokenStorage,
  userPreferencesStorage
} from "../security/storage";
import { AuthenticationError, FinoraError } from "../errors";
import { logger } from "../network/logger";
import { translate } from "../../i18n";
import { formatAuthorizationHeader, getOrCreateDeviceId } from "./clientInfo";

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

export interface PublicUser {
  id: string;
  name: string;
  serverId?: string;
  primaryImageTag?: string;
  hasPassword?: boolean;
}

export interface AuthSession {
  token: string;
  userId: string;
  userName: string;
  serverId: string;
  /** Effective runtime transport URL (LAN or WAN). */
  serverUrl: string;
  /** Stable saved URL used for persistence/rollback when runtime transport changes. */
  canonicalServerUrl?: string;
}

export interface ActiveSessionDescriptor {
  userId: string;
  userName: string;
  serverId: string;
  serverUrl: string;
  lastActiveAt: number;
}

interface SavedServerTransport {
  id: string;
  url: string;
  localUrl?: string;
  remoteUrl?: string;
}

export interface TrustedHttpEndpoint {
  serverId: string;
  normalizedUrl: string;
  approvedAt: number;
}

export type InsecureHttpConfirmer = (serverUrl: string) => Promise<boolean>;

export const ACTIVE_SESSION_STORAGE_KEY = "finora_active_session";
export const TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY = "finora_trusted_http_endpoints";
const SAVED_SERVERS_STORAGE_KEY = "finora_saved_servers";
const MAX_TRUSTED_HTTP_ENDPOINTS = 50;

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
      translate("auth.unencryptedHttpTitle"),
      translate("auth.unencryptedHttpDesc", { serverUrl }),
      [
        {
          text: translate("auth.cancel"),
          style: "cancel",
          onPress: () => finish(false)
        },
        {
          text: translate("auth.continue"),
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

  private async getTrustedHttpEndpoints(): Promise<TrustedHttpEndpoint[]> {
    const stored =
      (await this.prefStorage.getItem<TrustedHttpEndpoint[]>(TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY)) || [];
    return stored.filter(
      (entry) =>
        Boolean(entry) &&
        typeof entry.serverId === "string" &&
        typeof entry.normalizedUrl === "string" &&
        typeof entry.approvedAt === "number"
    );
  }

  private async isHttpEndpointTrusted(serverId: string, normalizedUrl: string): Promise<boolean> {
    const trusted = await this.getTrustedHttpEndpoints();
    return trusted.some(
      (entry) => entry.serverId === serverId && entry.normalizedUrl === normalizedUrl
    );
  }

  private async trustHttpEndpoint(serverId: string, normalizedUrl: string): Promise<void> {
    const trusted = await this.getTrustedHttpEndpoints();
    const now = Date.now();
    const next = trusted
      .filter(
        (entry) => !(entry.serverId === serverId && entry.normalizedUrl === normalizedUrl)
      )
      .concat({ serverId, normalizedUrl, approvedAt: now })
      .slice(-MAX_TRUSTED_HTTP_ENDPOINTS);
    await this.prefStorage.setItem(TRUSTED_HTTP_ENDPOINTS_STORAGE_KEY, next);
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
        throw new AuthenticationError(translate("auth.unencryptedHttpCancelled"));
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
        serverUrl: targetUrl,
        canonicalServerUrl: targetUrl
      };

      // Record only the explicitly approved non-sensitive HTTP route. The
      // credential remains exclusively in SecureStore and is never co-located
      // with endpoint trust metadata.
      if (!normalized.isHttps) {
        await this.trustHttpEndpoint(session.serverId, targetUrl);
      }

      // Store sensitive token strictly in SecureStore
      const tokenKey = getAuthTokenStorageKey(session.serverId, session.userId);
      await this.secureStorage.setToken(tokenKey, session.token);

      // Store non-sensitive session descriptor in preferences
      const descriptor: ActiveSessionDescriptor = {
        userId: session.userId,
        userName: session.userName,
        serverId: session.serverId,
        serverUrl: targetUrl,
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
      let normalized: ServerUrlValidationResult;
      try {
        normalized = normalizeServerUrlForCredentials(descriptor.serverUrl);
      } catch {
        // REL-02: the descriptor is invalid, so drop it AND the orphaned secure
        // token — otherwise a stale token is left behind in SecureStore.
        await this.prefStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
        try {
          await this.secureStorage.deleteToken(tokenKey);
        } catch {
          // Token cleanup is best effort; the descriptor is already gone.
        }
        this.client.setAuthToken(null);
        return null;
      }
      const canonicalUrl = normalized.url;

      // Resolve LAN/WAN before any saved token is applied. The discovery probe is
      // unauthenticated and, when a saved server ID exists, only accepts endpoints
      // proving they are the same Jellyfin server.
      let activeUrl = canonicalUrl;
      try {
        const savedServers =
          (await this.prefStorage.getItem<SavedServerTransport[]>(SAVED_SERVERS_STORAGE_KEY)) || [];
        const savedServer = savedServers.find((server) => server.id === descriptor.serverId);
        const detection = await autoDetectServerConnection(
          savedServer?.localUrl,
          savedServer?.remoteUrl,
          savedServer?.url || canonicalUrl,
          1500,
          descriptor.serverId
        );
        if (detection.activeUrl) {
          activeUrl = normalizeServerUrlForCredentials(detection.activeUrl).url;
        }
      } catch {
        // Detection is an optimization. The persisted canonical route remains the
        // safe fallback if saved candidates are malformed or unavailable.
        activeUrl = canonicalUrl;
      }

      const activeNormalized = normalizeServerUrlForCredentials(activeUrl);
      const clientHttp = httpClient || this.client.getHttpClient();

      // Detach any previously configured credential before switching transport.
      // From this point until endpoint validation succeeds, every request is
      // guaranteed to be unauthenticated.
      this.client.setAuthToken(null);

      if (typeof this.client.initialize === "function") {
        await this.client.initialize(activeNormalized.url);
      } else {
        this.client.setServerUrl(activeNormalized.url);
      }

      if (!activeNormalized.isHttps) {
        // A private cleartext address is not proof of identity: after the user
        // roams to another network a different machine can own the stored IP, so
        // the token must not be sent until the host proves it is the same server
        // that issued it. This probe is strictly unauthenticated.
        let publicInfo: { Id?: string } | null = null;
        try {
          publicInfo = await clientHttp.request<{ Id?: string }>("/System/Info/Public", {
            timeoutMs: 2500,
            retries: 0
          });
        } catch {
          // Unreachable host: identity cannot be verified, so the session is
          // suspended rather than authenticated blindly.
        }

        if (!publicInfo?.Id || publicInfo.Id !== descriptor.serverId) {
          logger.warn(
            "[Auth] Cleartext server identity mismatch — session suspended, token withheld."
          );
          return null;
        }

        const endpointTrusted = await this.isHttpEndpointTrusted(
          descriptor.serverId,
          activeNormalized.url
        );
        if (!endpointTrusted) {
          // The server identity matched, but this exact cleartext route has never
          // been approved. This is the network-change boundary: require explicit
          // consent before a saved credential can ever be attached to it.
          const approved = await this.confirmInsecureHttp(activeNormalized.url);
          if (!approved) {
            logger.warn(
              "[Auth] Cleartext endpoint is not trusted — session suspended, token withheld."
            );
            return null;
          }
          await this.trustHttpEndpoint(descriptor.serverId, activeNormalized.url);
        }
      }

      this.client.setAuthToken(token);

      // Verify token validity against the selected transport with a fast timeout.
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
        serverUrl: activeNormalized.url,
        canonicalServerUrl: canonicalUrl
      };
    } catch (error) {
      return null;
    }
  }

  public async getPublicUsers(
    serverUrl: string,
    httpClient?: HttpClient
  ): Promise<PublicUser[]> {
    if (!serverUrl || !serverUrl.trim()) return [];

    let targetUrl: string;
    try {
      const normalized = normalizeServerUrlForCredentials(serverUrl);
      targetUrl = normalized.url;
    } catch {
      return [];
    }

    let clientHttp = httpClient;
    if (!clientHttp) {
      const deviceId = await getOrCreateDeviceId(this.secureStorage);
      clientHttp = new HttpClient({
        baseUrl: targetUrl,
        defaultTimeoutMs: 7000,
        defaultRetries: 1,
        defaultHeaders: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "X-Emby-Authorization": formatAuthorizationHeader(deviceId)
        }
      });
    }

    try {
      const response = await clientHttp.request<any[]>(`${targetUrl}/Users/Public`, {
        timeoutMs: 7000,
        retries: 1
      });

      if (!Array.isArray(response)) {
        return [];
      }

      return response
        .map((u) => ({
          id: u.Id || u.id || "",
          name: u.Name || u.name || "User",
          serverId: u.ServerId || u.serverId,
          primaryImageTag: u.PrimaryImageTag || u.primaryImageTag,
          hasPassword:
            u.HasPassword ??
            u.hasPassword ??
            u.HasConfiguredPassword ??
            u.hasConfiguredPassword ??
            false
        }))
        .filter((u) => Boolean(u.id));
    } catch (error) {
      logger.warn("[AuthRepository] Failed to fetch public users:", error);
      return [];
    }
  }

  public async getAvailableUsers(
    serverUrl: string,
    isAuthenticated: boolean = false,
    httpClient?: HttpClient
  ): Promise<PublicUser[]> {
    const publicUsers = await this.getPublicUsers(serverUrl, httpClient);

    if (isAuthenticated) {
      try {
        const authClient = httpClient || this.client.getHttpClient();
        const normalized = normalizeServerUrlForCredentials(serverUrl);
        const authedUsers = await authClient.request<any[]>(`${normalized.url}/Users`, {
          timeoutMs: 5000,
          retries: 0
        });

        if (Array.isArray(authedUsers)) {
          const mappedAuthed: PublicUser[] = authedUsers
            .map((u) => ({
              id: u.Id || u.id || "",
              name: u.Name || u.name || "User",
              serverId: u.ServerId || u.serverId,
              primaryImageTag: u.PrimaryImageTag || u.primaryImageTag,
              hasPassword:
                u.HasPassword ??
                u.hasPassword ??
                u.HasConfiguredPassword ??
                u.hasConfiguredPassword ??
                false
            }))
            .filter((u) => Boolean(u.id));

          const userMap = new Map<string, PublicUser>();
          for (const u of publicUsers) {
            userMap.set(u.id, u);
          }
          for (const u of mappedAuthed) {
            userMap.set(u.id, u);
          }
          return Array.from(userMap.values());
        }
      } catch (error) {
        logger.debug(
          "[AuthRepository] Authenticated /Users endpoint unreachable or forbidden, using public users only:",
          error
        );
      }
    }

    return publicUsers;
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
