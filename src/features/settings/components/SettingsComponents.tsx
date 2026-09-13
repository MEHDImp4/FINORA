import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Platform
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";
import { hapticService } from "../../../core/feedback/hapticService";

interface SettingsSectionProps {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: SettingsSectionProps) {
  return (
    <View style={styles.sectionContainer}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  );
}

interface SettingsRowProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  destructive?: boolean;
  testID?: string;
  isLast?: boolean;
}

export function SettingsRow({
  iconName,
  iconColor = colors.primary,
  title,
  subtitle,
  value,
  onPress,
  showChevron = true,
  destructive = false,
  testID,
  isLast = false
}: SettingsRowProps) {
  const handlePress = () => {
    hapticService.impactLight();
    onPress?.();
  };

  const Content = (
    <View style={[styles.rowContainer, !isLast && styles.rowBorder]}>
      {iconName ? (
        <View
          style={[
            styles.iconWrapper,
            { backgroundColor: destructive ? "rgba(229, 9, 20, 0.12)" : "rgba(255, 255, 255, 0.05)" }
          ]}
        >
          <Ionicons
            name={iconName}
            size={18}
            color={destructive ? colors.primary : iconColor}
          />
        </View>
      ) : null}

      <View style={styles.rowTextContainer}>
        <Text style={[styles.rowTitle, destructive && styles.destructiveText]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {value ? (
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
      ) : null}

      {showChevron && !destructive ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color="#55556B"
          style={styles.chevron}
        />
      ) : null}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        testID={testID}
      >
        {Content}
      </TouchableOpacity>
    );
  }

  return Content;
}

interface SettingsSwitchRowProps {
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
  testID?: string;
  isLast?: boolean;
}

export function SettingsSwitchRow({
  iconName,
  iconColor = colors.primary,
  title,
  subtitle,
  value,
  onValueChange,
  testID,
  isLast = false
}: SettingsSwitchRowProps) {
  const handleToggle = (nextVal: boolean) => {
    hapticService.impactLight();
    onValueChange(nextVal);
  };

  return (
    <View style={[styles.rowContainer, !isLast && styles.rowBorder]} testID={testID}>
      {iconName ? (
        <View style={styles.iconWrapper}>
          <Ionicons name={iconName} size={18} color={iconColor} />
        </View>
      ) : null}

      <View style={styles.rowTextContainer}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>

      <Switch
        value={value}
        onValueChange={handleToggle}
        trackColor={{ false: "#2A2A38", true: colors.primary }}
        thumbColor={Platform.OS === "android" ? "#FFFFFF" : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: spacing.xl
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#8A8A9E",
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
    marginLeft: 4
  },
  sectionDescription: {
    fontSize: 13,
    color: "#6E6E82",
    marginBottom: spacing.sm,
    marginLeft: 4,
    lineHeight: 18
  },
  card: {
    backgroundColor: "rgba(20, 20, 28, 0.72)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.09)",
    borderTopColor: "rgba(255, 255, 255, 0.20)",
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10
  },
  rowContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 13,
    paddingHorizontal: 16
  },
  rowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#1C1C26"
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12
  },
  rowTextContainer: {
    flex: 1,
    justifyContent: "center",
    marginRight: 12
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#FFFFFF"
  },
  destructiveText: {
    color: colors.primary
  },
  rowSubtitle: {
    fontSize: 12,
    color: "#8A8A9E",
    marginTop: 2,
    lineHeight: 16
  },
  rowValue: {
    fontSize: 14,
    color: "#8A8A9E",
    marginRight: 6,
    maxWidth: "45%",
    textAlign: "right"
  },
  chevron: {
    marginLeft: 2
  }
});
