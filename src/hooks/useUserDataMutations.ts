import { useMutation, useQueryClient } from "@tanstack/react-query";
import { userDataRepository } from "../core/repositories/userDataRepository";
import { mediaKeys } from "./useMediaQueries";
import { MediaItem } from "../types/media";

export interface ToggleFavoriteParams {
  itemId: string;
  isFavorite: boolean;
}

export function useToggleFavorite(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itemId, isFavorite }: ToggleFavoriteParams) =>
      userDataRepository.setFavorite(userId, itemId, isFavorite),

    onMutate: async ({ itemId, isFavorite }) => {
      // Cancel outgoing queries for this item to avoid overwriting optimistic update
      const detailKey = mediaKeys.detail(userId, itemId);
      await queryClient.cancelQueries({ queryKey: detailKey });

      // Snapshot previous value
      const previousItem = queryClient.getQueryData<MediaItem>(detailKey);

      // Optimistically update item detail
      if (previousItem) {
        queryClient.setQueryData<MediaItem>(detailKey, {
          ...previousItem,
          isFavorite
        });
      }

      return { previousItem };
    },

    onError: (_err, { itemId }, context) => {
      // Rollback on failure
      if (context?.previousItem) {
        queryClient.setQueryData(mediaKeys.detail(userId, itemId), context.previousItem);
      }
    },

    onSettled: (_data, _err, { itemId }) => {
      // Revalidate to ensure server truth
      queryClient.invalidateQueries({ queryKey: mediaKeys.detail(userId, itemId) });
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
