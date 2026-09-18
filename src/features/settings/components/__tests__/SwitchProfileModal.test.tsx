import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import { SwitchProfileModal } from "../SwitchProfileModal";
import { authRepository } from "../../../../core/jellyfin/authRepository";
import { useAuthStore } from "../../../../stores/authStore";
import { useServerStore } from "../../../../stores/serverStore";
import { translate } from "../../../../i18n";

jest.mock("../../../../core/jellyfin/authRepository", () => {
  const actual = jest.requireActual("../../../../core/jellyfin/authRepository");
  return {
    ...actual,
    authRepository: {
      ...actual.authRepository,
      getPublicUsers: jest.fn(),
      getAvailableUsers: jest.fn()
    }
  };
});

describe("SwitchProfileModal", () => {
  const mockClose = jest.fn();
  const mockSwitchAccount = jest.fn();
  const mockLogin = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      session: {
        token: "tok-1",
        userId: "user-alice",
        userName: "Alice",
        serverId: "srv-1",
        serverUrl: "https://jellyfin.example.com"
      },
      login: mockLogin
    });

    useServerStore.setState({
      savedAccounts: [
        {
          serverId: "srv-1",
          serverName: "Jellyfin Home",
          serverUrl: "https://jellyfin.example.com",
          userId: "user-alice",
          userName: "Alice",
          lastUsedAt: 1000
        },
        {
          serverId: "srv-1",
          serverName: "Jellyfin Home",
          serverUrl: "https://jellyfin.example.com",
          userId: "user-bob",
          userName: "Bob",
          lastUsedAt: 900
        }
      ],
      switchAccount: mockSwitchAccount,
      loadSavedAccounts: jest.fn().mockResolvedValue(undefined)
    });

    (authRepository.getAvailableUsers as jest.Mock).mockResolvedValue([
      {
        id: "user-alice",
        name: "Alice",
        serverId: "srv-1",
        hasPassword: true
      },
      {
        id: "user-bob",
        name: "Bob",
        serverId: "srv-1",
        hasPassword: true
      },
      {
        id: "user-charlie",
        name: "Charlie",
        serverId: "srv-1",
        hasPassword: false
      }
    ]);
  });

  it("fetches and renders all public users on current server", async () => {
    let component: any;
    await act(async () => {
      component = ReactTestRenderer.create(
        <SwitchProfileModal visible={true} onClose={mockClose} />
      );
    });

    expect(authRepository.getAvailableUsers).toHaveBeenCalledWith("https://jellyfin.example.com", true);
    expect(component.root.findByProps({ children: "Alice" })).toBeDefined();
    expect(component.root.findByProps({ children: "Bob" })).toBeDefined();
    expect(component.root.findByProps({ children: "Charlie" })).toBeDefined();
  });

  it("switches account immediately in 1-tap when selecting an already saved account", async () => {
    mockSwitchAccount.mockResolvedValue({
      token: "tok-bob",
      userId: "user-bob",
      userName: "Bob",
      serverId: "srv-1",
      serverUrl: "https://jellyfin.example.com"
    });

    let component: any;
    await act(async () => {
      component = ReactTestRenderer.create(
        <SwitchProfileModal visible={true} onClose={mockClose} />
      );
    });

    // Find Bob's profile card
    const bobCard = component.root.findByProps({
      accessibilityLabel: `Bob, ${translate("auth.passwordRequired")}`
    });

    await act(async () => {
      bobCard.props.onPress();
    });

    expect(mockSwitchAccount).toHaveBeenCalledWith("srv-1", "user-bob");
    expect(mockClose).toHaveBeenCalled();
  });

  it("logs in immediately when selecting an unsaved user with no password", async () => {
    mockLogin.mockResolvedValue(true);

    let component: any;
    await act(async () => {
      component = ReactTestRenderer.create(
        <SwitchProfileModal visible={true} onClose={mockClose} />
      );
    });

    // Find Charlie's profile card (unsaved, no password)
    const charlieCard = component.root.findByProps({
      accessibilityLabel: "Charlie"
    });

    await act(async () => {
      charlieCard.props.onPress();
    });

    expect(mockLogin).toHaveBeenCalledWith(
      { username: "Charlie", password: "" },
      "https://jellyfin.example.com"
    );
    expect(mockClose).toHaveBeenCalled();
  });

  it("prompts for password when requirePassword is true even for saved account", async () => {
    let component: any;
    await act(async () => {
      component = ReactTestRenderer.create(
        <SwitchProfileModal visible={true} onClose={mockClose} requirePassword={true} />
      );
    });

    const bobCard = component.root.findByProps({
      accessibilityLabel: `Bob, ${translate("auth.passwordRequired")}`
    });

    await act(async () => {
      bobCard.props.onPress();
    });

    // Should NOT have called switchAccount directly
    expect(mockSwitchAccount).not.toHaveBeenCalled();
    // ProfilePasswordModal should be rendered for Bob
    const { ProfilePasswordModal } = require("../../../auth/components/ProfilePasswordModal");
    const passwordModal = component.root.findByType(ProfilePasswordModal);
    expect(passwordModal.props.visible).toBe(true);
    expect(passwordModal.props.user.name).toBe("Bob");
  });
});
