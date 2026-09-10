import {
  NetworkError,
  AuthenticationError,
  ServerUnavailableError,
  FinoraError
} from "../errors";
import { logger, sanitizeData } from "./logger";

export interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  retries?: number;
  params?: Record<string, string | number | boolean | undefined>;
}

export interface HttpClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
  defaultTimeoutMs?: number;
  defaultRetries?: number;
}

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
      retries = this.defaultRetries,
      params,
      headers: customHeaders,
      ...fetchOptions
    } = options;

    const url = this.buildUrl(endpoint, params);
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(customHeaders as Record<string, string>)
    };

    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt <= retries) {
      attempt++;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        logger.debug(`[HTTP] ${fetchOptions.method || "GET"} ${url}`, { headers });

        const response = await fetch(url, {
          ...fetchOptions,
          headers,
          signal: controller.signal
        });

        clearTimeout(timer);

        if (!response.ok) {
          const status = response.status;
          let errorBody: unknown;
          try {
            errorBody = await response.json();
          } catch {
            errorBody = await response.text();
          }

          logger.warn(`[HTTP ERROR ${status}] ${url}`, sanitizeData(errorBody));

          if (status === 401 || status === 403) {
            throw new AuthenticationError(`Authentication failed (${status})`);
          }

          if (status === 503 || status === 502 || status === 504) {
            if (attempt <= retries) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              await new Promise((r) => setTimeout(r, delay));
              continue;
            }
            throw new ServerUnavailableError(`Server unavailable (${status})`, url);
          }

          throw new NetworkError(`HTTP request failed with status ${status}`, {
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

        if (attempt <= retries) {
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
