import { HttpClient } from "../network/httpClient";
import { FinoraError } from "../errors";

/** Empty by default — FINORA never pre-fills a personal server URL on fresh install. */
export const DEFAULT_JELLYFIN_SERVER = "";

export interface ServerUrlValidationResult {
  url: string;
  isHttps: boolean;
  hasWarning: boolean;
  warningMessage?: string;
}

export interface ServerPublicInfo {
  Id: string;
  ServerName: string;
  Version: string;
  ProductName?: string;
  OperatingSystem?: string;
  StartupWizardCompleted?: boolean;
}

export interface ServerDiscoveryResult {
  serverId: string;
  serverName: string;
  version: string;
  url: string;
  isHttps: boolean;
  hasWarning: boolean;
  warningMessage?: string;
  operatingSystem?: string;
}

function isPrivateIpv4(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) return false;

  const octets = parts.map((part) => Number(part));
  if (octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)) {
    return false;
  }

  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    // RFC 6598 shared address space, commonly used by Tailscale/CGNAT overlays.
    (first === 100 && second >= 64 && second <= 127)
  );
}

/**
 * Returns true for hosts that are expected to stay on the device's local/private
 * network. Cleartext HTTP is never permitted for a public Internet hostname.
 */
export function isLocalNetworkHost(rawHostname: string): boolean {
  const hostname = rawHostname.toLowerCase().replace(/^\[/, "").replace(/\]$/, "");

  if (!hostname) return false;
  if (hostname === "localhost" || hostname.endsWith(".localhost")) return true;
  if (hostname.endsWith(".local") || hostname.endsWith(".lan") || hostname.endsWith(".home")) {
    return true;
  }

  // Single-label hostnames are normally resolved by local DNS/mDNS only.
  if (!hostname.includes(".") && !hostname.includes(":")) return true;
  if (isPrivateIpv4(hostname)) return true;

  // IPv6 loopback, unique-local (fc00::/7), and link-local (fe80::/10).
  if (hostname === "::1" || hostname.startsWith("fc") || hostname.startsWith("fd")) {
    return true;
  }
  if (/^fe[89ab]/i.test(hostname)) return true;

  return false;
}

/**
 * Applies FINORA's credential transport policy.
 *
 * HTTPS is accepted everywhere. HTTP is accepted only for local/private hosts so
 * users can keep a LAN-only Jellyfin setup without allowing credentials to be
 * sent in cleartext to an Internet host.
 */
export function enforceServerTransportPolicy(
  normalized: ServerUrlValidationResult
): ServerUrlValidationResult {
  if (normalized.isHttps) return normalized;

  const hostname = new URL(normalized.url).hostname;
  if (!isLocalNetworkHost(hostname)) {
    throw new FinoraError(
      "Unencrypted HTTP is only allowed for local/private Jellyfin servers. Use HTTPS for remote servers.",
      "INSECURE_SERVER_URL"
    );
  }

  return normalized;
}

export function normalizeServerUrl(rawInput: string): ServerUrlValidationResult {
  let cleaned = rawInput.trim();
  if (!cleaned) {
    throw new FinoraError("Server URL cannot be empty", "INVALID_SERVER_URL");
  }

  // Check if an explicit protocol other than http/https is specified
  const protocolMatch = cleaned.match(/^([a-zA-Z0-9+.-]+):\/\//);
  if (protocolMatch) {
    const protocol = protocolMatch[1].toLowerCase();
    if (protocol !== "http" && protocol !== "https") {
      throw new FinoraError(
        `Unsupported protocol "${protocol}". Only HTTP and HTTPS are supported.`,
        "INVALID_PROTOCOL"
      );
    }
  } else {
    cleaned = `https://${cleaned}`;
  }

  // Remove trailing slashes
  cleaned = cleaned.replace(/\/+$/, "");

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(cleaned);
  } catch {
    throw new FinoraError(`Invalid server URL format: ${rawInput}`, "INVALID_SERVER_URL");
  }

  const isHttps = parsedUrl.protocol === "https:";
  const isHttp = parsedUrl.protocol === "http:";

  if (!isHttps && !isHttp) {
    throw new FinoraError(
      `Unsupported protocol "${parsedUrl.protocol}". Only HTTP and HTTPS are supported.`,
      "INVALID_PROTOCOL"
    );
  }

  const hasWarning = !isHttps;
  const warningMessage = hasWarning
    ? "Warning: Connecting over unencrypted HTTP on a local/private network. Credentials and streaming traffic are not encrypted."
    : undefined;

  let pathname = parsedUrl.pathname !== "/" ? parsedUrl.pathname.replace(/\/+$/, "") : "";
  // Strip Jellyfin web client UI path if user pasted browser URL (e.g. /web, /web/index.html)
  pathname = pathname.replace(/\/web(\/.*)?$/i, "");

  return {
    url: parsedUrl.origin + pathname,
    isHttps,
    hasWarning,
    warningMessage
  };
}

/** Normalize and enforce transport policy before any credential-bearing request. */
export function normalizeServerUrlForCredentials(rawInput: string): ServerUrlValidationResult {
  return enforceServerTransportPolicy(normalizeServerUrl(rawInput));
}

export async function validateAndDiscoverServer(
  inputUrl: string,
  client?: HttpClient
): Promise<ServerDiscoveryResult> {
  const normalized = normalizeServerUrlForCredentials(inputUrl);
  const httpClient = client || new HttpClient({ baseUrl: normalized.url, defaultTimeoutMs: 10000 });

  try {
    const publicInfo = await httpClient.request<ServerPublicInfo>("/System/Info/Public");

    if (!publicInfo || !publicInfo.Id || !publicInfo.ServerName) {
      throw new FinoraError(
        "Invalid server response: Target does not appear to be a valid Jellyfin server.",
        "INVALID_SERVER_RESPONSE"
      );
    }

    return {
      serverId: publicInfo.Id,
      serverName: publicInfo.ServerName,
      version: publicInfo.Version || "Unknown",
      url: normalized.url,
      isHttps: normalized.isHttps,
      hasWarning: normalized.hasWarning,
      warningMessage: normalized.warningMessage,
      operatingSystem: publicInfo.OperatingSystem
    };
  } catch (error) {
    if (error instanceof FinoraError) {
      throw error;
    }
    throw new FinoraError(
      `Failed to connect to server at ${normalized.url}: ${(error as Error).message}`,
      "SERVER_UNREACHABLE"
    );
  }
}
