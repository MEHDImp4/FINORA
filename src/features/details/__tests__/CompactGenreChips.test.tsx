import React from "react";
import renderer, { act } from "react-test-renderer";
import {
  CompactGenreChips,
  normalizeCompactGenres
} from "../components/CompactGenreChips";

describe("CompactGenreChips", () => {
  it("shows only four chips by default and exposes the rest behind +N", () => {
    let root: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(
        <CompactGenreChips
          genres={["Action", "Drama", "Comedy", "Thriller", "Mystery", "Adventure"]}
          language="en"
        />
      );
    });

    const instance = root!.root;
    expect(instance.findByProps({ children: "Action" })).toBeTruthy();
    expect(instance.findByProps({ children: "Thriller" })).toBeTruthy();
    expect(instance.findAllByProps({ children: "Mystery" })).toHaveLength(0);
    expect(instance.findByProps({ children: "+2" })).toBeTruthy();

    act(() => {
      instance.findByProps({ testID: "compact-genre-toggle" }).props.onPress();
    });

    expect(instance.findByProps({ children: "Mystery" })).toBeTruthy();
    expect(instance.findByProps({ children: "Adventure" })).toBeTruthy();
    expect(instance.findByProps({ children: "−" })).toBeTruthy();
  });

  it("deduplicates tags case-insensitively", () => {
    expect(normalizeCompactGenres(["Drama", "drama", " Drama ", "Crime"])).toEqual([
      "Drama",
      "Crime"
    ]);
  });
});
