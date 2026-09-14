import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { mediaRepository, GetItemsOptions } from "../core/repositories/mediaRepository";
import { MediaItem, MediaLibrary } from "../types/media";

export const mediaKeys = {
  all: ["media"] as const,
  libraries: (userId: string) => [...mediaKeys.all, "libraries", userId] as const,
  items: (userId: string, parentId?: string, options?: GetItemsOptions) =>
    [...mediaKeys.all, "items", userId, parentId, options] as const,
  resume: (userId: string, limit?: number) =>
    [...mediaKeys.all, "resume", userId, limit] as const,
  recentlyAdded: (userId: string, parentId?: string, limit?: number) =>
    [...mediaKeys.all, "recentlyAdded", userId, parentId, limit] as const,
  detail: (userId: string, itemId: string) =>
    [...mediaKeys.all, "detail", userId, itemId] as const,
  seasons: (seriesId: string, userId: string) =>
    [...mediaKeys.all, "seasons", seriesId, userId] as const,
  episodes: (seriesId: string, seasonId: string, userId: string) =>
    [...mediaKeys.all, "episodes", seriesId, seasonId, userId] as const,
  genres: (userId: string, parentId?: string) =>
    [...mediaKeys.all, "genres", userId, parentId] as const,
  watchlist: (userId: string, options?: GetItemsOptions) =>
    [...mediaKeys.all, "watchlist", userId, options] as const,
  similar: (userId: string, itemId: string, limit?: number) =>
    [...mediaKeys.all, "similar", userId, itemId, limit] as const
};

export function useLibraries(userId?: string) {
  return useQuery<MediaLibrary[]>({
    queryKey: mediaKeys.libraries(userId || ""),
    queryFn: () => mediaRepository.getLibraries(userId!),
    enabled: Boolean(userId)
  });
}

export function useLibraryItems(
  userId?: string,
  parentId?: string,
  options?: GetItemsOptions
) {
  return useQuery<MediaItem[]>({
    queryKey: mediaKeys.items(userId || "", parentId, options),
    queryFn: () => mediaRepository.getItems(userId!, { ...options, parentId }),
    enabled: Boolean(userId)
  });
}

/**
 * Paginated variant of {@link useLibraryItems}. Fetches the library in pages so a
 * very large library is not downloaded in a single request; `total` from the first
 * page is the server's real record count.
 */
export function useInfiniteLibraryItems(
  userId?: string,
  parentId?: string,
  options?: GetItemsOptions,
  pageSize: number = 100
) {
  return useInfiniteQuery({
    queryKey: [...mediaKeys.items(userId || "", parentId, options), "infinite", pageSize],
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      mediaRepository.getItemsPage(userId!, {
        ...options,
        parentId,
        limit: pageSize,
        startIndex: pageParam
      }),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.items.length < pageSize ? undefined : allPages.length * pageSize,
    enabled: Boolean(userId)
  });
}

export function useResumeItems(userId?: string, limit: number = 12) {
  return useQuery<MediaItem[]>({
    queryKey: mediaKeys.resume(userId || "", limit),
    queryFn: () => mediaRepository.getResumeItems(userId!, limit),
    enabled: Boolean(userId)
  });
}

export function useRecentlyAdded(userId?: string, parentId?: string, limit: number = 16) {
  return useQuery<MediaItem[]>({
    queryKey: mediaKeys.recentlyAdded(userId || "", parentId, limit),
    queryFn: () => mediaRepository.getRecentlyAdded(userId!, parentId, limit),
    enabled: Boolean(userId)
  });
}

export function useItemDetails(userId?: string, itemId?: string) {
  return useQuery<MediaItem>({
    queryKey: mediaKeys.detail(userId || "", itemId || ""),
    queryFn: () => mediaRepository.getItem(userId!, itemId!),
    enabled: Boolean(userId && itemId)
  });
}

export function useSeasons(seriesId?: string, userId?: string) {
  return useQuery<MediaItem[]>({
    queryKey: mediaKeys.seasons(seriesId || "", userId || ""),
    queryFn: () => mediaRepository.getSeasons(userId!, seriesId!),
    enabled: Boolean(seriesId && userId)
  });
}

export function useEpisodes(seriesId?: string, seasonId?: string, userId?: string) {
  return useQuery<MediaItem[]>({
    queryKey: mediaKeys.episodes(seriesId || "", seasonId || "", userId || ""),
    queryFn: () => mediaRepository.getEpisodes(userId!, seriesId!, seasonId),
    enabled: Boolean(seriesId && userId)
  });
}

export function useGenres(userId?: string, parentId?: string) {
  return useQuery<string[]>({
    queryKey: mediaKeys.genres(userId || "", parentId),
    queryFn: () => mediaRepository.getGenres(userId!, parentId),
    enabled: Boolean(userId),
    staleTime: 5 * 60 * 1000
  });
}

export function useWatchlistItems(
  userId?: string,
  options?: GetItemsOptions
) {
  return useQuery<MediaItem[]>({
    queryKey: mediaKeys.watchlist(userId || "", options),
    queryFn: () =>
      mediaRepository.getItems(userId!, {
        ...options,
        filters: ["IsFavorite"],
        isFavorite: true,
        includeItemTypes: options?.includeItemTypes || ["Movie", "Series", "BoxSet", "Episode"],
        sortBy: options?.sortBy || "DateCreated,SortName",
        sortOrder: options?.sortOrder || "Descending",
        recursive: true
      }),
    enabled: Boolean(userId)
  });
}

export function useSimilarItems(userId?: string, itemId?: string, limit: number = 12) {
  return useQuery<MediaItem[]>({
    queryKey: mediaKeys.similar(userId || "", itemId || "", limit),
    queryFn: () => mediaRepository.getSimilarItems(userId!, itemId!, limit),
    enabled: Boolean(userId && itemId)
  });
}

