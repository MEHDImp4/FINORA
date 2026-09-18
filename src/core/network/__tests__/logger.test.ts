import { sanitizeData, logger } from "../logger";

describe("Sanitized Logger", () => {
  it("redacts Authorization headers in strings", () => {
    const input = "Headers: Authorization: Bearer my-secret-token-123\nHost: example.com";
    const sanitized = sanitizeData(input);
    expect(sanitized).toContain("Authorization: [REDACTED]");
    expect(sanitized).not.toContain("my-secret-token-123");
  });

  it("redacts X-Emby-Token headers in strings", () => {
    const input = "Request: X-Emby-Token: jellyfin-auth-token-456";
    const sanitized = sanitizeData(input);
    expect(sanitized).toContain("X-Emby-Token: [REDACTED]");
    expect(sanitized).not.toContain("jellyfin-auth-token-456");
  });

  it("redacts password and token query parameters", () => {
    const input = "https://jellyfin.local/Users/AuthenticateByName?password=supersecret&token=abc12345";
    const sanitized = sanitizeData(input);
    expect(sanitized).toContain("password=[REDACTED]");
    expect(sanitized).toContain("token=[REDACTED]");
    expect(sanitized).not.toContain("supersecret");
    expect(sanitized).not.toContain("abc12345");
  });

  it("redacts sensitive keys in JSON objects recursively", () => {
    const payload = {
      username: "demo_user",
      password: "secret_password",
      accessToken: "token_xyz",
      headers: {
        authorization: "Bearer secret_header",
        cookie: "session_cookie_secret"
      },
      meta: {
        normalField: "public_value"
      }
    };

    const sanitized = sanitizeData(payload);

    expect(sanitized.username).toBe("demo_user");
    expect(sanitized.password).toBe("[REDACTED]");
    expect(sanitized.accessToken).toBe("[REDACTED]");
    expect(sanitized.headers.authorization).toBe("[REDACTED]");
    expect(sanitized.headers.cookie).toBe("[REDACTED]");
    expect(sanitized.meta.normalField).toBe("public_value");
  });

  it("handles null, undefined, and primitives safely", () => {
    expect(sanitizeData(null)).toBeNull();
    expect(sanitizeData(undefined)).toBeUndefined();
    expect(sanitizeData(42)).toBe(42);
    expect(sanitizeData(true)).toBe(true);
  });

  describe("SEC-02 credential coverage", () => {
    it("redacts api_key inside a Jellyfin image URL", () => {
      const sanitized = sanitizeData("https://server/image?api_key=SECRET");
      expect(sanitized).toBe("https://server/image?api_key=[REDACTED]");
      expect(sanitized).not.toContain("SECRET");
    });

    it("redacts X-MediaBrowser-Token headers", () => {
      const sanitized = sanitizeData("X-MediaBrowser-Token: SECRET");
      expect(sanitized).toContain("X-MediaBrowser-Token: [REDACTED]");
      expect(sanitized).not.toContain("SECRET");
    });

    it.each([
      "access_token=SECRET",
      "refresh_token=SECRET",
      "api-key=SECRET",
      "pwd=SECRET",
      "passwd=SECRET",
      "credential=SECRET",
      "credentials=SECRET",
      "?api_key=SECRET&x=1"
    ])("redacts %s", (input) => {
      const sanitized = sanitizeData(input);
      expect(sanitized).not.toContain("SECRET");
      expect(sanitized).toContain("[REDACTED]");
    });

    it("redacts new credential object keys", () => {
      const sanitized = sanitizeData({
        access_token: "a",
        refreshToken: "b",
        "X-MediaBrowser-Token": "c",
        "api-key": "d",
        credentials: "e",
        passwd: "f",
        safe: "keep"
      });
      expect(sanitized.access_token).toBe("[REDACTED]");
      expect(sanitized.refreshToken).toBe("[REDACTED]");
      expect((sanitized as any)["X-MediaBrowser-Token"]).toBe("[REDACTED]");
      expect((sanitized as any)["api-key"]).toBe("[REDACTED]");
      expect(sanitized.credentials).toBe("[REDACTED]");
      expect(sanitized.passwd).toBe("[REDACTED]");
      expect(sanitized.safe).toBe("keep");
    });

    it("redacts quoted and unquoted credential pairs", () => {
      expect(sanitizeData('{"password":"SECRET"}')).not.toContain("SECRET");
      expect(sanitizeData("password: SECRET")).not.toContain("SECRET");
      expect(sanitizeData("apiKey = SECRET")).not.toContain("SECRET");
    });
  });
});
