import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { MediaQuickActionsModal } from "../components/MediaQuickActionsModal";
import { MediaItem } from "../../../types/media";

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
    expect(root.findByProps({ children: "Marquer comme vu" })).toBeDefined();
    expect(root.findByProps({ children: "Marquer comme non vu" })).toBeDefined();
    expect(root.findByProps({ children: "Retirer de Reprendre la lecture" })).toBeDefined();
    expect(root.findByProps({ children: "Ajouter aux favoris" })).toBeDefined();
    expect(root.findByProps({ children: "Reprendre la lecture" })).toBeDefined();
    expect(root.findByProps({ children: "Voir la fiche détaillée" })).toBeDefined();
  });

  it("calls onTogglePlayed with true when 'Marquer comme vu' is pressed", () => {
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
    const markPlayedText = root.findByProps({ children: "Marquer comme vu" });
    // Find ancestor pressable
    const pressables = root.findAllByType("Pressable" as any);
    const markPlayedPressable = pressables.find(
      (p) => p.props.accessibilityLabel && p.props.accessibilityLabel.includes("Marquer comme vu")
    );

    expect(markPlayedPressable).toBeDefined();
    ReactTestRenderer.act(() => {
      markPlayedPressable!.props.onPress();
    });

    expect(onTogglePlayedMock).toHaveBeenCalledWith(inProgressEpisode, true);
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("calls onRemoveFromResume when 'Retirer de Reprendre' is pressed", () => {
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
    const pressables = root.findAllByType("Pressable" as any);
    const removePressable = pressables.find(
      (p) => p.props.accessibilityLabel && p.props.accessibilityLabel.includes("Retirer de Reprendre")
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
    expect(root.findByProps({ children: "Vu · Terminé" })).toBeDefined();
    expect(root.findByProps({ children: "Favori" })).toBeDefined();
    expect(root.findByProps({ children: "Retirer des favoris" })).toBeDefined();
  });
});
