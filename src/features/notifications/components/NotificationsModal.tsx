import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Alert
} from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNotificationStore,
  FinoraNotification,
  NotificationType
} from "../../../stores/notificationStore";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMedia?: (mediaId: string) => void;
}

type FilterTab = "all" | "series" | "movies";

function formatRelativeTime(
  timestamp: number,
  t: (key: any, params?: Record<string, any>) => string
): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return t("notifications.timeJustNow");
  if (diffMins < 60) return t("notifications.timeMinutesAgo", { mins: diffMins });
  if (diffHours < 24) return t("notifications.timeHoursAgo", { hours: diffHours });
  if (diffDays === 1) return t("notifications.timeYesterday");
  if (diffDays < 7) return t("notifications.timeDaysAgo", { days: diffDays });

  const date = new Date(timestamp);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

function getNotificationVisuals(
  type: NotificationType,
  t: (key: any, params?: Record<string, any>) => string
): {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  badgeBg: string;
  badgeBorder: string;
  typeLabel: string;
} {
  switch (type) {
    case "new_episode":
      return {
        iconName: "tv-outline",
        iconColor: "#A78BFA",
        badgeBg: "rgba(167, 139, 250, 0.16)",
        badgeBorder: "rgba(167, 139, 250, 0.35)",
        typeLabel: t("notifications.badgeEpisode")
      };
    case "new_movie":
      return {
        iconName: "film-outline",
        iconColor: "#FBBF24",
        badgeBg: "rgba(251, 191, 36, 0.16)",
        badgeBorder: "rgba(251, 191, 36, 0.35)",
        typeLabel: t("notifications.badgeMovie")
      };
    case "new_series":
      return {
        iconName: "sparkles-outline",
        iconColor: "#E50914",
        badgeBg: "rgba(229, 9, 20, 0.16)",
        badgeBorder: "rgba(229, 9, 20, 0.35)",
        typeLabel: t("notifications.badgeSeries")
      };
    case "download_completed":
      return {
        iconName: "arrow-down-circle-outline",
        iconColor: "#34D399",
        badgeBg: "rgba(52, 211, 153, 0.16)",
        badgeBorder: "rgba(52, 211, 153, 0.35)",
        typeLabel: t("notifications.badgeDownloaded")
      };
    case "test":
    default:
      return {
        iconName: "notifications-outline",
        iconColor: "#E2E8F0",
        badgeBg: "rgba(255, 255, 255, 0.12)",
        badgeBorder: "rgba(255, 255, 255, 0.25)",
        typeLabel: t("notifications.badgeSystem")
      };
  }
}

