import React from "react";
import ReactTestRenderer from "react-test-renderer";
import { SearchCategoryChips, SEARCH_CATEGORIES } from "../components/SearchCategoryChips";
import { SearchBar } from "../components/SearchBar";
import { SearchHistoryList } from "../components/SearchHistoryList";
import { translate } from "../../../i18n";

describe("Search Components Localization", () => {
  it("renders SearchCategoryChips with translated category names", () => {
    const onSelectCategory = jest.fn();
    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <SearchCategoryChips
          selectedCategoryId="all"
          onSelectCategory={onSelectCategory}
        />
      );
    });

    const root = component!.root;
    expect(root.findByProps({ children: translate("search.allCategory") })).toBeDefined();
    expect(root.findByProps({ children: translate("search.moviesCategory") })).toBeDefined();
    expect(root.findByProps({ children: translate("search.showsCategory") })).toBeDefined();
    expect(root.findByProps({ children: translate("search.episodesCategory") })).toBeDefined();
  });

  it("renders SearchBar with localized default placeholder", () => {
    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <SearchBar
          value=""
          onChangeText={jest.fn()}
          onClear={jest.fn()}
        />
      );
    });

    const root = component!.root;
    const input = root.findByType("TextInput" as any);
    expect(input.props.placeholder).toBe(translate("search.placeholder"));
    expect(input.props.accessibilityLabel).toBe(translate("common.search"));
  });

  it("renders SearchHistoryList with translated header and clear button", () => {
    const onClearAll = jest.fn();
    let component: ReactTestRenderer.ReactTestRenderer;
    ReactTestRenderer.act(() => {
      component = ReactTestRenderer.create(
        <SearchHistoryList
          history={["Inception", "Dark"]}
          onSelectTerm={jest.fn()}
          onRemoveTerm={jest.fn()}
          onClearAll={onClearAll}
        />
      );
    });

    const root = component!.root;
    expect(root.findByProps({ children: translate("search.recentSearches") })).toBeDefined();
    expect(root.findByProps({ children: translate("search.clearHistory") })).toBeDefined();
  });
});
