import { useQuery } from "@tanstack/react-query";
import { mediaRepository } from "../core/repositories/mediaRepository";
import { MediaItem } from "../types/media";

export const searchKeys = {
  all: ["search"] as const,
  query: (userId: string, term: string, itemTypes?: string[]) =>
    [...searchKeys.all, userId, term.trim().toLowerCase(), itemTypes] as const
};

export function useSearchMedia(
  userId?: string,
  searchTerm: string = "",
  itemTypes?: string[]
) {
  const trimmedTerm = searchTerm.trim();

  return useQuery<MediaItem[]>({
    queryKey: searchKeys.query(userId || "", trimmedTerm, itemTypes),
    queryFn: () => mediaRepository.searchMedia(userId!, trimmedTerm, itemTypes),
    enabled: Boolean(userId && trimmedTerm.length >= 2),
    staleTime: 60 * 1000
  });
}
