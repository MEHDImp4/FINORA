import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import DetailsScreen from "../../../app/details/[id]";
import { useItemDetails } from "../../../hooks/useMediaQueries";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    back: mockBack
  }),
  useLocalSearchParams: () => ({ id: "item-123" })
}));

jest.mock("../../../stores/authStore", () => ({
  useAuthStore: jest.fn((selector) =>
    selector({
      session: {
        serverId: "server-1",
        userId: "user-1",
        serverUrl: "https://jellyfin.example.com",
        token: "token-abc"
      }
    })
  )
}));

jest.mock("../../../hooks/useMediaQueries", () => ({
  useItemDetails: jest.fn(),
  useSeriesSeasons: jest.fn(() => ({ data: [], isLoading: false })),
  useSeasonEpisodes: jest.fn(() => ({ data: [], isLoading: false }))
}));

jest.mock("../../../hooks/useUserDataMutations", () => ({
  useToggleFavorite: jest.fn(() => ({ mutate: jest.fn() })),
  useMarkPlayed: jest.fn(() => ({ mutate: jest.fn() })),
  useRemoveFromResume: jest.fn(() => ({ mutate: jest.fn() }))
}));

jest.mock("../../../core/network/networkStatusService", () => ({
  useNetworkDiagnostic: jest.fn(() => ({
    failureType: null,
    isChecking: false,
    runDiagnostic: jest.fn()
  }))
}));

jest.mock("../../../features/offline/downloadManager", () => ({
  downloadManager: {
    subscribe: jest.fn(() => () => {}),
    getDownloads: jest.fn(() => []),
    startDownload: jest.fn(),
    pauseDownload: jest.fn(),
    resumeDownload: jest.fn(),
    cancelDownload: jest.fn()
  }
}));

jest.mock("../../../features/offline/offlineStorage", () => ({
  offlineStorageService: {
    getOfflineMedia: jest.fn().mockResolvedValue(null),
    getAllOfflineMedia: jest.fn().mockResolvedValue([])
  }
}));

jest.mock("../components/MovieDetailsView", () => ({
  MovieDetailsView: () => {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, { testID: "movie-details-view" });
  }
}));

jest.mock("../components/SeriesDetailsView", () => ({
  SeriesDetailsView: () => {
    const React = require("react");
    const { View } = require("react-native");
    return React.createElement(View, { testID: "series-details-view" });
  }
}));

describe("DetailsScreen routing & redirection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects an Episode to its parent seriesId without rendering MovieDetailsView", () => {
    (useItemDetails as jest.Mock).mockReturnValue({
      data: {
        id: "ep-001",
        name: "Pilot",
        type: "Episode",
        seriesId: "series-999",
        seriesName: "Breaking Bad"
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn()
    });

    let tree: any;
    act(() => {
      tree = ReactTestRenderer.create(<DetailsScreen />);
    });

    // Should show loading spinner while redirecting
    const loadingView = tree.root.findByProps({ testID: "details-loading" });
    expect(loadingView).toBeTruthy();

    // Should NOT mount MovieDetailsView
    expect(tree.root.findAllByProps({ testID: "movie-details-view" }).length).toBe(0);

    // Should call router.replace with seriesId
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/details/[id]",
      params: { id: "series-999" }
    });

    act(() => {
      tree.unmount();
    });
  });

  it("redirects a Season to its parent seriesId or parentId", () => {
    (useItemDetails as jest.Mock).mockReturnValue({
      data: {
        id: "season-1",
        name: "Season 1",
        type: "Season",
        parentId: "series-888"
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn()
    });

    let tree: any;
    act(() => {
      tree = ReactTestRenderer.create(<DetailsScreen />);
    });

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/details/[id]",
      params: { id: "series-888" }
    });

    act(() => {
      tree.unmount();
    });
  });

  it("renders SeriesDetailsView directly when item is a Series", () => {
    (useItemDetails as jest.Mock).mockReturnValue({
      data: {
        id: "series-999",
        name: "Breaking Bad",
        type: "Series"
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn()
    });

    let tree: any;
    act(() => {
      tree = ReactTestRenderer.create(<DetailsScreen />);
    });

    expect(mockReplace).not.toHaveBeenCalled();
    const seriesView = tree.root.findByProps({ testID: "series-details-view" });
    expect(seriesView).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });

  it("renders MovieDetailsView directly when item is a Movie", () => {
    (useItemDetails as jest.Mock).mockReturnValue({
      data: {
        id: "movie-1",
        name: "Inception",
        type: "Movie"
      },
      isLoading: false,
      isError: false,
      refetch: jest.fn()
    });

    let tree: any;
    act(() => {
      tree = ReactTestRenderer.create(<DetailsScreen />);
    });

    expect(mockReplace).not.toHaveBeenCalled();
    const movieView = tree.root.findByProps({ testID: "movie-details-view" });
    expect(movieView).toBeTruthy();

    act(() => {
      tree.unmount();
    });
  });
});
