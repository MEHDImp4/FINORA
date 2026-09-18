import React from "react";
import ReactTestRenderer, { act } from "react-test-renderer";
import { SortOptionsModal } from "../components/SortOptionsModal";
import { AVAILABLE_SORT_OPTIONS, getSortOptionLabel } from "../types";
import { translate } from "../../../i18n";

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

    const titleAscLabel = getSortOptionLabel("title-asc", (k) => translate(k));
    const dateDescLabel = getSortOptionLabel("date-desc", (k) => translate(k));

    expect(tree.root.findByProps({
      accessibilityLabel: `${translate("library.sortBy")} ${titleAscLabel}`
    })).toBeTruthy();

    expect(tree.root.findByProps({
      accessibilityLabel: `${translate("library.sortBy")} ${dateDescLabel}`
    })).toBeTruthy();
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

    const targetOption = AVAILABLE_SORT_OPTIONS[2];
    const targetLabel = getSortOptionLabel(targetOption.id, (k) => translate(k));
    const button = tree.root.findByProps({
      accessibilityLabel: `${translate("library.sortBy")} ${targetLabel}`
    });

    act(() => {
      button.props.onPress();
    });

    expect(mockOnSelectSort).toHaveBeenCalledWith({ ...targetOption, label: targetLabel });
    expect(mockOnClose).toHaveBeenCalled();
  });
});
