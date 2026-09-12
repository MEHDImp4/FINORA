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
  recursive?: boolean;
}

const MEDIA_FIELDS =
  "Overview,Genres,ProductionYear,RunTimeTicks,CommunityRating,ImageTags,BackdropImageTags,ParentBackdropImageTags,ParentBackdropItemId,SeriesPrimaryImageTag,ParentPrimaryImageTag,ParentThumbImageTag,ParentThumbItemId,ParentId,PrimaryImageAspectRatio,ImageBlurHashes,UserData,ParentIndexNumber,IndexNumber,SeriesId,SeriesName,SeasonId,LocationType,MediaSources";

export class MediaRepository {
  private client: JellyfinClient;

  constructor(client: JellyfinClient = jellyfinClient) {
    this.client = client;
  }

  private getHttp(customClient?: HttpClient): HttpClient {
    return customClient || this.client.getHttpClient();
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

    if (options.genres && options.genres.length > 0) {
      params.Genres = options.genres.join(",");
    }

    const response = await http.request<{ Items?: any[] }>(`/Users/${userId}/Items`, {
      params
    });

    const items = response?.Items || [];
    return items
      .filter((dto) => dto.LocationType !== "Virtual" && !dto.IsMissing)
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
      .filter((dto) => dto.LocationType !== "Virtual" && !dto.IsMissing)
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
      .filter((dto) => dto.LocationType !== "Virtual" && !dto.IsMissing)
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
      .filter((dto) => {
        if (dto.LocationType === "Virtual" || dto.IsMissing) {
          return false;
        }
        if (
          dto.ItemCounts &&
          typeof dto.ItemCounts.EpisodeCount === "number" &&
          dto.ItemCounts.EpisodeCount === 0
        ) {
          return false;
        }
        return true;
      })
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
      .filter((dto) => dto.LocationType !== "Virtual" && !dto.IsMissing)
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
    const params: Record<string, string | number | boolean | undefined> = {
      SearchTerm: trimmed,
      Recursive: true,
      Limit: 50,
      IsMissing: false,
      ExcludeLocationTypes: "Virtual",
      Fields: MEDIA_FIELDS,
      EnableImageTypes: "Primary,Backdrop,Thumb"
    };

    if (itemTypes && itemTypes.length > 0) {
      params.IncludeItemTypes = itemTypes.join(",");
    }

    const response = await http.request<{ Items?: any[] }>(`/Users/${userId}/Items`, {
      params
    });

    const items = response?.Items || [];
    return items
      .filter((dto) => dto.LocationType !== "Virtual" && !dto.IsMissing)
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
