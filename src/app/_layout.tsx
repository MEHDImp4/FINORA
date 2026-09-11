import "react-native-url-polyfill/auto";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useAuthStore } from "../stores/authStore";
import { QueryProvider } from "../providers/QueryProvider";
import { offlineSyncManager } from "../features/offline/offlineSyncManager";

export default function RootLayout() {
  const status = useAuthStore((state) => state.status);
  const session = useAuthStore((state) => state.session);
  const restoreSession = useAuthStore((state) => state.restoreSession);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (status === "authenticated" && session?.userId) {
      offlineSyncManager.syncPendingProgress(session.userId).catch(() => {});
    }
  }, [status, session?.userId]);

  return (
    <SafeAreaProvider>
      <QueryProvider>
        <View style={styles.container}>
          <StatusBar style="light" backgroundColor="#0A0A0C" />
          {status === "idle" || status === "restoring" ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#E50914" />
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
  }
});
