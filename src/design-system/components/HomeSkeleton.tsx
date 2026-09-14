import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { ShimmerSkeleton } from "./ShimmerSkeleton";
import { spacing } from "../tokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = Math.round(SCREEN_WIDTH * 1.15);
const POSTER_WIDTH = 130;
const POSTER_HEIGHT = 195;
const CARDS_PER_ROW = 3;

export interface HomeSkeletonProps {
  sections?: number;
}

export function HomeSkeleton({ sections = 3 }: HomeSkeletonProps) {
  return (
    <View testID="home-skeleton">
      {/* Brand mark + header actions */}
      <View style={styles.header}>
        <ShimmerSkeleton width={120} height={24} borderRadius={6} />
        <View style={styles.headerIcons}>
          <ShimmerSkeleton width={28} height={28} borderRadius={14} />
          <ShimmerSkeleton width={28} height={28} borderRadius={14} />
        </View>
      </View>

      {/* Category pills */}
      <View style={styles.pillsRow}>
        {Array.from({ length: 4 }, (_, index) => (
          <ShimmerSkeleton key={index} width={78} height={28} borderRadius={14} />
        ))}
      </View>

      {/* Hero banner */}
      <ShimmerSkeleton width="100%" height={HERO_HEIGHT} borderRadius={0} />

      {/* Carousel sections */}
      {Array.from({ length: sections }, (_, sectionIndex) => (
        <View key={sectionIndex} style={styles.section}>
          <ShimmerSkeleton width={150} height={18} borderRadius={4} style={styles.sectionTitle} />
          <View style={styles.cardRow}>
            {Array.from({ length: CARDS_PER_ROW }, (_, cardIndex) => (
              <View key={cardIndex}>
                <ShimmerSkeleton width={POSTER_WIDTH} height={POSTER_HEIGHT} borderRadius={12} />
                <ShimmerSkeleton
                  width={POSTER_WIDTH * 0.8}
                  height={12}
                  borderRadius={4}
                  style={styles.cardTitle}
                />
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.md
  },
  headerIcons: {
    flexDirection: "row",
    gap: spacing.sm
  },
  pillsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md
  },
  section: {
    marginTop: spacing.lg,
    overflow: "hidden"
  },
  sectionTitle: {
    marginLeft: spacing.md,
    marginBottom: spacing.sm
  },
  cardRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingLeft: spacing.md
  },
  cardTitle: {
    marginTop: spacing.xs
  }
});
