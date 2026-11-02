import subprocess
from pathlib import Path

root = Path("src/features/offline/download")
root.mkdir(parents=True, exist_ok=True)

(root / "DownloadResumeService.ts").write_text(r'''import { DownloadQuality } from "../downloadQuality";

/**
 * Resume policy kept outside DownloadManager so process-death recovery rules can
 * evolve independently from orchestration and native transfer wiring.
 */
export function isTranscodedQuality(quality?: DownloadQuality): boolean {
  return (quality ?? "original") !== "original";
}

/** Persist download URLs without credential-bearing query parameters. */
export function stripTokensFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.delete("api_key");
    parsed.searchParams.delete("ApiKey");
    parsed.searchParams.delete("Token");
    return parsed.toString();
  } catch {
    // Relative/legacy paths carry no parsed credential query; preserve them.
    return url;
  }
}
''')

(root / "DownloadNetworkPolicy.ts").write_text(r'''import { isWifiConnected } from "../../../core/network/networkStatusService";

/** Centralized network gate for queued/restored/new downloads. */
export async function isDownloadNetworkAllowed(wifiOnly: boolean): Promise<boolean> {
  if (!wifiOnly) return true;
  return isWifiConnected();
}
''')

manager_path = Path("src/features/offline/downloadManager.ts")
text = manager_path.read_text()

old_import = 'import { isWifiConnected } from "../../core/network/networkStatusService";\n'
if text.count(old_import) != 1:
    raise RuntimeError("Expected one direct isWifiConnected import")
text = text.replace(
    old_import,
    'import { isDownloadNetworkAllowed } from "./download/DownloadNetworkPolicy";\n',
    1,
)

anchor = 'import { formatBytes, formatSpeed, formatTimeRemaining } from "./offlineFormatting";\n'
if text.count(anchor) != 1:
    raise RuntimeError("Could not find offlineFormatting import anchor")
text = text.replace(
    anchor,
    anchor + 'import { isTranscodedQuality, stripTokensFromUrl } from "./download/DownloadResumeService";\n',
    1,
)

resume_block = '''/**\n * Transcoded downloads are live Jellyfin streams, not stable byte-addressable\n * artifacts. Only the original-file endpoint is safe to reconstruct with a\n * persisted HTTP Range offset after task loss/process death.\n */\nfunction isTranscodedQuality(quality?: DownloadQuality): boolean {\n  return (quality ?? "original") !== "original";\n}\n\n/**\n * Strips authentication tokens from a URL query string.\n * Tokens must come from the live secure session, never from persisted storage.\n */\nfunction stripTokensFromUrl(url: string): string {\n  try {\n    const parsed = new URL(url);\n    parsed.searchParams.delete("api_key");\n    parsed.searchParams.delete("ApiKey");\n    parsed.searchParams.delete("Token");\n    return parsed.toString();\n  } catch {\n    // URL parsing failed (e.g., relative path) — return as-is\n    return url;\n  }\n}\n\n'''
if text.count(resume_block) != 1:
    raise RuntimeError("Expected one inline resume-policy block")
text = text.replace(resume_block, "", 1)

# Centralize both compact and expanded Wi-Fi gates. The manager still owns the
# status transition/queue semantics; only the connectivity policy moves out.
compact_wifi_expr = 'wifiOnly ? await isWifiConnected() : true'
compact_count = text.count(compact_wifi_expr)
text = text.replace(compact_wifi_expr, 'await isDownloadNetworkAllowed(wifiOnly)')

expanded_wifi_expr = 'const isWifi = await isWifiConnected();'
expanded_count = text.count(expanded_wifi_expr)
text = text.replace(expanded_wifi_expr, 'const isWifi = await isDownloadNetworkAllowed(true);')

count = compact_count + expanded_count
if count < 1:
    raise RuntimeError("Expected at least one inline Wi-Fi gate")
if 'isWifiConnected' in text:
    raise RuntimeError("Direct isWifiConnected usage remains in DownloadManager")

manager_path.write_text(text)

# Focused tests for the extracted pure resume rules. Existing downloadManagerWifi
# tests continue to exercise the policy through the real manager.
test = Path("src/features/offline/__tests__/downloadArchitecture.test.ts")
test.write_text(r'''import {
  isTranscodedQuality,
  stripTokensFromUrl
} from "../download/DownloadResumeService";

describe("download architecture helpers", () => {
  it("keeps resume limited to original-file downloads", () => {
    expect(isTranscodedQuality("original")).toBe(false);
    expect(isTranscodedQuality("720p")).toBe(true);
  });

  it("removes credential query parameters before persistence", () => {
    const sanitized = stripTokensFromUrl(
      "https://jellyfin.example.test/Videos/1?api_key=secret&Token=secret2&mediaSourceId=abc"
    );
    expect(sanitized).not.toContain("secret");
    expect(sanitized).toContain("mediaSourceId=abc");
  });
});
''')

paths = [
    "src/features/offline/download/DownloadResumeService.ts",
    "src/features/offline/download/DownloadNetworkPolicy.ts",
    "src/features/offline/downloadManager.ts",
    "src/features/offline/__tests__/downloadArchitecture.test.ts",
]
subprocess.run(["git", "add", *paths], check=True)
print(f"Phase 4 download refactor applied; centralized {count} Wi-Fi gate(s)")
