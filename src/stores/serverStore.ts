import { create } from "zustand";
import {
  SavedAccount,
  SavedServer,
  serverManager
} from "../core/jellyfin/serverManager";
import { AuthSession } from "../core/jellyfin/authRepository";
import {
  clearActiveIdentity,
  restoreActiveIdentity,
  runIdentityTransition
} from "../core/jellyfin/identityTransition";
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
import { offlineStorageService } from "../features/offline/offlineStorage";

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

      // A server removal also removes its accounts: capture them first so their
      // downloads can be purged from disk (server + user scoped).
      const accountsToPurge = (await serverManager.getSavedAccounts()).filter(
        (account) => account.serverId === serverId
      );

      await serverManager.removeServer(serverId);

      for (const account of accountsToPurge) {
        await offlineStorageService
          .purgeScope({ serverId: account.serverId, userId: account.userId })
          .catch(() => {});
      }

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

  switchAccount: async (serverId, userId) =>
    runIdentityTransition(async () => {
      set({ isLoading: true, errorMessage: null });
      const previousSession = useAuthStore.getState().session;

      // Remove the old identity from the render tree before the singleton client
      // can change. Old hooks therefore cannot issue requests with target creds.
      useAuthStore.setState({
        status: "restoring",
        session: null,
        errorMessage: null
      });

      try {
        await queryClient.cancelQueries().catch(() => {});
        queryClient.clear();
        useNotificationStore.getState().resetActiveScope();

        // Stop and persist the previous account's transfers before credentials
        // change. A failure here aborts the switch instead of risking cross-talk.
        await downloadManager.handleIdentityChange();

        const session = await serverManager.switchAccount(serverId, userId);

        // Prepare all identity-scoped services before publishing the new account.
        await useNotificationStore
          .getState()
          .loadPersisted(session.serverId, session.userId);
        await downloadManager.initialize();

        const accounts = await serverManager.getSavedAccounts();
        const isLocal = isLocalNetworkHost(new URL(session.serverUrl).hostname);

        useAuthStore.getState().adoptSession(session);
        set({
          savedAccounts: accounts,
          isLoading: false,
          activeResolvedUrl: session.serverUrl,
          isLocalConnection: isLocal
        });
        return session;
      } catch (error) {
        // The target session may already have been persisted/applied before a
        // later scoped service failed. Tear it down before restoring the source.
        await downloadManager.handleIdentityChange().catch(() => {});
        useNotificationStore.getState().resetActiveScope();

        let rollbackSucceeded = false;
        if (previousSession) {
          try {
            const restored = await restoreActiveIdentity(previousSession);
            await useNotificationStore
              .getState()
              .loadPersisted(restored.serverId, restored.userId);
            await downloadManager.initialize();
            useAuthStore.setState({
              status: "authenticated",
              session: restored,
              errorMessage: null
            });
            rollbackSucceeded = true;
          } catch {
            // Fall through to fail-closed cleanup below.
          }
        }

        if (!rollbackSucceeded) {
          await clearActiveIdentity();
          useNotificationStore.getState().resetActiveScope();
          useAuthStore.setState({
            status: "unauthenticated",
            session: null,
            errorMessage: null
          });
        }

        set({
          isLoading: false,
          errorMessage: (error as Error).message || "Failed to switch account"
        });
        throw error;
      }
    }),

  removeAccount: async (serverId, userId) => {
    set({ isLoading: true, errorMessage: null });
    try {
      const active = useAuthStore.getState().session;
      if (active?.serverId === serverId && active?.userId === userId) {
        // Removing the signed-in account: stop its downloads first.
        await downloadManager.handleIdentityChange().catch(() => {});
      }

      await serverManager.removeAccount(serverId, userId);
      // Removing an account ALSO purges its downloads. A plain logout does not
      // call this path, so logout never deletes downloads.
      await offlineStorageService
        .purgeScope({ serverId, userId })
        .catch(() => {});
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
