import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import PlayerRoute from "../[id]";
import { offlineStorageService } from "../../../features/offline/offlineStorage";
import { OfflineMediaRecord } from "../../../features/offline/types";

const mockBack = jest.fn();
const mockReplace = jest.fn();
const mockSetQueriesData = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockPlayerScreen = jest.fn((_props: any) => null);
const mockUseItemDetails = jest.fn();
const mockRestoreSession = jest.fn().mockResolvedValue(undefined);
let mockAuthState: any;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ id: "movie-1" }),
  useRouter: () => ({ back: mockBack, replace: mockReplace }),
  Stack: { Screen: () => null }
}));

jest.mock("../../../stores/authStore", () => ({
  useAuthStore: (selector: any) => selector(mockAuthState)
}));

jest.mock("../../../hooks/useMediaQueries", () => ({
  useItemDetails: (...args: any[]) => mockUseItemDetails(...args),
  mediaKeys: { all: ["media"] }
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    setQueriesData: mockSetQueriesData,
    invalidateQueries: mockInvalidateQueries
  })
}));

jest.mock("../../../features/player/components/PlayerScreen", () => ({
  PlayerScreen: (props: any) => {
    mockPlayerScreen(props);
    return null;
  }
}));

jest.mock("../../../i18n", () => ({
  useTranslation: () => ({ t: (key: string) => key })
}));

jest.mock("../../../core/jellyfin/jellyfinClient", () => ({
  jellyfinClient: {
    getServerUrl: () => "https://jellyfin.example.com",
    getAuthToken: () => "token"
  }
}));

const offlineRecord: OfflineMediaRecord = {
  itemId: "movie-1",
  title: "Offline Movie",
  type: "Movie",
  localPath: "file:///stale/finora_downloads/movie-1.mp4",
  fileSizeBytes: 100,
  totalTicks: 1000,
  playbackPositionTicks: 0,
  savedAt: 1
};

const onlineItem = {
  id: "movie-1",
  name: "Online Movie",
  type: "Movie",
  genres: [],
  totalTicks: 1000,
  playbackPositionTicks: 0,
  playedPercentage: 0,
  isFavorite: false,
  isPlayed: false,
  mediaStreams: []
};

async function renderRoute() {
  let tree: any;
  await act(async () => {
    tree = ReactTestRenderer.create(<PlayerRoute />);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return tree;
}

describe("PlayerRoute offline fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState = {
      session: {
        userId: "user-1",
        serverId: "server-1",
        serverUrl: "https://jellyfin.example.com",
        token: "token"
      },
      status: "authenticated",
      restoreSession: mockRestoreSession
    };
    jest.spyOn(offlineStorageService, "getOfflineMedia").mockResolvedValue(offlineRecord);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("never sends a stale missing file URI to PlayerScreen", async () => {
    jest.spyOn(offlineStorageService, "resolveLocalUri").mockResolvedValue(null);
    mockUseItemDetails.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    const tree = await renderRoute();

    expect(mockPlayerScreen).not.toHaveBeenCalled();
    expect(tree.root.findByProps({ testID: "player-route-error" })).toBeTruthy();
  });

  it("keeps online streaming usable when the offline file is missing", async () => {
    jest.spyOn(offlineStorageService, "resolveLocalUri").mockResolvedValue(null);
    mockUseItemDetails.mockReturnValue({ data: onlineItem, isLoading: false, isError: false });

    await renderRoute();

    expect(mockPlayerScreen).toHaveBeenCalled();
    const props = mockPlayerScreen.mock.calls.at(-1)?.[0];
    expect(props.item).toEqual(onlineItem);
    expect(props.localPath).toBeUndefined();
  });

  it("uses a verified offline path when online playback is unavailable", async () => {
    const validPath = "file:///mock-documents/finora_downloads/movie-1.mp4";
    jest.spyOn(offlineStorageService, "resolveLocalUri").mockResolvedValue(validPath);
    mockUseItemDetails.mockReturnValue({ data: undefined, isLoading: false, isError: true });

    await renderRoute();

    expect(mockPlayerScreen).toHaveBeenCalled();
    const props = mockPlayerScreen.mock.calls.at(-1)?.[0];
    expect(props.localPath).toBe(validPath);
  });
});
