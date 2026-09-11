import React from "react";
import renderer, { act } from "react-test-renderer";
import { TrickplayPreview } from "../components/TrickplayPreview";
import { getTrickplayThumbnailUrl } from "../trickplayHelper";

describe("TrickplayPreview & Helper", () => {
  it("generates correct trickplay thumbnail URL with ticks", () => {
    const url = getTrickplayThumbnailUrl("https://demo.jellyfin.org", "item-99", 45.5, 320);
    expect(url).toBe("https://demo.jellyfin.org/Items/item-99/Images/Primary?maxWidth=320&tag=trickplay_455000000");
  });

  it("renders preview card when visible is true", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <TrickplayPreview
          serverUrl="https://demo.jellyfin.org"
          itemId="item-99"
          previewSeconds={120}
          scrubPositionPercent={0.3}
          visible={true}
        />
      );
    });

    const preview = root.root.findByProps({ testID: "trickplay-preview" });
    expect(preview).toBeTruthy();

    const image = root.root.findByProps({ testID: "trickplay-thumbnail-image" });
    expect(image.props.source.uri).toContain("tag=trickplay_1200000000");

    act(() => {
      root.unmount();
    });
  });

  it("renders null when visible is false", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <TrickplayPreview
          serverUrl="https://demo.jellyfin.org"
          itemId="item-99"
          previewSeconds={120}
          scrubPositionPercent={0.3}
          visible={false}
        />
      );
    });

    expect(root.toJSON()).toBeNull();

    act(() => {
      root.unmount();
    });
  });
});
