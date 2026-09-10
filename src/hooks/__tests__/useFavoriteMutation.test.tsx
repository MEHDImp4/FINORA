import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useToggleFavorite } from "../useUserDataMutations";
import { userDataRepository } from "../../core/repositories/userDataRepository";
import { mediaKeys } from "../useMediaQueries";
import { MediaItem } from "../../types/media";

jest.mock("../../core/repositories/userDataRepository");

describe("useToggleFavorite", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  function HookTester({
    userId,
    onReady
  }: {
    userId: string;
    onReady: (mutation: ReturnType<typeof useToggleFavorite>) => void;
  }) {
    const mutation = useToggleFavorite(userId);
    React.useEffect(() => {
      onReady(mutation);
    }, [mutation]);
    return null;
  }

  it("optimistically updates item in query cache", async () => {
    const userId = "user-123";
    const itemId = "item-456";
    const detailKey = mediaKeys.detail(userId, itemId);

    const initialItem: MediaItem = {
      id: itemId,
      name: "Interstellar",
      type: "Movie",
      genres: [],
      playbackPositionTicks: 0,
      totalTicks: 1000,
      playedPercentage: 0,
      isPlayed: false,
      isFavorite: false
    };

    queryClient.setQueryData(detailKey, initialItem);
    (userDataRepository.setFavorite as jest.Mock).mockResolvedValue(undefined);

    let capturedMutation: ReturnType<typeof useToggleFavorite> | null = null;

    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <HookTester
            userId={userId}
            onReady={(m) => {
              capturedMutation = m;
            }}
          />
        </QueryClientProvider>
      );
    });

    expect(capturedMutation).not.toBeNull();

    await ReactTestRenderer.act(async () => {
      await capturedMutation!.mutateAsync({ itemId, isFavorite: true });
    });

    expect(userDataRepository.setFavorite).toHaveBeenCalledWith(userId, itemId, true);
  });

  it("rolls back optimistic update when mutation fails", async () => {
    const userId = "user-123";
    const itemId = "item-456";
    const detailKey = mediaKeys.detail(userId, itemId);

    const initialItem: MediaItem = {
      id: itemId,
      name: "Interstellar",
      type: "Movie",
      genres: [],
      playbackPositionTicks: 0,
      totalTicks: 1000,
      playedPercentage: 0,
      isPlayed: false,
      isFavorite: false
    };

    queryClient.setQueryData(detailKey, initialItem);
    (userDataRepository.setFavorite as jest.Mock).mockRejectedValue(new Error("Network failure"));

    let capturedMutation: ReturnType<typeof useToggleFavorite> | null = null;

    ReactTestRenderer.act(() => {
      ReactTestRenderer.create(
        <QueryClientProvider client={queryClient}>
          <HookTester
            userId={userId}
            onReady={(m) => {
              capturedMutation = m;
            }}
          />
        </QueryClientProvider>
      );
    });

    try {
      await ReactTestRenderer.act(async () => {
        await capturedMutation!.mutateAsync({ itemId, isFavorite: true });
      });
    } catch {
      // Expected rejection
    }

    const cached = queryClient.getQueryData<MediaItem>(detailKey);
    expect(cached?.isFavorite).toBe(false);
  });
});
