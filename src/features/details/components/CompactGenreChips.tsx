import React, { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { getLocalizedGenre } from "../../library/libraryLocalization";

export interface CompactGenreChipsProps {
  genres?: string[];
  language?: string;
  maxVisible?: number;
}

export function normalizeCompactGenres(genres: string[] = []): string[] {
  const seen = new Set<string>();
  return genres.filter((genre) => {
    const value = genre?.trim();
    if (!value) return false;
    const key = value.toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function CompactGenreChips({
  genres = [],
  language,
  maxVisible = 4
}: CompactGenreChipsProps) {
  const [expanded, setExpanded] = useState(false);

  const normalizedGenres = useMemo(() => normalizeCompactGenres(genres), [genres]);

  if (normalizedGenres.length === 0) return null;

  const visibleGenres = expanded
    ? normalizedGenres
    : normalizedGenres.slice(0, maxVisible);
  const hiddenCount = Math.max(0, normalizedGenres.length - maxVisible);

  return (
    <View style={styles.row} testID="compact-genre-chips">
      {visibleGenres.map((genre) => (
        <View
          key={genre}
          style={styles.chip}
          testID={`compact-genre-chip-${genre.trim().toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
        >
          <FinoraText variant="caption" color="textSecondary" numberOfLines={1}>
            {getLocalizedGenre(genre, language)}
          </FinoraText>
        </View>
      ))}

      {hiddenCount > 0 ? (
        <Pressable
          onPress={() => setExpanded((value) => !value)}
          style={({ pressed }) => [styles.moreChip, pressed && styles.moreChipPressed]}
          testID="compact-genre-toggle"
          accessibilityRole="button"
        >
          <FinoraText variant="caption" color="textPrimary" style={styles.moreText}>
            {expanded ? "−" : `+${hiddenCount}`}
          </FinoraText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md
  },
  chip: {
    maxWidth: "68%",
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  moreChip: {
    minWidth: 34,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: "center"
  },
  moreChipPressed: {
    opacity: 0.72
  },
  moreText: {
    fontWeight: "800"
  }
});
