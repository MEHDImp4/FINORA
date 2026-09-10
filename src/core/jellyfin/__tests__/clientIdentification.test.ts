import {
  CLIENT_NAME,
  CLIENT_VERSION,
  DEVICE_ID_STORAGE_KEY,
  getDeviceName,
  getOrCreateDeviceId,
  formatAuthorizationHeader
} from "../clientInfo";
import { ISecureTokenStorage } from "../../security/storage";

jest.mock("expo-crypto", () => ({
  randomUUID: jest.fn(() => "mocked-uuid-1234-5678")
}));

describe("clientInfo", () => {
  let mockStorage: jest.Mocked<ISecureTokenStorage>;

  beforeEach(() => {
    mockStorage = {
      getToken: jest.fn(),
      setToken: jest.fn(),
      deleteToken: jest.fn()
    };
  });

  it("returns client name and default version", () => {
    expect(CLIENT_NAME).toBe("FINORA");
    expect(CLIENT_VERSION).toBeDefined();
    expect(typeof getDeviceName()).toBe("string");
  });

  it("generates and stores new device UUID when none exists", async () => {
    mockStorage.getToken.mockResolvedValue(null);

    const deviceId = await getOrCreateDeviceId(mockStorage);

    expect(deviceId).toBe("mocked-uuid-1234-5678");
    expect(mockStorage.getToken).toHaveBeenCalledWith(DEVICE_ID_STORAGE_KEY);
    expect(mockStorage.setToken).toHaveBeenCalledWith(
      DEVICE_ID_STORAGE_KEY,
      "mocked-uuid-1234-5678"
    );
  });

  it("reuses existing persistent device UUID without regenerating", async () => {
    mockStorage.getToken.mockResolvedValue("existing-uuid-abcd");

    const deviceId = await getOrCreateDeviceId(mockStorage);

    expect(deviceId).toBe("existing-uuid-abcd");
    expect(mockStorage.getToken).toHaveBeenCalledWith(DEVICE_ID_STORAGE_KEY);
    expect(mockStorage.setToken).not.toHaveBeenCalled();
  });

  it("formats Jellyfin authorization header with and without token", () => {
    const headerNoToken = formatAuthorizationHeader("device-1");
    expect(headerNoToken).toContain('Client="FINORA"');
    expect(headerNoToken).toContain('DeviceId="device-1"');
    expect(headerNoToken).not.toContain("Token=");

    const headerWithToken = formatAuthorizationHeader("device-1", "secret-token-xyz");
    expect(headerWithToken).toContain('Client="FINORA"');
    expect(headerWithToken).toContain('DeviceId="device-1"');
    expect(headerWithToken).toContain('Token="secret-token-xyz"');
  });
});
