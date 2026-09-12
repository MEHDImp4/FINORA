import React from "react";
import { View, TextInput, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";

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
  placeholder = "Search movies, TV shows, series...",
  autoFocus = false
}: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        returnKeyType="search"
        onSubmitEditing={onSubmitEditing}
        autoFocus={autoFocus}
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search input"
      />
      {value.length > 0 && (
        <Pressable
          onPress={onClear}
          style={styles.clearButton}
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          hitSlop={8}
        >
          <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1C1C26",
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: 48,
    borderWidth: 1,
    borderColor: "#2C2C3E"
  },
  searchIcon: {
    marginRight: spacing.sm
  },
  input: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: 16,
    paddingVertical: 0
  },
  clearButton: {
    padding: 4
  }
});
