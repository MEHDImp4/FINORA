import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

export interface SearchCategory {
  id: string;
  label: string;
  itemTypes?: string[];
}

export const SEARCH_CATEGORIES: SearchCategory[] = [
  { id: "all", label: "All", itemTypes: ["Movie", "Series", "BoxSet"] },
  { id: "movies", label: "Movies", itemTypes: ["Movie"] },
  { id: "series", label: "Series", itemTypes: ["Series"] },
  { id: "episodes", label: "Episodes", itemTypes: ["Episode"] }
];

interface SearchCategoryChipsProps {
  selectedCategoryId: string;
  onSelectCategory: (category: SearchCategory) => void;
}

export function SearchCategoryChips({
  selectedCategoryId,
  onSelectCategory
}: SearchCategoryChipsProps) {
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {SEARCH_CATEGORIES.map((cat) => {
          const isSelected = cat.id === selectedCategoryId;
          return (
            <Pressable
              key={cat.id}
              style={[
                styles.chip,
                isSelected ? styles.chipSelected : styles.chipUnselected
              ]}
              onPress={() => onSelectCategory(cat)}
              accessibilityRole="button"
              accessibilityLabel={`Filter by ${cat.label}`}
              accessibilityState={{ selected: isSelected }}
            >
              <FinoraText
                variant="caption"
                style={[
                  styles.chipText,
                  isSelected ? styles.chipTextSelected : styles.chipTextUnselected
                ]}
              >
                {cat.label}
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
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1
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
    color: "#FFFFFF"
  },
  chipTextUnselected: {
    color: colors.textSecondary
  }
});
