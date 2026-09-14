import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";

// Mock authRepository (headless session restore) before importing the task module
jest.mock("../../../core/jellyfin/authRepository", () => ({
  authRepository: {
    restoreSession: jest.fn().mockResolvedValue(null)
  }
}));

jest.mock("../../../core/jellyfin/jellyfinClient", () => ({
  jellyfinClient: {
    initialize: jest.fn().mockResolvedValue(undefined),
    setAuthToken: jest.fn(),
    getServerUrl: jest.fn().mockReturnValue("https://jellyfin.example.com"),
    getHttpClient: jest.fn().mockReturnValue({ request: jest.fn() })
  }
}));

jest.mock("../../../features/notifications/useNotificationSync", () => ({
  syncNewMediaNotifications: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../../core/network/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

import { authRepository } from "../../../core/jellyfin/authRepository";
import { syncNewMediaNotifications } from "../../../features/notifications/useNotificationSync";
import {
  FINORA_BG_FETCH_TASK,
  registerBackgroundFetch,
  unregisterBackgroundFetch
} from "../backgroundFetchTask";

const mockDefineTask = TaskManager.defineTask as jest.Mock;
const mockIsTaskRegisteredAsync = TaskManager.isTaskRegisteredAsync as jest.Mock;
const mockGetStatusAsync = BackgroundFetch.getStatusAsync as jest.Mock;
const mockRegisterTaskAsync = BackgroundFetch.registerTaskAsync as jest.Mock;
const mockUnregisterTaskAsync = BackgroundFetch.unregisterTaskAsync as jest.Mock;
const mockRestoreSession = authRepository.restoreSession as jest.Mock;
const mockSyncNewMedia = syncNewMediaNotifications as jest.Mock;

describe("backgroundFetchTask", () => {
  describe("FINORA_BG_FETCH_TASK constant", () => {
    it("should export the task name constant", () => {
      expect(FINORA_BG_FETCH_TASK).toBe("FINORA_BACKGROUND_CONTENT_CHECK");
    });
  });

  describe("TaskManager.defineTask registration", () => {
    it("should call defineTask at module load time with the correct task name", () => {
      expect(mockDefineTask).toHaveBeenCalledWith(
        FINORA_BG_FETCH_TASK,
        expect.any(Function)
      );
    });
  });

  describe("background task handler", () => {
    let taskHandler: (...args: any[]) => any;

    beforeAll(() => {
      // Capture the handler before any clearAllMocks wipes the call history
      taskHandler = mockDefineTask.mock.calls[mockDefineTask.mock.calls.length - 1][1];
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("returns NoData when authRepository.restoreSession returns null (headless — Zustand not hydrated)", async () => {
      // Simulates the real headless background scenario where Zustand is NOT hydrated
      mockRestoreSession.mockResolvedValueOnce(null);

      const result = await taskHandler();

      expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
      expect(mockSyncNewMedia).not.toHaveBeenCalled();
    });

    it("returns NoData when restored session has no userId", async () => {
      mockRestoreSession.mockResolvedValueOnce({ serverUrl: "https://test", token: "tok" });

      const result = await taskHandler();

      expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
      expect(mockSyncNewMedia).not.toHaveBeenCalled();
    });

    it("calls syncNewMediaNotifications with the restored userId and returns NewData on success", async () => {
      mockRestoreSession.mockResolvedValueOnce({
        userId: "user-1",
        userName: "Bastoz",
        serverId: "srv-1",
        serverUrl: "https://jellyfin.example.com",
        token: "tok-fresh"
      });
      mockSyncNewMedia.mockResolvedValueOnce(undefined);

      const result = await taskHandler();

      expect(mockSyncNewMedia).toHaveBeenCalledWith("user-1");
      expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NewData);
    });

    it("returns Failed when syncNewMediaNotifications throws", async () => {
      mockRestoreSession.mockResolvedValueOnce({
        userId: "user-1",
        serverUrl: "https://jellyfin.example.com",
        token: "tok-fresh"
      });
      mockSyncNewMedia.mockRejectedValueOnce(new Error("network error"));

      const result = await taskHandler();

      expect(result).toBe(BackgroundFetch.BackgroundFetchResult.Failed);
    });

    it("returns Failed when authRepository.restoreSession throws", async () => {
      mockRestoreSession.mockRejectedValueOnce(new Error("secure store error"));

      const result = await taskHandler();

      expect(result).toBe(BackgroundFetch.BackgroundFetchResult.Failed);
    });
  });

  describe("registerBackgroundFetch", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("skips registration when status is Restricted", async () => {
      mockGetStatusAsync.mockResolvedValueOnce(BackgroundFetch.BackgroundFetchStatus.Restricted);

      await registerBackgroundFetch();

      expect(mockRegisterTaskAsync).not.toHaveBeenCalled();
    });

    it("skips registration when status is Denied", async () => {
      mockGetStatusAsync.mockResolvedValueOnce(BackgroundFetch.BackgroundFetchStatus.Denied);

      await registerBackgroundFetch();

      expect(mockRegisterTaskAsync).not.toHaveBeenCalled();
    });

    it("skips registration when task is already registered", async () => {
      mockGetStatusAsync.mockResolvedValueOnce(BackgroundFetch.BackgroundFetchStatus.Available);
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(true);

      await registerBackgroundFetch();

      expect(mockRegisterTaskAsync).not.toHaveBeenCalled();
    });

    it("registers the task with correct options when available and not registered", async () => {
      mockGetStatusAsync.mockResolvedValueOnce(BackgroundFetch.BackgroundFetchStatus.Available);
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(false);
      mockRegisterTaskAsync.mockResolvedValueOnce(undefined);

      await registerBackgroundFetch();

      expect(mockRegisterTaskAsync).toHaveBeenCalledWith(FINORA_BG_FETCH_TASK, {
        minimumInterval: 15 * 60,
        stopOnTerminate: false,
        startOnBoot: true
      });
    });

    it("does not throw when registerTaskAsync rejects", async () => {
      mockGetStatusAsync.mockResolvedValueOnce(BackgroundFetch.BackgroundFetchStatus.Available);
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(false);
      mockRegisterTaskAsync.mockRejectedValueOnce(new Error("register failed"));

      await expect(registerBackgroundFetch()).resolves.toBeUndefined();
    });
  });

  describe("unregisterBackgroundFetch", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("does nothing when the task is not registered", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(false);

      await unregisterBackgroundFetch();

      expect(mockUnregisterTaskAsync).not.toHaveBeenCalled();
    });

    it("calls unregisterTaskAsync when the task is registered", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(true);
      mockUnregisterTaskAsync.mockResolvedValueOnce(undefined);

      await unregisterBackgroundFetch();

      expect(mockUnregisterTaskAsync).toHaveBeenCalledWith(FINORA_BG_FETCH_TASK);
    });

    it("does not throw when unregisterTaskAsync rejects", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(true);
      mockUnregisterTaskAsync.mockRejectedValueOnce(new Error("unreg failed"));

      await expect(unregisterBackgroundFetch()).resolves.toBeUndefined();
    });
  });
});
