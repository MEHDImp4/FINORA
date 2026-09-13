import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import { ErrorStateView } from "../ErrorStateView";
import { OfflineBanner } from "../OfflineBanner";

describe("ErrorStateView & OfflineBanner", () => {
  it("renders ErrorStateView with title, message, and calls onRetry", async () => {
    const mockRetry = jest.fn();
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <ErrorStateView
          title="Network Failure"
          error={new Error("Failed to reach Jellyfin server")}
          onRetry={mockRetry}
          retryLabel="Reconnect"
        />
      );
    });

    const retryBtn = tree.root.findByProps({ accessibilityLabel: "Reconnect" });
    expect(retryBtn).toBeTruthy();

    act(() => {
      retryBtn.props.onPress();
    });

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it("renders OfflineBanner only when isOffline is true", async () => {
    let offlineTree: any;
    await act(async () => {
      offlineTree = ReactTestRenderer.create(
        <OfflineBanner isOffline={true} message="No internet connection" />
      );
    });

    const alertView = offlineTree.root.findByProps({ accessibilityRole: "alert" });
    expect(alertView).toBeTruthy();

    let onlineTree: any;
    await act(async () => {
      onlineTree = ReactTestRenderer.create(
        <OfflineBanner isOffline={false} />
      );
    });

    expect(onlineTree.toJSON()).toBeNull();
  });

  it("dismisses OfflineBanner when close button is pressed", async () => {
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <OfflineBanner isOffline={true} message="Server offline" />
      );
    });

    const closeBtn = tree.root.findByProps({ accessibilityLabel: "Fermer le message" });
    expect(closeBtn).toBeTruthy();

    act(() => {
      closeBtn.props.onPress();
    });

    expect(tree.toJSON()).toBeNull();
  });
});
