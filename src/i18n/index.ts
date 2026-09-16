import { useCallback } from "react";
import { useLanguageStore } from "../stores/languageStore";
import { SupportedLanguage, LanguageOption, Translations } from "./types";
import { translations, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from "./locales";

export * from "./types";
export * from "./locales";

/**
 * Resolves a dot-notated translation key against an object (e.g. 'settings.appLanguage').
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
}

/**
 * Translates a key for a specific language or active language, interpolating params like {username}.
 */
export function translate(
  key: string,
  params?: Record<string, string | number>,
  lang: SupportedLanguage = DEFAULT_LANGUAGE
): string {
  const dictionary = translations[lang] || translations[DEFAULT_LANGUAGE];
  let rawValue = getNestedValue(dictionary, key);

  // Fallback to default language (English) if missing in current dictionary
  if (typeof rawValue !== "string" && lang !== DEFAULT_LANGUAGE) {
    rawValue = getNestedValue(translations[DEFAULT_LANGUAGE], key);
  }

  if (typeof rawValue !== "string") {
    return key;
  }

  if (!params) {
    return rawValue;
  }

  let result = rawValue;
  for (const [paramKey, val] of Object.entries(params)) {
    result = result.replace(new RegExp(`\\{${paramKey}\\}`, "g"), String(val));
  }
  return result;
}

/**
 * React hook for consuming translations and switching languages reactively.
 */
export function useTranslation() {
  const language = useLanguageStore((state) => state.language);
  const setLanguage = useLanguageStore((state) => state.setLanguage);
  const isLoaded = useLanguageStore((state) => state.isLoaded);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      return translate(key, params, language);
    },
    [language]
  );

  return {
    t,
    language,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
    isLoaded
  };
}
