import AsyncStorage from "@react-native-async-storage/async-storage";
import * as TaskManager from "expo-task-manager";
import * as BackgroundTask from "expo-background-task";

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
import { useNotificationStore, DEFAULT_NOTIFICATION_PREFERENCES } from "../../../stores/notificationStore";
import {
  BACKGROUND_NOTIFICATION_INTERVAL_MINUTES,
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
    it("exports the task name constant", () => {
      expect(FINORA_BG_FETCH_TASK).toBe("FINORA_BACKGROUND_CONTENT_CHECK");
      expect(BACKGROUND_NOTIFICATION_INTERVAL_MINUTES).toBe(15);
    });
  });

  describe("TaskManager.defineTask registration", () => {
    it("calls defineTask at module load time with the correct task name", () => {
      expect(mockDefineTask).toHaveBeenCalledWith(FINORA_BG_FETCH_TASK, expect.any(Function));
    });
  });

  describe("background task handler", () => {
    let taskHandler: (...args: any[]) => any;

    beforeAll(() => {
      taskHandler = mockDefineTask.mock.calls[mockDefineTask.mock.calls.length - 1][1];
    });

    beforeEach(async () => {
      jest.clearAllMocks();
      await AsyncStorage.clear();
      useNotificationStore.setState({
        notifications: [],
        unreadCount: 0,
        preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
        activeScopeKey: null,
        isLoaded: false
      });
    });

    it("returns Success when no secure session exists", async () => {
      mockRestoreSession.mockResolvedValueOnce(null);

      const result = await taskHandler();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
      expect(mockSyncNewMedia).not.toHaveBeenCalled();
    });

    it("returns Success when restored session has no complete account identity", async () => {
      mockRestoreSession.mockResolvedValueOnce({ serverUrl: "https://test", token: "tok" });

      const result = await taskHandler();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
      expect(mockSyncNewMedia).not.toHaveBeenCalled();
    });

    it("hydrates persisted preferences and syncs the restored server/user", async () => {
      mockRestoreSession.mockResolvedValueOnce({
        userId: "user-1",
        userName: "Bastoz",
        serverId: "srv-1",
        serverUrl: "https://jellyfin.example.com",
        token: "tok-fresh"
      });
      mockSyncNewMedia.mockResolvedValueOnce(undefined);

      const result = await taskHandler();

      expect(useNotificationStore.getState().activeScopeKey).toContain("srv-1");
      expect(mockSyncNewMedia).toHaveBeenCalledWith("user-1", "srv-1");
      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
    });

    it("does not sync when persisted global notification preference is disabled", async () => {
      await AsyncStorage.setItem(
        "@finora_notification_prefs",
        JSON.stringify({ ...DEFAULT_NOTIFICATION_PREFERENCES, enabled: false })
      );
      mockRestoreSession.mockResolvedValueOnce({
        userId: "user-1",
        userName: "Bastoz",
        serverId: "srv-1",
        serverUrl: "https://jellyfin.example.com",
        token: "tok-fresh"
      });

      const result = await taskHandler();

      expect(mockSyncNewMedia).not.toHaveBeenCalled();
      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Success);
    });

    it("returns Failed when sync throws", async () => {
      mockRestoreSession.mockResolvedValueOnce({
        userId: "user-1",
        serverId: "srv-1",
        serverUrl: "https://jellyfin.example.com",
        token: "tok-fresh"
      });
      mockSyncNewMedia.mockRejectedValueOnce(new Error("network error"));

      const result = await taskHandler();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Failed);
    });

    it("returns Failed when auth restore throws", async () => {
      mockRestoreSession.mockRejectedValueOnce(new Error("secure store error"));

      const result = await taskHandler();

      expect(result).toBe(BackgroundTask.BackgroundTaskResult.Failed);
    });
  });

  describe("registerBackgroundFetch", () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      await AsyncStorage.clear();
    });

    it("skips registration only when the current config version is already registered", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(true);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce("2");

      await registerBackgroundFetch();

      expect(mockUnregisterTaskAsync).not.toHaveBeenCalled();
      expect(mockRegisterTaskAsync).not.toHaveBeenCalled();
    });

    it("migrates an old registration and fixes the interval to 15 minutes", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(true);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      mockUnregisterTaskAsync.mockResolvedValueOnce(undefined);
      mockRegisterTaskAsync.mockResolvedValueOnce(undefined);

      await registerBackgroundFetch();

      expect(mockUnregisterTaskAsync).toHaveBeenCalledWith(FINORA_BG_FETCH_TASK);
      expect(mockRegisterTaskAsync).toHaveBeenCalledWith(FINORA_BG_FETCH_TASK, {
        minimumInterval: 15
      });
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(expect.any(String), "2");
    });

    it("registers a fresh task with a 15-minute minimum", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(false);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      mockRegisterTaskAsync.mockResolvedValueOnce(undefined);

      await registerBackgroundFetch();

      expect(mockRegisterTaskAsync).toHaveBeenCalledWith(FINORA_BG_FETCH_TASK, {
        minimumInterval: 15
      });
    });

    it("does not throw when registration rejects", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(false);
      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      mockRegisterTaskAsync.mockRejectedValueOnce(new Error("register failed"));

      await expect(registerBackgroundFetch()).resolves.toBeUndefined();
    });
  });

  describe("unregisterBackgroundFetch", () => {
    beforeEach(async () => {
      jest.clearAllMocks();
      await AsyncStorage.clear();
    });

    it("does not call native unregister when the task is absent", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(false);

      await unregisterBackgroundFetch();

      expect(mockUnregisterTaskAsync).not.toHaveBeenCalled();
    });

    it("unregisters an existing task", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(true);
      mockUnregisterTaskAsync.mockResolvedValueOnce(undefined);

      await unregisterBackgroundFetch();

      expect(mockUnregisterTaskAsync).toHaveBeenCalledWith(FINORA_BG_FETCH_TASK);
    });

    it("does not throw when native unregister rejects", async () => {
      mockIsTaskRegisteredAsync.mockResolvedValueOnce(true);
      mockUnregisterTaskAsync.mockRejectedValueOnce(new Error("unreg failed"));

      await expect(unregisterBackgroundFetch()).resolves.toBeUndefined();
    });
  });
});
