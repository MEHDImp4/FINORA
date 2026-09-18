import React from "react";
import { View, TextInput, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";

import { useTranslation } from "../../../i18n";

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClear: () => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function SearchBar({
  value,
  onChangeText,
  onClear,
  onSubmitEditing,
  placeholder,
  autoFocus = false
}: SearchBarProps) {
  const { t } = useTranslation();
  const effectivePlaceholder = placeholder ?? t("search.placeholder");

  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color={colors.textSecondary} style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={effectivePlaceholder}
        placeholderTextColor={colors.textMuted}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel={t("common.search")}
      />
      {value.length > 0 && (
        <Pressable
          onPress={onClear}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel={t("search.clearHistory")}
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#181824",
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 6,
    height: 40,
    borderWidth: 1,
    borderColor: "#28283C"
  },
  searchIcon: {
    marginRight: spacing.xs
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 15,
    height: 40,
    paddingVertical: 0
  },
  clearButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center"
  }
});

