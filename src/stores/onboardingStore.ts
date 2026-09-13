import { create } from "zustand";
import { userPreferencesStorage } from "../core/security/storage";

export const ONBOARDING_COMPLETED_KEY = "finora_onboarding_completed_v1";

export interface OnboardingState {
  isCompleted: boolean;
  isLoaded: boolean;
  loadOnboardingStatus: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  isCompleted: false,
  isLoaded: false,

  loadOnboardingStatus: async () => {
    try {
      const completed = await userPreferencesStorage.getItem<boolean>(ONBOARDING_COMPLETED_KEY);
      set({ isCompleted: Boolean(completed), isLoaded: true });
    } catch {
      set({ isCompleted: false, isLoaded: true });
    }
  },

  completeOnboarding: async () => {
    set({ isCompleted: true });
    try {
      await userPreferencesStorage.setItem(ONBOARDING_COMPLETED_KEY, true);
    } catch {
      // Non-blocking preference
    }
  },

  resetOnboarding: async () => {
    set({ isCompleted: false });
    try {
      await userPreferencesStorage.removeItem(ONBOARDING_COMPLETED_KEY);
    } catch {
      // Non-blocking preference
    }
  }
}));
