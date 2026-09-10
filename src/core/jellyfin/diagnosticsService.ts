import { HttpClient } from "../network/httpClient";
import { FinoraError } from "../errors";

export interface ServerDiagnosticsResult {
  serverUrl: string;
  isHttps: boolean;
  pingMs: number;
  serverName: string;
  version: string;
  operatingSystem?: string;
  apiHealthy: boolean;
  statusMessage: string;
}

export class DiagnosticsService {
  public async runDiagnostics(
    serverUrl: string,
    token?: string | null,
    client?: HttpClient
  ): Promise<ServerDiagnosticsResult> {
    const cleanUrl = serverUrl.replace(/\/+$/, "");
    const isHttps = cleanUrl.startsWith("https://");
    const headers: Record<string, string> = {};
    if (token) {
      headers["X-Emby-Token"] = token;
    }

    const httpClient = client || new HttpClient({
      baseUrl: cleanUrl,
      defaultTimeoutMs: 8000,
      defaultHeaders: headers
    });

    const startTime = Date.now();
    try {
      // Step 1: Ping / Info public check
      const info = await httpClient.request<{
        Id: string;
        ServerName: string;
        Version: string;
        OperatingSystem?: string;
      }>("/System/Info/Public");

      const pingMs = Math.max(1, Date.now() - startTime);

      return {
        serverUrl: cleanUrl,
        isHttps,
        pingMs,
        serverName: info.ServerName || "Jellyfin Server",
        version: info.Version || "Unknown",
        operatingSystem: info.OperatingSystem,
        apiHealthy: true,
        statusMessage: "Operational and responsive"
      };
    } catch (error) {
      const pingMs = Math.max(1, Date.now() - startTime);
      return {
        serverUrl: cleanUrl,
        isHttps,
        pingMs,
        serverName: "Unreachable",
        version: "Unknown",
        apiHealthy: false,
        statusMessage: `Diagnostics failed: ${(error as Error).message}`
      };
    }
  }
}

export const diagnosticsService = new DiagnosticsService();
