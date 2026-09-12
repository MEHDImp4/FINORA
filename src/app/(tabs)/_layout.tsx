import React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, Platform.OS === "ios" ? 20 : 8);
  const tabHeight = 54 + bottomPadding;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#E50914",
        tabBarInactiveTintColor: "#8A8A9E",
        tabBarStyle: [
          styles.tabBar,
          {
            height: tabHeight,
            paddingBottom: bottomPadding
          }
        ],
        tabBarLabelStyle: styles.tabBarLabel
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size - 2} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" size={size - 2} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="film-outline" size={size - 2} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: "Downloads",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="download-outline" size={size - 2} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size - 2} color={color} />
          )
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: "#101014",
    borderTopColor: "#22222C",
    borderTopWidth: 1,
    paddingTop: 6
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600"
  }
});

