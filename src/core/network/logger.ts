export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * SEC-02 — credential names redacted everywhere.
 * Keys are compared lower-cased, so both camelCase and snake_case are covered.
 */
const SENSITIVE_KEYS = new Set([
  "authorization",
  "token",
  "accesstoken",
  "access_token",
  "refreshtoken",
  "refresh_token",
  "x-emby-token",
  "x-mediabrowser-token",
  "password",
  "passwd",
  "pwd",
  "secret",
  "apikey",
  "api_key",
  "api-key",
  "credential",
  "credentials",
  "cookie"
]);

/**
 * Credential names that can appear in a `key=value` / `key: value` / JSON form.
 * Ordered longest-first so `api_key` is not partially matched by `token`.
 */
const CREDENTIAL_NAMES =
  "authorization|x-mediabrowser-token|x-emby-token|refresh_token|access_token|credential(?:s)?|api[_-]?key|password|passwd|pwd|secret|token";

const SENSITIVE_REGEXES = [
  /(Authorization:\s*)([^\r\n]+)/gi,
  /(X-Emby-Token:\s*)([^\r\n]+)/gi,
  /(X-MediaBrowser-Token:\s*)([^\r\n]+)/gi,
  // Query strings and free-form key=value (api_key=..., access_token=..., pwd=...)
  new RegExp(`((?:${CREDENTIAL_NAMES})=)([^&\\s]+)`, "gi"),
  // Quoted JSON/JS object values: "password":"...", 'api_key': '...'
  new RegExp(`("?(?:${CREDENTIAL_NAMES})"?\\s*[:=]\\s*)"([^"]*)"`, "gi"),
  // Unquoted object values: password: secret, api_key=secret
  new RegExp(`("?(?:${CREDENTIAL_NAMES})"?\\s*[:=]\\s*)([^\\s,;&"')}]+)`, "gi")
];

/**
 * Sanitizes strings, objects, or arrays to redact credentials and tokens.
 */
export function sanitizeData<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === "string") {
    let sanitized: string = data;
    for (const regex of SENSITIVE_REGEXES) {
      sanitized = sanitized.replace(regex, "$1[REDACTED]");
    }
    return sanitized as unknown as T;
  }

  if (Array.isArray(data)) {
    return data.map((item) => sanitizeData(item)) as unknown as T;
  }

  if (typeof data === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.has(lowerKey)) {
        result[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        result[key] = sanitizeData(value);
      } else if (typeof value === "string") {
        result[key] = sanitizeData(value);
      } else {
        result[key] = value;
      }
    }
    return result as unknown as T;
  }

  return data;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV !== "production";

  debug(message: string, ...args: unknown[]): void {
    if (this.isDevelopment) {
      console.debug(`[FINORA DEBUG] ${sanitizeData(message)}`, ...args.map((a) => sanitizeData(a)));
    }
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[FINORA INFO] ${sanitizeData(message)}`, ...args.map((a) => sanitizeData(a)));
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[FINORA WARN] ${sanitizeData(message)}`, ...args.map((a) => sanitizeData(a)));
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[FINORA ERROR] ${sanitizeData(message)}`, ...args.map((a) => sanitizeData(a)));
  }
}

export const logger = new Logger();
