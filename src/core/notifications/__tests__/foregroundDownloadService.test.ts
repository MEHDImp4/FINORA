import { NativeModules, Platform } from "react-native";
import BackgroundService from "react-native-background-actions";
import {
  isBackgroundServiceSupported,
  startDownloadForeground,
  updateDownloadNotification,
  stopDownloadForeground,
  isForegroundActive,
  _resetForegroundServiceStateForTesting
} from "../foregroundDownloadService";
import { logger } from "../../network/logger";


jest.mock("../notificationService", () => ({
  notificationService: {
    requestPermissions: jest.fn().mockResolvedValue(true)
  }
}));

describe("foregroundDownloadService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    _resetForegroundServiceStateForTesting();
    // Default mock: Android with RNBackgroundActions present
    Platform.OS = "android";
    (NativeModules as any).RNBackgroundActions = {
      start: jest.fn(),
      stop: jest.fn(),
      updateNotification: jest.fn()
    };
  });

  describe("isBackgroundServiceSupported", () => {
    it("returns true on android when RNBackgroundActions exists", () => {
      Platform.OS = "android";
      (NativeModules as any).RNBackgroundActions = {};
      expect(isBackgroundServiceSupported()).toBe(true);
    });

    it("returns false when Platform is iOS", () => {
      Platform.OS = "ios";
      (NativeModules as any).RNBackgroundActions = {};
      expect(isBackgroundServiceSupported()).toBe(false);
    });

    it("returns false on android when RNBackgroundActions is null (e.g. Expo Go)", () => {
      Platform.OS = "android";
      (NativeModules as any).RNBackgroundActions = null;
      expect(isBackgroundServiceSupported()).toBe(false);
    });
  });

  describe("unsupported environment (Expo Go / Missing Native Module)", () => {
    beforeEach(() => {
      Platform.OS = "android";
      (NativeModules as any).RNBackgroundActions = null;
    });

    it("bypasses startDownloadForeground without calling BackgroundService.start or throwing", async () => {
      const loggerSpy = jest.spyOn(logger, "info").mockImplementation(() => {});

      await startDownloadForeground("Downloading Movie", "50 MB / 100 MB", 50);

      expect(BackgroundService.start).not.toHaveBeenCalled();
      expect(isForegroundActive()).toBe(false);
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.stringContaining("Native module RNBackgroundActions not available")
      );
    });

    it("only logs unsupported info once across multiple ticks", async () => {
      const loggerSpy = jest.spyOn(logger, "info").mockImplementation(() => {});

      await startDownloadForeground("Movie", "10%", 10);
      await startDownloadForeground("Movie", "20%", 20);
      await startDownloadForeground("Movie", "30%", 30);

      expect(loggerSpy).toHaveBeenCalledTimes(1);
    });

    it("gracefully ignores updateDownloadNotification and stopDownloadForeground", async () => {
      await updateDownloadNotification("Movie", "10%", 10);
      expect(BackgroundService.updateNotification).not.toHaveBeenCalled();

      await stopDownloadForeground();
      expect(BackgroundService.stop).not.toHaveBeenCalled();
    });
  });

  describe("supported environment (Android Standalone / Dev Client)", () => {
    beforeEach(() => {
      Platform.OS = "android";
      (NativeModules as any).RNBackgroundActions = {
        start: jest.fn(),
        stop: jest.fn()
      };
    });

    it("starts background service on first call and updates notification when running", async () => {
      (BackgroundService.isRunning as jest.Mock).mockReturnValue(true);

      await startDownloadForeground("Inception", "45%", 45);
      expect(BackgroundService.start).toHaveBeenCalledTimes(1);

      // Subsequent call while running updates notification
      await startDownloadForeground("Inception", "55%", 55);
      expect(BackgroundService.updateNotification).toHaveBeenCalledTimes(1);
    });

    it("activates circuit breaker on start failure and prevents repeated warning spam on subsequent ticks", async () => {
      const warnSpy = jest.spyOn(logger, "warn").mockImplementation(() => {});
      (BackgroundService.isRunning as jest.Mock).mockReturnValue(false);
      (BackgroundService.start as jest.Mock).mockRejectedValueOnce(
        new Error("ForegroundServiceStartNotAllowedException")
      );

      // First tick fails
      await startDownloadForeground("Inception", "10%", 10);
      expect(warnSpy).toHaveBeenCalledTimes(1);

      // Next ticks should be short-circuited by _startFailed
      await startDownloadForeground("Inception", "12%", 12);
      await startDownloadForeground("Inception", "15%", 15);
      expect(BackgroundService.start).toHaveBeenCalledTimes(1); // not called again
      expect(warnSpy).toHaveBeenCalledTimes(1); // no spam

      // Stopping download resets the circuit breaker
      await stopDownloadForeground();

      // Next new session can try again
      (BackgroundService.start as jest.Mock).mockResolvedValueOnce(undefined);
      await startDownloadForeground("Matrix", "5%", 5);
      expect(BackgroundService.start).toHaveBeenCalledTimes(2);
    });

    it("stops foreground service properly when active", async () => {
      (BackgroundService.isRunning as jest.Mock).mockReturnValue(false);
      (BackgroundService.start as jest.Mock).mockResolvedValueOnce(undefined);

      await startDownloadForeground("Inception", "10%", 10);
      (BackgroundService.isRunning as jest.Mock).mockReturnValue(true);
      expect(isForegroundActive()).toBe(true);

      await stopDownloadForeground();
      expect(BackgroundService.stop).toHaveBeenCalledTimes(1);
    });
  });
});
