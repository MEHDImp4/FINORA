import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "../../design-system/components/FinoraText";
import { colors, spacing } from "../../design-system/tokens";
import { translate } from "../../i18n";
import { logger, sanitizeData } from "../network/logger";

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  /** Attempts to bring the user back to a known screen (e.g. the home tab). */
  onReturnHome?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * REL-01 — root error boundary.
 *
 * Guarantees FINORA never shows a blank screen when a render error escapes:
 * a minimal, translated fallback is shown with a working Retry (which remounts
 * the subtree) and an optional "Return home" action.
 *
 * Production never renders the error message or stack; development may show the
 * sanitized message to help debugging.
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error): void {
    // Never log tokens/URLs: the logger sanitizes every credential form.
    logger.error("[ErrorBoundary] Unhandled render error:", error?.message ?? error);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null });
  };

  private handleReturnHome = (): void => {
    this.setState({ hasError: false, error: null });
    try {
      this.props.onReturnHome?.();
    } catch {
      // Navigation is best effort — the boundary has already recovered the tree.
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const devMessage =
      process.env.NODE_ENV !== "production" && this.state.error?.message
        ? String(sanitizeData(this.state.error.message))
        : "";

    return (
      <View style={styles.container} testID="error-boundary">
        <Ionicons name="alert-circle-outline" size={54} color={colors.error} style={styles.icon} />
        <FinoraText variant="title" style={styles.title}>
          {translate("errors.boundaryTitle")}
        </FinoraText>
        <FinoraText variant="caption" style={styles.message}>
          {translate("errors.boundaryDesc")}
        </FinoraText>
        {Boolean(devMessage) && (
          <FinoraText variant="caption" style={styles.devMessage}>
            {devMessage}
          </FinoraText>
        )}

        <View style={styles.actions}>
          <Pressable
            style={styles.primaryButton}
            onPress={this.handleRetry}
            accessibilityRole="button"
            accessibilityLabel={translate("common.retry")}
            testID="error-boundary-retry"
          >
            <Ionicons name="refresh" size={18} color="#FFFFFF" style={styles.buttonIcon} />
            <FinoraText variant="body" style={styles.primaryButtonText}>
              {translate("common.retry")}
            </FinoraText>
          </Pressable>

          {Boolean(this.props.onReturnHome) && (
            <Pressable
              style={styles.secondaryButton}
              onPress={this.handleReturnHome}
              accessibilityRole="button"
              accessibilityLabel={translate("errors.boundaryReturnHome")}
              testID="error-boundary-home"
            >
              <Ionicons name="home-outline" size={18} color={colors.textPrimary} />
              <FinoraText variant="body" style={styles.secondaryButtonText}>
                {translate("errors.boundaryReturnHome")}
              </FinoraText>
            </Pressable>
          )}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0A0A0C",
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
    maxWidth: 320,
    marginBottom: spacing.lg
  },
  devMessage: {
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 320,
    marginBottom: spacing.md,
    fontStyle: "italic"
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  buttonIcon: {
    marginRight: spacing.xs
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontWeight: "600"
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: colors.border,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    marginLeft: spacing.xs,
    fontWeight: "600"
  }
});
