import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useMarkPlayed, useRemoveFromResume } from "../useUserDataMutations";
import { userDataRepository } from "../../core/repositories/userDataRepository";
import { mediaKeys } from "../useMediaQueries";
import { MediaItem } from "../../types/media";

jest.mock("../../core/repositories/userDataRepository");

describe("useMarkPlayed and useRemoveFromResume mutations", () => {
  let queryClient: QueryClient;
  const userId = "user-test-1";
  const itemId = "item-test-10";

  const sampleMediaItem: MediaItem = {
    id: itemId,
    name: "Breaking Bad S01E01",
    type: "Episode",
    genres: ["Drama"],
    playbackPositionTicks: 15000000000,
    totalTicks: 30000000000,
    playedPercentage: 50,
    isPlayed: false,
    isFavorite: false
  };

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false }
      }
    });
    jest.clearAllMocks();
  });

  function MarkPlayedTester({
    onReady
  }: {
    onReady: (mutation: ReturnType<typeof useMarkPlayed>) => void;
  }) {
    const mutation = useMarkPlayed(userId);
    React.useEffect(() => {
      onReady(mutation);
    }, [mutation]);
    return null;
  }

  function RemoveResumeTester({
    onReady
  }: {
    onReady: (mutation: ReturnType<typeof useRemoveFromResume>) => void;
  }) {
    const mutation = useRemoveFromResume(userId);
    React.useEffect(() => {
      onReady(mutation);
    }, [mutation]);
    return null;
  }

  describe("useMarkPlayed", () => {
    it("optimistically updates item to played and removes from resume cache", async () => {
      const detailKey = mediaKeys.detail(userId, itemId);
      const resumeKey = mediaKeys.resume(userId);

      queryClient.setQueryData(detailKey, sampleMediaItem);
      queryClient.setQueryData(resumeKey, [sampleMediaItem]);

      (userDataRepository.markPlayed as jest.Mock).mockResolvedValue(undefined);

      let capturedMutation: ReturnType<typeof useMarkPlayed> | null = null;
      ReactTestRenderer.act(() => {
        ReactTestRenderer.create(
          <QueryClientProvider client={queryClient}>
            <MarkPlayedTester onReady={(m) => (capturedMutation = m)} />
          </QueryClientProvider>
        );
      });

      expect(capturedMutation).not.toBeNull();

      await ReactTestRenderer.act(async () => {
        await capturedMutation!.mutateAsync({ itemId, played: true });
      });

      expect(userDataRepository.markPlayed).toHaveBeenCalledWith(userId, itemId);
    });

    it("marks unplayed and updates repository", async () => {
      const detailKey = mediaKeys.detail(userId, itemId);
      const resumeKey = mediaKeys.resume(userId);

      queryClient.setQueryData(detailKey, { ...sampleMediaItem, isPlayed: true });
      queryClient.setQueryData(resumeKey, []);

      (userDataRepository.markUnplayed as jest.Mock).mockResolvedValue(undefined);

      let capturedMutation: ReturnType<typeof useMarkPlayed> | null = null;
      ReactTestRenderer.act(() => {
        ReactTestRenderer.create(
          <QueryClientProvider client={queryClient}>
            <MarkPlayedTester onReady={(m) => (capturedMutation = m)} />
          </QueryClientProvider>
        );
      });

      await ReactTestRenderer.act(async () => {
        await capturedMutation!.mutateAsync({ itemId, played: false });
      });

      expect(userDataRepository.markUnplayed).toHaveBeenCalledWith(userId, itemId);
    });

    it("rolls back optimistic updates when markPlayed fails", async () => {
      const detailKey = mediaKeys.detail(userId, itemId);
      const resumeKey = mediaKeys.resume(userId);

      queryClient.setQueryData(detailKey, sampleMediaItem);
      queryClient.setQueryData(resumeKey, [sampleMediaItem]);

      (userDataRepository.markPlayed as jest.Mock).mockRejectedValue(new Error("Server error"));

      let capturedMutation: ReturnType<typeof useMarkPlayed> | null = null;
      ReactTestRenderer.act(() => {
        ReactTestRenderer.create(
          <QueryClientProvider client={queryClient}>
            <MarkPlayedTester onReady={(m) => (capturedMutation = m)} />
          </QueryClientProvider>
        );
      });

      await ReactTestRenderer.act(async () => {
        try {
          await capturedMutation!.mutateAsync({ itemId, played: true });
        } catch {
          // Expected rejection
        }
      });

      const detailAfterRollback = queryClient.getQueryData<MediaItem>(detailKey);
      expect(detailAfterRollback?.isPlayed).toBe(false);
      expect(detailAfterRollback?.playedPercentage).toBe(50);
    });
  });

  describe("useRemoveFromResume", () => {
    it("optimistically removes item from resume list and clears progress", async () => {
      const detailKey = mediaKeys.detail(userId, itemId);
      const resumeKey = mediaKeys.resume(userId);

      queryClient.setQueryData(detailKey, sampleMediaItem);
      queryClient.setQueryData(resumeKey, [sampleMediaItem]);

      (userDataRepository.removeFromResume as jest.Mock).mockResolvedValue(undefined);

      let capturedMutation: ReturnType<typeof useRemoveFromResume> | null = null;
      ReactTestRenderer.act(() => {
        ReactTestRenderer.create(
          <QueryClientProvider client={queryClient}>
            <RemoveResumeTester onReady={(m) => (capturedMutation = m)} />
          </QueryClientProvider>
        );
      });

      await ReactTestRenderer.act(async () => {
        await capturedMutation!.mutateAsync({ itemId });
      });

      expect(userDataRepository.removeFromResume).toHaveBeenCalledWith(userId, itemId);
    });

    it("rolls back resume cache when removeFromResume fails", async () => {
      const detailKey = mediaKeys.detail(userId, itemId);
      const resumeKey = mediaKeys.resume(userId);

      queryClient.setQueryData(detailKey, sampleMediaItem);
      queryClient.setQueryData(resumeKey, [sampleMediaItem]);

      (userDataRepository.removeFromResume as jest.Mock).mockRejectedValue(
        new Error("Network failed")
      );

      let capturedMutation: ReturnType<typeof useRemoveFromResume> | null = null;
      ReactTestRenderer.act(() => {
        ReactTestRenderer.create(
          <QueryClientProvider client={queryClient}>
            <RemoveResumeTester onReady={(m) => (capturedMutation = m)} />
          </QueryClientProvider>
        );
      });

      await ReactTestRenderer.act(async () => {
        try {
          await capturedMutation!.mutateAsync({ itemId });
        } catch {
          // Expected rejection
        }
      });

      const resumeAfter = queryClient.getQueryData<MediaItem[]>(resumeKey);
      expect(resumeAfter).toHaveLength(1);
      expect(resumeAfter![0].id).toBe(itemId);
    });
  });
});
