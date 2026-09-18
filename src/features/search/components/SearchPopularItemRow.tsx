import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { MediaItem } from "../../../types/media";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";
import { getBackdropUrl, getPosterUrl } from "../../../core/repositories/imageUrlBuilder";
import { hapticService } from "../../../core/feedback/hapticService";
import { useTranslation } from "../../../i18n";

interface SearchPopularItemRowProps {
  item: MediaItem;
  serverUrl: string;
  onPress: (item: MediaItem) => void;
  onPlayPress?: (item: MediaItem) => void;
}

export const SearchPopularItemRow = React.memo(function SearchPopularItemRow({
  item,
  serverUrl,
  onPress,
  onPlayPress
}: SearchPopularItemRowProps) {
  const { t } = useTranslation();

  const imageUrl = item.backdropImageTag
    ? getBackdropUrl(serverUrl, item.id, item.backdropImageTag, 300)
    : getPosterUrl(serverUrl, item.id, item.primaryImageTag, 200);

  const typeLabel =
    item.type === "Series"
      ? t("library.shows")
      : item.type === "Movie"
      ? t("library.movies")
      : "";
  const subtitleParts = [item.year, typeLabel].filter(Boolean);

  const handleRowPress = () => {
    hapticService.selection();
    onPress(item);
  };

  const handlePlayPress = () => {
    hapticService.impactMedium();
    if (onPlayPress) {
      onPlayPress(item);
    } else {
      onPress(item);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={handleRowPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.name}${item.year ? `, ${item.year}` : ""}`}
    >
      <View style={styles.thumbnailWrapper}>
        <Image
          source={imageUrl ? { uri: imageUrl } : undefined}
          style={styles.thumbnail}
          contentFit="cover"
          transition={200}
        />
      </View>

      <View style={styles.infoContainer}>
        <FinoraText variant="body" weight="600" color="textPrimary" numberOfLines={1}>
          {item.name}
        </FinoraText>
        {subtitleParts.length > 0 && (
          <FinoraText variant="caption" color="textSecondary" style={styles.subtitle} numberOfLines={1}>
            {subtitleParts.join(" • ")}
          </FinoraText>
        )}
      </View>

      <Pressable
        style={styles.playButton}
        onPress={handlePlayPress}
        accessibilityRole="button"
        accessibilityLabel={`Play ${item.name}`}
        hitSlop={10}
      >
        <Ionicons name="play-circle-outline" size={32} color={colors.textPrimary} />
      </Pressable>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    backgroundColor: "transparent"
  },
  rowPressed: {
    opacity: 0.75,
    backgroundColor: "rgba(255, 255, 255, 0.04)"
  },
  thumbnailWrapper: {
    width: 120,
    height: 68,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#161622"
  },
  thumbnail: {
    width: "100%",
    height: "100%"
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center"
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12
  },
  playButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center"
  }
});
