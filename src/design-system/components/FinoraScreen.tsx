import React from "react";
import { View, StyleSheet, ViewProps } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar, StatusBarProps } from "expo-status-bar";
import { colors } from "../tokens";

export interface FinoraScreenProps extends ViewProps {
  children: React.ReactNode;
  safeBottom?: boolean;
  safeTop?: boolean;
  statusBarStyle?: StatusBarProps["style"];
  backgroundColor?: string;
}

export function FinoraScreen({
  children,
  safeBottom = true,
  safeTop = true,
  statusBarStyle = "light",
  backgroundColor = colors.background,
  style,
  ...props
}: FinoraScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor,
          paddingTop: safeTop ? insets.top : 0,
          paddingBottom: safeBottom ? insets.bottom : 0,
          paddingLeft: insets.left,
          paddingRight: insets.right
        },
        style
      ]}
      {...props}
    >
      <StatusBar style={statusBarStyle} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1
  }
});
