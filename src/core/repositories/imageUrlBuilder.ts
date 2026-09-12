import { jellyfinClient } from "../jellyfin/jellyfinClient";
import { MediaItem } from "../../types/media";

export type ImageType = "Primary" | "Backdrop" | "Logo" | "Thumb";

export interface ImageUrlOptions {
  width?: number;
  height?: number;
  quality?: number;
  tag?: string;
  apiKey?: string;
}

export function buildImageUrl(
  baseUrl: string,
  itemId: string,
  type: ImageType = "Primary",
  options: ImageUrlOptions = {}
): string {
  if (!baseUrl || !itemId) {
    return "";
  }

  const cleanBase = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${cleanBase}/Items/${itemId}/Images/${type}`);

  if (options.width) {
    url.searchParams.append("fillWidth", String(options.width));
  }
  if (options.height) {
    url.searchParams.append("fillHeight", String(options.height));
  }
  if (options.quality) {
    url.searchParams.append("quality", String(options.quality));
  }
  if (options.tag) {
    url.searchParams.append("tag", options.tag);
  }

  const token = options.apiKey || jellyfinClient.getAuthToken();
  if (token) {
    url.searchParams.append("api_key", token);
  }

  return url.toString();
}

export function getPosterUrl(
  baseUrl: string,
  itemId: string,
  tag?: string,
  targetWidth: number = 340
): string {
  return buildImageUrl(baseUrl, itemId, "Primary", {
    width: targetWidth,
    quality: 85,
    tag
  });
}

export function getBackdropUrl(
  baseUrl: string,
  itemId: string,
  tag?: string,
  targetWidth: number = 1080
): string {
  return buildImageUrl(baseUrl, itemId, "Backdrop", {
    width: targetWidth,
    quality: 80,
    tag
  });
}

export function getLogoUrl(
  baseUrl: string,
  itemId: string,
  tag?: string,
  targetWidth: number = 400
): string {
  return buildImageUrl(baseUrl, itemId, "Logo", {
    width: targetWidth,
    quality: 85,
    tag
  });
}

export function getPersonImageUrl(
  baseUrl: string,
  personId: string,
  tag?: string,
  targetWidth: number = 200
): string {
  return buildImageUrl(baseUrl, personId, "Primary", {
    width: targetWidth,
    quality: 80,
    tag
  });
}

/**
 * Resolves the best 2:3 vertical poster URL for an item.
 * For an Episode, it prefers the Series Poster (SeriesId / SeriesPrimaryImageTag)
 * matching the standard Netflix / Jellyfin Web behavior.
 */
export function getMediaPosterUrl(
  baseUrl: string,
  item: MediaItem,
  targetWidth: number = 340
): string {
  if (!baseUrl || !item) return "";

  // For Episodes, prefer the parent series poster
  if (item.type === "Episode" && item.seriesId) {
    return buildImageUrl(baseUrl, item.seriesId, "Primary", {
      width: targetWidth,
      quality: 85,
      tag: item.seriesPrimaryImageTag
    });
  }

  // Fallback to item's own Primary image
  return buildImageUrl(baseUrl, item.id, "Primary", {
    width: targetWidth,
    quality: 85,
    tag: item.primaryImageTag
  });
}

/**
 * Resolves the best 16:9 horizontal thumbnail URL for an item.
 * - For an Episode: its Primary image is the 16:9 episode still frame! (NOT Backdrop!)
 *   Fallback to Series Backdrop if episode still tag is missing.
 * - For a Movie or Series: uses Backdrop (16:9).
 *   Fallback to Thumb or Primary.
 */
export function getMediaThumbnailUrl(
  baseUrl: string,
  item: MediaItem,
  targetWidth: number = 440
): string {
  if (!baseUrl || !item) return "";

  if (item.type === "Episode") {
    // 1. Episode still is type "Primary" (16:9)
    if (item.primaryImageTag) {
      return buildImageUrl(baseUrl, item.id, "Primary", {
        width: targetWidth,
        quality: 85,
        tag: item.primaryImageTag
      });
    }

    // 2. Fallback to Series Backdrop if episode still is missing
    const parentId = item.parentBackdropItemId || item.seriesId;
    if (parentId) {
      return buildImageUrl(baseUrl, parentId, "Backdrop", {
        width: targetWidth,
        quality: 80,
        tag: item.parentBackdropImageTag || item.backdropImageTag
      });
    }

    // 3. Fallback: item Primary without tag
    return buildImageUrl(baseUrl, item.id, "Primary", {
      width: targetWidth,
      quality: 85
    });
  }

  // For Movies & Series: Backdrop is the standard 16:9 fanart
  if (item.backdropImageTag) {
    return buildImageUrl(baseUrl, item.id, "Backdrop", {
      width: targetWidth,
      quality: 80,
      tag: item.backdropImageTag
    });
  }

  // Fallback to Thumb
  if (item.thumbImageTag) {
    return buildImageUrl(baseUrl, item.id, "Thumb", {
      width: targetWidth,
      quality: 85,
      tag: item.thumbImageTag
    });
  }

  // Fallback to Primary
  return buildImageUrl(baseUrl, item.id, "Primary", {
    width: targetWidth,
    quality: 85,
    tag: item.primaryImageTag
  });
}


