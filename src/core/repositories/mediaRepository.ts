import { HttpClient } from "../network/httpClient";
import { jellyfinClient, JellyfinClient } from "../jellyfin/jellyfinClient";
import { MediaItem, MediaLibrary } from "../../types/media";
import { mapJellyfinItemToMediaItem, mapJellyfinViewToLibrary } from "./mediaMapper";
import { FinoraError } from "../errors";

export interface GetItemsOptions {
  parentId?: string;
  includeItemTypes?: string[];
  sortBy?: string;
  sortOrder?: "Ascending" | "Descending";
  limit?: number;
  startIndex?: number;
  genres?: string[];
  filters?: string[];
  isFavorite?: boolean;
  recursive?: boolean;
}

const MEDIA_FIELDS =
  "Overview,Genres,ProductionYear,RunTimeTicks,CommunityRating,ImageTags,BackdropImageTags,ParentBackdropImageTags,ParentBackdropItemId,SeriesPrimaryImageTag,ParentPrimaryImageTag,ParentThumbImageTag,ParentThumbItemId,ParentId,PrimaryImageAspectRatio,ImageBlurHashes,UserData,ParentIndexNumber,IndexNumber,SeriesId,SeriesName,SeasonId,LocationType,MediaSources,ChildCount,RecursiveItemCount,MediaSourceCount,ItemCounts";

export function isValidMediaDto(dto: any): boolean {
  if (!dto) return false;
  if (dto.Type === "Person" || dto.LocationType === "Virtual" || dto.IsMissing === true) {
    return false;
  }
  // Items with explicit 0 episode count (empty seasons, series, or collections)
  if (dto.ItemCounts) {
    if (typeof dto.ItemCounts.EpisodeCount === "number" && dto.ItemCounts.EpisodeCount === 0) {
      return false;
    }
    if (typeof dto.ItemCounts.ChildCount === "number" && dto.ItemCounts.ChildCount === 0) {
      return false;
    }
  }
  if (dto.EpisodeCount !== undefined && dto.EpisodeCount === 0) {
    return false;
  }
  // Series without any episodes or seasons (deleted series or ghost metadata)
  if (dto.Type === "Series") {
    if (dto.RecursiveItemCount !== undefined && dto.RecursiveItemCount === 0) {
      return false;
    }
    if (dto.ChildCount !== undefined && dto.ChildCount === 0) {
      return false;
    }
  }
  // Season without episodes
  if (dto.Type === "Season") {
    if (dto.ChildCount !== undefined && dto.ChildCount === 0) {
      return false;
    }
  }
  // Movie or Episode with explicit 0 media sources (unplayable / deleted file)
  if (dto.Type === "Movie" || dto.Type === "Episode") {
    if (dto.MediaSourceCount !== undefined && dto.MediaSourceCount === 0) {
      return false;
    }
  }
  return true;
}

export class MediaRepository {
  private client: JellyfinClient;
  private lastLibraryRefreshTime = 0;

  constructor(client: JellyfinClient = jellyfinClient) {
    this.client = client;
  }

  private getHttp(customClient?: HttpClient): HttpClient {
    return customClient || this.client.getHttpClient();
  }

  public async refreshLibrary(customClient?: HttpClient): Promise<void> {
    const now = Date.now();
    // Throttled to at most once per 30s to stay optimal and prevent server load
    if (now - this.lastLibraryRefreshTime < 30000) {
      return;
    }
    this.lastLibraryRefreshTime = now;

    try {
      const http = this.getHttp(customClient);
      await http.request(`/Library/Refresh`, { method: "POST" });
    } catch {
      // Ignored for non-admin users or transient network errors
    }
  }

