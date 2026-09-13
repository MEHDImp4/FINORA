import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  usePlaybackPreferencesStore,
  DEFAULT_PLAYBACK_PREFERENCES
} from "../playbackPreferencesStore";
import { MediaItem } from "../../types/media";

describe("playbackPreferencesStore", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    // Reset store state
    usePlaybackPreferencesStore.setState({
      preferences: { ...DEFAULT_PLAYBACK_PREFERENCES, seriesPreferences: {} },
      isLoaded: true
    });
  });

  it("updates preferred audio language and saves to AsyncStorage", async () => {
    await usePlaybackPreferencesStore.getState().setPreferredAudioLanguage("ja");

    expect(usePlaybackPreferencesStore.getState().preferences.preferredAudioLanguage).toBe("ja");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "@finora_playback_preferences_v1",
      expect.stringContaining('"preferredAudioLanguage":"ja"')
    );
  });

  it("updates preferred subtitle language and subtitle mode", async () => {
    await usePlaybackPreferencesStore.getState().setPreferredSubtitleLanguage("en");
    await usePlaybackPreferencesStore.getState().setSubtitleMode("always");

    const prefs = usePlaybackPreferencesStore.getState().preferences;
    expect(prefs.preferredSubtitleLanguage).toBe("en");
    expect(prefs.subtitleMode).toBe("always");
  });

  it("sets and retrieves series-specific preferences across episodes", async () => {
    // User chooses Japanese audio and French subtitles for series 'series-naruto'
    await usePlaybackPreferencesStore.getState().setSeriesPreference("series-naruto", {
      audioLanguage: "ja",
      subtitleLanguage: "fr"
    });

    const seriesPref =
      usePlaybackPreferencesStore.getState().preferences.seriesPreferences["series-naruto"];
    expect(seriesPref.audioLanguage).toBe("ja");
    expect(seriesPref.subtitleLanguage).toBe("fr");

    // Episode 1 of Naruto
    const episodeItem: MediaItem = {
      id: "ep-1",
      name: "Episode 1",
      type: "Episode",
      seriesId: "series-naruto",
      genres: ["Anime"],
      playbackPositionTicks: 0,
      totalTicks: 1000,
      playedPercentage: 0,
      isPlayed: false,
      isFavorite: false,
      mediaStreams: [
        { index: 0, type: "Audio", language: "fre" },
        { index: 1, type: "Audio", language: "jpn" },
        { index: 2, type: "Subtitle", language: "fre" },
        { index: 3, type: "Subtitle", language: "eng" }
      ]
    };

    const resolved = usePlaybackPreferencesStore.getState().resolveBestTracks(episodeItem);
    expect(resolved.initialAudioIndex).toBe(1); // Japanese
    expect(resolved.initialSubtitleIndex).toBe(2); // French
  });

  it("resolves tracks based on global preferences when no series preference exists", () => {
    usePlaybackPreferencesStore.setState({
      preferences: {
        preferredAudioLanguage: "fr",
        preferredSubtitleLanguage: "fr",
        subtitleMode: "smart",
        seriesPreferences: {}
      },
      isLoaded: true
    });

    // Movie with English audio and French subtitles
    const movieItem: MediaItem = {
      id: "movie-1",
      name: "Interstellar",
      type: "Movie",
      genres: ["Sci-Fi"],
      playbackPositionTicks: 0,
      totalTicks: 1000,
      playedPercentage: 0,
      isPlayed: false,
      isFavorite: false,
      mediaStreams: [
        { index: 0, type: "Audio", language: "eng" },
        { index: 1, type: "Subtitle", language: "fre" }
      ]
    };

    const resolved = usePlaybackPreferencesStore.getState().resolveBestTracks(movieItem);
    // Audio matches default English (stream 0) since French isn't available
    expect(resolved.initialAudioIndex).toBe(0);
    // In smart mode, since audio is English and preferred subtitle is French, French subtitle (index 1) is activated!
    expect(resolved.initialSubtitleIndex).toBe(1);
  });
});
