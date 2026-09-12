import React from "react";
import { View, Modal, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { AVAILABLE_SORT_OPTIONS, SortOption } from "../types";

interface SortOptionsModalProps {
  visible: boolean;
  currentSort: SortOption;
  onSelectSort: (option: SortOption) => void;
  onClose: () => void;
}

export function SortOptionsModal({
  visible,
  currentSort,
  onSelectSort,
  onClose
}: SortOptionsModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheetContainer,
            { paddingBottom: Math.max(insets.bottom, spacing.lg) + 8 }
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.header}>
            <FinoraText variant="title" style={styles.title}>
              Sort By
            </FinoraText>
            <Pressable
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Close sort options"
            >
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </Pressable>
          </View>

          <View style={styles.optionsList}>
            {AVAILABLE_SORT_OPTIONS.map((option) => {
              const isSelected =
                option.sortBy === currentSort.sortBy &&
                option.sortOrder === currentSort.sortOrder;

              return (
                <Pressable
                  key={option.id}
                  style={[
                    styles.optionRow,
                    isSelected && styles.optionRowSelected
                  ]}
                  onPress={() => {
                    onSelectSort(option);
                    onClose();
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${option.label}`}
                  accessibilityState={{ selected: isSelected }}
                >
                  <FinoraText
                    variant="body"
                    style={[
                      styles.optionLabel,
                      isSelected && styles.optionLabelSelected
                    ]}
                  >
                    {option.label}
                  </FinoraText>
                  {isSelected && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={colors.primary}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "flex-end"
  },
  sheetContainer: {
    backgroundColor: "#161622",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: "#2C2C3E"
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing.md
  },
  title: {
    fontWeight: "700",
    color: colors.textPrimary
  },
  closeButton: {
    padding: 4
  },
  optionsList: {
    gap: spacing.xs
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 12
  },
  optionRowSelected: {
    backgroundColor: "#202030"
  },
  optionLabel: {
    color: colors.textSecondary
  },
  optionLabelSelected: {
    color: colors.textPrimary,
    fontWeight: "600"
  }
});
