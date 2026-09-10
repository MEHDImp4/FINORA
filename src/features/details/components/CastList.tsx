import React from "react";
import { View, StyleSheet, FlatList } from "react-native";
import { Image } from "expo-image";
import { Person } from "../../../types/media";
import { getPersonImageUrl } from "../../../core/repositories/imageUrlBuilder";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { colors, spacing } from "../../../design-system/tokens";

export interface CastListProps {
  people: Person[];
  serverUrl: string;
}

const AVATAR_SIZE = 72;

export const CastList: React.FC<CastListProps> = React.memo(({ people, serverUrl }) => {
  if (!people || people.length === 0) {
    return null;
  }

  const renderItem = ({ item }: { item: Person }) => {
    const imageUrl = item.primaryImageTag
      ? getPersonImageUrl(serverUrl, item.id, item.primaryImageTag, 160)
      : null;

    const initials = item.name
      ? item.name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "?";

    return (
      <View style={styles.personContainer} testID={`cast-member-${item.id}`}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.avatar}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.avatar, styles.fallbackAvatar]}>
            <FinoraText variant="body" color="#8E8E9F" style={styles.initials}>
              {initials}
            </FinoraText>
          </View>
        )}
        <FinoraText variant="caption" numberOfLines={1} style={styles.name}>
          {item.name}
        </FinoraText>
        {item.role ? (
          <FinoraText variant="caption" color="#8E8E9F" numberOfLines={1} style={styles.role}>
            {item.role}
          </FinoraText>
        ) : null}
      </View>
    );
  };

  return (
    <View style={styles.sectionContainer}>
      <FinoraText variant="title" style={styles.sectionTitle}>
        Cast & Crew
      </FinoraText>
      <FlatList
        data={people}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={renderItem}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={5}
        maxToRenderPerBatch={5}
        windowSize={3}
      />
    </View>
  );
});

CastList.displayName = "CastList";

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: spacing.lg
  },
  sectionTitle: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm
  },
  listContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.md
  },
  personContainer: {
    width: 84,
    alignItems: "center"
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: colors.surface,
    marginBottom: spacing.xs
  },
  fallbackAvatar: {
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border
  },
  initials: {
    fontWeight: "700"
  },
  name: {
    textAlign: "center",
    fontWeight: "600"
  },
  role: {
    textAlign: "center",
    fontSize: 11
  }
});
