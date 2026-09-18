import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "./FinoraText";
import { colors, spacing } from "../tokens";
import { useTranslation } from "../../i18n";

export interface ErrorStateViewProps {
  title?: string;
  error?: Error | string | null;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorStateView({
  title,
  error,
  onRetry,
  retryLabel
}: ErrorStateViewProps) {
  const { t } = useTranslation();
  const displayTitle = title || t("errors.genericErrorTitle");
  const displayRetryLabel = retryLabel || t("common.retry");
  const errorMessage =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";

  return (
    <View style={styles.container}>
      <Ionicons
        name="alert-circle-outline"
        size={54}
        color={colors.error}
        style={styles.icon}
      />
      <FinoraText variant="title" style={styles.title}>
        {displayTitle}
      </FinoraText>
      {Boolean(errorMessage) && (
        <FinoraText variant="caption" style={styles.message}>
          {errorMessage}
        </FinoraText>
      )}
      {Boolean(onRetry) && (
        <Pressable
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={displayRetryLabel}
        >
          <Ionicons name="refresh" size={18} color="#FFFFFF" style={styles.retryIcon} />
          <FinoraText variant="body" style={styles.retryText}>
            {displayRetryLabel}
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
    marginBottom: spacing.md
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
    maxWidth: 300,
    marginBottom: spacing.lg
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  retryIcon: {
    marginRight: spacing.xs
  },
  retryText: {
    color: "#FFFFFF",
    fontWeight: "600"
  }
});
