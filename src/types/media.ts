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
  index?: number;
  codec?: string;
  displayTitle?: string;
  language?: string;
  isExternal?: boolean;
  width?: number;
  height?: number;
  channels?: number;
  isDefault?: boolean;
}

export interface ChapterMarker {
  name: string;
  startPositionTicks: number;
  markerType?: "IntroStart" | "IntroEnd" | "CreditsStart" | "Chapter";
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
  chapters?: ChapterMarker[];
  container?: string;
  mediaSourceId?: string;
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
