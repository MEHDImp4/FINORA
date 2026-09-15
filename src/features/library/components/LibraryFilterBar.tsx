import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

interface LibraryFilterBarProps {
  genres: string[];
  selectedGenre: string | null;
  onSelectGenre: (genre: string | null) => void;
}

export function LibraryFilterBar({
  genres,
  selectedGenre,
  onSelectGenre
}: LibraryFilterBarProps) {
  if (genres.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Pressable
          style={[
            styles.chip,
            selectedGenre === null ? styles.chipSelected : styles.chipUnselected
          ]}
          onPress={() => onSelectGenre(null)}
          accessibilityRole="button"
          accessibilityLabel="Afficher tous les genres"
          accessibilityState={{ selected: selectedGenre === null }}
        >
          <FinoraText
            variant="caption"
            style={[
              styles.chipText,
              selectedGenre === null
                ? styles.chipTextSelected
                : styles.chipTextUnselected
            ]}
          >
            Tous les genres
          </FinoraText>
        </Pressable>

        {genres.map((genre) => {
          const isSelected = selectedGenre === genre;
          return (
            <Pressable
              key={genre}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected
              ]}
              onPress={() => onSelectGenre(isSelected ? null : genre)}
              accessibilityRole="button"
              accessibilityLabel={`Filtrer par genre ${genre}`}
              accessibilityState={{ selected: isSelected }}
            >
              <FinoraText
                variant="caption"
                style={[
                  styles.chipText,
                  isSelected
                    ? styles.chipTextSelected
                    : styles.chipTextUnselected
                ]}
              >
                {genre}
              </FinoraText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.sm
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipUnselected: {
    backgroundColor: "#161622",
    borderColor: "#28283A"
  },
  chipText: {
    fontWeight: "600"
  },
  chipTextSelected: {
    color: colors.textPrimary
  },
  chipTextUnselected: {
    color: colors.textSecondary
  }
});
