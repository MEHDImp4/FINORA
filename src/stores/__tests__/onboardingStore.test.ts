import { useOnboardingStore, ONBOARDING_COMPLETED_KEY } from "../onboardingStore";
import { userPreferencesStorage } from "../../core/security/storage";

jest.mock("../../core/security/storage", () => ({
  userPreferencesStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn()
  }
}));

describe("onboardingStore", () => {
  beforeEach(() => {
    useOnboardingStore.setState({
      isCompleted: false,
      isLoaded: false
    });
    jest.clearAllMocks();
  });

  it("loads onboarding status when true in storage", async () => {
    (userPreferencesStorage.getItem as jest.Mock).mockResolvedValueOnce(true);

    await useOnboardingStore.getState().loadOnboardingStatus();

    expect(userPreferencesStorage.getItem).toHaveBeenCalledWith(ONBOARDING_COMPLETED_KEY);
    const state = useOnboardingStore.getState();
    expect(state.isCompleted).toBe(true);
    expect(state.isLoaded).toBe(true);
  });

  it("loads onboarding status when false or null in storage", async () => {
    (userPreferencesStorage.getItem as jest.Mock).mockResolvedValueOnce(null);

    await useOnboardingStore.getState().loadOnboardingStatus();

    const state = useOnboardingStore.getState();
    expect(state.isCompleted).toBe(false);
    expect(state.isLoaded).toBe(true);
  });

  it("completes onboarding and persists true in storage", async () => {
    await useOnboardingStore.getState().completeOnboarding();

    expect(useOnboardingStore.getState().isCompleted).toBe(true);
    expect(userPreferencesStorage.setItem).toHaveBeenCalledWith(ONBOARDING_COMPLETED_KEY, true);
  });

  it("resets onboarding and removes key from storage", async () => {
    useOnboardingStore.setState({ isCompleted: true, isLoaded: true });

    await useOnboardingStore.getState().resetOnboarding();

    expect(useOnboardingStore.getState().isCompleted).toBe(false);
    expect(userPreferencesStorage.removeItem).toHaveBeenCalledWith(ONBOARDING_COMPLETED_KEY);
  });
});
