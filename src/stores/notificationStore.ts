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

const STORAGE_KEY_NOTIFS = "@finora_notifications";
const STORAGE_KEY_PREFS = "@finora_notification_prefs";
const MAX_STORED_NOTIFICATIONS = 50;

export interface NotificationState {
  notifications: FinoraNotification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  hasPermissions: boolean;
  isLoaded: boolean;

  // Actions
  addNotification: (
    notif: Omit<FinoraNotification, "id" | "timestamp" | "read"> & {
      id?: string;
      timestamp?: number;
    }
  ) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
  updatePreferences: (partial: Partial<NotificationPreferences>) => void;
  setHasPermissions: (granted: boolean) => void;
  loadPersisted: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  preferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  hasPermissions: false,
  isLoaded: false,

  addNotification: (notifData) => {
    const newNotif: FinoraNotification = {
      id: notifData.id || `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      timestamp: notifData.timestamp || Date.now(),
      read: false,
      ...notifData
    };

    set((state) => {
      // Deduplicate by ID if already exists
      const filtered = state.notifications.filter((n) => n.id !== newNotif.id);
      const updated = [newNotif, ...filtered].slice(0, MAX_STORED_NOTIFICATIONS);
      const unreadCount = updated.filter((n) => !n.read).length;

      // Async persist
      AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(updated)).catch(() => {});

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

      AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(updated)).catch(() => {});

      return {
        notifications: updated,
        unreadCount
      };
    });
  },

  markAllAsRead: () => {
    set((state) => {
      const updated = state.notifications.map((n) => ({ ...n, read: true }));
      AsyncStorage.setItem(STORAGE_KEY_NOTIFS, JSON.stringify(updated)).catch(() => {});
      return {
        notifications: updated,
        unreadCount: 0
      };
    });
  },

  clearAll: () => {
    set(() => {
      AsyncStorage.removeItem(STORAGE_KEY_NOTIFS).catch(() => {});
      return {
        notifications: [],
        unreadCount: 0
      };
    });
  },

  updatePreferences: (partial) => {
    set((state) => {
      const updated = { ...state.preferences, ...partial };
      AsyncStorage.setItem(STORAGE_KEY_PREFS, JSON.stringify(updated)).catch(() => {});
      return { preferences: updated };
    });
  },

  setHasPermissions: (granted) => {
    set({ hasPermissions: granted });
  },

  loadPersisted: async () => {
    try {
      const [notifsJson, prefsJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_NOTIFS),
        AsyncStorage.getItem(STORAGE_KEY_PREFS)
      ]);

      let notifs: FinoraNotification[] = [];
      if (notifsJson) {
        try {
          notifs = JSON.parse(notifsJson);
        } catch {
          notifs = [];
        }
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
      set({ isLoaded: true });
    }
  }
}));
