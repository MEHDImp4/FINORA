import React from "react";
import { View, StyleSheet } from "react-native";
import { ShimmerSkeleton } from "./ShimmerSkeleton";
import { spacing } from "../tokens";

const THUMBNAIL_WIDTH = 130;
const THUMBNAIL_HEIGHT = 73;

export function EpisodeSkeleton() {
  return (
    <View style={styles.row}>
      <ShimmerSkeleton width={THUMBNAIL_WIDTH} height={THUMBNAIL_HEIGHT} borderRadius={8} />
      <View style={styles.info}>
        <ShimmerSkeleton width="70%" height={14} borderRadius={4} />
        <ShimmerSkeleton width="28%" height={11} borderRadius={4} style={styles.line} />
        <ShimmerSkeleton width="92%" height={11} borderRadius={4} style={styles.line} />
      </View>
    </View>
  );
}

export interface EpisodeListSkeletonProps {
  count?: number;
}

export function EpisodeListSkeleton({ count = 6 }: EpisodeListSkeletonProps) {
  return (
    <View testID="episode-list-skeleton">
      {Array.from({ length: count }, (_, index) => (
        <EpisodeSkeleton key={index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    alignItems: "center"
  },
  info: {
    flex: 1
  },
  line: {
    marginTop: spacing.sm
  }
});
