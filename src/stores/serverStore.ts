import { create } from "zustand";
import {
  SavedAccount,
  SavedServer,
  serverManager
} from "../core/jellyfin/serverManager";
import { AuthSession } from "../core/jellyfin/authRepository";
import {
  autoDetectServerConnection,
  isLocalNetworkHost,
  ServerConnectionDetectionResult
} from "../core/jellyfin/serverDiscovery";
import { queryClient } from "../providers/QueryProvider";
import { useAuthStore } from "./authStore";
import {
  removePersistedNotificationScope,
  useNotificationStore
} from "./notificationStore";
import { downloadManager } from "../features/offline/downloadManager";

export interface ServerState {
  savedAccounts: SavedAccount[];
  savedServers: SavedServer[];
  isLocalConnection: boolean;
  activeResolvedUrl: string | null;
  isLoading: boolean;
  errorMessage: string | null;

  loadSavedAccounts: () => Promise<void>;
  loadSavedServers: () => Promise<void>;
  saveServer: (server: SavedServer) => Promise<void>;
  removeServer: (serverId: string) => Promise<void>;
  switchAccount: (serverId: string, userId: string) => Promise<AuthSession>;
  removeAccount: (serverId: string, userId: string) => Promise<void>;
  autoDetectActiveConnection: (serverId?: string) => Promise<ServerConnectionDetectionResult>;
}

export const useServerStore = create<ServerState>((set, get) => ({
  savedAccounts: [],
  savedServers: [],
  isLocalConnection: false,
  activeResolvedUrl: null,
  isLoading: false,
  errorMessage: null,

  loadSavedAccounts: async () => {
    set({ isLoading: true, errorMessage: null });
    try {
      const [accounts, servers] = await Promise.all([
        serverManager.getSavedAccounts(),
        serverManager.getSavedServers()
      ]);
      set({ savedAccounts: accounts, savedServers: servers, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: (error as Error).message || "Failed to load saved accounts"
      });
    }
  },

  loadSavedServers: async () => {
    try {
      const servers = await serverManager.getSavedServers();
      set({ savedServers: servers });
    } catch (error) {
      set({
        errorMessage: (error as Error).message || "Failed to load saved servers"
      });
    }
  },

  saveServer: async (server: SavedServer) => {
    try {
      await serverManager.saveServer(server);
      const servers = await serverManager.getSavedServers();
      set({ savedServers: servers });
    } catch (error) {
      set({
        errorMessage: (error as Error).message || "Failed to save server"
      });
    }
  },

  removeServer: async (serverId: string) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const active = useAuthStore.getState().session;
      if (active?.serverId === serverId) {
        // Removing the active server: stop its downloads first.
        await downloadManager.handleIdentityChange().catch(() => {});
      }

      await serverManager.removeServer(serverId);
      const [servers, accounts] = await Promise.all([
        serverManager.getSavedServers(),
        serverManager.getSavedAccounts()
      ]);
      set({ savedServers: servers, savedAccounts: accounts, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        errorMessage: (error as Error).message || "Failed to remove server"
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

      // Stop and detach the previous account's downloads before the singleton
      // Jellyfin client changes identity.
      await downloadManager.handleIdentityChange().catch(() => {});

      const session = await serverManager.switchAccount(serverId, userId);
      await useNotificationStore.getState().loadPersisted(session.serverId, session.userId);

      useAuthStore.getState().adoptSession(session);

      // Load the new account's own download queue (never the previous one).
      await downloadManager.initialize().catch(() => {});

      const accounts = await serverManager.getSavedAccounts();
      const isLocal = isLocalNetworkHost(new URL(session.serverUrl).hostname);
      set({
        savedAccounts: accounts,
        isLoading: false,
        activeResolvedUrl: session.serverUrl,
        isLocalConnection: isLocal
      });
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
      const active = useAuthStore.getState().session;
      if (active?.serverId === serverId && active?.userId === userId) {
        // Removing the signed-in account: stop its downloads first.
        await downloadManager.handleIdentityChange().catch(() => {});
      }

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
  },

  autoDetectActiveConnection: async (serverId?: string) => {
    const servers = get().savedServers;
    const session = useAuthStore.getState().session;
    const targetServerId = serverId || session?.serverId;
    const currentServer = servers.find((s) => s.id === targetServerId);

    const localUrl = currentServer?.localUrl;
    const remoteUrl = currentServer?.remoteUrl;
    const fallbackUrl = currentServer?.url || session?.serverUrl;

    const result = await autoDetectServerConnection(localUrl, remoteUrl, fallbackUrl);

    set({
      isLocalConnection: result.isLocal,
      activeResolvedUrl: result.activeUrl
    });

    return result;
  }
}));
