import { create } from "zustand";
import {
  SavedAccount,
  serverManager
} from "../core/jellyfin/serverManager";
import { AuthSession } from "../core/jellyfin/authRepository";
import { queryClient } from "../providers/QueryProvider";
import { useAuthStore } from "./authStore";
import {
  removePersistedNotificationScope,
  useNotificationStore
} from "./notificationStore";

export interface ServerState {
  savedAccounts: SavedAccount[];
  isLoading: boolean;
  errorMessage: string | null;

  loadSavedAccounts: () => Promise<void>;
  switchAccount: (serverId: string, userId: string) => Promise<AuthSession>;
  removeAccount: (serverId: string, userId: string) => Promise<void>;
}

export const useServerStore = create<ServerState>((set) => ({
  savedAccounts: [],
  isLoading: false,
  errorMessage: null,

  loadSavedAccounts: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const accounts = await serverManager.getSavedAccounts();
      set({ savedAccounts: accounts, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: (error as Error).message || "Failed to load saved accounts"
      });
    }
  },

  switchAccount: async (serverId, userId) => {
    set({ isLoading: true, errorMessage: null });
    const previousSession = useAuthStore.getState().session;

    // Unmount authenticated screens while the singleton Jellyfin client changes.
    // This prevents old hooks from issuing requests with the new token/server.
    useAuthStore.setState({ status: "restoring", errorMessage: null });

    try {
      await queryClient.cancelQueries().catch(() => {});
      queryClient.clear();
      useNotificationStore.getState().resetActiveScope();

      const session = await serverManager.switchAccount(serverId, userId);
      await useNotificationStore.getState().loadPersisted(session.serverId, session.userId);

      useAuthStore.getState().adoptSession(session);

      const accounts = await serverManager.getSavedAccounts();
      set({ savedAccounts: accounts, isLoading: false });
      return session;
    } catch (error) {
      // Switching can fail before ServerManager changes the singleton client
      // (missing account/token). Restore the previous UI identity in that case.
      useAuthStore.setState({
        status: previousSession ? "authenticated" : "unauthenticated",
        session: previousSession,
        errorMessage: null
      });

      if (previousSession) {
        await useNotificationStore
          .getState()
          .loadPersisted(previousSession.serverId, previousSession.userId)
          .catch(() => {});
      }

      set({
        isLoading: false,
        errorMessage: (error as Error).message || "Failed to switch account"
      });
      throw error;
    }
  },

  removeAccount: async (serverId, userId) => {
    set({ isLoading: true, errorMessage: null });
    try {
      await serverManager.removeAccount(serverId, userId);
      await removePersistedNotificationScope(serverId, userId).catch(() => {});
      const accounts = await serverManager.getSavedAccounts();
      set({ savedAccounts: accounts, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: (error as Error).message || "Failed to remove account"
      });
    }
  }
}));
