import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { PublicUser } from "../../../core/jellyfin/authRepository";
import { getUserAvatarUrl } from "../../../core/repositories/imageUrlBuilder";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";

interface ProfilePickerViewProps {
  users: PublicUser[];
  serverUrl: string;
  activeUserId?: string;
  onSelectUser: (user: PublicUser) => void;
  onManualLoginPress?: () => void;
  isLoading?: boolean;
}

// Sophisticated, muted Netflix-style palette for fallbacks
const AVATAR_PALETTE = [
  "#E50914", // Netflix / Finora Red
  "#1E3A8A", // Deep Navy
  "#334155", // Slate Blue
  "#4C1D95", // Deep Purple
  "#1E293B", // Dark Charcoal
  "#831843", // Deep Rose
  "#0F766E"  // Deep Teal
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index];
}

export function ProfilePickerView({
  users,
  serverUrl,
  activeUserId,
  onSelectUser,
  onManualLoginPress,
  isLoading = false
}: ProfilePickerViewProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>{t("auth.scanningUsers")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t("auth.whoIsWatching")}</Text>
      </View>

      <View style={styles.grid}>
        {users.map((user) => {
          const isActive = activeUserId === user.id;
          const avatarUrl = user.primaryImageTag
            ? getUserAvatarUrl(serverUrl, user.id, user.primaryImageTag, 200)
            : "";
          const avatarBgColor = getAvatarColor(user.name);

          return (
            <Pressable
              key={user.id}
              style={({ pressed }) => [
                styles.profileTile,
                pressed && styles.profileTilePressed
              ]}
              onPress={() => {
                hapticService.selection();
                onSelectUser(user);
              }}
              accessibilityRole="button"
              accessibilityLabel={`${user.name}${user.hasPassword ? `, ${t("auth.passwordRequired")}` : ""}`}
            >
              <View style={[styles.avatarBox, isActive && styles.avatarBoxActive]}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatarImage}
                    contentFit="cover"
                    transition={200}
                  />
                ) : (
                  <View style={[styles.avatarFallback, { backgroundColor: avatarBgColor }]}>
                    <Text style={styles.avatarInitial}>
                      {(user.name[0] || "?").toUpperCase()}
                    </Text>
                  </View>
                )}

                {/* Subtle micro-lock indicator if password protected */}
                {user.hasPassword ? (
                  <View style={styles.microLockBadge} accessibilityLabel={t("auth.passwordRequired")}>
                    <Ionicons name="lock-closed" size={11} color="rgba(255, 255, 255, 0.85)" />
                  </View>
                ) : null}
              </View>

              <Text
                style={[styles.profileName, isActive && styles.profileNameActive]}
                numberOfLines={1}
              >
                {user.name}
              </Text>

              {/* Minimalist active profile indicator */}
              {isActive ? (
                <View style={styles.activeBadgeRow}>
                  <View style={styles.activeDot} />
                  <Text style={styles.activeBadgeText}>{t("auth.activeProfile")}</Text>
                </View>
              ) : null}
            </Pressable>
          );
        })}

        {/* Integrated "Autre compte" tile styled naturally within the Netflix grid */}
        {onManualLoginPress ? (
          <Pressable
            style={({ pressed }) => [
              styles.profileTile,
              pressed && styles.profileTilePressed
            ]}
            onPress={() => {
              hapticService.impactLight();
              onManualLoginPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={t("auth.addAccountTile")}
          >
            <View style={styles.addAccountBox}>
              <Ionicons name="add" size={38} color="rgba(255, 255, 255, 0.55)" />
            </View>
            <Text style={styles.addAccountLabel} numberOfLines={1}>
              {t("auth.addAccountTile")}
            </Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    alignItems: "center",
    paddingVertical: spacing.lg
  },
  loadingContainer: {
    paddingVertical: spacing.xxl,
    alignItems: "center",
    justifyContent: "center"
  },
  loadingText: {
    marginTop: spacing.md,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: "500"
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.xl
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.4,
    textAlign: "center"
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 24,
    width: "100%",
    maxWidth: 360
  },
  profileTile: {
    alignItems: "center",
    width: 100
  },
  profileTilePressed: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }]
  },
  avatarBox: {
    width: 96,
    height: 96,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "rgba(255, 255, 255, 0.05)"
  },
  avatarBoxActive: {
    borderColor: colors.primary,
    borderWidth: 2.5
  },
  avatarImage: {
    width: "100%",
    height: "100%"
  },
  avatarFallback: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "700"
  },
  microLockBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center"
  },
  profileName: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: "500",
    color: "#D4D4D8",
    textAlign: "center"
  },
  profileNameActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  activeBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.primary,
    marginRight: 4
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.primary,
    letterSpacing: 0.3
  },
  addAccountBox: {
    width: 96,
    height: 96,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.2)",
    borderStyle: "dashed",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    alignItems: "center",
    justifyContent: "center"
  },
  addAccountLabel: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "500",
    color: "rgba(255, 255, 255, 0.6)",
    textAlign: "center"
  }
});
