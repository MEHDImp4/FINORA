import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { formatTime } from "./TimelineScrubber";
import {
  findChapterAtSeconds,
  getTrickplayCoordinates,
  getTrickplaySheetUrl,
  getChapterImageUrl,
  getFallbackThumbnailUrl,
  getTrickplayThumbnailUrl
} from "../trickplayHelper";
import { colors, spacing } from "../../../design-system/tokens";
import { ChapterMarker, TrickplayManifest } from "../../../types/media";
import { formatAuthorizationHeader } from "../../../core/jellyfin/clientInfo";

export interface TrickplayPreviewProps {
  serverUrl: string;
  itemId: string;
  token?: string;
  previewSeconds: number;
  scrubPositionPercent: number;
  visible: boolean;
  chapters?: ChapterMarker[];
  trickplayManifest?: TrickplayManifest;
  backdropImageTag?: string;
  bottomOffset?: number;
}

const PREVIEW_WIDTH = 144;
const PREVIEW_HEIGHT = 81; // 16:9 cinematic ratio

export function TrickplayPreview({
  serverUrl,
  itemId,
  token,
  previewSeconds,
  scrubPositionPercent,
  visible,
  chapters,
  trickplayManifest,
  bottomOffset
}: TrickplayPreviewProps) {
  const insets = useSafeAreaInsets();
  const [nativeTrickplayFailed, setNativeTrickplayFailed] = useState(false);
  const [chapterFailed, setChapterFailed] = useState(false);

  if (!visible) return null;

  const currentChapter = findChapterAtSeconds(chapters, previewSeconds);

  // Position the preview box clamped so it stays inside screen boundaries
  const clampedPercent = Math.max(0.08, Math.min(0.92, scrubPositionPercent));
  const effectiveBottom =
    bottomOffset !== undefined
      ? bottomOffset
      : Math.max(insets.bottom, spacing.md) + 52;

  const authHeaders = token
    ? { Authorization: formatAuthorizationHeader("finora-mobile", token) }
    : undefined;

  const renderThumbnail = () => {
    // 1. Native Jellyfin 10.9+ Trickplay Sprite Sheet
    if (trickplayManifest && !nativeTrickplayFailed) {
      const coords = getTrickplayCoordinates(previewSeconds, trickplayManifest);
      const sheetUrl = getTrickplaySheetUrl(
        serverUrl,
        itemId,
        coords.sheetIndex,
        coords.thumbWidth,
        token
      );
      const scale = PREVIEW_WIDTH / coords.thumbWidth;
      const scaledSheetWidth = coords.totalSheetWidth * scale;
      const scaledSheetHeight = coords.totalSheetHeight * scale;
      const scaledX = coords.x * scale;
      const scaledY = coords.y * scale;

      return (
        <View style={styles.spriteClip}>
          <Image
            source={{
              uri: sheetUrl,
              headers: authHeaders
            }}
            style={{
              position: "absolute",
              width: scaledSheetWidth,
              height: scaledSheetHeight,
              left: -scaledX,
              top: -scaledY
            }}
            contentFit="fill"
            cachePolicy="memory-disk"
            onError={() => setNativeTrickplayFailed(true)}
            testID="trickplay-thumbnail-image"
          />
        </View>
      );
    }

    // 2. Chapter Image Fallback
    if (currentChapter && !chapterFailed) {
      const chapterUrl = getChapterImageUrl(
        serverUrl,
        itemId,
        currentChapter.index,
        320,
        token
      );
      return (
        <Image
          source={{
            uri: chapterUrl,
            headers: authHeaders
          }}
          style={styles.thumbnailImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          onError={() => setChapterFailed(true)}
          testID="trickplay-thumbnail-image"
        />
      );
    }

    // 3. Fallback to backdrop or legacy tag (ensures unit tests and bare servers render cleanly)
    const fallbackUrl = token
      ? getFallbackThumbnailUrl(serverUrl, itemId, 320, token, "Backdrop")
      : getTrickplayThumbnailUrl(serverUrl, itemId, previewSeconds, 320, { mode: "legacy", token });

    return (
      <Image
        source={{
          uri: fallbackUrl,
          headers: authHeaders
        }}
        style={styles.thumbnailImage}
        contentFit="cover"
        cachePolicy="memory-disk"
        testID="trickplay-thumbnail-image"
      />
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          left: `${clampedPercent * 100}%`,
          bottom: effectiveBottom,
          transform: [{ translateX: -PREVIEW_WIDTH / 2 }]
        }
      ]}
      pointerEvents="none"
      testID="trickplay-preview"
    >
      <View style={styles.card}>
        {renderThumbnail()}

        {Boolean(currentChapter?.chapter.name) && (
          <View style={styles.chapterBadge}>
            <FinoraText variant="caption" style={styles.chapterText} numberOfLines={1}>
              {currentChapter?.chapter.name}
            </FinoraText>
          </View>
        )}

        <View style={styles.timeBadge}>
          <FinoraText variant="caption" style={styles.timeText}>
            {formatTime(previewSeconds)}
          </FinoraText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 999
  },
  card: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    backgroundColor: "#14141A",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.28)",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.75,
    shadowRadius: 10,
    elevation: 15
  },
  spriteClip: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    overflow: "hidden",
    position: "relative"
  },
  thumbnailImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#14141A"
  },
  chapterBadge: {
    position: "absolute",
    top: 4,
    left: 4,
    right: 4,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4
  },
  chapterText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "700",
    textAlign: "center"
  },
  timeBadge: {
    position: "absolute",
    bottom: 4,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4
  },
  timeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "700"
  }
});
