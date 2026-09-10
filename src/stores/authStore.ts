import { create } from "zustand";
import {
  AuthRepository,
  authRepository,
  AuthSession,
  LoginCredentials
} from "../core/jellyfin/authRepository";

export type AuthStatus = "idle" | "restoring" | "authenticating" | "authenticated" | "unauthenticated";

export interface AuthState {
  status: AuthStatus;
  session: AuthSession | null;
  errorMessage: string | null;

  // Actions
  login: (credentials: LoginCredentials, serverUrl: string) => Promise<boolean>;
  restoreSession: () => Promise<boolean>;
  logout: () => Promise<void>;
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
      } else {
        set({ status: "unauthenticated", session: null });
        return false;
      }
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
    set({ status: "unauthenticated", session: null, errorMessage: null });
  },

  clearError: () => set({ errorMessage: null })
}));
