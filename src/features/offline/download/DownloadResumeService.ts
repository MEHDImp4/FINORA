import { DownloadQuality } from "../downloadQuality";

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
