import React from "react";
import { View, ScrollView, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { useTranslation } from "../../../i18n";

interface SearchHistoryListProps {
  history: string[];
  onSelectTerm: (term: string) => void;
  onRemoveTerm: (term: string) => void;
  onClearAll: () => void;
}

export function SearchHistoryList({
  history,
  onSelectTerm,
  onRemoveTerm,
  onClearAll
}: SearchHistoryListProps) {
  const { t } = useTranslation();

  if (history.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <FinoraText variant="caption" weight="600" color="textSecondary" style={styles.headerTitle}>
          {t("search.recentSearches")}
        </FinoraText>
        <Pressable
          onPress={onClearAll}
          style={styles.clearAllButton}
          accessibilityRole="button"
          accessibilityLabel={t("search.clearHistory")}
          hitSlop={8}
        >
          <FinoraText variant="caption" style={styles.clearAllText}>
            {t("search.clearHistory")}
          </FinoraText>
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {history.map((term) => (
          <View key={term} style={styles.chip}>
            <Pressable
              style={styles.termPressable}
              onPress={() => onSelectTerm(term)}
              accessibilityRole="button"
              accessibilityLabel={term}
            >
              <Ionicons
                name="time-outline"
                size={13}
                color={colors.textSecondary}
                style={styles.clockIcon}
              />
              <FinoraText variant="caption" style={styles.termText} numberOfLines={1}>
                {term}
              </FinoraText>
            </Pressable>
            <Pressable
              onPress={() => onRemoveTerm(term)}
              style={styles.removeButton}
              accessibilityRole="button"
              accessibilityLabel={t("search.deleteHistoryTermA11y", { term })}
              hitSlop={6}
            >
              <Ionicons name="close" size={13} color={colors.textSecondary} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    marginBottom: 6
  },
  headerTitle: {
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 0.5
  },
  clearAllButton: {
    paddingVertical: 2,
    paddingHorizontal: 4
  },
  clearAllText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 12
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    alignItems: "center"
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#161622",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#28283C",
    paddingLeft: 10,
    paddingRight: 6,
    height: 32
  },
  termPressable: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 4
  },
  clockIcon: {
    marginRight: 4
  },
  termText: {
    color: colors.textPrimary,
    fontWeight: "500"
  },
  removeButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  }
});

