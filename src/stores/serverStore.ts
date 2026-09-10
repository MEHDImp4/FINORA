import { create } from "zustand";
import {
  SavedAccount,
  serverManager,
  ServerManager
} from "../core/jellyfin/serverManager";
import { AuthSession } from "../core/jellyfin/authRepository";

export interface ServerState {
  savedAccounts: SavedAccount[];
  isLoading: boolean;
  errorMessage: string | null;

  // Actions
  loadSavedAccounts: () => Promise<void>;
  switchAccount: (serverId: string, userId: string) => Promise<AuthSession>;
  removeAccount: (serverId: string, userId: string) => Promise<void>;
}

export const useServerStore = create<ServerState>((set, get) => ({
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
    try {
      const session = await serverManager.switchAccount(serverId, userId);
      const accounts = await serverManager.getSavedAccounts();
      set({ savedAccounts: accounts, isLoading: false });
      return session;
    } catch (error) {
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
