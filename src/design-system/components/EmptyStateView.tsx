import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "./FinoraText";
import { colors, spacing } from "../tokens";

export interface EmptyStateViewProps {
  iconName?: string;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyStateView({
  iconName = "film-outline",
  title,
  message,
  actionLabel,
  onAction
}: EmptyStateViewProps) {
  return (
    <View style={styles.container}>
      <Ionicons
        name={iconName as any}
        size={54}
        color={colors.textSecondary}
        style={styles.icon}
      />
      <FinoraText variant="title" style={styles.title}>
        {title}
      </FinoraText>
      {Boolean(message) && (
        <FinoraText variant="caption" style={styles.message}>
          {message}
        </FinoraText>
      )}
      {Boolean(actionLabel && onAction) && (
        <Pressable
          style={styles.actionButton}
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
        >
          <FinoraText variant="body" style={styles.actionText}>
            {actionLabel}
          </FinoraText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl
  },
  icon: {
    marginBottom: spacing.md,
    opacity: 0.8
  },
  title: {
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xs
  },
  message: {
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 280,
    marginBottom: spacing.lg
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "600"
  }
});
