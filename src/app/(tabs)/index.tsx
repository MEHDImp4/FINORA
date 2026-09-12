import React from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { FinoraScreen } from "../../design-system/components/FinoraScreen";
import { HeroBanner } from "../../features/home/components/HeroBanner";
import { MediaCarousel } from "../../features/home/components/MediaCarousel";
import { useAuthStore } from "../../stores/authStore";
import {
  useResumeItems,
  useRecentlyAdded,
  useLibraries
} from "../../hooks/useMediaQueries";
import { useToggleFavorite } from "../../hooks/useUserDataMutations";
import { colors } from "../../design-system/tokens";
import { MediaItem } from "../../types/media";

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
  }
});
