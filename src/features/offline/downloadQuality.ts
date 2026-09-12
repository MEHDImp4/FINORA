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
 * Builds standard Jellyfin authentication headers for download requests.
 */
export function getDownloadHeaders(token: string): Record<string, string> {
  if (!token) return {};
  return {
    "X-Emby-Token": token,
    Authorization: `MediaBrowser Client="Finora", Device="Finora Mobile", DeviceId="finora-mobile", Version="1.0.0", Token="${token}"`
  };
}

/**
 * Builds the appropriate Jellyfin download URL.
 * If 'original', downloads the raw file directly via /Items/{id}/Download.
 * If transcode quality is selected, requests a progressive MP4 stream encoded by Jellyfin.
 */
export function buildDownloadUrl(
  serverUrl: string,
  itemId: string,
  token: string,
  quality: DownloadQuality = "original"
): string {
  const cleanUrl = serverUrl.replace(/\/+$/, "");

  if (quality === "original") {
    return `${cleanUrl}/Items/${itemId}/Download?api_key=${encodeURIComponent(token)}`;
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
    `api_key=${encodeURIComponent(token)}`,
    "deviceId=finora-mobile",
    `mediaSourceId=${encodeURIComponent(itemId)}`
  ];

  return `${cleanUrl}/Videos/${itemId}/stream.mp4?${params.join("&")}`;
}
