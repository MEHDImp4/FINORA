import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MediaItem, MediaStreamInfo } from "../types/media";
import {
  selectInitialAudioTrack,
  selectInitialSubtitleTrack,
  normalizeLanguage
} from "../features/player/trackUtils";

export type SubtitleMode = "smart" | "always" | "off";

export interface SeriesPreference {
  audioLanguage?: string;
  subtitleLanguage?: string | null;
}

export interface PlaybackPreferences {
  preferredAudioLanguage: string; // ISO 639-1 code: "fr", "en", "ja", or "auto"
  preferredSubtitleLanguage: string; // "none", "fr", "en", "ja", etc.
  subtitleMode: SubtitleMode;
  seriesPreferences: Record<string, SeriesPreference>;
}

export const DEFAULT_PLAYBACK_PREFERENCES: PlaybackPreferences = {
  preferredAudioLanguage: "fr",
  preferredSubtitleLanguage: "fr",
  subtitleMode: "smart",
  seriesPreferences: {}
};

const STORAGE_KEY = "@finora_playback_preferences_v1";

interface PlaybackPreferencesState {
  preferences: PlaybackPreferences;
  isLoaded: boolean;
  loadPreferences: () => Promise<void>;
  setPreferredAudioLanguage: (lang: string) => Promise<void>;
  setPreferredSubtitleLanguage: (lang: string) => Promise<void>;
  setSubtitleMode: (mode: SubtitleMode) => Promise<void>;
  setSeriesPreference: (
    seriesId: string,
    pref: { audioLanguage?: string; subtitleLanguage?: string | null }
  ) => Promise<void>;
  resolveBestTracks: (item: MediaItem) => {
    initialAudioIndex?: number;
    initialSubtitleIndex: number | null;
  };
}

export const usePlaybackPreferencesStore = create<PlaybackPreferencesState>((set, get) => ({
  preferences: DEFAULT_PLAYBACK_PREFERENCES,
  isLoaded: false,

  loadPreferences: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({
          preferences: {
            ...DEFAULT_PLAYBACK_PREFERENCES,
            ...parsed,
            seriesPreferences: {
              ...DEFAULT_PLAYBACK_PREFERENCES.seriesPreferences,
              ...(parsed.seriesPreferences || {})
            }
          },
          isLoaded: true
        });
        return;
      }
    } catch {
      // Fallback
    }
    set({ preferences: DEFAULT_PLAYBACK_PREFERENCES, isLoaded: true });
  },

  setPreferredAudioLanguage: async (lang: string) => {
    const updated: PlaybackPreferences = {
      ...get().preferences,
      preferredAudioLanguage: lang
    };
    set({ preferences: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  },

  setPreferredSubtitleLanguage: async (lang: string) => {
    const updated: PlaybackPreferences = {
      ...get().preferences,
      preferredSubtitleLanguage: lang
    };
    set({ preferences: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  },

  setSubtitleMode: async (mode: SubtitleMode) => {
    const updated: PlaybackPreferences = {
      ...get().preferences,
      subtitleMode: mode
    };
    set({ preferences: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  },

  setSeriesPreference: async (seriesId: string, pref) => {
    if (!seriesId) return;
    const currentSeries = get().preferences.seriesPreferences[seriesId] || {};
    const updatedSeriesMap = {
      ...get().preferences.seriesPreferences,
      [seriesId]: {
        ...currentSeries,
        ...(pref.audioLanguage !== undefined ? { audioLanguage: pref.audioLanguage } : {}),
        ...(pref.subtitleLanguage !== undefined ? { subtitleLanguage: pref.subtitleLanguage } : {})
      }
    };

    const updated: PlaybackPreferences = {
      ...get().preferences,
      seriesPreferences: updatedSeriesMap
    };
    set({ preferences: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  },

  resolveBestTracks: (item: MediaItem) => {
    const { preferredAudioLanguage, preferredSubtitleLanguage, subtitleMode, seriesPreferences } =
      get().preferences;

    const audioStreams = item.mediaStreams?.filter((s) => s.type === "Audio") || [];
    const subtitleStreams = item.mediaStreams?.filter((s) => s.type === "Subtitle") || [];

    const seriesId = item.seriesId;
    const seriesPref = seriesId ? seriesPreferences[seriesId] : undefined;

    // 1. Resolve Audio Stream
    const matchedAudio = selectInitialAudioTrack(
      audioStreams,
      seriesPref?.audioLanguage,
      preferredAudioLanguage
    );

    const initialAudioIndex = matchedAudio?.index;
    const resolvedAudioLanguage = matchedAudio?.language;

    // 2. Resolve Subtitle Stream
    const matchedSubtitle = selectInitialSubtitleTrack(
      subtitleStreams,
      resolvedAudioLanguage,
      seriesPref?.subtitleLanguage,
      preferredSubtitleLanguage,
      subtitleMode
    );

    const initialSubtitleIndex = matchedSubtitle?.index !== undefined ? matchedSubtitle.index : null;

    return {
      initialAudioIndex,
      initialSubtitleIndex
    };
  }
}));

// Automatically trigger load upon module import
usePlaybackPreferencesStore.getState().loadPreferences();
