import { en } from "./en";
import { fr } from "./fr";
import { LanguageOption, SupportedLanguage, Translations } from "../types";

export const translations: Record<SupportedLanguage, Translations> = {
  en,
  fr
};

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    label: "English",
    nativeName: "English",
    flag: "🇬🇧"
  },
  {
    code: "fr",
    label: "French",
    nativeName: "Français",
    flag: "🇫🇷"
  }
];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";
