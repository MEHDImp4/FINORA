import { HttpClient } from "../network/httpClient";
import { FinoraError } from "../errors";

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
    ? "Warning: Connecting over unencrypted HTTP. Your credentials and streaming traffic will not be protected across the network."
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

export async function validateAndDiscoverServer(
  inputUrl: string,
  client?: HttpClient
): Promise<ServerDiscoveryResult> {
  const normalized = normalizeServerUrl(inputUrl);
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
