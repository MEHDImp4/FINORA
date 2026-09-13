import React, { useState, useMemo } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList
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

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMedia?: (mediaId: string) => void;
}

type FilterTab = "all" | "series" | "movies";

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "À l'instant";
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} j`;

  const date = new Date(timestamp);
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1)
    .toString()
    .padStart(2, "0")}`;
}

function getNotificationVisuals(type: NotificationType): {
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
        typeLabel: "ÉPISODE"
      };
    case "new_movie":
      return {
        iconName: "film-outline",
        iconColor: "#FBBF24",
        badgeBg: "rgba(251, 191, 36, 0.16)",
        badgeBorder: "rgba(251, 191, 36, 0.35)",
        typeLabel: "FILM"
      };
    case "new_series":
      return {
        iconName: "sparkles-outline",
        iconColor: "#E50914",
        badgeBg: "rgba(229, 9, 20, 0.16)",
        badgeBorder: "rgba(229, 9, 20, 0.35)",
        typeLabel: "SÉRIE"
      };
    case "download_completed":
      return {
        iconName: "arrow-down-circle-outline",
        iconColor: "#34D399",
        badgeBg: "rgba(52, 211, 153, 0.16)",
        badgeBorder: "rgba(52, 211, 153, 0.35)",
        typeLabel: "TÉLÉCHARGÉ"
      };
    case "test":
    default:
      return {
        iconName: "notifications-outline",
        iconColor: "#E2E8F0",
        badgeBg: "rgba(255, 255, 255, 0.12)",
        badgeBorder: "rgba(255, 255, 255, 0.25)",
        typeLabel: "SYSTÈME"
      };
  }
}

export function NotificationsModal({
  visible,
  onClose,
  onSelectMedia
}: NotificationsModalProps) {
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

  const renderItem = ({ item }: { item: FinoraNotification }) => {
    const visuals = getNotificationVisuals(item.type);

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
        {/* Poster thumbnail or stylized liquid icon */}
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

        {/* Content */}
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.typeBadge}>
              <Text style={[styles.typeBadgeText, { color: visuals.iconColor }]}>
                {visuals.typeLabel}
              </Text>
            </View>
            <FinoraText variant="caption" color="textSecondary" style={styles.timeText}>
              {formatRelativeTime(item.timestamp)}
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
          <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.3)" />
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
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          {/* Top Apple Handle */}
          <View style={styles.handle} />

          {/* Dynamic Island Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <View style={styles.titleGlassPill}>
                <Ionicons name="notifications" size={16} color="#E50914" />
                <FinoraText variant="title" weight="800" color="textPrimary" style={styles.titleText}>
                  Activité
                </FinoraText>
                {unreadCount > 0 && (
                  <View style={styles.countBadge}>
                    <Text style={styles.countText}>{unreadCount}</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.headerActions}>
              {unreadCount > 0 && (
                <Pressable
                  style={styles.glassActionButton}
                  onPress={() => {
                    hapticService.impactLight();
                    markAllAsRead();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Tout marquer comme lu"
                >
                  <Ionicons name="checkmark-done" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
                  <FinoraText variant="caption" color="textPrimary" weight="600">
                    Lu
                  </FinoraText>
                </Pressable>
              )}

              {notifications.length > 0 && (
                <Pressable
                  style={styles.glassActionButton}
                  onPress={() => {
                    hapticService.impactLight();
                    clearAll();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Vider l'historique"
                >
                  <Ionicons name="trash-outline" size={13} color="rgba(255, 255, 255, 0.7)" style={{ marginRight: 3 }} />
                  <FinoraText variant="caption" color="textSecondary" weight="500">
                    Effacer
                  </FinoraText>
                </Pressable>
              )}

              <Pressable
                style={styles.closeGlassButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* Liquid Glass Filter Tabs */}
          {notifications.length > 0 && (
            <View style={styles.tabsRow}>
              <Pressable
                style={[styles.filterPill, activeTab === "all" && styles.filterPillActive]}
                onPress={() => {
                  hapticService.selection();
                  setActiveTab("all");
                }}
              >
                <Text style={[styles.filterPillText, activeTab === "all" && styles.filterPillTextActive]}>
                  Tous ({notifications.length})
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterPill, activeTab === "series" && styles.filterPillActive]}
                onPress={() => {
                  hapticService.selection();
                  setActiveTab("series");
                }}
              >
                <Text style={[styles.filterPillText, activeTab === "series" && styles.filterPillTextActive]}>
                  Séries
                </Text>
              </Pressable>

              <Pressable
                style={[styles.filterPill, activeTab === "movies" && styles.filterPillActive]}
                onPress={() => {
                  hapticService.selection();
                  setActiveTab("movies");
                }}
              >
                <Text style={[styles.filterPillText, activeTab === "movies" && styles.filterPillTextActive]}>
                  Films
                </Text>
              </Pressable>
            </View>
          )}

          {/* List or Empty State */}
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-outline" size={32} color="rgba(255, 255, 255, 0.35)" />
              </View>
              <FinoraText variant="title" weight="700" color="textPrimary" style={styles.emptyTitle}>
                Tout est à jour
              </FinoraText>
              <FinoraText variant="body" color="textSecondary" style={styles.emptySubtitle}>
                Vous serez notifié des nouveaux épisodes de vos séries en cours et des ajouts récents.
              </FinoraText>
            </View>
          ) : filteredNotifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FinoraText variant="body" color="textSecondary" style={styles.emptySubtitle}>
                Aucune notification dans cette catégorie.
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
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "flex-end"
  },
  sheetContainer: {
    maxHeight: "86%",
    backgroundColor: "rgba(16, 16, 24, 0.94)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.28)",
    borderLeftWidth: 1,
    borderLeftColor: "rgba(255, 255, 255, 0.12)",
    borderRightWidth: 1,
    borderRightColor: "rgba(255, 255, 255, 0.12)",
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.6,
    shadowRadius: 24,
    elevation: 24
  },
  handle: {
    width: 36,
    height: 4.5,
    borderRadius: 3,
    backgroundColor: "rgba(255, 255, 255, 0.28)",
    alignSelf: "center",
    marginBottom: 14
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center"
  },
  titleGlassPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)"
  },
  titleText: {
    fontSize: 18,
    letterSpacing: -0.3
  },
  countBadge: {
    backgroundColor: "#E50914",
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 10,
    minWidth: 18,
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
    gap: 8
  },
  glassActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)"
  },
  closeGlassButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255, 255, 255, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.20)",
    alignItems: "center",
    justifyContent: "center"
  },
  tabsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 8
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.10)"
  },
  filterPillActive: {
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(255, 255, 255, 0.35)"
  },
  filterPillText: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 12,
    fontWeight: "600"
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  listContent: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    gap: 10
  },
  glassCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 20,
    backgroundColor: "rgba(26, 26, 38, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    borderTopColor: "rgba(255, 255, 255, 0.24)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8
  },
  glassCardUnread: {
    backgroundColor: "rgba(34, 34, 52, 0.88)",
    borderColor: "rgba(229, 9, 20, 0.35)",
    borderTopColor: "rgba(255, 255, 255, 0.38)"
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
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
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
