import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSubtitleSettingsStore, DEFAULT_SUBTITLE_SETTINGS } from "../../../stores/subtitleSettingsStore";

describe("subtitleSettingsStore", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    useSubtitleSettingsStore.setState({
      settings: { ...DEFAULT_SUBTITLE_SETTINGS },
      isLoaded: true
    });
  });

  it("initializes with Netflix-style default settings", () => {
    const { settings } = useSubtitleSettingsStore.getState();
    expect(settings.textColor).toBe("#FFFFFF");
    expect(settings.background).toBe("none");
    expect(settings.shadow).toBe("netflix_shadow");
    expect(settings.size).toBe("medium");
    expect(settings.position).toBe("standard");
  });

  it("updates partial settings and saves to AsyncStorage", async () => {
    const { updateSettings } = useSubtitleSettingsStore.getState();

    await updateSettings({
      size: "large",
      textColor: "#FFE600"
    });

    const current = useSubtitleSettingsStore.getState().settings;
    expect(current.size).toBe("large");
    expect(current.textColor).toBe("#FFE600");
    expect(current.background).toBe("none");

    const savedRaw = await AsyncStorage.getItem("@finora_subtitle_settings_v1");
    expect(savedRaw).toBeTruthy();
    const saved = JSON.parse(savedRaw!);
    expect(saved.size).toBe("large");
    expect(saved.textColor).toBe("#FFE600");
  });

  it("applies presets correctly", async () => {
    const { applyPreset } = useSubtitleSettingsStore.getState();

    await applyPreset("cinema_yellow");
    let current = useSubtitleSettingsStore.getState().settings;
    expect(current.textColor).toBe("#FFE600");
    expect(current.background).toBe("none");

    await applyPreset("high_contrast");
    current = useSubtitleSettingsStore.getState().settings;
    expect(current.textColor).toBe("#FFE600");
    expect(current.background).toBe("solid_black");
    expect(current.shadow).toBe("none");

    await applyPreset("netflix");
    current = useSubtitleSettingsStore.getState().settings;
    expect(current.textColor).toBe("#FFFFFF");
    expect(current.background).toBe("none");
    expect(current.shadow).toBe("netflix_shadow");
  });

  it("resets to defaults", async () => {
    const { updateSettings, resetToDefaults } = useSubtitleSettingsStore.getState();

    await updateSettings({ size: "extraLarge", textColor: "#00E5FF", background: "pill" });
    expect(useSubtitleSettingsStore.getState().settings.size).toBe("extraLarge");

    await resetToDefaults();
    const current = useSubtitleSettingsStore.getState().settings;
    expect(current).toEqual(DEFAULT_SUBTITLE_SETTINGS);
  });

  it("loads stored settings from AsyncStorage", async () => {
    const customConfig = {
      ...DEFAULT_SUBTITLE_SETTINGS,
      size: "large" as const,
      textColor: "#00E5FF"
    };
    await AsyncStorage.setItem("@finora_subtitle_settings_v1", JSON.stringify(customConfig));

    const { loadSettings } = useSubtitleSettingsStore.getState();
    await loadSettings();

    const loaded = useSubtitleSettingsStore.getState().settings;
    expect(loaded.size).toBe("large");
    expect(loaded.textColor).toBe("#00E5FF");
  });
});
