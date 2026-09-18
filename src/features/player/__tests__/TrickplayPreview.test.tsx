import React from "react";
import renderer, { act } from "react-test-renderer";
import { TrickplayPreview } from "../components/TrickplayPreview";
import {
  getTrickplayThumbnailUrl,
  getTrickplayCoordinates,
  getTrickplaySheetUrl,
  getChapterImageUrl
} from "../trickplayHelper";
import { TrickplayManifest } from "../../../types/media";

describe("TrickplayPreview & Helper", () => {
  const mockManifest: TrickplayManifest = {
    width: 320,
    height: 180,
    tileWidth: 10,
    tileHeight: 10,
    thumbnailCount: 500,
    intervalMs: 10000
  };

  it("generates correct trickplay thumbnail URL with ticks", () => {
    const url = getTrickplayThumbnailUrl("https://demo.jellyfin.org", "item-99", 45.5, 320);
    expect(url).toBe("https://demo.jellyfin.org/Items/item-99/Images/Primary?maxWidth=320&tag=trickplay_455000000");
  });

  it("calculates exact sprite sheet coordinates from manifest", () => {
    // 0s -> sheet 0, col 0, row 0
    const coords0 = getTrickplayCoordinates(0, mockManifest);
    expect(coords0.sheetIndex).toBe(0);
    expect(coords0.col).toBe(0);
    expect(coords0.row).toBe(0);
    expect(coords0.x).toBe(0);
    expect(coords0.y).toBe(0);

    // 150s (15th thumbnail at 10s interval) -> sheet 0, col 5, row 1
    const coords150 = getTrickplayCoordinates(150, mockManifest);
    expect(coords150.sheetIndex).toBe(0);
    expect(coords150.col).toBe(5);
    expect(coords150.row).toBe(1);
    expect(coords150.x).toBe(5 * 320);
    expect(coords150.y).toBe(1 * 180);

    // 1050s (105th thumbnail, 100 per sheet) -> sheet 1, col 5, row 0
    const coords1050 = getTrickplayCoordinates(1050, mockManifest);
    expect(coords1050.sheetIndex).toBe(1);
    expect(coords1050.col).toBe(5);
    expect(coords1050.row).toBe(0);
  });

  it("generates authenticated trickplay sheet URL", () => {
    const url = getTrickplaySheetUrl("https://demo.jellyfin.org", "item-123", 2, 320, "secret-token");
    expect(url).toBe("https://demo.jellyfin.org/Videos/item-123/Trickplay/320/2.jpg?api_key=secret-token");
  });

  it("generates authenticated chapter image URL", () => {
    const url = getChapterImageUrl("https://demo.jellyfin.org", "item-123", 3, 320, "secret-token");
    expect(url).toBe("https://demo.jellyfin.org/Items/item-123/Images/Chapter/3?maxWidth=320&api_key=secret-token");
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

  it("renders native trickplay sprite sheet with authorization when manifest is provided", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <TrickplayPreview
          serverUrl="https://demo.jellyfin.org"
          itemId="item-99"
          token="test-token"
          previewSeconds={250}
          scrubPositionPercent={0.5}
          visible={true}
          trickplayManifest={mockManifest}
        />
      );
    });

    const image = root.root.findByProps({ testID: "trickplay-thumbnail-image" });
    // 250s at 10s interval = 25th thumbnail = sheet 0
    expect(image.props.source.uri).toBe("https://demo.jellyfin.org/Videos/item-99/Trickplay/320/0.jpg?api_key=test-token");
    expect(image.props.source.headers.Authorization).toBeDefined();

    act(() => {
      root.unmount();
    });
  });

  it("renders chapter thumbnail when chapters are provided without trickplay manifest", () => {
    let root: any;
    act(() => {
      root = renderer.create(
        <TrickplayPreview
          serverUrl="https://demo.jellyfin.org"
          itemId="item-99"
          token="test-token"
          previewSeconds={75}
          scrubPositionPercent={0.25}
          visible={true}
          chapters={[
            { name: "Intro", startPositionTicks: 0 },
            { name: "Action Scene", startPositionTicks: 600000000 }
          ]}
        />
      );
    });

    const image = root.root.findByProps({ testID: "trickplay-thumbnail-image" });
    // 75s is in Chapter 1 ("Action Scene")
    expect(image.props.source.uri).toBe("https://demo.jellyfin.org/Items/item-99/Images/Chapter/1?maxWidth=320&api_key=test-token");

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
