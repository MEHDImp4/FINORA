import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { FinoraScreen } from "../../design-system/components/FinoraScreen";
import { HeroBanner } from "../../features/home/components/HeroBanner";
import { MediaCarousel } from "../../features/home/components/MediaCarousel";
import { FinoraText } from "../../design-system/components/FinoraText";
import { useAuthStore } from "../../stores/authStore";
import {
  useResumeItems,
  useRecentlyAdded,
  useLibraries
} from "../../hooks/useMediaQueries";
import { useToggleFavorite } from "../../hooks/useUserDataMutations";
import { colors, spacing } from "../../design-system/tokens";
import { MediaItem, MediaLibrary } from "../../types/media";

function HomeLibraryRow({
  library,
  userId,
  serverUrl,
  onItemPress
}: {
  library: MediaLibrary;
  userId?: string;
  serverUrl: string;
  onItemPress: (item: MediaItem) => void;
}) {
  const { data: items = [] } = useRecentlyAdded(userId, library.id, 16);

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <MediaCarousel
      title={library.name}
      items={items}
      serverUrl={serverUrl}
      variant="poster"
      onItemPress={onItemPress}
    />
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const userId = session?.userId;
  const serverUrl = session?.serverUrl || "";

  // Data queries
  const {
    data: resumeItems,
    isLoading: isResumeLoading,
    refetch: refetchResume
  } = useResumeItems(userId);

  const {
    data: recentItems,
    isLoading: isRecentLoading,
    refetch: refetchRecent
  } = useRecentlyAdded(userId);

  const {
    data: libraries,
    isLoading: isLibrariesLoading,
    refetch: refetchLibraries
  } = useLibraries(userId);

  const toggleFavorite = useToggleFavorite(userId || "");

  const isRefreshing = isResumeLoading || isRecentLoading || isLibrariesLoading;

  const onRefresh = () => {
    refetchResume();
    refetchRecent();
    refetchLibraries();
  };

  // Derive featured hero item (prefer first recently added with backdrop or first resume item)
  const featuredItem =
    recentItems?.find((i) => i.backdropImageTag) ||
    resumeItems?.find((i) => i.backdropImageTag) ||
    recentItems?.[0] ||
    null;

  const handlePlay = (item: MediaItem) => {
    router.push({ pathname: "/player/[id]", params: { id: item.id } });
  };

  const handleItemPress = (item: MediaItem) => {
    router.push({ pathname: "/details/[id]", params: { id: item.id } });
  };

  const handleToggleFavorite = (item: MediaItem) => {
    toggleFavorite.mutate({ itemId: item.id, isFavorite: !item.isFavorite });
  };

  return (
    <FinoraScreen safeTop={false} safeBottom={false}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Dynamic Hero Banner */}
        <HeroBanner
          item={featuredItem}
          serverUrl={serverUrl}
          onPlay={handlePlay}
          onToggleFavorite={handleToggleFavorite}
          onPressDetails={handleItemPress}
        />

        {/* Quick Library Shortcuts */}
        {libraries && libraries.length > 0 ? (
          <View style={styles.categoriesBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoriesContent}
            >
              {libraries.map((lib) => (
                <Pressable
                  key={lib.id}
                  style={styles.categoryPill}
                  onPress={() => router.push("/(tabs)/library")}
                  accessibilityRole="button"
                  accessibilityLabel={`Browse ${lib.name}`}
                >
                  <FinoraText variant="caption" color="textSecondary" weight="600">
                    {lib.name}
                  </FinoraText>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {/* Continue Watching Section (Thumbnails with progress bars) */}
        {resumeItems && resumeItems.length > 0 ? (
          <MediaCarousel
            title="Continue Watching"
            items={resumeItems}
            serverUrl={serverUrl}
            variant="thumbnail"
            onItemPress={handleItemPress}
          />
        ) : null}

        {/* Recently Added Section (Posters) */}
        {recentItems && recentItems.length > 0 ? (
          <MediaCarousel
            title="Recently Added"
            items={recentItems}
            serverUrl={serverUrl}
            variant="poster"
            onItemPress={handleItemPress}
          />
        ) : null}

        {/* Dynamic Per-Library Sections (Movies, TV Shows, Anime, Collections...) */}
        {libraries?.map((library) => (
          <HomeLibraryRow
            key={library.id}
            library={library}
            userId={userId}
            serverUrl={serverUrl}
            onItemPress={handleItemPress}
          />
        ))}
      </ScrollView>
    </FinoraScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  contentContainer: {
    paddingBottom: 60
  },
  categoriesBar: {
    marginVertical: spacing.md
  },
  categoriesContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)"
  }
});
