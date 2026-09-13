import React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, Platform, View, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { hapticService } from "../../core/feedback/hapticService";

const HIDDEN_ROUTES = new Set(["search", "downloads"]);

function FinoraPillTabBar({ state, descriptors, navigation, insets }: any) {
  const bottomInset = Platform.OS === "ios" ? insets.bottom + 6 : 14;

  return (
    <View style={[styles.tabBarWrapper, { bottom: bottomInset }]} pointerEvents="box-none">
      <View style={styles.pillContainer}>
        {state.routes.map((route: any, index: number) => {
          if (HIDDEN_ROUTES.has(route.name)) return null;

          const { options } = descriptors[route.key];
          if (options?.href === null) return null;

          const isFocused = state.index === index;
          const label = options.title !== undefined ? options.title : route.name;

          const onPress = () => {
            hapticService.selection();
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel || label}
              onPress={onPress}
              style={[styles.tabItem, isFocused && styles.tabItemActive]}
              hitSlop={6}
            >
              {options.tabBarIcon?.({
                focused: isFocused,
                color: isFocused ? "#E50914" : "#8A8A9E",
                size: 24
              })}
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isFocused ? "#FFFFFF" : "#8A8A9E",
                    fontWeight: isFocused ? "700" : "500"
                  }
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <FinoraPillTabBar {...props} />}
      screenOptions={{
        headerShown: false
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={size || 24}
              color={focused ? "#E50914" : color}
            />
          )
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "film" : "film-outline"}
              size={size || 24}
              color={focused ? "#E50914" : color}
            />
          )
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          href: null
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={size || 24}
              color={focused ? "#E50914" : color}
            />
          )
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarWrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "box-none"
  },
  pillContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(18, 18, 26, 0.78)",
    height: 60,
    borderRadius: 30,
    paddingHorizontal: 16,
    gap: 12,
    borderWidth: 1.2,
    borderColor: "rgba(255, 255, 255, 0.18)",
    borderTopColor: "rgba(255, 255, 255, 0.32)",
    elevation: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 18
  },
  tabItem: {
    width: 86,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4
  },
  tabItemActive: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)"
  },
  tabLabel: {
    fontSize: 10.5,
    marginTop: 2
  }
});


