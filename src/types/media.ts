export type MediaType =
  | "Movie"
  | "Series"
  | "Season"
  | "Episode"
  | "BoxSet"
  | "Folder"
  | "Unknown";

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  overview?: string;
  year?: number;
  runtimeMinutes?: number;
  communityRating?: number;
  genres: string[];
  backdropImageTag?: string;
  primaryImageTag?: string;
  logoImageTag?: string;
  blurhash?: string;
  playbackPositionTicks: number;
  totalTicks: number;
  playedPercentage: number;
  isPlayed: boolean;
  isFavorite: boolean;
  seriesId?: string;
  seriesName?: string;
  seasonId?: string;
  seasonIndex?: number;
  episodeIndex?: number;
}

export interface MediaLibrary {
  id: string;
  name: string;
  collectionType?: string;
  primaryImageTag?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  serverId: string;
  hasPassword?: boolean;
}
