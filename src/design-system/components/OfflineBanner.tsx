import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "./FinoraText";
import { colors, spacing } from "../tokens";
import { hapticService } from "../../core/feedback/hapticService";

export interface OfflineBannerProps {
  isOffline: boolean;
  message?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export function OfflineBanner({
  isOffline,
  message = "You are currently offline. Showing cached content.",
  onRetry,
  onDismiss
}: OfflineBannerProps) {
  const insets = useSafeAreaInsets();
  const [isDismissed, setIsDismissed] = useState(false);

  // Reset dismissed state whenever offline status re-triggers
  useEffect(() => {
    if (!isOffline) {
      setIsDismissed(false);
    }
  }, [isOffline]);

  if (!isOffline || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    hapticService.selection();
    setIsDismissed(true);
    onDismiss?.();
  };

  const handleRetry = () => {
    hapticService.impactLight();
    onRetry?.();
  };

  // Safe area top padding avoids front camera punch-holes (Xiaomi, Samsung, Dynamic Island)
  const topPadding = Math.max(insets.top, 12) + 6;

  return (
    <View
      style={[styles.container, { paddingTop: topPadding }]}
      accessibilityRole="alert"
      testID="offline-banner"
    >
      <View style={styles.contentRow}>
        <View style={styles.iconCircle}>
          <Ionicons
            name="cloud-offline-outline"
            size={16}
            color="#EF4444"
          />
        </View>

        <FinoraText variant="caption" weight="600" style={styles.message} numberOfLines={2}>
          {message}
        </FinoraText>

        <View style={styles.actionsGroup}>
          {Boolean(onRetry) && (
            <Pressable
              onPress={handleRetry}
              style={styles.actionButton}
              accessibilityRole="button"
              accessibilityLabel="Réessayer la connexion"
              hitSlop={8}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
            </Pressable>
          )}

          <Pressable
            onPress={handleDismiss}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel="Fermer le message"
            hitSlop={8}
          >
            <Ionicons name="close" size={18} color="rgba(255, 255, 255, 0.7)" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1C1215",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(239, 68, 68, 0.35)",
    paddingBottom: 10,
    paddingHorizontal: spacing.md,
    zIndex: 999
  },
  contentRow: {
    flexDirection: "row",
    alignItems: "center"
  },
  iconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm
  },
  message: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 12,
    lineHeight: 16
  },
  actionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginLeft: spacing.xs
  },
  actionButton: {
    padding: 5,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  }
});
