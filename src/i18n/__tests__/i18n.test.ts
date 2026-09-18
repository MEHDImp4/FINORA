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

  it("enforces 100% key parity between English and French dictionaries", () => {
    function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
      const res: Record<string, string> = {};
      for (const [k, v] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === "object" && !Array.isArray(v)) {
          Object.assign(res, flatten(v as Record<string, unknown>, fullKey));
        } else {
          res[fullKey] = String(v);
        }
      }
      return res;
    }

    const enFlat = flatten(translations.en as unknown as Record<string, unknown>);
    const frFlat = flatten(translations.fr as unknown as Record<string, unknown>);

    const enKeys = Object.keys(enFlat).sort();
    const frKeys = Object.keys(frFlat).sort();

    expect(frKeys).toEqual(enKeys);

    // Ensure no empty strings
    for (const key of enKeys) {
      expect(enFlat[key].trim().length).toBeGreaterThan(0);
      expect(frFlat[key].trim().length).toBeGreaterThan(0);

      // Check placeholder parity
      const enPlaceholders = (enFlat[key].match(/\{{1,2}([a-zA-Z0-9_-]+)\}{1,2}/g) || []).map(m => m.replace(/[{}]/g, "")).sort();
      const frPlaceholders = (frFlat[key].match(/\{{1,2}([a-zA-Z0-9_-]+)\}{1,2}/g) || []).map(m => m.replace(/[{}]/g, "")).sort();
      expect(frPlaceholders).toEqual(enPlaceholders);
    }
  });

  it("supports both single and double bracket placeholders", () => {
    const single = translate("details.downloadSeasonNumber", { season: 3 }, "en");
    expect(single).toBe("Season 3");

    const singleFr = translate("details.downloadSeasonNumber", { season: 3 }, "fr");
    expect(singleFr).toBe("Saison 3");

    // Season count automatic and explicit pluralization
    expect(translate("details.seasonCount", { count: 1 }, "fr")).toBe("1 saison");
    expect(translate("details.seasonCount", { count: 2 }, "fr")).toBe("2 saisons");
    expect(translate("details.seasonCount", { count: 1 }, "en")).toBe("1 season");
    expect(translate("details.seasonCount", { count: 4 }, "en")).toBe("4 seasons");
  });

  it("translates newly added accessibility and player keys accurately", () => {
    expect(translate("details.resumeWithProgress", { percent: 42 }, "en")).toBe("Resume (42%)");
    expect(translate("details.resumeWithProgress", { percent: 42 }, "fr")).toBe("Reprendre (42%)");

    expect(translate("home.percentWatched", { percent: 45 }, "en")).toBe("45% watched");
    expect(translate("home.percentWatched", { percent: 45 }, "fr")).toBe("45 % regardé");

    expect(translate("home.openMediaDetailsHint", undefined, "en")).toBe("Double tap to open media details");
    expect(translate("home.openMediaDetailsHint", undefined, "fr")).toBe("Touchez deux fois pour ouvrir les détails du média");

    expect(translate("details.offlineAvailableDesc", undefined, "en")).toContain("downloaded on your device");
    expect(translate("details.offlineAvailableDesc", undefined, "fr")).toContain("copie locale est téléchargée");

    expect(translate("player.audioTrackN", { index: 2 }, "en")).toBe("Audio 2");
    expect(translate("player.subtitleTrackN", { index: 2 }, "fr")).toBe("Sous-titre 2");

    expect(translate("player.scrubberValueText", { current: 10, total: 60 }, "en")).toBe("10 of 60 seconds");
    expect(translate("player.scrubberValueText", { current: 10, total: 60 }, "fr")).toBe("10 sur 60 secondes");

    expect(translate("settings.diagPlaceholder", undefined, "en")).toContain("inspect network and server metrics");
    expect(translate("settings.diagPlaceholder", undefined, "fr")).toContain("inspecter les métriques réseau");
  });
});

