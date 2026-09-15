import { create } from "zustand";
import {
  authRepository,
  AuthSession,
  LoginCredentials
} from "../core/jellyfin/authRepository";
import { queryClient } from "../providers/QueryProvider";
import { useNotificationStore } from "./notificationStore";

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

  login: async (credentials, serverUrl) => {
    set({ status: "authenticating", errorMessage: null });
    try {
      const session = await authRepository.authenticate(credentials, serverUrl);
      // A login can target another server/user in the same process. Do not let
      // React Query reuse cache entries from the previous identity.
      await queryClient.cancelQueries().catch(() => {});
      queryClient.clear();
      set({ status: "authenticated", session, errorMessage: null });
      return true;
    } catch (error) {
      set({
        status: "unauthenticated",
        errorMessage: (error as Error).message || "Login failed"
      });
      return false;
    }
  },

  restoreSession: async () => {
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
  },

  logout: async () => {
    const { session } = get();
    if (session) {
      await authRepository.logout(session.serverId, session.userId);
    }

    await queryClient.cancelQueries().catch(() => {});
    queryClient.clear();
    useNotificationStore.getState().resetActiveScope();
    set({ status: "unauthenticated", session: null, errorMessage: null });
  },

  /**
   * Adopt a session that was switched by ServerManager. Cache is cleared by the
   * caller before this state transition so hooks cannot render another server's data.
   */
  adoptSession: (session) => {
    set({ status: "authenticated", session, errorMessage: null });
  },

  clearError: () => set({ errorMessage: null })
}));
