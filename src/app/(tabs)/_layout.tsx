import React from "react";
import { Tabs } from "expo-router";
import { StyleSheet, Platform } from "react-native";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#E50914",
        tabBarInactiveTintColor: "#8A8A9E",
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabBarLabel
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home"
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search"
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library"
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: "Downloads"
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings"
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
    height: Platform.OS === "ios" ? 88 : 64,
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
    paddingTop: 8
  },
  tabBarLabel: {
    fontSize: 11,
    fontWeight: "600"
  }
});
