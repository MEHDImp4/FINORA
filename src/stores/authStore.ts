import { create } from "zustand";
import {
  authRepository,
  AuthSession,
  LoginCredentials
} from "../core/jellyfin/authRepository";
import {
  clearActiveIdentity,
  restoreActiveIdentity,
  runIdentityTransition
} from "../core/jellyfin/identityTransition";
import { queryClient } from "../providers/QueryProvider";
import { useNotificationStore } from "./notificationStore";
import { downloadManager } from "../features/offline/downloadManager";

export type AuthStatus = "idle" | "restoring" | "authenticating" | "authenticated" | "unauthenticated";

export interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  errorMessage: string | null;

  login: (credentials: LoginCredentials, serverUrl: string) => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  logout: () => Promise<void>;
  adoptSession: (session: AuthSession) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "idle",
  session: null,
  errorMessage: null,

  login: async (credentials, serverUrl) =>
    runIdentityTransition(async () => {
      const previousSession = get().session;
      set({ status: "authenticating", session: null, errorMessage: null });

      // A fresh login may target another server/user in the same process. Freeze
      // every identity-scoped subsystem before AuthRepository mutates the shared
      // Jellyfin client so old requests/downloads cannot continue with new creds.
      await queryClient.cancelQueries().catch(() => {});
      queryClient.clear();
      useNotificationStore.getState().resetActiveScope();

      try {
        await downloadManager.handleIdentityChange();

        const session = await authRepository.authenticate(credentials, serverUrl);

        // Prepare the target identity completely before publishing it to React.
        // Both services restore their scope from the newly persisted session.
        await useNotificationStore
          .getState()
          .loadPersisted(session.serverId, session.userId);
        await downloadManager.initialize();

        set({ status: "authenticated", session, errorMessage: null });
        return true;
      } catch (error) {
        const errorMessage = (error as Error).message || "Login failed";

        // Authentication may already have changed the persistent descriptor or
        // network singleton before a later initialization step failed. Clear any
        // partially prepared target state before attempting rollback.
        await downloadManager.handleIdentityChange().catch(() => {});
        useNotificationStore.getState().resetActiveScope();

        if (previousSession) {
          try {
            const restored = await restoreActiveIdentity(previousSession);
            await useNotificationStore
              .getState()
              .loadPersisted(restored.serverId, restored.userId);
            await downloadManager.initialize();
            set({
              status: "authenticated",
              session: restored,
              errorMessage
            });
            return false;
          } catch {
            // Rollback failure must fail closed: no ambiguous active credential.
          }
        }

        await clearActiveIdentity();
        useNotificationStore.getState().resetActiveScope();
        set({
          status: "unauthenticated",
          session: null,
          errorMessage
        });
        return false;
      }
    }),

  restoreSession: async () =>
    runIdentityTransition(async () => {
      set({ status: "restoring", errorMessage: null });
      try {
        const session = await authRepository.restoreSession();
        if (session) {
          set({ status: "authenticated", session, errorMessage: null });
          return true;
        }
        set({ status: "unauthenticated", session: null });
        return false;
      } catch {
        set({ status: "unauthenticated", session: null });
        return false;
      }
    }),

  logout: async () =>
    runIdentityTransition(async () => {
      const { session } = get();

      // Stop and detach the outgoing account's downloads BEFORE the token is
      // revoked, so no transfer can keep running authenticated as the old user.
      await downloadManager.handleIdentityChange().catch(() => {});

      if (session) {
        await authRepository.logout(session.serverId, session.userId);
      }

      await queryClient.cancelQueries().catch(() => {});
      queryClient.clear();
      useNotificationStore.getState().resetActiveScope();
      set({ status: "unauthenticated", session: null, errorMessage: null });
    }),

  /**
   * Adopt a session that was switched by ServerManager. Cache is cleared by the
   * caller before this state transition so hooks cannot render another server's data.
   */
  adoptSession: (session) => {
    set({ status: "authenticated", session, errorMessage: null });
  },

  clearError: () => set({ errorMessage: null })
}));
