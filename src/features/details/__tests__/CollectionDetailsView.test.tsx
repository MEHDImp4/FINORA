import React from "react";
import renderer, { act } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CollectionDetailsView } from "../components/CollectionDetailsView";
import { MediaItem } from "../../../types/media";
import { mediaRepository } from "../../../core/repositories/mediaRepository";
import { translate } from "../../../i18n";

jest.mock("../../../core/repositories/mediaRepository", () => ({
  mediaRepository: {
    getItems: jest.fn()
  }
}));

const mockCollection: MediaItem = {
  id: "col-1",
  name: "The Dark Knight Trilogy",
  type: "BoxSet",
  overview: "Christopher Nolan's iconic Batman trilogy.",
  backdropImageTag: "tag-backdrop",
  genres: ["Action", "Crime"],
  playbackPositionTicks: 0,
  totalTicks: 0,
  playedPercentage: 0,
  isPlayed: false,
  isFavorite: false
};

const mockMovies: MediaItem[] = [
  {
    id: "mov-1",
    name: "Batman Begins",
    type: "Movie",
    year: 2005,
    runtimeMinutes: 140,
    genres: ["Action"],
    playbackPositionTicks: 0,
    totalTicks: 84000000000,
    primaryImageTag: "tag-begins",
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false
  },
  {
    id: "mov-2",
    name: "The Dark Knight",
    type: "Movie",
    year: 2008,
    runtimeMinutes: 152,
    genres: ["Action", "Crime"],
    playbackPositionTicks: 0,
    totalTicks: 91200000000,
    primaryImageTag: "tag-tdk",
    playedPercentage: 0,
    isPlayed: false,
    isFavorite: false
  }
];

describe("CollectionDetailsView", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false }
      }
    });
    (mediaRepository.getItems as jest.Mock).mockResolvedValue(mockMovies);
  });

  it("renders collection title and saga badge", async () => {
    let component: renderer.ReactTestRenderer;
    await act(async () => {
      component = renderer.create(
        <QueryClientProvider client={queryClient}>
          <CollectionDetailsView
            collection={mockCollection}
            serverUrl="https://jellyfin.example.com"
            userId="user-1"
            onBack={jest.fn()}
            onPlayItem={jest.fn()}
            onSelectItem={jest.fn()}
          />
        </QueryClientProvider>
      );
    });

    const root = component!.root;
    expect(root.findByProps({ children: "The Dark Knight Trilogy" })).toBeDefined();
    expect(root.findByProps({ children: "COLLECTION SAGA" })).toBeDefined();
  });

  it("triggers onBack when back button is pressed", async () => {
    const onBackMock = jest.fn();
    let component: renderer.ReactTestRenderer;
    await act(async () => {
      component = renderer.create(
        <QueryClientProvider client={queryClient}>
          <CollectionDetailsView
            collection={mockCollection}
            serverUrl="https://jellyfin.example.com"
            userId="user-1"
            onBack={onBackMock}
            onPlayItem={jest.fn()}
            onSelectItem={jest.fn()}
          />
        </QueryClientProvider>
      );
    });

    const root = component!.root;
    const backBtn = root.findByProps({ accessibilityLabel: translate("common.back") });
    act(() => {
      backBtn.props.onPress();
    });
    expect(onBackMock).toHaveBeenCalledTimes(1);
  });

  it("triggers onToggleFavorite when favorite button is pressed", async () => {
    const onFavMock = jest.fn();
    let component: renderer.ReactTestRenderer;
    await act(async () => {
      component = renderer.create(
        <QueryClientProvider client={queryClient}>
          <CollectionDetailsView
            collection={mockCollection}
            serverUrl="https://jellyfin.example.com"
            userId="user-1"
            onBack={jest.fn()}
            onPlayItem={jest.fn()}
            onSelectItem={jest.fn()}
            onToggleFavorite={onFavMock}
          />
        </QueryClientProvider>
      );
    });

    const root = component!.root;
    const favBtn = root.findByProps({ accessibilityLabel: translate("details.addToMyList") });
    act(() => {
      favBtn.props.onPress();
    });
    expect(onFavMock).toHaveBeenCalledWith(mockCollection);
  });
});
