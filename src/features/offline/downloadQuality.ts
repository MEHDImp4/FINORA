export type DownloadQuality = "original" | "1080p" | "720p" | "480p";

export interface DownloadQualityProfile {
  id: DownloadQuality;
  title: string;
  description: string;
  badge?: string;
  maxHeight?: number;
  maxWidth?: number;
  videoBitRate?: number;
}

export const DOWNLOAD_QUALITIES: DownloadQualityProfile[] = [
  {
    id: "original",
    title: "Qualité d'origine",
    description: "Fichier brut complet du serveur sans transcodage, lecture fluide garantie",
    badge: "Recommandé"
  },
  {
    id: "1080p",
    title: "1080p Full HD",
    description: "Haute fidélité pour grand écran ou tablette",
    maxHeight: 1080,
    maxWidth: 1920,
    videoBitRate: 7500000
  },
  {
    id: "720p",
    title: "720p HD",
    description: "Qualité optimale pour smartphone, taille et temps réduits",
    maxHeight: 720,
    maxWidth: 1280,
    videoBitRate: 3500000
  },
  {
    id: "480p",
    title: "480p SD",
    description: "Économiseur d'espace et téléchargement ultra rapide",
    maxHeight: 480,
    maxWidth: 854,
    videoBitRate: 1500000
  }
];

/**
 * Jellyfin ticks: 10 000 000 ticks per second.
 */
const TICKS_PER_SECOND = 10_000_000;

/**
 * The transcode request asks for stereo AAC; ~128 kbps covers it.
 */
const ESTIMATED_AUDIO_BITRATE = 128_000;

/**
 * Estimates the byte size of a transcoded download.
 *
 * Jellyfin does NOT send a `Content-Length` header for transcode responses —
 * the size is only known once encoding finishes. Without an estimate the
 * progress bar has no denominator and stays at 0 %. The media duration
 * (`totalTicks`) and the profile's target bitrate give a usable approximation.
 *
 * Returns undefined for "original" quality (no bitrate target — the real
 * Content-Length is available there) or when the duration is unknown.
 */
export function estimateTranscodedBytes(
  quality: DownloadQuality,
  totalTicks?: number
): number | undefined {
  if (quality === "original" || !totalTicks || totalTicks <= 0) return undefined;

  const profile = DOWNLOAD_QUALITIES.find((q) => q.id === quality);
  if (!profile?.videoBitRate) return undefined;

  const durationSeconds = totalTicks / TICKS_PER_SECOND;
  const totalBits = (profile.videoBitRate + ESTIMATED_AUDIO_BITRATE) * durationSeconds;
  return Math.round(totalBits / 8);
}

/**
 * Builds standard Jellyfin authentication headers for download requests.
 * Credentials live in headers so they do not leak through URLs, proxy access
 * logs, native download diagnostics, or persisted resume metadata.
 */
export function getDownloadHeaders(token: string): Record<string, string> {
  if (!token) return {};
  return {
    "X-Emby-Token": token,
    Authorization: `MediaBrowser Client="Finora", Device="Finora Mobile", DeviceId="finora-mobile", Version="1.0.0", Token="${token}"`
  };
}

/**
 * Builds the appropriate Jellyfin download URL WITHOUT credentials.
 * Authentication must be supplied separately through getDownloadHeaders().
 *
 * `_token` is retained for call-site compatibility while old callers migrate;
 * it is intentionally never interpolated into the URL.
 */
export function buildDownloadUrl(
  serverUrl: string,
  itemId: string,
  _token: string,
  quality: DownloadQuality = "original"
): string {
  const cleanUrl = serverUrl.replace(/\/+$/, "");

  if (quality === "original") {
    return `${cleanUrl}/Items/${itemId}/Download`;
  }

  const profile =
    DOWNLOAD_QUALITIES.find((q) => q.id === quality) || DOWNLOAD_QUALITIES[0];

  const params: string[] = [
    "static=false",
    "videoCodec=h264",
    "audioCodec=aac",
    "audioChannels=2",
    "transcodingContainer=mp4",
    "transcodingProtocol=http",
    `maxHeight=${profile.maxHeight || 720}`,
    `maxWidth=${profile.maxWidth || 1280}`,
    `videoBitRate=${profile.videoBitRate || 3500000}`,
    "deviceId=finora-mobile",
    `mediaSourceId=${encodeURIComponent(itemId)}`
  ];

  return `${cleanUrl}/Videos/${itemId}/stream.mp4?${params.join("&")}`;
}
