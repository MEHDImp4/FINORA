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
          Recherches récentes
        </FinoraText>
        <Pressable
          onPress={onClearAll}
          style={styles.clearAllButton}
          accessibilityRole="button"
          accessibilityLabel="Effacer tout l'historique de recherche"
        >
          <FinoraText variant="caption" style={styles.clearAllText}>
            Tout effacer
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
              accessibilityLabel={`Rechercher ${term}`}
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
              accessibilityLabel={`Retirer ${term} de l'historique`}
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
  clearAllButton: {
    minHeight: 44,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center"
  },
  clearAllText: {
    color: colors.primary,
    fontWeight: "600"
  },
  itemsList: {
    gap: spacing.xs
  },
  historyRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#1F1F2E"
  },
  termButton: {
    minHeight: 48,
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
    width: 44,
    height: 44,
    marginLeft: spacing.sm,
    alignItems: "center",
    justifyContent: "center"
  }
});
