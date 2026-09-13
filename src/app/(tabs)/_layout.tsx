import React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const bottomInset = Platform.OS === "ios" ? insets.bottom + 4 : 12;
  const tabWidth = 230;
  const leftInset = Math.max(16, Math.round((width - tabWidth) / 2));

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#8A8A9E",
        tabBarStyle: [
          styles.floatingTabBar,
          {
            bottom: bottomInset,
            left: leftInset,
            width: tabWidth
          }
        ],
        tabBarItemStyle: styles.tabBarItem,
        tabBarLabelStyle: styles.tabBarLabel
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={18}
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "film" : "film-outline"}
              size={18}
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "settings" : "settings-outline"}
              size={18}
              color={focused ? "#E50914" : color}
            />
          )
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  floatingTabBar: {
    position: "absolute",
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(18, 18, 24, 0.94)",
    borderTopWidth: 0,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    paddingHorizontal: 8,
    paddingBottom: 0,
    paddingTop: 0,
    justifyContent: "center",
    alignItems: "center"
  },
  tabBarItem: {
    paddingVertical: 2,
    justifyContent: "center",
    alignItems: "center"
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1
  }
});


