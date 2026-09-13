import React from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  Dimensions
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useNotificationStore,
  FinoraNotification,
  NotificationType
} from "../../../stores/notificationStore";
import { colors, spacing } from "../../../design-system/tokens";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { hapticService } from "../../../core/feedback/hapticService";

interface NotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectMedia?: (mediaId: string) => void;
}

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
} {
  switch (type) {
    case "new_episode":
      return {
        iconName: "tv-outline",
        iconColor: "#8B5CF6",
        badgeBg: "rgba(139, 92, 246, 0.15)",
        badgeBorder: "rgba(139, 92, 246, 0.35)"
      };
    case "new_movie":
      return {
        iconName: "film-outline",
        iconColor: "#F59E0B",
        badgeBg: "rgba(245, 158, 11, 0.15)",
        badgeBorder: "rgba(245, 158, 11, 0.35)"
      };
    case "new_series":
      return {
        iconName: "sparkles-outline",
        iconColor: "#E50914",
        badgeBg: "rgba(229, 9, 20, 0.15)",
        badgeBorder: "rgba(229, 9, 20, 0.35)"
      };
    case "download_completed":
      return {
        iconName: "arrow-down-circle-outline",
        iconColor: "#10B981",
        badgeBg: "rgba(16, 185, 129, 0.15)",
        badgeBorder: "rgba(16, 185, 129, 0.35)"
      };
    case "test":
    default:
      return {
        iconName: "notifications-outline",
        iconColor: "#E0E0E6",
        badgeBg: "rgba(255, 255, 255, 0.1)",
        badgeBorder: "rgba(255, 255, 255, 0.25)"
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
          styles.itemContainer,
          !item.read && styles.itemUnread,
          pressed && styles.itemPressed
        ]}
        onPress={() => handlePressItem(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}, ${item.body}`}
      >
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: visuals.badgeBg,
              borderColor: visuals.badgeBorder
            }
          ]}
        >
          <Ionicons name={visuals.iconName} size={18} color={visuals.iconColor} />
        </View>

        <View style={styles.textColumn}>
          <View style={styles.titleRow}>
            <FinoraText
              variant="body"
              weight={item.read ? "600" : "700"}
              color={item.read ? "textPrimary" : "textPrimary"}
              style={styles.itemTitle}
              numberOfLines={1}
            >
              {item.title}
            </FinoraText>
            <FinoraText variant="caption" color="textSecondary" style={styles.timeText}>
              {formatRelativeTime(item.timestamp)}
            </FinoraText>
          </View>

          <FinoraText
            variant="caption"
            color="textSecondary"
            numberOfLines={2}
            style={styles.itemBody}
          >
            {item.body}
          </FinoraText>
        </View>

        <View style={styles.trailingCol}>
          {!item.read && <View style={styles.unreadDot} />}
          <Ionicons name="chevron-forward" size={16} color="rgba(255, 255, 255, 0.25)" />
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

        <View style={[styles.sheetContainer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Top handle bar */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <FinoraText variant="title" weight="800" color="textPrimary">
                Notifications
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
                  style={styles.actionBtn}
                  onPress={() => {
                    hapticService.impactLight();
                    markAllAsRead();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Tout marquer comme lu"
                >
                  <FinoraText variant="caption" color="primary" weight="600">
                    Tout lire
                  </FinoraText>
                </Pressable>
              )}

              {notifications.length > 0 && (
                <Pressable
                  style={styles.actionBtn}
                  onPress={() => {
                    hapticService.impactLight();
                    clearAll();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Vider l'historique"
                >
                  <FinoraText variant="caption" color="textSecondary" weight="500">
                    Effacer
                  </FinoraText>
                </Pressable>
              )}

              <Pressable
                style={styles.closeButton}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Fermer"
              >
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>

          {/* List or Empty State */}
          {notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="notifications-off-outline" size={32} color="rgba(255, 255, 255, 0.4)" />
              </View>
              <FinoraText variant="title" weight="700" color="textPrimary" style={styles.emptyTitle}>
                Aucune notification
              </FinoraText>
              <FinoraText variant="body" color="textSecondary" style={styles.emptySubtitle}>
                Vous serez alerté dès qu'un nouvel épisode, film ou téléchargement sera disponible.
              </FinoraText>
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
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
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    justifyContent: "flex-end"
  },
  sheetContainer: {
    maxHeight: "82%",
    backgroundColor: "rgba(18, 18, 26, 0.94)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.28)",
    paddingTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.45,
    shadowRadius: 18,
    elevation: 20
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
    alignSelf: "center",
    marginBottom: 12
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.08)"
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
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
    fontSize: 11,
    fontWeight: "800"
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  actionBtn: {
    paddingVertical: 4,
    paddingHorizontal: 6
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center"
  },
  listContent: {
    paddingVertical: 8
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "transparent"
  },
  itemUnread: {
    backgroundColor: "rgba(229, 9, 20, 0.05)"
  },
  itemPressed: {
    backgroundColor: "rgba(255, 255, 255, 0.08)"
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14
  },
  textColumn: {
    flex: 1,
    marginRight: 10
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4
  },
  itemTitle: {
    flex: 1,
    marginRight: 8
  },
  timeText: {
    fontSize: 11
  },
  itemBody: {
    lineHeight: 18
  },
  trailingCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E50914"
  },
  separator: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginLeft: 72
  },
  emptyContainer: {
    paddingVertical: 48,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
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
