import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";

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
const mockRegisterTaskAsync = BackgroundTask.registerTaskAsync as jest.Mock;
const mockUnregisterTaskAsync = BackgroundTask.unregisterTaskAsync as jest.Mock;
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

    it("returns Success when authRepository.restoreSession returns null (headless — Zustand not hydrated)", async () => {
      // Simulates the real headless background scenario where Zustand is NOT hydrated.
      // The new API returns Success (not NoData) for a no-op run.
      mockRestoreSession.mockResolvedValueOnce(null);

      const result = await taskHandler();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
      expect(mockSyncNewMedia).not.toHaveBeenCalled();
    });

    it("returns Success when restored session has no userId", async () => {
      mockRestoreSession.mockResolvedValueOnce({ serverUrl: "https://test", token: "tok" });

      const result = await taskHandler();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
      expect(mockSyncNewMedia).not.toHaveBeenCalled();
    });

    it("calls syncNewMediaNotifications with the restored userId and returns Success on success", async () => {
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
      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
    });

    it("returns Failed when syncNewMediaNotifications throws", async () => {
      mockRestoreSession.mockResolvedValueOnce({
        userId: "user-1",
        serverUrl: "https://jellyfin.example.com",
        token: "tok-fresh"
      });
      mockSyncNewMedia.mockRejectedValueOnce(new Error("network error"));

      const result = await taskHandler();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Failed);
    });

    it("returns Failed when authRepository.restoreSession throws", async () => {
      mockRestoreSession.mockRejectedValueOnce(new Error("secure store error"));

      const result = await taskHandler();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Failed);
    });
  });

  describe("registerBackgroundFetch", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("skips registration when task is already registered", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(true);

      await registerBackgroundFetch();

      expect(mockRegisterTaskAsync).not.toHaveBeenCalled();
    });

    it("registers the task with correct options when not yet registered", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(false);
      mockRegisterTaskAsync.mockResolvedValueOnce(undefined);

      await registerBackgroundFetch();

      expect(mockRegisterTaskAsync).toHaveBeenCalledWith(FINORA_BG_FETCH_TASK, {
        minimumInterval: 15 * 60
      });
    });

    it("does not throw when registerTaskAsync rejects", async () => {
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
