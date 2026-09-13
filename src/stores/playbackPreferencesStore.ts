import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { MediaItem, MediaStreamInfo } from "../types/media";
import {
  selectInitialAudioTrack,
  selectInitialSubtitleTrack,
  normalizeLanguage
} from "../features/player/trackUtils";

import { DownloadQuality } from "../features/offline/downloadQuality";
import { hapticService } from "../core/feedback/hapticService";

export type SubtitleMode = "smart" | "always" | "off";

export interface SeriesPreference {
  audioLanguage?: string;
  subtitleLanguage?: string | null;
}

export interface PlaybackPreferences {
  preferredAudioLanguage: string; // ISO 639-1 code: "fr", "en", "ja", or "auto"
  preferredSubtitleLanguage: string; // "none", "fr", "en", "ja", etc.
  subtitleMode: SubtitleMode;
  autoSkipIntro: boolean;
  playbackSpeed: number; // 1.0, 1.25, 1.5, etc.
  downloadWifiOnly: boolean;
  defaultDownloadQuality: DownloadQuality;
  hapticsEnabled: boolean;
  seriesPreferences: Record<string, SeriesPreference>;
}

export const DEFAULT_PLAYBACK_PREFERENCES: PlaybackPreferences = {
  preferredAudioLanguage: "fr",
  preferredSubtitleLanguage: "fr",
  subtitleMode: "smart",
  autoSkipIntro: true,
  playbackSpeed: 1.0,
  downloadWifiOnly: true,
  defaultDownloadQuality: "original",
  hapticsEnabled: true,
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
  setAutoSkipIntro: (enabled: boolean) => Promise<void>;
  setPlaybackSpeed: (speed: number) => Promise<void>;
  setDownloadWifiOnly: (enabled: boolean) => Promise<void>;
  setDefaultDownloadQuality: (quality: DownloadQuality) => Promise<void>;
  setHapticsEnabled: (enabled: boolean) => Promise<void>;
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
        const resolved = {
          ...DEFAULT_PLAYBACK_PREFERENCES,
          ...parsed,
          seriesPreferences: {
            ...DEFAULT_PLAYBACK_PREFERENCES.seriesPreferences,
            ...(parsed.seriesPreferences || {})
          }
        };
        if (typeof resolved.hapticsEnabled === "boolean") {
          hapticService.setEnabled(resolved.hapticsEnabled);
        }
        set({
          preferences: resolved,
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

  setAutoSkipIntro: async (enabled: boolean) => {
    const updated: PlaybackPreferences = {
      ...get().preferences,
      autoSkipIntro: enabled
    };
    set({ preferences: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  },

  setPlaybackSpeed: async (speed: number) => {
    const updated: PlaybackPreferences = {
      ...get().preferences,
      playbackSpeed: speed
    };
    set({ preferences: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  },

  setDownloadWifiOnly: async (enabled: boolean) => {
    const updated: PlaybackPreferences = {
      ...get().preferences,
      downloadWifiOnly: enabled
    };
    set({ preferences: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  },

  setDefaultDownloadQuality: async (quality: DownloadQuality) => {
    const updated: PlaybackPreferences = {
      ...get().preferences,
      defaultDownloadQuality: quality
    };
    set({ preferences: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  },

  setHapticsEnabled: async (enabled: boolean) => {
    hapticService.setEnabled(enabled);
    const updated: PlaybackPreferences = {
      ...get().preferences,
      hapticsEnabled: enabled
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

// Wire dynamic preference resolver to hapticService
hapticService.registerPreferenceGetter(
  () => usePlaybackPreferencesStore.getState().preferences.hapticsEnabled
);

// Automatically trigger load upon module import
usePlaybackPreferencesStore.getState().loadPreferences();
