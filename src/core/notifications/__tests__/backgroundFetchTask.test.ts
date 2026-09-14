import * as TaskManager from "expo-task-manager";
import * as BackgroundFetch from "expo-background-fetch";

// Mock stores before importing the task module
jest.mock("../../../stores/authStore", () => ({
  useAuthStore: {
    getState: jest.fn(() => ({ session: null }))
  }
}));

jest.mock("../../../features/notifications/useNotificationSync", () => ({
  syncNewMediaNotifications: jest.fn().mockResolvedValue(undefined)
}));

jest.mock("../../../core/network/logger", () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
}));

import { useAuthStore } from "../../../stores/authStore";
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
const mockGetState = useAuthStore.getState as jest.Mock;
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
      // Capture the handler BEFORE any clearAllMocks wipes the call history
      taskHandler = mockDefineTask.mock.calls[mockDefineTask.mock.calls.length - 1][1];
    });

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("returns NoData when no session is present", async () => {
      mockGetState.mockReturnValue({ session: null });

      const result = await taskHandler();

      expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
      expect(mockSyncNewMedia).not.toHaveBeenCalled();
    });

    it("returns NoData when session has no userId", async () => {
      mockGetState.mockReturnValue({ session: { serverUrl: "http://test", token: "tok" } });

      const result = await taskHandler();

      expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NoData);
      expect(mockSyncNewMedia).not.toHaveBeenCalled();
    });

    it("calls syncNewMediaNotifications and returns NewData on success", async () => {
      mockGetState.mockReturnValue({ session: { userId: "user-1", serverUrl: "http://test" } });
      mockSyncNewMedia.mockResolvedValueOnce(undefined);

      const result = await taskHandler();

      expect(mockSyncNewMedia).toHaveBeenCalledWith("user-1");
      expect(result).toBe(BackgroundFetch.BackgroundFetchResult.NewData);
    });

    it("returns Failed when syncNewMediaNotifications throws", async () => {
      mockGetState.mockReturnValue({ session: { userId: "user-1" } });
      mockSyncNewMedia.mockRejectedValueOnce(new Error("network error"));

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
