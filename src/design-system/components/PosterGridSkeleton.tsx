import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { ShimmerSkeleton } from "./ShimmerSkeleton";
import { spacing } from "../tokens";

const HORIZONTAL_PADDING = spacing.md;
const GRID_GAP = spacing.sm;
const COLUMNS = 3;

export interface PosterGridSkeletonProps {
  rows?: number;
}

export function PosterGridSkeleton({ rows = 4 }: PosterGridSkeletonProps) {
  const screenWidth = Dimensions.get("window").width || 375;
  const cardWidth = Math.max(
    90,
    Math.floor((screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP * (COLUMNS - 1)) / COLUMNS)
  );
  const cardHeight = Math.round(cardWidth * 1.5);

  return (
    <View style={styles.container} testID="poster-grid-skeleton">
      {Array.from({ length: rows }, (_, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {Array.from({ length: COLUMNS }, (_, columnIndex) => (
            <View key={columnIndex} style={{ width: cardWidth }}>
              <ShimmerSkeleton width={cardWidth} height={cardHeight} borderRadius={12} />
              <ShimmerSkeleton
                width={Math.round(cardWidth * 0.8)}
                height={12}
                borderRadius={4}
                style={styles.title}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: spacing.sm
  },
  row: {
    flexDirection: "row",
    gap: GRID_GAP,
    marginBottom: spacing.md
  },
  title: {
    marginTop: spacing.xs
  }
});
