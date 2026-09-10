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
});
