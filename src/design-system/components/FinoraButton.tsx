import React from "react";
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  PressableProps
} from "react-native";
import { colors, spacing } from "../tokens";
import { FinoraText } from "./FinoraText";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface FinoraButtonProps extends Omit<PressableProps, "style"> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  style?: ViewStyle;
}

export function FinoraButton({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  style,
  onPress,
  ...props
}: FinoraButtonProps) {
  const isInteractive = !disabled && !loading;

  const getContainerStyle = (pressed: boolean): ViewStyle => {
    let backgroundColor: string = colors.primary;
    let borderColor: string | undefined = undefined;
    let borderWidth = 0;

    switch (variant) {
      case "primary":
        backgroundColor = pressed ? colors.primaryHover : colors.primary;
        break;
      case "secondary":
        backgroundColor = pressed ? colors.surface : colors.card;
        borderColor = colors.border;
        borderWidth = 1;
        break;
      case "ghost":
        backgroundColor = pressed ? colors.card : "transparent";
        break;
      case "danger":
        backgroundColor = pressed ? "#D32F2F" : colors.error;
        break;
    }

    const sizePadding = {
      sm: { paddingVertical: 6, paddingHorizontal: 12, minHeight: 32 },
      md: { paddingVertical: 12, paddingHorizontal: 20, minHeight: 44 },
      lg: { paddingVertical: 16, paddingHorizontal: 28, minHeight: 52 }
    }[size];

    return {
      backgroundColor,
      borderColor,
      borderWidth,
      opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
      transform: pressed && isInteractive ? [{ scale: 0.98 }] : [{ scale: 1 }],
      ...sizePadding
    };
  };

  const getTextColor = () => {
    switch (variant) {
      case "primary":
      case "danger":
        return "textPrimary";
      case "secondary":
        return "textPrimary";
      case "ghost":
        return "textSecondary";
    }
  };

  const getTextVariant = () => {
    switch (size) {
      case "sm":
        return "caption";
      case "md":
        return "body";
      case "lg":
        return "subtitle";
    }
  };

  return (
    <Pressable
      onPress={isInteractive ? onPress : undefined}
      disabled={!isInteractive}
      style={({ pressed }) => [styles.base, getContainerStyle(pressed), style]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractive, busy: loading }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.textPrimary} />
      ) : (
        <>
          {leftIcon}
          <FinoraText
            variant={getTextVariant()}
            color={getTextColor()}
            weight="600"
            style={styles.label}
          >
            {label}
          </FinoraText>
          {rightIcon}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm
  },
  label: {
    flexShrink: 0,
    paddingRight: 4
  }
});
