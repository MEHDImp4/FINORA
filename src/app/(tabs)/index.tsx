import React, { useCallback } from "react";
import { View, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { FinoraScreen } from "../../design-system/components/FinoraScreen";
import { HeroBanner } from "../../features/home/components/HeroBanner";
import { MediaCarousel } from "../../features/home/components/MediaCarousel";
import { FinoraText } from "../../design-system/components/FinoraText";
import { useAuthStore } from "../../stores/authStore";
import {
  useResumeItems,
  useRecentlyAdded,
  useLibraries,
  mediaKeys
} from "../../hooks/useMediaQueries";
import { useToggleFavorite } from "../../hooks/useUserDataMutations";
import { colors, spacing } from "../../design-system/tokens";
import { MediaItem, MediaLibrary } from "../../types/media";
import { mediaRepository } from "../../core/repositories/mediaRepository";
import { jellyfinClient } from "../../core/jellyfin/jellyfinClient";

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
  const queryClient = useQueryClient();
  const session = useAuthStore((state) => state.session);
  const userId = session?.userId;
  const serverUrl = session?.serverUrl || jellyfinClient.getServerUrl() || "";

  // Data queries
  const {
    data: resumeItems
  } = useResumeItems(userId);

  const {
    data: recentItems
  } = useRecentlyAdded(userId);

  const {
    data: libraries
  } = useLibraries(userId);

  const toggleFavorite = useToggleFavorite(userId || "");

  const [isPullRefreshing, setIsPullRefreshing] = React.useState(false);
  const lastFocusRef = React.useRef(0);

  const onRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      // 1. Ask Jellyfin to check disk changes / scan (throttled to 1/30s)
      await mediaRepository.refreshLibrary().catch(() => {});
      // 2. Refetch active queries and wait for server responses
      await queryClient.refetchQueries({ queryKey: mediaKeys.all, type: "active" });
    } finally {
      setIsPullRefreshing(false);
    }
  }, [queryClient]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      // Throttle focus refetch to at most once every 15 seconds
      if (now - lastFocusRef.current > 15000) {
        lastFocusRef.current = now;
        queryClient.invalidateQueries({ queryKey: mediaKeys.all, refetchType: "active" });
      }
    }, [queryClient])
  );

  // Derive featured hero item (prefer first recently added with backdrop or primary image, then resume item)
  const featuredItem =
    recentItems?.find((i) => i.backdropImageTag && !i.isMissing && i.locationType !== "Virtual") ||
    recentItems?.find((i) => i.primaryImageTag && !i.isMissing && i.locationType !== "Virtual") ||
    resumeItems?.find((i) => i.backdropImageTag && !i.isMissing && i.locationType !== "Virtual") ||
    resumeItems?.find((i) => i.primaryImageTag && !i.isMissing && i.locationType !== "Virtual") ||
    recentItems?.[0] ||
    resumeItems?.[0] ||
    null;

  const handlePlay = (item: MediaItem) => {
    if (item.type === "Series" || item.type === "Season") {
      router.push({ pathname: "/details/[id]", params: { id: item.id } });
      return;
    }
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
            refreshing={isPullRefreshing}
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
