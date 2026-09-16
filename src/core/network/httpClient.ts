import {
  NetworkError,
  AuthenticationError,
  ServerUnavailableError,
  SecurityError,
  FinoraError
} from "../errors";
import { logger, sanitizeData } from "./logger";

export type RetryPolicy = "safe" | "none" | "explicit";

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  retryPolicy?: RetryPolicy;
  retrySafe?: boolean;
  params?: Record<string, string | number | boolean | undefined>;
}

/** HTTP methods considered idempotent/safe to retry automatically on network errors. */
const SAFE_HTTP_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

export interface HttpClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  defaultTimeoutMs?: number;
  defaultRetries?: number;
}

/** Headers that carry a Jellyfin credential and must never leave the server origin. */
const CREDENTIAL_HEADERS = [
  "authorization",
  "x-emby-token",
  "x-emby-authorization",
  "x-mediabrowser-token",
  "cookie"
];

export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private defaultTimeoutMs: number;
  private defaultRetries: number;

  constructor(config: HttpClientConfig = {}) {
    this.baseUrl = config.baseUrl || "";
    this.defaultHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(config.defaultHeaders || {})
    };
    this.defaultTimeoutMs = config.defaultTimeoutMs ?? 15000;
    this.defaultRetries = config.defaultRetries ?? 2;
  }

  public setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/+$/, "");
  }

  public setDefaultHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  public removeDefaultHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  private static originOf(value: string): string | null {
    if (!value) return null;
    try {
      return new URL(value).origin;
    } catch {
      return null;
    }
  }

  /**
   * Central credential-leak boundary.
   *
   * A request carrying an Authorization / X-Emby-Token / Cookie header may only
   * target the origin configured as `baseUrl`. An absolute endpoint pointing
   * somewhere else would otherwise forward the Jellyfin token to a third party.
   *
   * An empty `baseUrl` (no trusted origin known) is deny-by-default, and a
   * request without credential headers may still target any URL.
   */
  private assertSameOriginIfAuthenticated(url: string, headers: Record<string, string>): void {
    const carriesCredentials = Object.keys(headers).some((key) =>
      CREDENTIAL_HEADERS.includes(key.toLowerCase())
    );
    if (!carriesCredentials) return;

    const targetOrigin = HttpClient.originOf(url);
    const trustedOrigin = HttpClient.originOf(this.baseUrl);

    if (!targetOrigin || !trustedOrigin || targetOrigin !== trustedOrigin) {
      throw new SecurityError(
        `Cross-origin authenticated request blocked. Target origin "${
          targetOrigin ?? "unknown"
        }" is not the configured origin "${trustedOrigin ?? "unknown"}".`,
        targetOrigin ?? undefined
      );
    }
  }

  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
    const isAbsolute = endpoint.startsWith("http://") || endpoint.startsWith("https://");
    const fullPath = isAbsolute ? endpoint : `${this.baseUrl}/${endpoint.replace(/^\/+/, "")}`;

    if (!params) {
      return fullPath;
    }

    const url = new URL(fullPath);
    for (const [key, val] of Object.entries(params)) {
      if (val !== undefined && val !== null) {
        url.searchParams.append(key, String(val));
      }
    }
    return url.toString();
  }

  public async request<T = unknown>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const {
      timeoutMs = this.defaultTimeoutMs,
      retries,
      retryPolicy = "safe",
      retrySafe = false,
      params,
      headers: customHeaders,
      ...fetchOptions
    } = options;

    const method = (fetchOptions.method || "GET").toUpperCase();
    const isSafeMethod = SAFE_HTTP_METHODS.has(method);

    let effectiveRetries: number;
    if (retryPolicy === "none") {
      effectiveRetries = 0;
    } else if (retryPolicy === "explicit" || retrySafe) {
      effectiveRetries = retries !== undefined ? retries : this.defaultRetries;
    } else {
      // Default: "safe" policy -> only safe HTTP methods (GET, HEAD, OPTIONS) retry by default
      effectiveRetries = isSafeMethod ? (retries !== undefined ? retries : this.defaultRetries) : 0;
    }

    const url = this.buildUrl(endpoint, params);
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(customHeaders as Record<string, string>)
    };

    // Refuse before the retry loop so no fetch, timer or retry ever runs.
    this.assertSameOriginIfAuthenticated(url, headers);

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= effectiveRetries) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      if (typeof (timer as any)?.unref === "function") {
        (timer as any).unref();
      }

      try {
        logger.debug(`[HTTP] ${method} ${url}`, { headers });

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          const status = response.status;
          let rawText = "";
          let errorBody: unknown;
          try {
            rawText = await response.text();
            try {
              errorBody = JSON.parse(rawText);
            } catch {
              errorBody = rawText;
            }
          } catch {
            errorBody = "Failed to read response body";
          }

          logger.warn(`[HTTP ERROR ${status}] ${url}`, sanitizeData(errorBody));

          if (status === 401 || status === 403) {
            throw new AuthenticationError(`Authentication failed (${status})`);
          }

          if (status === 503 || status === 502 || status === 504) {
            if (attempt <= effectiveRetries) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              await new Promise((r) => setTimeout(r, delay));
              continue;
            }
            throw new ServerUnavailableError(`Server unavailable (${status})`, url);
          }

          let detailMessage = `HTTP request failed with status ${status}`;
          if (typeof errorBody === "string" && errorBody.trim().length > 0) {
            detailMessage = `${detailMessage}: ${errorBody.trim()}`;
          } else if (
            typeof errorBody === "object" &&
            errorBody !== null &&
            "message" in errorBody &&
            typeof (errorBody as { message: unknown }).message === "string"
          ) {
            detailMessage = `${detailMessage}: ${(errorBody as { message: string }).message}`;
          }

          throw new NetworkError(detailMessage, {
            statusCode: status,
            endpoint: url
          });
        }

        // Return empty for 204 No Content
        if (response.status === 204) {
          return {} as T;
        }

        const data = (await response.json()) as T;
        return data;
      } catch (err: unknown) {
        clearTimeout(timer);

        if (err instanceof FinoraError) {
          throw err;
        }

        const isAbort = (err as Error)?.name === "AbortError";
        if (isAbort) {
          throw new NetworkError(`Request timed out after ${timeoutMs}ms`, {
            endpoint: url,
            isTimeout: true
          });
        }

        lastError = err as Error;

        if (attempt <= effectiveRetries) {
          const delay = Math.min(500 * Math.pow(2, attempt - 1), 3000);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
    }

    throw new ServerUnavailableError(
      lastError?.message || "Failed to connect to server after retries",
      url
    );
  }

  public get<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "GET" });
  }

  public post<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  }

  public put<T = unknown>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  }

  public delete<T = unknown>(endpoint: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: "DELETE" });
  }
}

export function createHttpClient(config?: HttpClientConfig): HttpClient {
  return new HttpClient(config);
}

export const httpClient = createHttpClient();