export function NotificationsModal({
  visible,
  onClose,
  onSelectMedia
}: NotificationsModalProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const notifications = useNotificationStore((state) => state.notifications);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const markAsRead = useNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useNotificationStore((state) => state.markAllAsRead);
  const clearAll = useNotificationStore((state) => state.clearAll);

  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const filteredNotifications = useMemo(() => {
    if (activeTab === "series") {
      return notifications.filter(
        (n) => n.type === "new_episode" || n.type === "new_series"
      );
    }
    if (activeTab === "movies") {
      return notifications.filter((n) => n.type === "new_movie");
    }
    return notifications;
  }, [notifications, activeTab]);

  const handlePressItem = (item: FinoraNotification) => {
    hapticService.selection();
    markAsRead(item.id);
    onClose();
    if (item.mediaId && onSelectMedia) {
      onSelectMedia(item.mediaId);
    }
  };

  const handleClearAll = () => {
    hapticService.impactLight();
    Alert.alert(
      t("notifications.clearConfirmTitle"),
      t("notifications.clearConfirmDesc"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("notifications.clearButton"),
          style: "destructive",
          onPress: () => clearAll()
        }
      ]
    );
  };

  const renderItem = ({ item }: { item: FinoraNotification }) => {
    const visuals = getNotificationVisuals(item.type, t);

    return (
      <Pressable
        style={({ pressed }) => [
          styles.glassCard,
          !item.read && styles.glassCardUnread,
          pressed && styles.glassCardPressed
        ]}
        onPress={() => handlePressItem(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${item.body}`}
      >
        <View style={styles.thumbnailWrapper}>
          {item.posterUrl ? (
            <Image
              source={{ uri: item.posterUrl }}
              style={styles.posterImage}
              contentFit="cover"
              transition={200}
            />
          ) : (
            <View
              style={[
                styles.iconBadge,
                {
                  backgroundColor: visuals.badgeBg,
                  borderColor: visuals.badgeBorder
                }
              ]}
            >
              <Ionicons name={visuals.iconName} size={20} color={visuals.iconColor} />
            </View>
          )}

          {!item.read && <View style={styles.unreadGlowingDot} />}
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.typeBadge}>
              <Text style={[styles.typeBadgeText, { color: visuals.iconColor }]}>
                {visuals.typeLabel}
              </Text>
            </View>
            <FinoraText variant="caption" color="textSecondary" style={styles.timeText}>
              {formatRelativeTime(item.timestamp, t)}
            </FinoraText>
          </View>

          <FinoraText
            variant="body"
            weight={item.read ? "600" : "700"}
            color="textPrimary"
            style={styles.cardTitle}
            numberOfLines={1}
          >
            {item.title}
          </FinoraText>

          <FinoraText
            variant="caption"
            color="textSecondary"
            numberOfLines={2}
            style={styles.cardBody}
          >
            {item.body}
          </FinoraText>
        </View>

        <View style={styles.chevronCol}>
          <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.38)" />
        </View>
      </Pressable>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t("common.close")} />

        <View
          style={[
            styles.sheetContainer,
            {
              marginTop: Math.max(insets.top + 8, 16),
              marginBottom: Math.max(insets.bottom, 24)
            }
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <FinoraText variant="title" weight="800" color="textPrimary" style={styles.titleText}>
                {t("notifications.title")}
              </FinoraText>
              {unreadCount > 0 && (
                <View style={styles.countBadge}>
                  <Text style={styles.countText}>{unreadCount}</Text>
                </View>
              )}
            </View>

            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <Pressable
                  style={styles.headerIconButton}
                  hitSlop={4}
                  onPress={() => {
                    hapticService.impactLight();
                    markAllAsRead();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t("notifications.markAllRead")}
                >
                  <Ionicons name="checkmark-done" size={19} color="#FFFFFF" />
                </Pressable>
              )}

              {notifications.length > 0 && (
                <Pressable
                  style={styles.headerIconButton}
                  hitSlop={4}
                  onPress={handleClearAll}
                  accessibilityRole="button"
                  accessibilityLabel={t("notifications.clearAll")}
                >
                  <Ionicons name="trash-outline" size={18} color="#A0A0B2" />
                </Pressable>
              )}

              <Pressable
                style={styles.headerIconButton}
                hitSlop={4}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {notifications.length > 0 && (
            <View style={styles.tabsRow}>
              <Pressable
                style={[styles.filterPill, activeTab === "all" && styles.filterPillActive]}
                onPress={() => {
                  hapticService.selection();
                  setActiveTab("all");
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: activeTab === "all" }}
              >
                <Text style={[styles.filterPillText, activeTab === "all" && styles.filterPillTextActive]}>
                  {t("notifications.tabAllWithCount", { count: notifications.length })}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterPill, activeTab === "series" && styles.filterPillActive]}
                onPress={() => {
                  hapticService.selection();
                  setActiveTab("series");
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: activeTab === "series" }}
              >
                <Text style={[styles.filterPillText, activeTab === "series" && styles.filterPillTextActive]}>
                  {t("notifications.tabSeries")}
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterPill, activeTab === "movies" && styles.filterPillActive]}
                onPress={() => {
                  hapticService.selection();
                  setActiveTab("movies");
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: activeTab === "movies" }}
              >
                <Text style={[styles.filterPillText, activeTab === "movies" && styles.filterPillTextActive]}>
                  {t("notifications.tabMovies")}
                </Text>
              </Pressable>
            </View>
          )}

          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-outline" size={32} color="rgba(255, 255, 255, 0.42)" />
              </View>
              <FinoraText variant="title" weight="700" color="textPrimary" style={styles.emptyTitle}>
                {t("notifications.emptyTitle")}
              </FinoraText>
              <FinoraText variant="body" color="textSecondary" style={styles.emptySubtitle}>
                {t("notifications.emptyDesc")}
              </FinoraText>
            </View>
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FinoraText variant="body" color="textSecondary" style={styles.emptySubtitle}>
                {t("notifications.emptyCategoryDesc")}
              </FinoraText>
            </View>
          ) : (
            <FlatList
              data={filteredNotifications}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "flex-start",
    alignItems: "center"
  },
  sheetContainer: {
    width: "92%",
    maxWidth: 440,
    maxHeight: "82%",
    backgroundColor: "rgba(16, 16, 24, 0.97)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    paddingTop: 10,
    paddingBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 20,
    overflow: "hidden"
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    alignSelf: "center",
    marginBottom: 10
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 12
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginRight: 8
  },
  titleText: {
    fontSize: 20,
    letterSpacing: -0.3
  },
  countBadge: {
    backgroundColor: "#E50914",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  countText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900"
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  headerIconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1C1C26",
    borderWidth: 1,
    borderColor: "#282836",
    alignItems: "center",
    justifyContent: "center"
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 18,
    paddingBottom: 12,
    gap: 8
  },
  filterPill: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#161622",
    borderWidth: 1,
    borderColor: "#262634",
    alignItems: "center",
    justifyContent: "center"
  },
  filterPillActive: {
    backgroundColor: "#E50914",
    borderColor: "#E50914"
  },
  filterPillText: {
    color: "#A0A0B2",
    fontSize: 12,
    fontWeight: "600"
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 10
  },
  glassCard: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 84,
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#14141C",
    borderWidth: 1,
    borderColor: "#22222E"
  },
  glassCardUnread: {
    backgroundColor: "#1A1A24",
    borderColor: "rgba(229, 9, 20, 0.4)"
  },
  glassCardPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }]
  },
  thumbnailWrapper: {
    position: "relative",
    marginRight: 12
  },
  posterImage: {
    width: 48,
    height: 68,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  unreadGlowingDot: {
    position: "absolute",
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#E50914",
    borderWidth: 2,
    borderColor: "#101018"
  },
  cardContent: {
    flex: 1,
    marginRight: 6
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  typeBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.06)"
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6
  },
  timeText: {
    fontSize: 11
  },
  cardTitle: {
    fontSize: 14,
    marginBottom: 2
  },
  cardBody: {
    fontSize: 12,
    lineHeight: 16
  },
  chevronCol: {
    paddingLeft: 4
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: "center"
  },
  emptySubtitle: {
    textAlign: "center",
    lineHeight: 20
  }
});
