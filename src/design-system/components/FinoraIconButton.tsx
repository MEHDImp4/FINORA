import React from "react";
import { Pressable, StyleSheet, ViewStyle, PressableProps } from "react-native";
import { colors } from "../tokens";

export interface FinoraIconButtonProps extends Omit<PressableProps, "style"> {
  children: React.ReactNode;
  size?: number;
  backgroundColor?: string;
  accessibilityLabel: string;
  style?: ViewStyle;
}

export function FinoraIconButton({
  children,
  size = 44,
  backgroundColor = "transparent",
  accessibilityLabel,
  disabled = false,
  style,
  onPress,
  hitSlop,
  ...props
}: FinoraIconButtonProps) {
  const isDisabled = Boolean(disabled);
  const minimumTarget = 44;
  const extraHitArea = Math.max(0, (minimumTarget - size) / 2);
  const resolvedHitSlop = hitSlop ?? (extraHitArea > 0 ? extraHitArea + 2 : 2);

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: isDisabled }}
      hitSlop={resolvedHitSlop}
      style={({ pressed }) => [
        styles.button,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: pressed ? colors.surface : backgroundColor,
          opacity: isDisabled ? 0.4 : pressed ? 0.8 : 1,
          transform: pressed && !isDisabled ? [{ scale: 0.94 }] : [{ scale: 1 }]
        },
        style
      ]}
      {...props}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: "center",
    alignItems: "center"
  }
});
