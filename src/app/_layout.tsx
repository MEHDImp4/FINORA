import "react-native-url-polyfill/auto";
import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";
import { notificationService } from "../core/notifications/notificationService";
// Side-effect import: registers the background task with TaskManager at module load time.
// Must be imported before Expo Router renders any screens.
import "../core/notifications/backgroundFetchTask";
import {
  registerBackgroundFetch,
  unregisterBackgroundFetch
} from "../core/notifications/backgroundFetchTask";
import { QueryProvider } from "../providers/QueryProvider";
import { offlineSyncManager } from "../features/offline/offlineSyncManager";
import { offlineStorageService } from "../features/offline/offlineStorage";
import { downloadManager } from "../features/offline/downloadManager";
import { useOnboardingStore } from "../stores/onboardingStore";
import { OnboardingScreen } from "../features/onboarding/components/OnboardingScreen";

export default function RootLayout() {
  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const isOnboardingCompleted = useOnboardingStore((state) => state.isCompleted);
  const isOnboardingLoaded = useOnboardingStore((state) => state.isLoaded);
  const loadOnboardingStatus = useOnboardingStore((state) => state.loadOnboardingStatus);
  const router = useRouter();
  const [minSplashDone, setMinSplashDone] = React.useState(false);

  useEffect(() => {
    // Boot sequence — no artificial delay, splash disappears when real data is ready
    Promise.all([
      restoreSession(),
      loadOnboardingStatus()
    ]).finally(() => {
      setMinSplashDone(true);
    });

    // Auto-cleanup watched downloads older than 48h and any orphaned disk files
    offlineStorageService.cleanupExpiredWatchedMedia(48).then(() => {
      offlineStorageService.cleanupOrphanDiskFiles().catch(() => {});
    }).catch(() => {});

    // Initialize notification engine and load stored notifications
    notificationService.init()
      .then(() => registerBackgroundFetch())
      .catch(() => {});
    useNotificationStore.getState().loadPersisted().catch(() => {});

    // Restore persisted downloads and resume the ones that were active before
    // the process died. Runs outside React state so it works right after a kill.
    downloadManager.initialize().catch(() => {});
  }, [restoreSession, loadOnboardingStatus]);

  // Deep linking: when user taps a notification on their device
  useEffect(() => {
    const unsubscribe = notificationService.addNotificationResponseListener((mediaId) => {
      router.push({ pathname: "/details/[id]", params: { id: mediaId } });
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (status === "authenticated" && session?.userId) {
      offlineSyncManager.syncPendingProgress(session.userId).catch(() => {});
      offlineStorageService.cleanupExpiredWatchedMedia(48).catch(() => {});
    } else if (status === "unauthenticated") {
      // Unregister background task on logout so we don't fire stale notifications
      unregisterBackgroundFetch().catch(() => {});
    }
  }, [status, session?.userId]);

  const showSplash = !minSplashDone || status === "idle" || status === "restoring" || !isOnboardingLoaded;
  const showOnboarding = !showSplash && !isOnboardingCompleted;

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
          {showSplash ? (
            <View style={styles.loadingContainer}>
              <Image
                source={require("../../assets/finora-logo-text.png")}
                style={styles.splashLogo}
                contentFit="contain"
                transition={300}
                accessibilityLabel="FINORA"
              />
              <ActivityIndicator
                size="small"
                color="#E50914"
                style={styles.splashLoader}
              />
            </View>
          ) : showOnboarding ? (
            <OnboardingScreen />
          ) : (
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#0A0A0C" },
                animation: "fade_from_bottom"
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            </Stack>
          )}
        </View>
      </QueryProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0C"
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A0A0C",
    justifyContent: "center",
    alignItems: "center"
  },
  splashLogo: {
    width: 220,
    height: 70
  },
  splashLoader: {
    marginTop: 24
  }
});
