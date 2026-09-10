import { HttpClient } from "../network/httpClient";
import { formatAuthorizationHeader, getOrCreateDeviceId } from "./clientInfo";
import { ISecureTokenStorage, secureTokenStorage } from "../security/storage";

export class JellyfinClient {
  private httpClient: HttpClient;
  private serverUrl: string = "";
  private deviceId: string = "";
  private authToken: string | null = null;
  private storage: ISecureTokenStorage;

  constructor(storage: ISecureTokenStorage = secureTokenStorage) {
    this.storage = storage;
    this.httpClient = new HttpClient({
      defaultTimeoutMs: 15000,
      defaultRetries: 2
    });
  }

  public async initialize(serverUrl?: string): Promise<void> {
    this.deviceId = await getOrCreateDeviceId(this.storage);
    if (serverUrl) {
      this.setServerUrl(serverUrl);
    }
  }

  public setServerUrl(url: string): void {
    this.serverUrl = url.replace(/\/+$/, "");
    this.httpClient.setBaseUrl(this.serverUrl);
  }

  public getServerUrl(): string {
    return this.serverUrl;
  }

  public getDeviceId(): string {
    return this.deviceId;
  }

  public setAuthToken(token: string | null): void {
    this.authToken = token;
    if (token) {
      const authHeader = formatAuthorizationHeader(this.deviceId, token);
      this.httpClient.setDefaultHeader("Authorization", authHeader);
      this.httpClient.setDefaultHeader("X-Emby-Token", token);
    } else {
      const authHeader = formatAuthorizationHeader(this.deviceId);
      this.httpClient.setDefaultHeader("Authorization", authHeader);
      this.httpClient.removeDefaultHeader("X-Emby-Token");
    }
  }

  public getAuthToken(): string | null {
    return this.authToken;
  }

  public getHttpClient(): HttpClient {
    return this.httpClient;
  }
}

export const jellyfinClient = new JellyfinClient();
