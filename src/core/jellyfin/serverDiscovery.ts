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

  // IPv6 literals only. Applying these to DNS names would let a public host
  // such as "fc-proxy.example.com" satisfy a bare `startsWith("fc")` and be
  // treated as private, permitting cleartext credentials to the Internet.
  if (hostname.includes(":")) {
    if (hostname === "::1") return true; // loopback
    if (/^f[cd][0-9a-f]{2}:/i.test(hostname)) return true; // fc00::/7 unique-local
    if (/^fe[89ab][0-9a-f]:/i.test(hostname)) return true; // fe80::/10 link-local
  }

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

export interface ServerConnectionDetectionResult {
  activeUrl: string;
  isLocal: boolean;
  strategy: "local-lan" | "remote-wan" | "fallback";
}

/**
 * Automatically detects whether the server is directly reachable on the local LAN
 * or if the client should connect via remote WAN.
 *
 * Checks the candidate local address first with a fast timeout (default 1500ms).
 * If the local ping succeeds (Jellyfin System/Info/Public responds with a valid ID),
 * FINORA selects the local address to maximize throughput (Direct Play, zero transcoding).
 * Otherwise, it falls back to the remote WAN address (or current active URL).
 */
export async function autoDetectServerConnection(
  localCandidateUrl?: string | null,
  remoteCandidateUrl?: string | null,
  fallbackUrl?: string | null,
  timeoutMs: number = 1500
): Promise<ServerConnectionDetectionResult> {
  const pingServer = async (candidateUrl: string): Promise<boolean> => {
    try {
      const normalized = normalizeServerUrl(candidateUrl);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(`${normalized.url}/System/Info/Public`, {
        method: "GET",
        headers: { Accept: "application/json" },
        signal: controller.signal
      });
      clearTimeout(timer);

      if (!response.ok) return false;
      const data = await response.json();
      return !!(data && (data.Id || data.ServerName));
    } catch {
      return false;
    }
  };

  // 1. If a local candidate URL is configured, probe it first
  if (localCandidateUrl && localCandidateUrl.trim()) {
    const isLocalAlive = await pingServer(localCandidateUrl.trim());
    if (isLocalAlive) {
      const normalized = normalizeServerUrl(localCandidateUrl.trim());
      return {
        activeUrl: normalized.url,
        isLocal: true,
        strategy: "local-lan"
      };
    }
  }

  // 2. If local fails or is not set, probe remote WAN candidate
  if (remoteCandidateUrl && remoteCandidateUrl.trim()) {
    const isRemoteAlive = await pingServer(remoteCandidateUrl.trim());
    if (isRemoteAlive) {
      const normalized = normalizeServerUrl(remoteCandidateUrl.trim());
      const hostname = new URL(normalized.url).hostname;
      return {
        activeUrl: normalized.url,
        isLocal: isLocalNetworkHost(hostname),
        strategy: "remote-wan"
      };
    }
  }

  // 3. Fallback to current URL or whatever candidate was provided
  const targetFallback = (fallbackUrl || remoteCandidateUrl || localCandidateUrl || "").trim();
  let isLocal = false;
  if (targetFallback) {
    try {
      const normalized = normalizeServerUrl(targetFallback);
      const hostname = new URL(normalized.url).hostname;
      isLocal = isLocalNetworkHost(hostname);
      return {
        activeUrl: normalized.url,
        isLocal,
        strategy: "fallback"
      };
    } catch {
      // Ignored - return raw fallback below
    }
  }

  return {
    activeUrl: targetFallback,
    isLocal,
    strategy: "fallback"
  };
}
