import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { useTranslation } from "../../../i18n";
import { SortOption, getSortOptionLabel } from "../types";

interface LibraryFilterBarProps {
  currentSort: SortOption;
  onOpenSortModal: () => void;
}

export function LibraryFilterBar({
  currentSort,
  onOpenSortModal
}: LibraryFilterBarProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.sortPill}
        onPress={onOpenSortModal}
        accessibilityRole="button"
        accessibilityLabel={t("library.sortBy")}
      >
        <Ionicons
          name="swap-vertical"
          size={14}
          color={colors.textPrimary}
          style={styles.sortIcon}
        />
        <FinoraText variant="caption" style={styles.sortPillText} numberOfLines={1}>
          {getSortOptionLabel(currentSort.id, t)}
        </FinoraText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    paddingHorizontal: spacing.md,
    marginVertical: spacing.xs,
    height: 40
  },
  sortPill: {
    height: 36,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderRadius: 18,
    backgroundColor: "#161622",
    borderWidth: 1,
    borderColor: "#28283A",
    maxWidth: 200
  },
  sortIcon: {
    marginRight: 4
  },
  sortPillText: {
    color: colors.textPrimary,
    fontWeight: "600"
  }
});


