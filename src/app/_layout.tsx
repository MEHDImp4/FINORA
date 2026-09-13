import "react-native-url-polyfill/auto";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useAuthStore } from "../stores/authStore";
import { QueryProvider } from "../providers/QueryProvider";
import { offlineSyncManager } from "../features/offline/offlineSyncManager";
import { offlineStorageService } from "../features/offline/offlineStorage";

export default function RootLayout() {
  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const restoreSession = useAuthStore((state) => state.restoreSession);
  const [minSplashDone, setMinSplashDone] = React.useState(false);

  useEffect(() => {
    restoreSession();
    // Auto-cleanup watched downloads older than 48h (2-3 days policy)
    offlineStorageService.cleanupExpiredWatchedMedia(48).catch(() => {});

    // Ensure splash screen remains visible for at least 2 seconds
    const timer = setTimeout(() => {
      setMinSplashDone(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [restoreSession]);

  useEffect(() => {
    if (status === "authenticated" && session?.userId) {
      offlineSyncManager.syncPendingProgress(session.userId).catch(() => {});
      offlineStorageService.cleanupExpiredWatchedMedia(48).catch(() => {});
    }
  }, [status, session?.userId]);

  const showSplash = !minSplashDone || status === "idle" || status === "restoring";

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
