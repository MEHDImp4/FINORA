import { MediaItem, MediaLibrary, MediaType } from "../../types/media";

export function mapJellyfinType(typeString?: string): MediaType {
  switch (typeString) {
    case "Movie":
      return "Movie";
    case "Series":
      return "Series";
    case "Season":
      return "Season";
    case "Episode":
      return "Episode";
    case "BoxSet":
      return "BoxSet";
    case "Folder":
      return "Folder";
    default:
      return "Unknown";
  }
}

export function mapJellyfinItemToMediaItem(dto: any): MediaItem {
  if (!dto) {
    throw new Error("Cannot map null or undefined Jellyfin item");
  }

  // Calculate ticks to minutes (10,000,000 ticks per second = 600,000,000 ticks per minute)
  const totalTicks = typeof dto.RunTimeTicks === "number" ? dto.RunTimeTicks : 0;
  const runtimeMinutes =
    totalTicks > 0 ? Math.round(totalTicks / (10000 * 1000 * 60)) : undefined;

  const userData = dto.UserData || {};
  const playbackPositionTicks =
    typeof userData.PlaybackPositionTicks === "number" ? userData.PlaybackPositionTicks : 0;
  const isPlayed = Boolean(userData.Played);
  const isFavorite = Boolean(userData.IsFavorite);

  let playedPercentage = 0;
  if (isPlayed) {
    playedPercentage = 100;
  } else if (totalTicks > 0 && playbackPositionTicks > 0) {
    playedPercentage = Math.min(100, Math.round((playbackPositionTicks / totalTicks) * 100));
  }

  // Extract primary or backdrop blurhash if present
  let blurhash: string | undefined = undefined;
  if (dto.ImageBlurHashes) {
    if (dto.ImageBlurHashes.Primary) {
      const primaryKeys = Object.keys(dto.ImageBlurHashes.Primary);
      if (primaryKeys.length > 0) {
        blurhash = dto.ImageBlurHashes.Primary[primaryKeys[0]];
      }
    }
    if (!blurhash && dto.ImageBlurHashes.Backdrop) {
      const backdropKeys = Object.keys(dto.ImageBlurHashes.Backdrop);
      if (backdropKeys.length > 0) {
        blurhash = dto.ImageBlurHashes.Backdrop[backdropKeys[0]];
      }
    }
  }

  // Extract backdrop image tag
  let backdropImageTag: string | undefined = undefined;
  if (Array.isArray(dto.BackdropImageTags) && dto.BackdropImageTags.length > 0) {
    backdropImageTag = dto.BackdropImageTags[0];
  } else if (dto.ImageTags && dto.ImageTags.Backdrop) {
    backdropImageTag = dto.ImageTags.Backdrop;
  }

  const primaryImageTag = dto.ImageTags?.Primary;
  const logoImageTag = dto.ImageTags?.Logo;

  return {
    id: String(dto.Id || ""),
    name: String(dto.Name || "Untitled"),
    type: mapJellyfinType(dto.Type),
    overview: dto.Overview || undefined,
    year: typeof dto.ProductionYear === "number" ? dto.ProductionYear : undefined,
    runtimeMinutes,
    communityRating:
      typeof dto.CommunityRating === "number" ? Math.round(dto.CommunityRating * 10) / 10 : undefined,
    genres: Array.isArray(dto.Genres) ? dto.Genres : [],
    backdropImageTag,
    primaryImageTag,
    logoImageTag,
    blurhash,
    playbackPositionTicks,
    totalTicks,
    playedPercentage,
    isPlayed,
    isFavorite,
    seriesId: dto.SeriesId || undefined,
    seriesName: dto.SeriesName || undefined,
    seasonId: dto.SeasonId || undefined,
    seasonIndex: typeof dto.ParentIndexNumber === "number" ? dto.ParentIndexNumber : undefined,
    episodeIndex: typeof dto.IndexNumber === "number" ? dto.IndexNumber : undefined
  };
}

export function mapJellyfinViewToLibrary(dto: any): MediaLibrary {
  if (!dto) {
    throw new Error("Cannot map null or undefined Jellyfin view");
  }

  return {
    id: String(dto.Id || ""),
    name: String(dto.Name || "Library"),
    collectionType: dto.CollectionType || undefined,
    primaryImageTag: dto.ImageTags?.Primary
  };
}
