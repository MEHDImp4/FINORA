import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import { SortOptionsModal } from "../components/SortOptionsModal";
import { AVAILABLE_SORT_OPTIONS } from "../types";

describe("SortOptionsModal", () => {
  const mockOnSelectSort = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders when visible and lists all sort options", () => {
    const currentSort = AVAILABLE_SORT_OPTIONS[0];

    const tree = ReactTestRenderer.create(
      <SortOptionsModal
        visible={true}
        currentSort={currentSort}
        onSelectSort={mockOnSelectSort}
        onClose={mockOnClose}
      />
    );

    const titleAscOption = tree.root.findByProps({
      accessibilityLabel: "Sort by Title (A to Z)"
    });
    expect(titleAscOption).toBeTruthy();

    const dateDescOption = tree.root.findByProps({
      accessibilityLabel: "Sort by Release Date (Newest first)"
    });
    expect(dateDescOption).toBeTruthy();
  });

  it("calls onSelectSort and onClose when an option is tapped", () => {
    const currentSort = AVAILABLE_SORT_OPTIONS[0];

    const tree = ReactTestRenderer.create(
      <SortOptionsModal
        visible={true}
        currentSort={currentSort}
        onSelectSort={mockOnSelectSort}
        onClose={mockOnClose}
      />
    );

    const targetOption = AVAILABLE_SORT_OPTIONS[2]; // Release Date (Newest first)
    const button = tree.root.findByProps({
      accessibilityLabel: `Sort by ${targetOption.label}`
    });

    act(() => {
      button.props.onPress();
    });

    expect(mockOnSelectSort).toHaveBeenCalledWith(targetOption);
    expect(mockOnClose).toHaveBeenCalled();
  });
});
