import { create } from "zustand";
import { userPreferencesStorage } from "../core/security/storage";
import { SupportedLanguage } from "../i18n/types";
import { DEFAULT_LANGUAGE, translations } from "../i18n/locales";

export const LANGUAGE_STORAGE_KEY = "finora_app_language";

export interface LanguageState {
  language: SupportedLanguage;
  isLoaded: boolean;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  loadLanguage: () => Promise<void>;
  resetLanguage: () => Promise<void>;
}

export function detectDeviceLanguage(): SupportedLanguage {
  try {
    const sysLocale = typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().locale : "";
    if (sysLocale && sysLocale.toLowerCase().startsWith("fr")) {
      return "fr";
    }
  } catch {
    // fallback
  }
  return DEFAULT_LANGUAGE;
}

export const useLanguageStore = create<LanguageState>((set) => ({
  language: DEFAULT_LANGUAGE,
  isLoaded: false,

  loadLanguage: async () => {
    try {
      const savedLang = await userPreferencesStorage.getItem<string>(LANGUAGE_STORAGE_KEY);
      if (savedLang && savedLang in translations) {
        set({ language: savedLang as SupportedLanguage, isLoaded: true });
        return;
      }
      const initial = detectDeviceLanguage();
      set({ language: initial, isLoaded: true });
    } catch {
      set({ language: DEFAULT_LANGUAGE, isLoaded: true });
    }
  },

  setLanguage: async (lang: SupportedLanguage) => {
    set({ language: lang });
    try {
      await userPreferencesStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch {
      // Non-blocking preference
    }
  },

  resetLanguage: async () => {
    set({ language: DEFAULT_LANGUAGE });
    try {
      await userPreferencesStorage.removeItem(LANGUAGE_STORAGE_KEY);
    } catch {
      // Non-blocking preference
    }
  }
}));
