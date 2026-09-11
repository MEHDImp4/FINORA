import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

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
  if (history.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <FinoraText variant="body" style={styles.headerTitle}>
          Recent Searches
        </FinoraText>
        <Pressable
          onPress={onClearAll}
          accessibilityRole="button"
          accessibilityLabel="Clear all search history"
          hitSlop={8}
        >
          <FinoraText variant="caption" style={styles.clearAllText}>
            Clear All
          </FinoraText>
        </Pressable>
      </View>

      <View style={styles.itemsList}>
        {history.map((term) => (
          <View key={term} style={styles.historyRow}>
            <Pressable
              style={styles.termButton}
              onPress={() => onSelectTerm(term)}
              accessibilityRole="button"
              accessibilityLabel={`Search for ${term}`}
            >
              <Ionicons
                name="time-outline"
                size={18}
                color={colors.textSecondary}
                style={styles.clockIcon}
              />
              <FinoraText variant="body" style={styles.termText} numberOfLines={1}>
                {term}
              </FinoraText>
            </Pressable>
            <Pressable
              onPress={() => onRemoveTerm(term)}
              style={styles.removeButton}
              accessibilityRole="button"
              accessibilityLabel={`Remove ${term} from history`}
              hitSlop={8}
            >
              <Ionicons name="close" size={18} color={colors.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    marginTop: spacing.md
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.sm
  },
  headerTitle: {
    fontWeight: "700",
    color: colors.textPrimary
  },
  clearAllText: {
    color: colors.primary,
    fontWeight: "600"
  },
  itemsList: {
    gap: spacing.xs
  },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1F1F2E"
  },
  termButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  clockIcon: {
    marginRight: spacing.sm
  },
  termText: {
    flex: 1,
    color: colors.textSecondary
  },
  removeButton: {
    padding: 4,
    marginLeft: spacing.sm
  }
});
