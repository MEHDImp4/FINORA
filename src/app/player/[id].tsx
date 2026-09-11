import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "../../stores/authStore";
import { useItemDetails } from "../../hooks/useMediaQueries";
import { PlayerScreen } from "../../features/player/components/PlayerScreen";
import { FinoraText } from "../../design-system/components/FinoraText";
import { FinoraButton } from "../../design-system/components/FinoraButton";
import { colors, spacing } from "../../design-system/tokens";

export default function PlayerRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.userId || "";
  const serverUrl = session?.serverUrl || "";
  const token = session?.token || "";

  const { data: item, isLoading, isError } = useItemDetails(userId, id);

  if (isLoading) {
    return (
      <View style={styles.centerContainer} testID="player-route-loading">
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isError || !item) {
    return (
      <View style={styles.centerContainer} testID="player-route-error">
        <FinoraText variant="title" style={styles.errorTitle}>
          Video unavailable
        </FinoraText>
        <FinoraButton label="Go Back" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <PlayerScreen
      item={item}
      serverUrl={serverUrl}
      token={token}
      onBack={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl
  },
  errorTitle: {
    marginBottom: spacing.md,
    color: colors.textPrimary
  }
});
