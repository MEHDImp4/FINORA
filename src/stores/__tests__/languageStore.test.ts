import { useLanguageStore, LANGUAGE_STORAGE_KEY } from "../languageStore";
import { userPreferencesStorage } from "../../core/security/storage";
import { DEFAULT_LANGUAGE } from "../../i18n/locales";

jest.mock("../../core/security/storage", () => ({
  userPreferencesStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

describe("languageStore", () => {
  beforeEach(() => {
    useLanguageStore.setState({
      language: DEFAULT_LANGUAGE,
      isLoaded: false
    });
    jest.clearAllMocks();
  });

  it("defaults to English when storage is empty", async () => {
    (userPreferencesStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    await useLanguageStore.getState().loadLanguage();

    expect(userPreferencesStorage.getItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY);
    const state = useLanguageStore.getState();
    expect(state.language).toBe("en");
    expect(state.isLoaded).toBe(true);
  });

  it("loads saved valid language from storage", async () => {
    (userPreferencesStorage.getItem as jest.Mock).mockResolvedValueOnce("fr");

    await useLanguageStore.getState().loadLanguage();

    const state = useLanguageStore.getState();
    expect(state.language).toBe("fr");
    expect(state.isLoaded).toBe(true);
  });

  it("falls back to default if saved language is invalid", async () => {
    (userPreferencesStorage.getItem as jest.Mock).mockResolvedValueOnce("invalid_lang");

    await useLanguageStore.getState().loadLanguage();

    const state = useLanguageStore.getState();
    expect(state.language).toBe("en");
    expect(state.isLoaded).toBe(true);
  });

  it("updates language and persists to storage", async () => {
    await useLanguageStore.getState().setLanguage("fr");

    expect(useLanguageStore.getState().language).toBe("fr");
    expect(userPreferencesStorage.setItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY, "fr");
  });

  it("resets language to English and removes from storage", async () => {
    useLanguageStore.setState({ language: "fr", isLoaded: true });

    await useLanguageStore.getState().resetLanguage();

    expect(useLanguageStore.getState().language).toBe("en");
    expect(userPreferencesStorage.removeItem).toHaveBeenCalledWith(LANGUAGE_STORAGE_KEY);
  });
});
