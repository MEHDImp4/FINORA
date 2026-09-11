import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "./FinoraText";
import { colors, spacing } from "../tokens";

export interface OfflineBannerProps {
  isOffline: boolean;
  message?: string;
  onRetry?: () => void;
}

export function OfflineBanner({
  isOffline,
  message = "You are currently offline. Showing cached content.",
  onRetry
}: OfflineBannerProps) {
  if (!isOffline) {
    return null;
  }

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Ionicons
        name="cloud-offline-outline"
        size={18}
        color="#FFFFFF"
        style={styles.icon}
      />
      <FinoraText variant="caption" style={styles.message} numberOfLines={2}>
        {message}
      </FinoraText>
      {Boolean(onRetry) && (
        <Pressable
          onPress={onRetry}
          style={styles.retryButton}
          accessibilityRole="button"
          accessibilityLabel="Retry network connection"
          hitSlop={8}
        >
          <Ionicons name="refresh" size={16} color="#FFFFFF" />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#A01B24", // subtle warning red
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    zIndex: 100
  },
  icon: {
    marginRight: spacing.sm
  },
  message: {
    flex: 1,
    color: "#FFFFFF",
    fontWeight: "600"
  },
  retryButton: {
    padding: 4,
    marginLeft: spacing.sm
  }
});
