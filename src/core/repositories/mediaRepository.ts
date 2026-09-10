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
      Fields: "Overview,Genres,ProductionYear,RunTimeTicks,CommunityRating,ImageTags,BackdropImageTags,ImageBlurHashes,UserData,ParentIndexNumber,IndexNumber"
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
    return items.map(mapJellyfinItemToMediaItem);
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
      Limit: limit,
      Fields: "Overview,Genres,ProductionYear,RunTimeTicks,CommunityRating,ImageTags,BackdropImageTags,ImageBlurHashes,UserData,ParentIndexNumber,IndexNumber",
      EnableImageTypes: "Primary,Backdrop,Thumb"
    };

    const response = await http.request<{ Items?: any[] }>(`/UserItems/Resume`, {
      params
    });

    const items = response?.Items || [];
    return items.map(mapJellyfinItemToMediaItem);
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
      Fields: "Overview,Genres,ProductionYear,RunTimeTicks,CommunityRating,ImageTags,BackdropImageTags,ImageBlurHashes,UserData,ParentIndexNumber,IndexNumber",
      EnableImageTypes: "Primary,Backdrop,Thumb"
    };

    const response = await http.request<any[]>(`/Users/${userId}/Items/Latest`, {
      params
    });

    const items = Array.isArray(response) ? response : [];
    return items.map(mapJellyfinItemToMediaItem);
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
        Fields:
          "Overview,Genres,ProductionYear,RunTimeTicks,CommunityRating,OfficialRating,Taglines,People,MediaStreams,ImageTags,BackdropImageTags,ImageBlurHashes,UserData,ParentIndexNumber,IndexNumber"
      }
    });
    return mapJellyfinItemToMediaItem(dto);
  }
}

export const mediaRepository = new MediaRepository();
