import React from "react";
import { View, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "./FinoraText";
import { colors, spacing } from "../tokens";
import { NetworkFailureType } from "../../core/network/networkStatusService";
import { hapticService } from "../../core/feedback/hapticService";

export interface NetworkFailureStateViewProps {
  failureType?: NetworkFailureType | null;
  onRetry?: () => void;
  isRetrying?: boolean;
  customTitle?: string;
  customMessage?: string;
  showDownloadsButton?: boolean;
  fullScreen?: boolean;
}

export function NetworkFailureStateView({
  failureType = "unknown",
  onRetry,
  isRetrying = false,
  customTitle,
  customMessage,
  showDownloadsButton = true,
  fullScreen = true
}: NetworkFailureStateViewProps) {
  const router = useRouter();

  const isNoInternet = failureType === "no_internet";
  const isServerDown = failureType === "server_unreachable";

  // Visual tokens depending on diagnosed failure
  const badgeText = isNoInternet
    ? "MODE HORS-LIGNE"
    : isServerDown
    ? "SERVEUR INDISPONIBLE"
    : "CONNEXION INTERROMPUE";

  const badgeColor = isNoInternet ? "#F59E0B" : isServerDown ? "#EF4444" : colors.primary;
  const badgeBg = isNoInternet
    ? "rgba(245, 158, 11, 0.15)"
    : isServerDown
    ? "rgba(239, 68, 68, 0.15)"
    : "rgba(139, 92, 246, 0.15)";

  const iconName: any = isNoInternet
    ? "cloud-offline-outline"
    : isServerDown
    ? "server-outline"
    : "wifi-outline";

  const defaultTitle = isNoInternet
    ? "Aucune connexion Internet"
    : isServerDown
    ? "Serveur Jellyfin injoignable"
    : "Impossible de joindre le serveur";

  const defaultMessage = isNoInternet
    ? "Votre appareil n'est pas connecté à Internet. Vérifiez votre Wi-Fi ou vos données mobiles, ou regardez vos contenus déjà téléchargés."
    : isServerDown
    ? "Votre serveur Jellyfin semble éteint ou inaccessible sur le réseau. Vous pouvez toujours visionner vos films et séries téléchargés."
    : "Une erreur réseau empêche le chargement du catalogue. Vos téléchargements hors-ligne restent disponibles.";

  const title = customTitle || defaultTitle;
  const message = customMessage || defaultMessage;

  const handleGoToDownloads = () => {
    hapticService.impactMedium();
    router.push("/(tabs)/downloads");
  };

  const handleRetry = () => {
    hapticService.impactLight();
    onRetry?.();
  };

  return (
    <View
      style={[styles.container, fullScreen && styles.fullScreen]}
      accessibilityRole="alert"
      testID="network-failure-state-view"
    >
      {/* Cinematic Status Badge */}
      <View style={[styles.badge, { backgroundColor: badgeBg, borderColor: badgeColor }]}>
        <View style={[styles.badgeDot, { backgroundColor: badgeColor }]} />
        <FinoraText variant="caption" weight="700" style={[styles.badgeLabel, { color: badgeColor }]}>
          {badgeText}
        </FinoraText>
      </View>

      {/* Hero Icon */}
      <View style={[styles.iconHalo, { backgroundColor: badgeBg }]}>
        <Ionicons name={iconName} size={48} color={badgeColor} />
      </View>

      {/* Cinematic Copy */}
      <FinoraText variant="title" weight="700" style={styles.title}>
        {title}
      </FinoraText>
      <FinoraText variant="caption" style={styles.message}>
        {message}
      </FinoraText>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        {showDownloadsButton && (
          <Pressable
            style={styles.primaryButton}
            onPress={handleGoToDownloads}
            accessibilityRole="button"
            accessibilityLabel="Regarder mes téléchargements hors-ligne"
            testID="failure-go-downloads-button"
          >
            <Ionicons name="download" size={18} color="#FFFFFF" style={styles.buttonIcon} />
            <FinoraText variant="body" weight="700" style={styles.primaryButtonText}>
              Regarder hors-ligne
            </FinoraText>
          </Pressable>
        )}

        {Boolean(onRetry) && (
          <Pressable
            style={[styles.secondaryButton, isRetrying && styles.secondaryButtonDisabled]}
            onPress={handleRetry}
            disabled={isRetrying}
            accessibilityRole="button"
            accessibilityLabel="Réessayer la connexion"
            testID="failure-retry-button"
          >
            {isRetrying ? (
              <ActivityIndicator size="small" color={colors.textPrimary} style={styles.buttonIcon} />
            ) : (
              <Ionicons name="refresh" size={18} color={colors.textPrimary} style={styles.buttonIcon} />
            )}
            <FinoraText variant="body" weight="600" style={styles.secondaryButtonText}>
              {isRetrying ? "Vérification..." : "Réessayer la connexion"}
            </FinoraText>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl
  },
  fullScreen: {
    flex: 1,
    minHeight: 400
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: spacing.lg
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6
  },
  badgeLabel: {
    fontSize: 11,
    letterSpacing: 0.8
  },
  iconHalo: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg
  },
  title: {
    color: colors.textPrimary,
    textAlign: "center",
    marginBottom: spacing.xs,
    fontSize: 20
  },
  message: {
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 20,
    marginBottom: spacing.xl
  },
  actionsContainer: {
    width: "100%",
    maxWidth: 290,
    gap: spacing.sm
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12
  },
  secondaryButtonDisabled: {
    opacity: 0.6
  },
  secondaryButtonText: {
    color: colors.textPrimary,
    fontSize: 14
  },
  buttonIcon: {
    marginRight: spacing.xs
  }
});
