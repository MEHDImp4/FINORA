import { ChapterMarker, TrickplayManifest } from "../../types/media";

export interface TrickplayCoordinates {
  sheetIndex: number;
  col: number;
  row: number;
  x: number;
  y: number;
  thumbWidth: number;
  thumbHeight: number;
  totalSheetWidth: number;
  totalSheetHeight: number;
}

/**
 * Calculates the sprite sheet index, column, row, pixel coordinates, and dimensions
 * for a specific timestamp using a Jellyfin 10.9+ Trickplay manifest.
 */
export function getTrickplayCoordinates(
  targetSeconds: number,
  manifest: TrickplayManifest
): TrickplayCoordinates {
  const intervalSec = (manifest.intervalMs || 10000) / 1000 || 10;
  const thumbIndex = Math.max(0, Math.floor(targetSeconds / intervalSec));
  const tileWidth = manifest.tileWidth || 10;
  const tileHeight = manifest.tileHeight || 10;
  const tilesPerSheet = tileWidth * tileHeight;

  const sheetIndex = Math.floor(thumbIndex / tilesPerSheet);
  const indexInSheet = thumbIndex % tilesPerSheet;
  const col = indexInSheet % tileWidth;
  const row = Math.floor(indexInSheet / tileWidth);

  const thumbWidth = manifest.width || 320;
  const thumbHeight = manifest.height || 180;
  const x = col * thumbWidth;
  const y = row * thumbHeight;
  const totalSheetWidth = tileWidth * thumbWidth;
  const totalSheetHeight = tileHeight * thumbHeight;

  return {
    sheetIndex,
    col,
    row,
    x,
    y,
    thumbWidth,
    thumbHeight,
    totalSheetWidth,
    totalSheetHeight
  };
}

/**
 * Returns the URL for a specific Jellyfin 10.9+ Trickplay sprite sheet tile.
 */
export function getTrickplaySheetUrl(
  serverUrl: string,
  itemId: string,
  sheetIndex: number,
  width: number = 320,
  token?: string
): string {
  const cleanUrl = serverUrl.replace(/\/+$/, "");
  const authQuery = token ? `?api_key=${encodeURIComponent(token)}` : "";
  return `${cleanUrl}/Videos/${itemId}/Trickplay/${width}/${sheetIndex}.jpg${authQuery}`;
}

/**
 * Returns the native Jellyfin 10.9+ Trickplay tile image URL (backward compatibility).
 */
export function getJellyfinTrickplayTileUrl(
  serverUrl: string,
  itemId: string,
  targetSeconds: number,
  width: number = 320,
  intervalSeconds: number = 10,
  token?: string
): string {
  const cleanUrl = serverUrl.replace(/\/+$/, "");
  const tileIndex = Math.max(0, Math.floor(targetSeconds / intervalSeconds));
  const authQuery = token ? `?api_key=${encodeURIComponent(token)}` : "";
  return `${cleanUrl}/Videos/${itemId}/Trickplay/${width}/${tileIndex}.jpg${authQuery}`;
}

/**
 * Returns the chapter thumbnail URL for a given media item.
 */
export function getChapterImageUrl(
  serverUrl: string,
  itemId: string,
  chapterIndex: number,
  width: number = 320,
  token?: string
): string {
  const cleanUrl = serverUrl.replace(/\/+$/, "");
  const queryParams = [`maxWidth=${width}`];
  if (token) queryParams.push(`api_key=${encodeURIComponent(token)}`);
  return `${cleanUrl}/Items/${itemId}/Images/Chapter/${chapterIndex}?${queryParams.join("&")}`;
}

/**
 * Returns a fallback thumbnail URL (Backdrop, Primary, or Thumb) for a media item.
 */
export function getFallbackThumbnailUrl(
  serverUrl: string,
  itemId: string,
  width: number = 320,
  token?: string,
  imageType: "Backdrop" | "Primary" | "Thumb" = "Backdrop"
): string {
  const cleanUrl = serverUrl.replace(/\/+$/, "");
  const queryParams = [`maxWidth=${width}`];
  if (token) queryParams.push(`api_key=${encodeURIComponent(token)}`);
  return `${cleanUrl}/Items/${itemId}/Images/${imageType}?${queryParams.join("&")}`;
}

/**
 * Finds the media chapter matching the given timestamp in seconds.
 */
export function findChapterAtSeconds(
  chapters?: ChapterMarker[],
  seconds?: number
): { chapter: ChapterMarker; index: number } | null {
  if (!chapters || chapters.length === 0 || seconds === undefined || seconds < 0) {
    return null;
  }
  for (let i = chapters.length - 1; i >= 0; i--) {
    const startSec = chapters[i].startPositionTicks / 10000000;
    if (seconds >= startSec) {
      return { chapter: chapters[i], index: i };
    }
  }
  return { chapter: chapters[0], index: 0 };
}

/**
 * Resolves the trickplay thumbnail preview URL.
 * Supports legacy ticks tag for unit test parity, chapter thumbnail, and native Jellyfin Trickplay.
 */
export function getTrickplayThumbnailUrl(
  serverUrl: string,
  itemId: string,
  targetSeconds: number,
  width: number = 320,
  options?: {
    mode?: "native" | "chapter" | "legacy";
    chapterIndex?: number;
    token?: string;
  }
): string {
  const cleanUrl = serverUrl.replace(/\/+$/, "");
  const token = options?.token;

  if (options?.mode === "native") {
    return getJellyfinTrickplayTileUrl(cleanUrl, itemId, targetSeconds, width, 10, token);
  }

  if (options?.mode === "chapter" && options.chapterIndex !== undefined && options.chapterIndex >= 0) {
    return getChapterImageUrl(cleanUrl, itemId, options.chapterIndex, width, token);
  }

  const ticks = Math.round(targetSeconds * 10000000);
  const authParam = token ? `&api_key=${encodeURIComponent(token)}` : "";
  return `${cleanUrl}/Items/${itemId}/Images/Primary?maxWidth=${width}&tag=trickplay_${ticks}${authParam}`;
}
