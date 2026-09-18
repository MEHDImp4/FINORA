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
  lang?: SupportedLanguage
): string {
  const currentLang = lang || useLanguageStore.getState().language || DEFAULT_LANGUAGE;
  const dictionary = translations[currentLang] || translations[DEFAULT_LANGUAGE];
  let rawValue = getNestedValue(dictionary, key);

  // Fallback to default language (English) if missing in current dictionary
  if (typeof rawValue !== "string" && currentLang !== DEFAULT_LANGUAGE) {
    rawValue = getNestedValue(translations[DEFAULT_LANGUAGE], key);
  }

  if (typeof rawValue !== "string") {
    return key;
  }

  if (!params) {
    return rawValue;
  }

  const effectiveParams = { ...params };
  if ("count" in effectiveParams && !("plural" in effectiveParams)) {
    const num = Number(effectiveParams.count);
    effectiveParams.plural = !isNaN(num) && num > 1 ? "s" : "";
  }

  let result = rawValue;
  for (const [paramKey, val] of Object.entries(effectiveParams)) {
    result = result.replace(new RegExp(`\\{{1,2}${paramKey}\\}{1,2}`, "g"), String(val));
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
