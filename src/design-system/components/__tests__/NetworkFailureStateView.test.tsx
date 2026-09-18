import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import { NetworkFailureStateView } from "../NetworkFailureStateView";
import { translate } from "../../../i18n";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: jest.fn(),
    back: jest.fn()
  })
}));

describe("NetworkFailureStateView", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("renders 'no_internet' state with appropriate badge and title", async () => {
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <NetworkFailureStateView failureType="no_internet" />
      );
    });

    const root = tree.root;
    const texts = root.findAllByType("Text" as any).map((t: any) => t.props.children);
    expect(texts).toContain(translate("errors.badgeOffline"));
    expect(texts).toContain(translate("errors.networkFailureTitle"));
  });

  it("renders 'server_unreachable' state with appropriate badge and title", async () => {
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <NetworkFailureStateView failureType="server_unreachable" />
      );
    });

    const root = tree.root;
    const texts = root.findAllByType("Text" as any).map((t: any) => t.props.children);
    expect(texts).toContain(translate("errors.badgeServerDown"));
    expect(texts).toContain(translate("errors.serverUnreachableTitle"));
  });

  it("navigates to downloads screen when clicking 'Regarder hors-ligne'", async () => {
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <NetworkFailureStateView failureType="no_internet" />
      );
    });

    const downloadBtn = tree.root.findByProps({ testID: "failure-go-downloads-button" });
    expect(downloadBtn).toBeTruthy();

    act(() => {
      downloadBtn.props.onPress();
    });

    expect(mockPush).toHaveBeenCalledWith("/(tabs)/downloads");
  });

  it("triggers onRetry callback when retry button is pressed", async () => {
    const mockRetry = jest.fn();
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <NetworkFailureStateView
          failureType="server_unreachable"
          onRetry={mockRetry}
        />
      );
    });

    const retryBtn = tree.root.findByProps({ testID: "failure-retry-button" });
    expect(retryBtn).toBeTruthy();

    act(() => {
      retryBtn.props.onPress();
    });

    expect(mockRetry).toHaveBeenCalledTimes(1);
  });
});
