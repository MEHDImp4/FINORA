import React from "react";
import { View, StyleSheet, ScrollView, Pressable } from "react-native";
import { MediaItem } from "../../../types/media";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { useTranslation } from "../../../i18n";

export interface SeasonPickerProps {
  seasons: MediaItem[];
  selectedSeasonId: string;
  onSelectSeason: (seasonId: string) => void;
}

export const SeasonPicker: React.FC<SeasonPickerProps> = React.memo(
  ({ seasons, selectedSeasonId, onSelectSeason }) => {
    const { t } = useTranslation();

    if (!seasons || seasons.length === 0) {
      return null;
    }

    const getSeasonLabel = (season: MediaItem): string => {
      if (typeof season.seasonIndex === "number" && season.seasonIndex > 0) {
        return t("details.downloadSeasonNumber", { season: season.seasonIndex });
      }
      const match = season.name?.match(/^(?:season|saison)\s+(\d+)$/i);
      if (match) {
        return t("details.downloadSeasonNumber", { season: match[1] });
      }
      return season.name;
    };

    return (
      <View style={styles.container}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {seasons.map((season) => {
            const isSelected = season.id === selectedSeasonId;
            const displayLabel = getSeasonLabel(season);
            return (
              <Pressable
                key={season.id}
                testID={`season-pill-${season.id}`}
                onPress={() => onSelectSeason(season.id)}
                accessibilityRole="button"
                accessibilityLabel={displayLabel}
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [
                  styles.pill,
                  isSelected ? styles.selectedPill : styles.unselectedPill,
                  pressed && styles.pressedPill
                ]}
              >
                <FinoraText
                  variant="caption"
                  color={isSelected ? "#FFFFFF" : colors.textSecondary}
                  style={[styles.pillText, isSelected && styles.selectedPillText]}
                >
                  {displayLabel}
                </FinoraText>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    );
  }
);

SeasonPicker.displayName = "SeasonPicker";

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1
  },
  selectedPill: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  unselectedPill: {
    backgroundColor: colors.card,
    borderColor: colors.border
  },
  pressedPill: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }]
  },
  pillText: {
    fontWeight: "600"
  },
  selectedPillText: {
    fontWeight: "700"
  }
});
