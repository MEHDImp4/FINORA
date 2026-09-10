import { DiagnosticsService } from "../diagnosticsService";
import { HttpClient } from "../../network/httpClient";

jest.mock("../../network/httpClient");

describe("DiagnosticsService", () => {
  let service: DiagnosticsService;
  let mockHttpClient: jest.Mocked<HttpClient>;

  beforeEach(() => {
    service = new DiagnosticsService();
    mockHttpClient = new HttpClient() as jest.Mocked<HttpClient>;
    mockHttpClient.request = jest.fn();
  });

  it("calculates latency and marks HTTPS and healthy on successful check", async () => {
    mockHttpClient.request.mockResolvedValue({
      Id: "server-1",
      ServerName: "Finora Media",
      Version: "10.9.11",
      OperatingSystem: "Linux"
    });

    const result = await service.runDiagnostics(
      "https://media.finora.org",
      "test-token",
      mockHttpClient
    );

    expect(result.serverUrl).toBe("https://media.finora.org");
    expect(result.isHttps).toBe(true);
    expect(result.serverName).toBe("Finora Media");
    expect(result.version).toBe("10.9.11");
    expect(result.operatingSystem).toBe("Linux");
    expect(result.apiHealthy).toBe(true);
    expect(result.pingMs).toBeGreaterThanOrEqual(1);
  });

  it("identifies HTTP and reports failure if server is unreachable", async () => {
    mockHttpClient.request.mockRejectedValue(new Error("Connection timed out"));

    const result = await service.runDiagnostics(
      "http://192.168.1.50:8096",
      null,
      mockHttpClient
    );

    expect(result.serverUrl).toBe("http://192.168.1.50:8096");
    expect(result.isHttps).toBe(false);
    expect(result.apiHealthy).toBe(false);
    expect(result.statusMessage).toContain("Connection timed out");
  });
});
