import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type SubtitleSize = "small" | "medium" | "large" | "extraLarge";
export type SubtitleColor = "#FFFFFF" | "#FFE600" | "#00E5FF" | "#A7F3D0";
export type SubtitleBackground = "none" | "semi_black" | "solid_black" | "pill";
export type SubtitleShadow = "netflix_shadow" | "thick_outline" | "none";
export type SubtitlePosition = "standard" | "elevated";
export type SubtitlePreset = "netflix" | "netflix_box" | "cinema_yellow" | "high_contrast";

export interface SubtitleSettings {
  size: SubtitleSize;
  textColor: SubtitleColor;
  background: SubtitleBackground;
  shadow: SubtitleShadow;
  position: SubtitlePosition;
}

export const SUBTITLE_SIZE_VALUES: Record<SubtitleSize, number> = {
  small: 16,
  medium: 20,
  large: 26,
  extraLarge: 32
};

export const DEFAULT_SUBTITLE_SETTINGS: SubtitleSettings = {
  size: "medium",
  textColor: "#FFFFFF",
  background: "none",
  shadow: "netflix_shadow",
  position: "standard"
};

export const SUBTITLE_PRESETS: Record<SubtitlePreset, SubtitleSettings> = {
  netflix: {
    size: "medium",
    textColor: "#FFFFFF",
    background: "none",
    shadow: "netflix_shadow",
    position: "standard"
  },
  netflix_box: {
    size: "medium",
    textColor: "#FFFFFF",
    background: "semi_black",
    shadow: "netflix_shadow",
    position: "standard"
  },
  cinema_yellow: {
    size: "medium",
    textColor: "#FFE600",
    background: "none",
    shadow: "netflix_shadow",
    position: "standard"
  },
  high_contrast: {
    size: "large",
    textColor: "#FFE600",
    background: "solid_black",
    shadow: "none",
    position: "standard"
  }
};

const STORAGE_KEY = "@finora_subtitle_settings_v1";

interface SubtitleSettingsState {
  settings: SubtitleSettings;
  isLoaded: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (partial: Partial<SubtitleSettings>) => Promise<void>;
  applyPreset: (preset: SubtitlePreset) => Promise<void>;
  resetToDefaults: () => Promise<void>;
}

export const useSubtitleSettingsStore = create<SubtitleSettingsState>((set, get) => ({
  settings: DEFAULT_SUBTITLE_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ settings: { ...DEFAULT_SUBTITLE_SETTINGS, ...parsed }, isLoaded: true });
        return;
      }
    } catch {
      // Fall back to default
    }
    set({ settings: DEFAULT_SUBTITLE_SETTINGS, isLoaded: true });
  },

  updateSettings: async (partial) => {
    const updated = { ...get().settings, ...partial };
    set({ settings: updated });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // Ignored
    }
  },

  applyPreset: async (preset) => {
    const presetSettings = SUBTITLE_PRESETS[preset];
    if (!presetSettings) return;
    set({ settings: presetSettings });
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(presetSettings));
    } catch {
      // Ignored
    }
  },

  resetToDefaults: async () => {
    set({ settings: DEFAULT_SUBTITLE_SETTINGS });
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignored
    }
  }
}));

// Automatically trigger initial load once module is evaluated
useSubtitleSettingsStore.getState().loadSettings();
