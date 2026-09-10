export type MediaType =
  | "Movie"
  | "Series"
  | "Season"
  | "Episode"
  | "BoxSet"
  | "Folder"
  | "Unknown";

export interface Person {
  id: string;
  name: string;
  role?: string;
  type?: string;
  primaryImageTag?: string;
}

export interface MediaStreamInfo {
  type: "Video" | "Audio" | "Subtitle";
  codec?: string;
  displayTitle?: string;
  width?: number;
  height?: number;
  channels?: number;
  isDefault?: boolean;
}

export interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  overview?: string;
  year?: number;
  runtimeMinutes?: number;
  communityRating?: number;
  officialRating?: string;
  tagline?: string;
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
  people?: Person[];
  mediaStreams?: MediaStreamInfo[];
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