  public async getLibraries(userId: string, customClient?: HttpClient): Promise<MediaLibrary[]> {
    if (!userId) {
      throw new FinoraError("User ID is required to fetch libraries", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    const response = await http.request<{ Items?: any[] }>(`/Users/${userId}/Views`);
    const items = response?.Items || [];
    return items.map(mapJellyfinViewToLibrary);
  }

  public async getItems(
    userId: string,
    options: GetItemsOptions = {},
    customClient?: HttpClient
  ): Promise<MediaItem[]> {
    if (!userId) {
      throw new FinoraError("User ID is required to fetch items", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    const params: Record<string, string | number | boolean | undefined> = {
      ParentId: options.parentId,
      SortBy: options.sortBy || "SortName",
      SortOrder: options.sortOrder || "Ascending",
      Limit: options.limit,
      StartIndex: options.startIndex,
      Recursive: options.recursive ?? true,
      Fields: MEDIA_FIELDS,
      IsMissing: false,
      ExcludeLocationTypes: "Virtual"
    };

    if (options.includeItemTypes && options.includeItemTypes.length > 0) {
      params.IncludeItemTypes = options.includeItemTypes.join(",");
    }

    if (options.filters && options.filters.length > 0) {
      params.Filters = options.filters.join(",");
    }

    if (options.isFavorite !== undefined) {
      params.IsFavorite = options.isFavorite;
    }

    if (options.genres && options.genres.length > 0) {
      params.Genres = options.genres.join(",");
    }

    const response = await http.request<{ Items?: any[] }>(`/Users/${userId}/Items`, {
      params
    });

    const items = response?.Items || [];
    return items
      .filter(isValidMediaDto)
      .map(mapJellyfinItemToMediaItem);
  }

  public async getResumeItems(
    userId: string,
    limit: number = 12,
    customClient?: HttpClient
  ): Promise<MediaItem[]> {
    if (!userId) {
      throw new FinoraError("User ID is required to fetch resume items", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    const params: Record<string, string | number | boolean | undefined> = {
      UserId: userId,
      Limit: limit,
      Fields: MEDIA_FIELDS,
      EnableImageTypes: "Primary,Backdrop,Thumb"
    };

    const response = await http.request<{ Items?: any[] }>(`/UserItems/Resume`, {
      params
    });

    const items = response?.Items || [];
    return items
      .filter(isValidMediaDto)
      .map(mapJellyfinItemToMediaItem);
  }

  public async getRecentlyAdded(
    userId: string,
    parentId?: string,
    limit: number = 16,
    customClient?: HttpClient
  ): Promise<MediaItem[]> {
    if (!userId) {
      throw new FinoraError("User ID is required to fetch latest items", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    const params: Record<string, string | number | boolean | undefined> = {
      ParentId: parentId,
      Limit: limit,
      Fields: MEDIA_FIELDS,
      EnableImageTypes: "Primary,Backdrop,Thumb",
      GroupItems: true,
      IsMissing: false
    };

    const response = await http.request<any[]>(`/Users/${userId}/Items/Latest`, {
      params
    });

    const items = Array.isArray(response) ? response : [];
    return items
      .filter(isValidMediaDto)
      .map(mapJellyfinItemToMediaItem);
  }

  public async getItem(
    userId: string,
    itemId: string,
    customClient?: HttpClient
  ): Promise<MediaItem> {
    if (!userId || !itemId) {
      throw new FinoraError("Both userId and itemId are required", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    const dto = await http.request<any>(`/Users/${userId}/Items/${itemId}`, {
      params: {
        Fields: `${MEDIA_FIELDS},OfficialRating,Taglines,People,MediaStreams,MediaSources`
      }
    });
    return mapJellyfinItemToMediaItem(dto);
  }

  public async getSeasons(
    userId: string,
    seriesId: string,
    customClient?: HttpClient
  ): Promise<MediaItem[]> {
    if (!userId || !seriesId) {
      throw new FinoraError("Both userId and seriesId are required", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    const response = await http.request<{ Items?: any[] }>(`/Shows/${seriesId}/Seasons`, {
      params: {
        UserId: userId,
        IsMissing: false,
        Fields:
          "Overview,ProductionYear,CommunityRating,ImageTags,BackdropImageTags,ImageBlurHashes,UserData,ItemCounts,LocationType"
      }
    });

    const items = response?.Items || [];
    return items
      .filter(isValidMediaDto)
      .map(mapJellyfinItemToMediaItem);
  }

  public async getEpisodes(
    userId: string,
    seriesId: string,
    seasonId?: string,
    customClient?: HttpClient
  ): Promise<MediaItem[]> {
    if (!userId || !seriesId) {
      throw new FinoraError("Both userId and seriesId are required", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    const params: Record<string, string | number | boolean | undefined> = {
      UserId: userId,
      SeasonId: seasonId,
      IsMissing: false,
      Fields: MEDIA_FIELDS,
      EnableImageTypes: "Primary,Backdrop,Thumb"
    };

    const response = await http.request<{ Items?: any[] }>(`/Shows/${seriesId}/Episodes`, {
      params
    });

    const items = response?.Items || [];
    return items
      .filter(isValidMediaDto)
      .map(mapJellyfinItemToMediaItem);
  }

  public async searchMedia(
    userId: string,
    searchTerm: string,
    itemTypes?: string[],
    customClient?: HttpClient
  ): Promise<MediaItem[]> {
    if (!userId) {
      throw new FinoraError("User ID is required to search media", "INVALID_PARAMS");
    }

    const trimmed = searchTerm ? searchTerm.trim() : "";
    if (!trimmed) {
      return [];
    }

    const http = this.getHttp(customClient);
    const validTypes = itemTypes && itemTypes.length > 0
      ? itemTypes.filter((t) => t !== "Person")
      : ["Movie", "Series", "BoxSet"];

    const params: Record<string, string | number | boolean | undefined> = {
      SearchTerm: trimmed,
      Recursive: true,
      Limit: 50,
      IsMissing: false,
      ExcludeLocationTypes: "Virtual",
      ExcludeItemTypes: "Person",
      IncludeItemTypes: validTypes.join(","),
      Fields: MEDIA_FIELDS,
      EnableImageTypes: "Primary,Backdrop,Thumb"
    };

    const response = await http.request<{ Items?: any[] }>(`/Users/${userId}/Items`, {
      params
    });

    const items = response?.Items || [];
    return items
      .filter(isValidMediaDto)
      .map(mapJellyfinItemToMediaItem);
  }

  public async getGenres(
    userId: string,
    parentId?: string,
    customClient?: HttpClient
  ): Promise<string[]> {
    if (!userId) {
      throw new FinoraError("User ID is required to fetch genres", "INVALID_PARAMS");
    }

    const http = this.getHttp(customClient);
    const params: Record<string, string | undefined> = {
      UserId: userId,
      ParentId: parentId
    };

    const response = await http.request<{ Items?: Array<{ Name?: string }> }>(`/Genres`, {
      params
    });

    const items = response?.Items || [];
    return items.map((g) => g.Name || "").filter(Boolean);
  }
}

export const mediaRepository = new MediaRepository();
