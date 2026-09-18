import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { MediaQuickActionsModal } from "../components/MediaQuickActionsModal";
import { MediaItem } from "../../../types/media";
import { translate } from "../../../i18n";

describe("MediaQuickActionsModal", () => {
  const serverUrl = "https://jellyfin.example.com";

  const inProgressEpisode: MediaItem = {
    id: "ep-1",
    name: "Ozymandias",
    type: "Episode",
    seriesName: "Breaking Bad",
    seasonIndex: 5,
    episodeIndex: 14,
    playedPercentage: 65,
    isPlayed: false,
    isFavorite: false,
    playbackPositionTicks: 18000000000,
    totalTicks: 28000000000,
    genres: ["Drama"]
  };

  const playedMovie: MediaItem = {
    id: "movie-1",
    name: "Interstellar",
    type: "Movie",
    year: 2014,
    runtimeMinutes: 169,
    playedPercentage: 100,
    isPlayed: true,
    isFavorite: true,
    playbackPositionTicks: 0,
    totalTicks: 60000000000,
    genres: ["Sci-Fi"]
  };

  it("does not render modal contents when item is null", () => {
    const component = ReactTestRenderer.create(
      <MediaQuickActionsModal
        visible={true}
        item={null}
        serverUrl={serverUrl}
        onClose={jest.fn()}
      />
    );
    expect(component.toJSON()).toBeNull();
  });

  it("renders episode details and correct action buttons when in-progress", () => {
    const onTogglePlayedMock = jest.fn();
    const onRemoveFromResumeMock = jest.fn();
    const onToggleFavoriteMock = jest.fn();
    const onPlayMock = jest.fn();
    const onViewDetailsMock = jest.fn();
    const onCloseMock = jest.fn();

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <MediaQuickActionsModal
          visible={true}
          item={inProgressEpisode}
          serverUrl={serverUrl}
          onClose={onCloseMock}
          onPlay={onPlayMock}
          onViewDetails={onViewDetailsMock}
          onTogglePlayed={onTogglePlayedMock}
          onRemoveFromResume={onRemoveFromResumeMock}
          onToggleFavorite={onToggleFavoriteMock}
        />
      );
    });

    const root = component!.root;
    // Check main title (Series name) and sub title
    expect(root.findByProps({ children: "Breaking Bad" })).toBeDefined();
    expect(root.findByProps({ children: "S5:E14 · Ozymandias" })).toBeDefined();

    // Check action rows
    expect(root.findByProps({ children: translate("quickActions.markWatched") })).toBeDefined();
    expect(root.findByProps({ children: translate("quickActions.markUnwatched") })).toBeDefined();
    expect(root.findByProps({ children: translate("quickActions.removeFromResume") })).toBeDefined();
    expect(root.findByProps({ children: translate("quickActions.addFavorite") })).toBeDefined();
    expect(root.findByProps({ children: translate("quickActions.resume") })).toBeDefined();
    expect(root.findByProps({ children: translate("quickActions.viewDetails") })).toBeDefined();
  });

  it("calls onTogglePlayed with true when 'Mark as watched' is pressed", () => {
    const onTogglePlayedMock = jest.fn();
    const onCloseMock = jest.fn();

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <MediaQuickActionsModal
          visible={true}
          item={inProgressEpisode}
          serverUrl={serverUrl}
          onClose={onCloseMock}
          onTogglePlayed={onTogglePlayedMock}
        />
      );
    });

    const root = component!.root;
    const markPlayedLabel = translate("quickActions.markWatched");
    const pressables = root.findAllByType("Pressable" as any);
    const markPlayedPressable = pressables.find(
      (p) => p.props.accessibilityLabel && p.props.accessibilityLabel.includes(markPlayedLabel)
    );

    expect(markPlayedPressable).toBeDefined();
    ReactTestRenderer.act(() => {
      markPlayedPressable!.props.onPress();
    });

    expect(onTogglePlayedMock).toHaveBeenCalledWith(inProgressEpisode, true);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("calls onRemoveFromResume when 'Remove from continue watching' is pressed", () => {
    const onRemoveFromResumeMock = jest.fn();
    const onCloseMock = jest.fn();

    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <MediaQuickActionsModal
          visible={true}
          item={inProgressEpisode}
          serverUrl={serverUrl}
          onClose={onCloseMock}
          onRemoveFromResume={onRemoveFromResumeMock}
        />
      );
    });

    const root = component!.root;
    const removeLabel = translate("quickActions.removeFromResume");
    const pressables = root.findAllByType("Pressable" as any);
    const removePressable = pressables.find(
      (p) => p.props.accessibilityLabel && p.props.accessibilityLabel.includes(removeLabel)
    );

    expect(removePressable).toBeDefined();
    ReactTestRenderer.act(() => {
      removePressable!.props.onPress();
    });

    expect(onRemoveFromResumeMock).toHaveBeenCalledWith(inProgressEpisode);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("renders played status and favorite removal for a played favorite movie", () => {
    const onToggleFavoriteMock = jest.fn();
    let component: ReactTestRenderer.ReactTestRenderer;

    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <MediaQuickActionsModal
          visible={true}
          item={playedMovie}
          serverUrl={serverUrl}
          onClose={jest.fn()}
          onToggleFavorite={onToggleFavoriteMock}
        />
      );
    });

    const root = component!.root;
    expect(root.findByProps({ children: "Interstellar" })).toBeDefined();
    expect(root.findByProps({ children: translate("quickActions.statusPlayed") })).toBeDefined();
    expect(root.findByProps({ children: translate("quickActions.statusFavorite") })).toBeDefined();
    expect(root.findByProps({ children: translate("quickActions.removeFavorite") })).toBeDefined();
  });
});
