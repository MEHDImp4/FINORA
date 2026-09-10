import React from "react";
import { Text, TextProps, StyleSheet, TextStyle } from "react-native";
import { typography, TypographyVariant, colors, ColorToken } from "../tokens";

export interface FinoraTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ColorToken | string;
  weight?: TextStyle["fontWeight"];
  align?: TextStyle["textAlign"];
  children: React.ReactNode;
}

export function FinoraText({
  variant = "body",
  color = "textPrimary",
  weight,
  align,
  style,
  children,
  ...props
}: FinoraTextProps) {
  const resolvedColor = (color in colors ? colors[color as ColorToken] : color) as string;
  const typoStyle = typography[variant];

  const computedStyle: TextStyle = {
    fontSize: typoStyle.fontSize,
    lineHeight: typoStyle.lineHeight,
    fontWeight: weight || typoStyle.fontWeight,
    color: resolvedColor,
    textAlign: align
  };

  return (
    <Text style={[computedStyle, style]} {...props}>
      {children}
    </Text>
  );
}
