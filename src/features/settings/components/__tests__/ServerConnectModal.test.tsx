import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import { ServerConnectModal } from "../ServerConnectModal";
import { validateAndDiscoverServer } from "../../../../core/jellyfin/serverDiscovery";
import { useAuthStore } from "../../../../stores/authStore";
import { useServerStore } from "../../../../stores/serverStore";

jest.mock("../../../../core/jellyfin/serverDiscovery", () => ({
  DEFAULT_JELLYFIN_SERVER: "",
  validateAndDiscoverServer: jest.fn()
}));

describe("ServerConnectModal", () => {
  const mockClose = jest.fn();
  const mockServerChanged = jest.fn();
  const mockSaveServer = jest.fn().mockResolvedValue(undefined);
  const mockRemoveServer = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      session: {
        token: "tok-1",
        userId: "user-1",
        userName: "Admin",
        serverId: "srv-1",
        serverUrl: "https://current.jellyfin.com"
      }
    });

    useServerStore.setState({
      savedServers: [
        {
          id: "srv-1",
          name: "Server 1",
          url: "https://current.jellyfin.com",
          lastUsedAt: 1000
        },
        {
          id: "srv-2",
          name: "Server 2",
          url: "https://other.jellyfin.com",
          lastUsedAt: 500
        }
      ],
      loadSavedServers: jest.fn().mockResolvedValue(undefined),
      saveServer: mockSaveServer,
      removeServer: mockRemoveServer
    });
  });

  it("renders saved servers list and active server badge", async () => {
    let component: any;
    await act(async () => {
      component = ReactTestRenderer.create(
        <ServerConnectModal visible={true} onClose={mockClose} onServerChanged={mockServerChanged} />
      );
    });

    expect(
      component.root.findAllByProps({ children: "https://current.jellyfin.com" }).length
    ).toBeGreaterThanOrEqual(1);
    expect(
      component.root.findAllByProps({ children: "https://other.jellyfin.com" }).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("discovers server and displays server info on test", async () => {
    (validateAndDiscoverServer as jest.Mock).mockResolvedValue({
      serverId: "srv-new",
      serverName: "Home Jellyfin",
      version: "10.9.11",
      url: "https://new.jellyfin.com",
      isHttps: true,
      hasWarning: false,
      operatingSystem: "Linux"
    });

    let component: any;
    await act(async () => {
      component = ReactTestRenderer.create(
        <ServerConnectModal visible={true} onClose={mockClose} onServerChanged={mockServerChanged} />
      );
    });

    const serverInput = component.root.findByProps({ keyboardType: "url" });
    await act(async () => {
      serverInput.props.onChangeText("https://new.jellyfin.com");
    });

    const testBtn = component.root.findAllByProps({ accessibilityRole: "button" })
      .find((b: any) => b.props.accessibilityLabel === "Test Connection" || b.props.accessibilityLabel === "Tester la connexion");

    expect(testBtn).toBeDefined();

    await act(async () => {
      testBtn.props.onPress();
    });

    expect(validateAndDiscoverServer).toHaveBeenCalled();
    expect(component.root.findByProps({ children: "Home Jellyfin" })).toBeDefined();
    expect(component.root.findByProps({ children: "10.9.11" })).toBeDefined();
  });

  it("switches server via onServerChanged when selecting a saved server", async () => {
    jest.useFakeTimers();

    let component: any;
    await act(async () => {
      component = ReactTestRenderer.create(
        <ServerConnectModal visible={true} onClose={mockClose} onServerChanged={mockServerChanged} />
      );
    });

    // Find the card for "Server 2"
    const server2Card = component.root.findAllByProps({ accessibilityRole: "button" })
      .find((b: any) => {
        const textElements = b.findAllByProps({ children: "Server 2" });
        return textElements.length > 0;
      });

    expect(server2Card).toBeDefined();

    await act(async () => {
      server2Card.props.onPress();
    });

    expect(mockSaveServer).toHaveBeenCalledWith(expect.objectContaining({ id: "srv-2" }));

    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(mockClose).toHaveBeenCalled();
    expect(mockServerChanged).toHaveBeenCalledWith("https://other.jellyfin.com");

    jest.useRealTimers();
  });

  it("removes server when trash button is clicked", async () => {
    let component: any;
    await act(async () => {
      component = ReactTestRenderer.create(
        <ServerConnectModal visible={true} onClose={mockClose} onServerChanged={mockServerChanged} />
      );
    });

    const trashButtons = component.root.findAllByProps({ accessibilityRole: "button" })
      .filter((b: any) => b.props.accessibilityLabel === "Remove this server" || b.props.accessibilityLabel === "Supprimer ce serveur");

    expect(trashButtons.length).toBeGreaterThanOrEqual(1);

    await act(async () => {
      trashButtons[0].props.onPress({ stopPropagation: jest.fn() });
    });

    expect(mockRemoveServer).toHaveBeenCalled();
  });
});
