import { jellyfinClient } from "../jellyfin/jellyfinClient";
import { MediaItem } from "../../types/media";

export type ImageType = "Primary" | "Backdrop" | "Logo" | "Thumb";

export interface ImageUrlOptions {
  width?: number;
  height?: number;
  maxWidth?: number;
  maxHeight?: number;
  fillWidth?: number;
  fillHeight?: number;
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

  if (options.fillWidth && options.fillHeight) {
    url.searchParams.append("fillWidth", String(options.fillWidth));
    url.searchParams.append("fillHeight", String(options.fillHeight));
  } else if (options.maxWidth !== undefined || options.width !== undefined) {
    url.searchParams.append("maxWidth", String(options.maxWidth ?? options.width));
  }

  if (options.maxHeight !== undefined || (options.height !== undefined && !options.fillHeight)) {
    url.searchParams.append("maxHeight", String(options.maxHeight ?? options.height));
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
 * Resolves an ordered list of candidate high-definition banner/backdrop URLs for the Hero Banner.
 */
export function getHeroBannerUrls(
  baseUrl: string,
  item: MediaItem,
  targetWidth: number = 1280
): string[] {
  if (!baseUrl || !item) return [];

  const urls: string[] = [];
  const parentId = item.parentBackdropItemId || item.seriesId || item.parentId;

  // 1. Item Backdrop with tag
  if (item.backdropImageTag) {
    urls.push(getBackdropUrl(baseUrl, item.id, item.backdropImageTag, targetWidth));
  }

  // 2. Parent Backdrop with tag
  const parentBackdropTag = item.parentBackdropImageTag || item.backdropImageTag;
  if (parentId && parentBackdropTag) {
    urls.push(getBackdropUrl(baseUrl, parentId, parentBackdropTag, targetWidth));
  }

  // 3. Item Thumb with tag
  if (item.thumbImageTag) {
    urls.push(
      buildImageUrl(baseUrl, item.id, "Thumb", {
        width: targetWidth,
        quality: 85,
        tag: item.thumbImageTag
      })
    );
  }

  // 4. Parent Thumb with tag
  const parentThumbTag = item.parentThumbImageTag || item.thumbImageTag;
  const parentThumbId = item.parentThumbItemId || parentId;
  if (parentThumbId && parentThumbTag) {
    urls.push(
      buildImageUrl(baseUrl, parentThumbId, "Thumb", {
        width: targetWidth,
        quality: 85,
        tag: parentThumbTag
      })
    );
  }

  // 5. Item Primary with tag
  if (item.primaryImageTag) {
    urls.push(getPosterUrl(baseUrl, item.id, item.primaryImageTag, Math.min(targetWidth, 1080)));
  }

  // 6. Parent Primary with tag
  const seriesPosterTag = item.seriesPrimaryImageTag || item.parentPrimaryImageTag;
  if (parentId && seriesPosterTag) {
    urls.push(getPosterUrl(baseUrl, parentId, seriesPosterTag, Math.min(targetWidth, 1080)));
  }

  // 7. Backdrop fallback without tag
  urls.push(getBackdropUrl(baseUrl, item.id, undefined, targetWidth));
  if (parentId) {
    urls.push(getBackdropUrl(baseUrl, parentId, undefined, targetWidth));
  }

  // 8. Primary fallback without tag
  urls.push(getPosterUrl(baseUrl, item.id, undefined, Math.min(targetWidth, 1080)));
  if (parentId) {
    urls.push(getPosterUrl(baseUrl, parentId, undefined, Math.min(targetWidth, 1080)));
  }

  return Array.from(new Set(urls.filter(Boolean)));
}

/**
 * Resolves an ordered list of candidate 2:3 vertical poster URLs for an item.
 * For an Episode, it prefers the Series Poster, falling back to Season Poster,
 * Episode still, and Series Backdrop.
 */
export function getMediaPosterUrls(
  baseUrl: string,
  item: MediaItem,
  targetWidth: number = 340
): string[] {
  if (!baseUrl || !item) return [];

  const urls: string[] = [];

  if (item.type === "Episode") {
    // 1. Series Primary Poster with tag (2:3)
    const seriesId = item.seriesId;
    const seriesPosterTag = item.seriesPrimaryImageTag || item.parentPrimaryImageTag;
    if (seriesId && seriesPosterTag) {
      urls.push(
        buildImageUrl(baseUrl, seriesId, "Primary", {
          width: targetWidth,
          quality: 85,
          tag: seriesPosterTag
        })
      );
    }

    // 2. Season Primary Poster
    if (item.seasonId) {
      urls.push(
        buildImageUrl(baseUrl, item.seasonId, "Primary", {
          width: targetWidth,
          quality: 85
        })
      );
    }

    // 3. Series Primary Poster fallback without tag
    if (seriesId) {
      urls.push(
        buildImageUrl(baseUrl, seriesId, "Primary", {
          width: targetWidth,
          quality: 85
        })
      );
    }

    // 4. Episode Primary still with tag
    if (item.primaryImageTag) {
      urls.push(
        buildImageUrl(baseUrl, item.id, "Primary", {
          width: targetWidth,
          quality: 85,
          tag: item.primaryImageTag
        })
      );
    }

    // 5. Parent Series Backdrop
    const parentBackdropId = item.parentBackdropItemId || item.seriesId;
    if (parentBackdropId) {
      urls.push(
        buildImageUrl(baseUrl, parentBackdropId, "Backdrop", {
          width: targetWidth,
          quality: 80,
          tag: item.parentBackdropImageTag || item.backdropImageTag
        })
      );
    }

    return Array.from(new Set(urls.filter(Boolean)));
  }

  // For Movies, Series, BoxSets:
  // 1. Primary with tag
  if (item.primaryImageTag) {
    urls.push(
      buildImageUrl(baseUrl, item.id, "Primary", {
        width: targetWidth,
        quality: 85,
        tag: item.primaryImageTag
      })
    );
  }

  // 2. Thumb with tag
  if (item.thumbImageTag) {
    urls.push(
      buildImageUrl(baseUrl, item.id, "Thumb", {
        width: targetWidth,
        quality: 85,
        tag: item.thumbImageTag
      })
    );
  }

  // 3. Backdrop with tag
  if (item.backdropImageTag) {
    urls.push(
      buildImageUrl(baseUrl, item.id, "Backdrop", {
        width: targetWidth,
        quality: 80,
        tag: item.backdropImageTag
      })
    );
  }

  // 4. Primary fallback without tag
  urls.push(
    buildImageUrl(baseUrl, item.id, "Primary", {
      width: targetWidth,
      quality: 85
    })
  );

  return Array.from(new Set(urls.filter(Boolean)));
}

/**
 * Resolves the primary 2:3 vertical poster URL for an item.
 */
export function getMediaPosterUrl(
  baseUrl: string,
  item: MediaItem,
  targetWidth: number = 340
): string {
  const urls = getMediaPosterUrls(baseUrl, item, targetWidth);
  return urls.length > 0 ? urls[0] : "";
}

/**
 * Resolves an ordered list of candidate 16:9 horizontal thumbnail URLs for an item.
 * - For an Episode:
 *   1. Episode Still (Primary 16:9)
 *   2. Series Backdrop (16:9) with tag
 *   3. Series Poster (Primary 2:3) with tag
 *   4. Series Thumb (16:9) with tag
 *   5. Season Poster
 *   6. Series Backdrop fallback without tag
 *   7. Series Poster fallback without tag
 *   8. Episode Still fallback without tag
 * - For Movies & Series:
 *   1. Backdrop (16:9) with tag
 *   2. Thumb (16:9) with tag
 *   3. Primary with tag
 *   4. Fallbacks without tag
 */
export function getMediaThumbnailUrls(
  baseUrl: string,
  item: MediaItem,
  targetWidth: number = 440
): string[] {
  if (!baseUrl || !item) return [];

  const urls: string[] = [];

  if (item.type === "Episode") {
    // 1. Episode still is type "Primary" (16:9) with tag
    if (item.primaryImageTag) {
      urls.push(
        buildImageUrl(baseUrl, item.id, "Primary", {
          width: targetWidth,
          quality: 85,
          tag: item.primaryImageTag
        })
      );
    }

    // 2. Parent Series Backdrop with tag (16:9) - only if tag exists
    const seriesId = item.seriesId || item.parentId;
    const parentBackdropId = item.parentBackdropItemId || item.seriesId || item.parentId;
    const parentBackdropTag = item.parentBackdropImageTag || item.backdropImageTag;
    if (parentBackdropId && parentBackdropTag) {
      urls.push(
        buildImageUrl(baseUrl, parentBackdropId, "Backdrop", {
          width: targetWidth,
          quality: 80,
          tag: parentBackdropTag
        })
      );
    }

    // 3. Parent Series Primary Poster with tag (2:3)
    const seriesPosterTag = item.seriesPrimaryImageTag || item.parentPrimaryImageTag;
    if (seriesId && seriesPosterTag) {
      urls.push(
        buildImageUrl(baseUrl, seriesId, "Primary", {
          width: targetWidth,
          quality: 85,
          tag: seriesPosterTag
        })
      );
    }

    // 4. Parent Series Thumb with tag (16:9)
    const parentThumbId = item.parentThumbItemId || item.seriesId || item.parentId;
    const parentThumbTag = item.parentThumbImageTag || item.thumbImageTag;
    if (parentThumbId && parentThumbTag) {
      urls.push(
        buildImageUrl(baseUrl, parentThumbId, "Thumb", {
          width: targetWidth,
          quality: 85,
          tag: parentThumbTag
        })
      );
    }

    // 5. Season Primary Poster
    const seasonId = item.seasonId || item.parentId;
    if (seasonId) {
      urls.push(
        buildImageUrl(baseUrl, seasonId, "Primary", {
          width: targetWidth,
          quality: 85
        })
      );
    }

    // 6. Parent Backdrop fallback without tag
    if (parentBackdropId) {
      urls.push(
        buildImageUrl(baseUrl, parentBackdropId, "Backdrop", {
          width: targetWidth,
          quality: 80
        })
      );
    }

    // 7. Series Primary fallback without tag
    if (seriesId) {
      urls.push(
        buildImageUrl(baseUrl, seriesId, "Primary", {
          width: targetWidth,
          quality: 85
        })
      );
    }

    // 8. Episode Primary fallback without tag
    urls.push(
      buildImageUrl(baseUrl, item.id, "Primary", {
        width: targetWidth,
        quality: 85
      })
    );

    return Array.from(new Set(urls.filter(Boolean)));
  }

  // For Movies, Series, BoxSets:
  // 1. Backdrop (16:9 fanart) with tag
  if (item.backdropImageTag) {
    urls.push(
      buildImageUrl(baseUrl, item.id, "Backdrop", {
        width: targetWidth,
        quality: 80,
        tag: item.backdropImageTag
      })
    );
  }

  // 2. Thumb (16:9) with tag
  if (item.thumbImageTag) {
    urls.push(
      buildImageUrl(baseUrl, item.id, "Thumb", {
        width: targetWidth,
        quality: 85,
        tag: item.thumbImageTag
      })
    );
  }

  // 3. Primary with tag
  if (item.primaryImageTag) {
    urls.push(
      buildImageUrl(baseUrl, item.id, "Primary", {
        width: targetWidth,
        quality: 85,
        tag: item.primaryImageTag
      })
    );
  }

  // 4. Backdrop fallback without tag
  urls.push(
    buildImageUrl(baseUrl, item.id, "Backdrop", {
      width: targetWidth,
      quality: 80
    })
  );

  // 5. Primary fallback without tag
  urls.push(
    buildImageUrl(baseUrl, item.id, "Primary", {
      width: targetWidth,
      quality: 85
    })
  );

  return Array.from(new Set(urls.filter(Boolean)));
}

/**
 * Resolves the primary 16:9 horizontal thumbnail URL for an item.
 */
export function getMediaThumbnailUrl(
  baseUrl: string,
  item: MediaItem,
  targetWidth: number = 440
): string {
  const urls = getMediaThumbnailUrls(baseUrl, item, targetWidth);
  return urls.length > 0 ? urls[0] : "";
}


