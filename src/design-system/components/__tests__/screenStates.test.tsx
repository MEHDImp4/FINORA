import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import { ShimmerSkeleton } from "../ShimmerSkeleton";
import { MediaCardSkeleton } from "../MediaCardSkeleton";
import { EmptyStateView } from "../EmptyStateView";

describe("Screen States - Skeletons & Empty State", () => {
  it("renders ShimmerSkeleton with specified width and height", async () => {
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <ShimmerSkeleton width={120} height={40} borderRadius={6} />
      );
    });

    const skeleton = tree.root.findByProps({ accessibilityLabel: "Loading content" });
    expect(skeleton).toBeTruthy();
  });

  it("renders MediaCardSkeleton in poster and thumbnail variants", async () => {
    let posterTree: any;
    await act(async () => {
      posterTree = ReactTestRenderer.create(<MediaCardSkeleton variant="poster" />);
    });
    expect(posterTree.root).toBeTruthy();

    let thumbTree: any;
    await act(async () => {
      thumbTree = ReactTestRenderer.create(<MediaCardSkeleton variant="thumbnail" />);
    });
    expect(thumbTree.root).toBeTruthy();
  });

  it("renders EmptyStateView and fires action button onPress", async () => {
    const mockAction = jest.fn();
    let tree: any;
    await act(async () => {
      tree = ReactTestRenderer.create(
        <EmptyStateView
          title="No Media Found"
          message="Your library has no items yet."
          actionLabel="Browse Catalog"
          onAction={mockAction}
        />
      );
    });

    const actionBtn = tree.root.findByProps({ accessibilityLabel: "Browse Catalog" });
    expect(actionBtn).toBeTruthy();

    act(() => {
      actionBtn.props.onPress();
    });

    expect(mockAction).toHaveBeenCalled();
  });
});
