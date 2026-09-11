import React from "react";
import { View, StyleSheet } from "react-native";
import { ShimmerSkeleton } from "./ShimmerSkeleton";
import {
  POSTER_WIDTH,
  POSTER_HEIGHT,
  THUMBNAIL_WIDTH,
  THUMBNAIL_HEIGHT,
  CardVariant
} from "../../features/home/components/MediaCard";
import { spacing } from "../tokens";

interface MediaCardSkeletonProps {
  variant?: CardVariant;
}

export function MediaCardSkeleton({ variant = "poster" }: MediaCardSkeletonProps) {
  const isThumbnail = variant === "thumbnail";
  const width = isThumbnail ? THUMBNAIL_WIDTH : POSTER_WIDTH;
  const height = isThumbnail ? THUMBNAIL_HEIGHT : POSTER_HEIGHT;

  return (
    <View style={[styles.container, { width }]}>
      {/* Image card skeleton */}
      <ShimmerSkeleton width={width} height={height} borderRadius={12} />
      {/* Title text line skeleton */}
      <View style={styles.textWrapper}>
        <ShimmerSkeleton width={width * 0.8} height={14} borderRadius={4} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginRight: spacing.sm
  },
  textWrapper: {
    marginTop: spacing.xs,
    paddingHorizontal: 2
  }
});
