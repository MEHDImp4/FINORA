import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { formatTime } from "./TimelineScrubber";
import { getTrickplayThumbnailUrl } from "../trickplayHelper";
import { colors, spacing } from "../../../design-system/tokens";

export interface TrickplayPreviewProps {
  serverUrl: string;
  itemId: string;
  previewSeconds: number;
  scrubPositionPercent: number;
  visible: boolean;
}

export function TrickplayPreview({
  serverUrl,
  itemId,
  previewSeconds,
  scrubPositionPercent,
  visible
}: TrickplayPreviewProps) {
  if (!visible) return null;

  const thumbnailUrl = getTrickplayThumbnailUrl(serverUrl, itemId, previewSeconds);

  // Position the preview box clamped between 5% and 75%
  const clampedPercent = Math.max(0.05, Math.min(0.75, scrubPositionPercent));

  return (
    <View
      style={[styles.container, { left: `${clampedPercent * 100}%` }]}
      pointerEvents="none"
      testID="trickplay-preview"
    >
      <View style={styles.card}>
        <Image
          source={{ uri: thumbnailUrl }}
          style={styles.thumbnailImage}
          contentFit="cover"
          cachePolicy="memory-disk"
          testID="trickplay-thumbnail-image"
        />
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
    bottom: 50,
    zIndex: 30
  },
  card: {
    width: 130,
    height: 75,
    backgroundColor: "#14141A",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2A2A38",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 8
  },
  thumbnailImage: {
    width: "100%",
    height: "100%"
  },
  timeBadge: {
    position: "absolute",
    bottom: spacing.xs,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: 4
  },
  timeText: {
    color: colors.textPrimary,
    fontSize: 11,
    fontWeight: "600"
  }
});
