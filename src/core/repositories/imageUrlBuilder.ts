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

export function getUserAvatarUrl(
  baseUrl: string,
  userId: string,
  tag?: string,
  targetWidth: number = 200
): string {
  if (!baseUrl || !userId) return "";
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const url = new URL(`${cleanBase}/Users/${userId}/Images/Primary`);
  if (targetWidth) {
    url.searchParams.append("maxWidth", String(targetWidth));
  }
  if (tag) {
    url.searchParams.append("tag", tag);
  }
  url.searchParams.append("quality", "85");
  return url.toString();
}

/**
 * Resolves an ordered list of candidate high-definition banner URLs for the Hero Banner.
 * Prioritizes official Primary posters (2:3 vertical key art, centered) in 1080p
 * over backdrops, avoiding random episode still frames.
 */
export function getHeroBannerUrls(
  baseUrl: string,
  item: MediaItem,
  targetWidth: number = 1080
): string[] {
  if (!baseUrl || !item) return [];

  const urls: string[] = [];
  const parentId = item.parentBackdropItemId || item.seriesId || item.parentId;

  if (item.type === "Episode") {
    // 1. Official Series Primary Poster with tag (1080p key art)
    const seriesPosterTag = item.seriesPrimaryImageTag || item.parentPrimaryImageTag;
    if (parentId && seriesPosterTag) {
      urls.push(getPosterUrl(baseUrl, parentId, seriesPosterTag, targetWidth));
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

    // 3. Series Primary fallback without tag
    if (parentId) {
      urls.push(getPosterUrl(baseUrl, parentId, undefined, targetWidth));
    }

    // 4. Parent Series Backdrop with tag
    const parentBackdropTag = item.parentBackdropImageTag || item.backdropImageTag;
    if (parentId && parentBackdropTag) {
      urls.push(getBackdropUrl(baseUrl, parentId, parentBackdropTag, Math.max(targetWidth, 1280)));
    }

    // 5. Parent Series Thumb with tag
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

    // 6. Parent Backdrop fallback without tag
    if (parentId) {
      urls.push(getBackdropUrl(baseUrl, parentId, undefined, Math.max(targetWidth, 1280)));
    }

    return Array.from(new Set(urls.filter(Boolean)));
  }

  // For Movies, Series, BoxSets:
  // 1. Official Primary Poster with tag (1080p key art)
  if (item.primaryImageTag) {
    urls.push(getPosterUrl(baseUrl, item.id, item.primaryImageTag, targetWidth));
  }

  // 2. Primary fallback without tag
  urls.push(getPosterUrl(baseUrl, item.id, undefined, targetWidth));

  // 3. Official Backdrop with tag
  if (item.backdropImageTag) {
    urls.push(getBackdropUrl(baseUrl, item.id, item.backdropImageTag, Math.max(targetWidth, 1280)));
  }

  // 4. Thumb with tag
  if (item.thumbImageTag) {
    urls.push(
      buildImageUrl(baseUrl, item.id, "Thumb", {
        width: targetWidth,
        quality: 85,
        tag: item.thumbImageTag
      })
    );
  }

  // 5. Backdrop fallback without tag
  urls.push(getBackdropUrl(baseUrl, item.id, undefined, Math.max(targetWidth, 1280)));

  return Array.from(new Set(urls.filter(Boolean)));
}

/**
 * Resolves an ordered list of candidate 2:3 vertical poster URLs for an item.
 * For an Episode, it prefers the Series Poster, falling back to Season Poster,
 * Series Backdrop, and only as absolute last resort the Episode still.
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

    // 4. Parent Series Backdrop
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

    // 5. Episode Primary still with tag (last resort)
    if (item.primaryImageTag) {
      urls.push(
        buildImageUrl(baseUrl, item.id, "Primary", {
          width: targetWidth,
          quality: 85,
          tag: item.primaryImageTag
        })
      );
    }

    return Array.from(new Set(urls.filter(Boolean)));
  }

  if (item.type === "Season") {
    // 1. Season Primary with tag
    if (item.primaryImageTag) {
      urls.push(
        buildImageUrl(baseUrl, item.id, "Primary", {
          width: targetWidth,
          quality: 85,
          tag: item.primaryImageTag
        })
      );
    }

    // 2. Series Primary with tag
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

    // 3. Season Primary fallback without tag
    urls.push(
      buildImageUrl(baseUrl, item.id, "Primary", {
        width: targetWidth,
        quality: 85
      })
    );

    // 4. Series Primary fallback without tag
    if (seriesId) {
      urls.push(
        buildImageUrl(baseUrl, seriesId, "Primary", {
          width: targetWidth,
          quality: 85
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
 *   1. Episode Primary still frame with tag (16:9 thumbnail)
 *   2. Episode Thumb with tag (16:9)
 *   3. Episode Primary still without tag
 *   4. Parent Series Backdrop (16:9 landscape fanart) with tag
 *   5. Parent Series Thumb (16:9) with tag
 *   6. Parent Backdrop fallback without tag
 *   7. Season Primary Poster fallback
 *   8. Series Primary Poster fallback
 * - For Movies & Series:
 *   1. Primary Poster with tag
 *   2. Backdrop (16:9) with tag
 *   3. Thumb (16:9) with tag
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
    // 1. Episode's own Primary still frame with tag (16:9 thumbnail)
    if (item.primaryImageTag) {
      urls.push(
        buildImageUrl(baseUrl, item.id, "Primary", {
          width: targetWidth,
          quality: 85,
          tag: item.primaryImageTag
        })
      );
    }

    // 2. Episode's own Thumb with tag (16:9)
    if (item.thumbImageTag) {
      urls.push(
        buildImageUrl(baseUrl, item.id, "Thumb", {
          width: targetWidth,
          quality: 85,
          tag: item.thumbImageTag
        })
      );
    }

    // 3. Episode Primary fallback without tag
    urls.push(
      buildImageUrl(baseUrl, item.id, "Primary", {
        width: targetWidth,
        quality: 85
      })
    );

    // 4. Parent Series Backdrop with tag (16:9 landscape fallback)
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

    // 5. Parent Series Thumb with tag (16:9)
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

    // 6. Parent Backdrop fallback without tag
    if (parentBackdropId) {
      urls.push(
        buildImageUrl(baseUrl, parentBackdropId, "Backdrop", {
          width: targetWidth,
          quality: 80
        })
      );
    }

    // 7. Season Primary Poster fallback
    const seasonId = item.seasonId || item.parentId;
    if (seasonId) {
      urls.push(
        buildImageUrl(baseUrl, seasonId, "Primary", {
          width: targetWidth,
          quality: 85
        })
      );
    }

    // 8. Parent Series Primary Poster with tag (2:3) fallback
    const seriesId = item.seriesId || item.parentId;
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

    // 9. Series Primary fallback without tag
    if (seriesId) {
      urls.push(
        buildImageUrl(baseUrl, seriesId, "Primary", {
          width: targetWidth,
          quality: 85
        })
      );
    }

    return Array.from(new Set(urls.filter(Boolean)));
  }

  // For Movies, Series, BoxSets:
  // 1. Primary Poster with tag (official poster)
  if (item.primaryImageTag) {
    urls.push(
      buildImageUrl(baseUrl, item.id, "Primary", {
        width: targetWidth,
        quality: 85,
        tag: item.primaryImageTag
      })
    );
  }

  // 2. Backdrop (16:9 fanart) with tag
  if (item.backdropImageTag) {
    urls.push(
      buildImageUrl(baseUrl, item.id, "Backdrop", {
        width: targetWidth,
        quality: 80,
        tag: item.backdropImageTag
      })
    );
  }

  // 3. Thumb (16:9) with tag
  if (item.thumbImageTag) {
    urls.push(
      buildImageUrl(baseUrl, item.id, "Thumb", {
        width: targetWidth,
        quality: 85,
        tag: item.thumbImageTag
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

  // 5. Backdrop fallback without tag
  urls.push(
    buildImageUrl(baseUrl, item.id, "Backdrop", {
      width: targetWidth,
      quality: 80
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


