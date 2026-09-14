import React from "react";
import { View, StyleSheet, Dimensions } from "react-native";
import { ShimmerSkeleton } from "./ShimmerSkeleton";
import { EpisodeListSkeleton } from "./EpisodeSkeleton";
import { spacing } from "../tokens";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BACKDROP_HEIGHT = Math.round(SCREEN_WIDTH * 0.72);
const ACTION_BUTTON_SIZE = 48;

export interface DetailsSkeletonProps {
  /** Show episode rows below the metadata (series) instead of just the overview (movie). */
  showEpisodes?: boolean;
}

export function DetailsSkeleton({ showEpisodes = true }: DetailsSkeletonProps) {
  return (
    <View style={styles.container} testID="details-skeleton">
      <ShimmerSkeleton width="100%" height={BACKDROP_HEIGHT} borderRadius={0} />

      <View style={styles.body}>
        <ShimmerSkeleton width="62%" height={28} borderRadius={6} />

        <View style={styles.metaRow}>
          <ShimmerSkeleton width={44} height={14} borderRadius={4} />
          <ShimmerSkeleton width={72} height={14} borderRadius={4} />
          <ShimmerSkeleton width={38} height={14} borderRadius={4} />
        </View>

        <View style={styles.actionRow}>
          <View style={styles.playButton}>
            <ShimmerSkeleton width="100%" height={ACTION_BUTTON_SIZE} borderRadius={10} />
          </View>
          <ShimmerSkeleton width={ACTION_BUTTON_SIZE} height={ACTION_BUTTON_SIZE} borderRadius={24} />
          <ShimmerSkeleton width={ACTION_BUTTON_SIZE} height={ACTION_BUTTON_SIZE} borderRadius={24} />
        </View>

        <ShimmerSkeleton width="100%" height={12} borderRadius={4} />
        <ShimmerSkeleton width="92%" height={12} borderRadius={4} style={styles.line} />
        <ShimmerSkeleton width="68%" height={12} borderRadius={4} style={styles.line} />
      </View>

      {showEpisodes ? (
        <View style={styles.episodes}>
          <ShimmerSkeleton width={110} height={20} borderRadius={4} style={styles.sectionTitle} />
          <EpisodeListSkeleton count={4} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  body: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.md
  },
  playButton: {
    flex: 1
  },
  line: {
    marginTop: spacing.sm
  },
  episodes: {
    marginTop: spacing.sm
  },
  sectionTitle: {
    marginLeft: spacing.md,
    marginBottom: spacing.sm
  }
});
