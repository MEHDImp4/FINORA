import "react-native-url-polyfill/auto";
import React, { useEffect } from "react";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet, ActivityIndicator, Linking } from "react-native";
import { Image } from "expo-image";
import { useAuthStore } from "../stores/authStore";
import { useNotificationStore } from "../stores/notificationStore";
import { notificationService } from "../core/notifications/notificationService";
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
  const notificationPreferencesEnabled = useNotificationStore(
    (state) => state.preferences.enabled
  );
  const notificationsLoaded = useNotificationStore((state) => state.isLoaded);
  const isOnboardingCompleted = useOnboardingStore((state) => state.isCompleted);
  const isOnboardingLoaded = useOnboardingStore((state) => state.isLoaded);
  const loadOnboardingStatus = useOnboardingStore((state) => state.loadOnboardingStatus);
  const router = useRouter();
  const [minSplashDone, setMinSplashDone] = React.useState(false);

  useEffect(() => {
    Promise.all([restoreSession(), loadOnboardingStatus()]).finally(() => {
      setMinSplashDone(true);
    });

    downloadManager
      .initialize()
      .then(() => {
        const trackedPaths = downloadManager.getTrackedLocalPaths();
        offlineStorageService
          .cleanupExpiredWatchedMedia(48)
          .then(() => {
            offlineStorageService.cleanupOrphanDiskFiles(trackedPaths).catch(() => {});
          })
          .catch(() => {});
      })
      .catch(() => {});

    // Only initialize handlers here. Permission requests and OS task registration
    // happen after the persisted user preference has been loaded for the session.
    notificationService.init().catch(() => {});
  }, [restoreSession, loadOnboardingStatus]);

  // Load account-scoped notification state whenever the authenticated identity changes.
  useEffect(() => {
    if (status === "authenticated" && session?.serverId && session?.userId) {
      useNotificationStore
        .getState()
        .loadPersisted(session.serverId, session.userId)
        .catch(() => {});

      offlineSyncManager.syncPendingProgress(session.userId).catch(() => {});
      offlineStorageService.cleanupExpiredWatchedMedia(48).catch(() => {});
      return;
    }

    if (status === "unauthenticated") {
      useNotificationStore.getState().resetActiveScope();
      unregisterBackgroundFetch().catch(() => {});
    }
  }, [status, session?.serverId, session?.userId]);

  // Keep the OS background task in lockstep with the persisted global setting.
  // Disabling notifications now really unregisters the worker; enabling them only
  // registers after native permission is granted.
  useEffect(() => {
    if (
      status !== "authenticated" ||
      !session?.userId ||
      !notificationsLoaded
    ) {
      return;
    }

    if (!notificationPreferencesEnabled) {
      unregisterBackgroundFetch().catch(() => {});
      return;
    }

    notificationService
      .requestPermissions()
      .then((granted) => {
        if (granted) {
          return registerBackgroundFetch();
        }
        return unregisterBackgroundFetch();
      })
      .catch(() => {});
  }, [
    status,
    session?.serverId,
    session?.userId,
    notificationsLoaded,
    notificationPreferencesEnabled
  ]);

  useEffect(() => {
    const unsubscribe = notificationService.addNotificationResponseListener((mediaId) => {
      router.push({ pathname: "/details/[id]", params: { id: mediaId } });
    });

    return () => {
      unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    const handleUrl = ({ url }: { url: string }) => {
      if (url.includes("downloads")) {
        router.push("/downloads");
      }
    };
    const subscription = Linking.addEventListener("url", handleUrl);
    return () => {
      subscription.remove();
    };
  }, [router]);

  const showSplash =
    !minSplashDone ||
    status === "idle" ||
    status === "restoring" ||
    !isOnboardingLoaded;
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
