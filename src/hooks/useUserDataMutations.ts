import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userDataRepository } from "../core/repositories/userDataRepository";
import { mediaKeys } from "./useMediaQueries";
import { MediaItem } from "../types/media";

export interface ToggleFavoriteParams {
  itemId: string;
  isFavorite: boolean;
  item?: MediaItem;
}

export function useToggleFavorite(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, isFavorite }: ToggleFavoriteParams) =>
      userDataRepository.setFavorite(userId, itemId, isFavorite),

    onMutate: async ({ itemId, isFavorite, item }) => {
      const detailKey = mediaKeys.detail(userId, itemId);
      const watchlistQueryFilter = { queryKey: [...mediaKeys.all, "watchlist"] as const };

      // Cancel outgoing queries to avoid overwriting optimistic updates
      await queryClient.cancelQueries({ queryKey: detailKey });
      await queryClient.cancelQueries(watchlistQueryFilter);

      // Snapshot previous values
      const previousDetail = queryClient.getQueryData<MediaItem>(detailKey);
      const previousWatchlists = queryClient.getQueriesData<MediaItem[]>(watchlistQueryFilter);

      const targetItem: MediaItem | undefined =
        item || previousDetail || queryClient.getQueryData<MediaItem>(detailKey);

      // 1. Optimistically update item detail
      if (targetItem) {
        queryClient.setQueryData<MediaItem>(detailKey, {
          ...targetItem,
          isFavorite
        });
      }

      // 2. Optimistically update all watchlist caches
      queryClient.setQueriesData<MediaItem[]>(watchlistQueryFilter, (old = []) => {
        if (!Array.isArray(old)) return old;
        if (isFavorite) {
          if (old.some((i) => i.id === itemId)) {
            return old.map((i) => (i.id === itemId ? { ...i, isFavorite: true } : i));
          }
          if (targetItem) {
            return [{ ...targetItem, isFavorite: true }, ...old];
          }
          return old;
        } else {
          return old.filter((i) => i.id !== itemId);
        }
      });

      // 3. Optimistically update any media lists (hero pool, recents, resume)
      queryClient.setQueriesData<MediaItem[]>({ queryKey: mediaKeys.all }, (old) => {
        if (!Array.isArray(old)) return old;
        return old.map((i) => (i.id === itemId ? { ...i, isFavorite } : i));
      });

      return { previousDetail, previousWatchlists };
    },

    onError: (_err, { itemId }, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(mediaKeys.detail(userId, itemId), context.previousDetail);
      }
      if (context?.previousWatchlists) {
        for (const [key, data] of context.previousWatchlists) {
          queryClient.setQueryData(key, data);
        }
      }
    },

    onSettled: (_data, _err, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.detail(userId, itemId) });
      queryClient.invalidateQueries({ queryKey: [...mediaKeys.all, "watchlist"] });
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
    }
  });
}

export function useMarkPlayed(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, played }: { itemId: string; played: boolean }) =>
      played
        ? userDataRepository.markPlayed(userId, itemId)
        : userDataRepository.markUnplayed(userId, itemId),

    onSettled: (_data, _err, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: mediaKeys.detail(userId, itemId) });
      queryClient.invalidateQueries({ queryKey: mediaKeys.resume(userId) });
      queryClient.invalidateQueries({ queryKey: mediaKeys.all });
    }
  });
}
