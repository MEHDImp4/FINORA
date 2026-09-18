import {
  DOWNLOAD_ROOT_DIR,
  buildDownloadRelativePath,
  getDownloadScopeKey,
  sanitizePathSegment
} from "../downloadPaths";

const A = { serverId: "server-A", userId: "user-A" };
const B = { serverId: "server-A", userId: "user-B" };

describe("downloadPaths", () => {
  it("keeps already-safe identifiers verbatim", () => {
    expect(sanitizePathSegment("movie-1")).toBe("movie-1");
    expect(sanitizePathSegment("3c9a1f2e-1111-2222-3333-444455556666")).toBe(
      "3c9a1f2e-1111-2222-3333-444455556666"
    );
  });

  it("neutralises path traversal and separators", () => {
    const segment = sanitizePathSegment("../../etc/passwd");
    expect(segment).not.toContain("/");
    expect(segment).not.toContain("..");
    expect(segment).not.toContain("\\");
    expect(segment.length).toBeGreaterThan(0);
  });

  it("is deterministic and collision-resistant for unsafe inputs", () => {
    const a = sanitizePathSegment("a/b");
    const b = sanitizePathSegment("a\\b");
    expect(a).toBe(sanitizePathSegment("a/b"));
    expect(a).not.toBe(b);
  });

  it("namespaces the relative path by server and user", () => {
    const path = buildDownloadRelativePath(A, "item-1");
    expect(path).toBe(`${DOWNLOAD_ROOT_DIR}/server-A/user-A/item-1.mp4`);
    expect(buildDownloadRelativePath(B, "item-1")).not.toBe(path);
  });

  it("falls back to an unscoped path only when no scope is known", () => {
    expect(buildDownloadRelativePath(null, "item-1")).toBe(
      `${DOWNLOAD_ROOT_DIR}/item-1.mp4`
    );
  });

  it("builds a stable composite scope key", () => {
    expect(getDownloadScopeKey({ serverId: "a b", userId: "c/d" })).toBe("a%20b:c%2Fd");
  });
});
