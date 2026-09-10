import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>FINORA</Text>
        <Text style={styles.subtitle}>Watch your way</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0C"
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: "#E50914",
    letterSpacing: 2
  },
  subtitle: {
    fontSize: 16,
    color: "#8A8A9E",
    marginTop: 8
  }
});
