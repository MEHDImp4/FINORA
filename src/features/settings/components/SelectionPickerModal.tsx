import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  FlatList
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";

export interface SelectionOption<T extends string | number> {
  id: T;
  label: string;
  subtitle?: string;
  badge?: string;
}

interface SelectionPickerModalProps<T extends string | number> {
  visible: boolean;
  title: string;
  description?: string;
  options: SelectionOption<T>[];
  selectedValue: T;
  onSelect: (val: T) => void;
  onClose: () => void;
}

export function SelectionPickerModal<T extends string | number>({
  visible,
  title,
  description,
  options,
  selectedValue,
  onSelect,
  onClose
}: SelectionPickerModalProps<T>) {
  const { t } = useTranslation();
  const handleSelect = (val: T) => {
    hapticService.impactMedium();
    onSelect(val);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{title}</Text>
              {description ? (
                <Text style={styles.headerDescription}>{description}</Text>
              ) : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityLabel={t("common.closeA11y")}
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            renderItem={({ item, index }) => {
              const isSelected = item.id === selectedValue;
              const isLast = index === options.length - 1;

              return (
                <TouchableOpacity
                  style={[styles.optionRow, !isLast && styles.optionBorder]}
                  onPress={() => handleSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.optionTextContainer}>
                    <View style={styles.titleRow}>
                      <Text
                        style={[
                          styles.optionTitle,
                          isSelected && styles.optionTitleActive
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.badge ? (
                        <View style={styles.badgeContainer}>
                          <Text style={styles.badgeText}>{item.badge}</Text>
                        </View>
                      ) : null}
                    </View>
                    {item.subtitle ? (
                      <Text style={styles.optionSubtitle}>{item.subtitle}</Text>
                    ) : null}
                  </View>

                  <View
                    style={[
                      styles.checkCircle,
                      isSelected && styles.checkCircleActive
                    ]}
                  >
                    {isSelected ? (
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                    ) : null}
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.lg
  },
  modalCard: {
    width: "100%",
    maxWidth: 420,
    maxHeight: "80%",
    backgroundColor: "#14141A",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#262633",
    overflow: "hidden"
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#1E1E28"
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  headerDescription: {
    fontSize: 13,
    color: "#8A8A9E",
    marginTop: 4,
    lineHeight: 18
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.sm
  },
  listContent: {
    paddingVertical: spacing.xs
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: spacing.md
  },
  optionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#1C1C26"
  },
  optionTextContainer: {
    flex: 1,
    marginRight: spacing.sm
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#D1D1E0"
  },
  optionTitleActive: {
    color: "#FFFFFF"
  },
  optionSubtitle: {
    fontSize: 12,
    color: "#8A8A9E",
    marginTop: 3,
    lineHeight: 16
  },
  badgeContainer: {
    backgroundColor: "rgba(229, 9, 20, 0.15)",
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primary
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#3D3D52",
    alignItems: "center",
    justifyContent: "center"
  },
  checkCircleActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  }
});
