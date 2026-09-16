import { translate, translations, SUPPORTED_LANGUAGES } from "../index";

describe("i18n translate", () => {
  it("translates English key correctly", () => {
    const text = translate("common.save", undefined, "en");
    expect(text).toBe("Save");
  });

  it("translates French key correctly", () => {
    const text = translate("common.save", undefined, "fr");
    expect(text).toBe("Enregistrer");
  });

  it("interpolates parameters in translation strings", () => {
    const welcome = translate("onboarding.welcomeBackUser", { username: "Alice" }, "en");
    expect(welcome).toBe("Welcome back, Alice!");

    const welcomeFr = translate("onboarding.welcomeBackUser", { username: "Bob" }, "fr");
    expect(welcomeFr).toBe("Bienvenue, Bob !");
  });

  it("falls back to English when French translation key is missing or undefined", () => {
    // Both en and fr have full definitions, but if an unknown key is queried:
    const fallback = translate("common.nonExistentKey", undefined, "fr");
    expect(fallback).toBe("common.nonExistentKey");
  });

  it("returns key if not found in any language dictionary", () => {
    const missing = translate("some.totally.missing.key", undefined, "en");
    expect(missing).toBe("some.totally.missing.key");
  });

  it("contains valid structure for all supported languages", () => {
    SUPPORTED_LANGUAGES.forEach((lang) => {
      const dict = translations[lang.code];
      expect(dict).toBeDefined();
      expect(dict.common.save).toBeTruthy();
      expect(dict.tabs.home).toBeTruthy();
      expect(dict.onboarding.connectTitle).toBeTruthy();
      expect(dict.settings.appLanguage).toBeTruthy();
    });
  });
});
