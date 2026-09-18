import React from "react";
import renderer, { act } from "react-test-renderer";
import { ErrorBoundary } from "../ErrorBoundary";

let shouldThrow = true;

function Boom(): React.ReactElement {
  if (shouldThrow) {
    throw new Error("render exploded token=SECRET");
  }
  return <>{null}</>;
}

describe("REL-01 root error boundary", () => {
  beforeEach(() => {
    shouldThrow = true;
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("shows a fallback instead of a blank screen when a child throws", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      );
    });

    expect(root.root.findByProps({ testID: "error-boundary" })).toBeTruthy();
    act(() => root.unmount());
  });

  it("retry actually remounts the subtree once the error is resolved", () => {
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>
      );
    });

    expect(root.root.findByProps({ testID: "error-boundary" })).toBeTruthy();

    shouldThrow = false;
    act(() => {
      root.root.findByProps({ testID: "error-boundary-retry" }).props.onPress();
    });

    // Fallback is gone and the (now healthy) child rendered.
    expect(root.root.findAllByProps({ testID: "error-boundary" }).length).toBe(0);

    act(() => root.unmount());
  });

  it("exposes a return-home action when a handler is provided", () => {
    const onReturnHome = jest.fn();
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <ErrorBoundary onReturnHome={onReturnHome}>
          <Boom />
        </ErrorBoundary>
      );
    });

    act(() => {
      root.root.findByProps({ testID: "error-boundary-home" }).props.onPress();
    });

    expect(onReturnHome).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
  });
});
