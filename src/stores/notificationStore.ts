import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type NotificationType =
  | "new_episode"
  | "new_movie"
  | "new_series"
  | "download_completed"
  | "test";

export interface FinoraNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  mediaId?: string;
  seriesId?: string;
  seriesName?: string;
  /**
   * Runtime-only convenience URL. Jellyfin image URLs can contain api_key, so
   * this field is deliberately stripped before anything is persisted.
   */
  posterUrl?: string;
  seasonIndex?: number;
  episodeIndex?: number;
}

export interface NotificationPreferences {
  enabled: boolean;
  newEpisodes: boolean;
  newMovies: boolean;
  newSeries: boolean;
  downloadsCompleted: boolean;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  enabled: true,
  newEpisodes: true,
  newMovies: true,
  newSeries: true,
  downloadsCompleted: true
};

/** Legacy unscoped inbox key. Removed during v2 migration because it may contain tokenized poster URLs. */
export const LEGACY_NOTIFICATION_STORAGE_KEY = "@finora_notifications";
export const NOTIFICATION_PREFS_STORAGE_KEY = "@finora_notification_prefs";
const STORAGE_KEY_NOTIFS_PREFIX = "@finora_notifications_v2";
const MAX_STORED_NOTIFICATIONS = 50;

export function getNotificationStorageKey(serverId: string, userId: string): string {
  return `${STORAGE_KEY_NOTIFS_PREFIX}:${encodeURIComponent(serverId)}:${encodeURIComponent(userId)}`;
}

function sanitizeForPersistence(notification: FinoraNotification): Omit<FinoraNotification, "posterUrl"> {
  // posterUrl can embed Jellyfin api_key. Never serialize it to AsyncStorage.
  const { posterUrl: _posterUrl, ...safeNotification } = notification;
  return safeNotification;
}

function serializeSafeNotifications(notifications: FinoraNotification[]): string {
  return JSON.stringify(notifications.map(sanitizeForPersistence));
}

function parseNotifications(raw: string | null): FinoraNotification[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item === "object" && typeof item.id === "string")
      .map((item) => {
        // Migration hardening: even if an old scoped payload somehow included posterUrl,
        // drop it on read so a tokenized URL never gets re-persisted.
        const { posterUrl: _posterUrl, ...safe } = item as FinoraNotification;
        return safe as FinoraNotification;
      });
  } catch {
    return [];
  }
}

async function persistScopedNotifications(
  scopeKey: string | null,
  notifications: FinoraNotification[]
): Promise<void> {
  if (!scopeKey) return;
  await AsyncStorage.setItem(scopeKey, serializeSafeNotifications(notifications));
}

export async function removePersistedNotificationScope(
  serverId: string,
  userId: string
): Promise<void> {
  await AsyncStorage.removeItem(getNotificationStorageKey(serverId, userId));
}

export interface NotificationState {
  notifications: FinoraNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  hasPermissions: boolean;
  isLoaded: boolean;
  activeScopeKey: string | null;

  addNotification: (
    notif: Omit<FinoraNotification, "id" | "timestamp" | "read"> & {
      id?: string;
      timestamp?: number;
    }
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  updatePreferences: (partial: Partial<NotificationPreferences>) => Promise<void>;
  setHasPermissions: (granted: boolean) => void;
  loadPersisted: (serverId?: string, userId?: string) => Promise<void>;
  resetActiveScope: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  hasPermissions: false,
  isLoaded: false,
  activeScopeKey: null,

  addNotification: (notifData) => {
    const newNotif: FinoraNotification = {
      id: notifData.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: notifData.timestamp || Date.now(),
      read: false,
      ...notifData
    };

    set((state) => {
      const filtered = state.notifications.filter((n) => n.id !== newNotif.id);
      const updated = [newNotif, ...filtered].slice(0, MAX_STORED_NOTIFICATIONS);
      const unreadCount = updated.filter((n) => !n.read).length;

      persistScopedNotifications(state.activeScopeKey, updated).catch(() => {});

      return {
        notifications: updated,
        unreadCount
      };
    });
  },

  markAsRead: (id: string) => {
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      );
      const unreadCount = updated.filter((n) => !n.read).length;

      persistScopedNotifications(state.activeScopeKey, updated).catch(() => {});

      return {
        notifications: updated,
        unreadCount
      };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      persistScopedNotifications(state.activeScopeKey, updated).catch(() => {});
      return {
        notifications: updated,
        unreadCount: 0
      };
    });
  },

  clearAll: () => {
    const scopeKey = get().activeScopeKey;
    set({ notifications: [], unreadCount: 0 });
    if (scopeKey) {
      AsyncStorage.removeItem(scopeKey).catch(() => {});
    }
  },

  updatePreferences: async (partial) => {
    const updated = { ...get().preferences, ...partial };
    set({ preferences: updated });
    await AsyncStorage.setItem(NOTIFICATION_PREFS_STORAGE_KEY, JSON.stringify(updated));
  },

  setHasPermissions: (granted) => {
    set({ hasPermissions: granted });
  },

  loadPersisted: async (serverId, userId) => {
    const scopeKey = serverId && userId ? getNotificationStorageKey(serverId, userId) : null;
    set({ activeScopeKey: scopeKey, isLoaded: false });

    try {
      const [scopedNotifsJson, legacyNotifsJson, prefsJson] = await Promise.all([
        scopeKey ? AsyncStorage.getItem(scopeKey) : Promise.resolve(null),
        AsyncStorage.getItem(LEGACY_NOTIFICATION_STORAGE_KEY),
        AsyncStorage.getItem(NOTIFICATION_PREFS_STORAGE_KEY)
      ]);

      // If a different account became active while storage was loading, discard this result.
      if (get().activeScopeKey !== scopeKey) return;

      let notifs = parseNotifications(scopedNotifsJson);

      // The legacy inbox was global and could include posterUrl?api_key=... . Do not assign it
      // to an arbitrary account. Delete it and start the scoped inbox clean.
      if (legacyNotifsJson !== null) {
        await AsyncStorage.removeItem(LEGACY_NOTIFICATION_STORAGE_KEY).catch(() => {});
      }

      // Rewrite any existing scoped payload in sanitized form so upgrades scrub posterUrl.
      if (scopeKey && scopedNotifsJson) {
        await persistScopedNotifications(scopeKey, notifs).catch(() => {});
      }

      let prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES };
      if (prefsJson) {
        try {
          prefs = { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(prefsJson) };
        } catch {
          // Keep defaults
        }
      }

      set({
        notifications: notifs,
        unreadCount: notifs.filter((n) => !n.read).length,
        preferences: prefs,
        isLoaded: true
      });
    } catch {
      if (get().activeScopeKey === scopeKey) {
        set({ notifications: [], unreadCount: 0, isLoaded: true });
      }
    }
  },

  resetActiveScope: () => {
    set({
      notifications: [],
      unreadCount: 0,
      activeScopeKey: null,
      isLoaded: false
    });
  }
}));
