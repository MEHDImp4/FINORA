import React, { useMemo, useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StatusBar
} from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { VideoView } from "expo-video";
import { MediaItem } from "../../../types/media";
import { useFinoraPlayer } from "../useFinoraPlayer";
import { usePlaybackSession } from "../usePlaybackSession";
import { createPlaybackPlan } from "../playbackPlanner";
import { CinematicOverlay } from "./CinematicOverlay";
import { PlayerGestures } from "./PlayerGestures";
import { TrackSelectionModal } from "./TrackSelectionModal";
import { TrickplayPreview } from "./TrickplayPreview";
import { SkipMarkerButton } from "./SkipMarkerButton";
import { StatsForNerdsModal } from "./StatsForNerdsModal";
import { FinoraText } from "../../../design-system/components/FinoraText";
import { FinoraButton } from "../../../design-system/components/FinoraButton";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing } from "../../../design-system/tokens";
import { formatAuthorizationHeader } from "../../../core/jellyfin/clientInfo";
import { findMatchingAudioTrack, findMatchingSubtitleTrack, normalizeLanguage } from "../trackUtils";
import { logger } from "../../../core/network/logger";
import { useQueryClient } from "@tanstack/react-query";
import { mediaKeys } from "../../../hooks/useMediaQueries";
import { FinoraSubtitleOverlay } from "./FinoraSubtitleOverlay";
import { SubtitleStyleModal } from "./SubtitleStyleModal";
import { usePlaybackPreferencesStore } from "../../../stores/playbackPreferencesStore";
import { useSubtitleCues } from "../useSubtitleCues";

export interface PlayerScreenProps {
  item: MediaItem;
  serverUrl: string;
  token?: string;
  localPath?: string;
  onBack: () => void;
  playbackRepository?: any;
  overlayAutoHideMs?: number;
}

export function PlayerScreen({
  item,
  serverUrl,
  token = "",
  localPath,
  onBack,
  playbackRepository: customPlaybackRepo,
  overlayAutoHideMs = 4000
}: PlayerScreenProps) {
  // Modal & Overlay states
  const [controlsVisible, setControlsVisible] = useState(true);
  const [tracksModalVisible, setTracksModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const queryClient = useQueryClient();

  // Persistent preferences store
  const resolveBestTracks = usePlaybackPreferencesStore((state) => state.resolveBestTracks);
  const setSeriesPreference = usePlaybackPreferencesStore((state) => state.setSeriesPreference);
  const autoSkipIntro = usePlaybackPreferencesStore((state) => state.preferences.autoSkipIntro);
  const [hasAutoSkipped, setHasAutoSkipped] = useState(false);

  // Compute best initial audio and subtitle stream index according to user / series preferences
  const { initialAudioIndex: bestAudioIndex, initialSubtitleIndex: bestSubtitleIndex } = useMemo(() => {
    return resolveBestTracks(item);
  }, [item, resolveBestTracks]);

  // UI Selection states (controls checkmarks in TrackSelectionModal)
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | undefined>(bestAudioIndex);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(bestSubtitleIndex);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  const [isLandscape, setIsLandscape] = useState(false);
  const [showSubtitleStyleModal, setShowSubtitleStyleModal] = useState(false);

  // High-fidelity custom subtitle cues
  const { cues, isCustomSubtitleActive } = useSubtitleCues({
    itemId: item.id,
    mediaSourceId: item.mediaSourceId,
    subtitleStreamIndex: selectedSubtitleIndex,
    serverUrl,
    token,
    localPath,
    streams: item.mediaStreams
  });

  // Server stream states (ONLY updated when native track switching cannot be performed and server stream must be replaced)
  const [serverAudioIndex, setServerAudioIndex] = useState<number | undefined>(undefined);
  const [serverSubtitleIndex, setServerSubtitleIndex] = useState<number | null>(null);

  // Live native tracks from expo-video
  const [availableAudioTracks, setAvailableAudioTracks] = useState<any[]>([]);
  const [availableSubtitleTracks, setAvailableSubtitleTracks] = useState<any[]>([]);

  useEffect(() => {
    if (selectedAudioIndex === undefined && bestAudioIndex !== undefined) {
      setSelectedAudioIndex(bestAudioIndex);
    }
  }, [bestAudioIndex]);

  useEffect(() => {
    if (selectedSubtitleIndex === null && bestSubtitleIndex !== null) {
      setSelectedSubtitleIndex(bestSubtitleIndex);
    }
  }, [bestSubtitleIndex]);

  // Auto/Manual screen orientation handling
  useEffect(() => {
    ScreenOrientation.unlockAsync().catch(() => {});

    ScreenOrientation.getOrientationAsync()
      .then((orientation) => {
        const isLand =
          orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
          orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
        setIsLandscape(isLand);
      })
      .catch(() => {});

    const subscription = ScreenOrientation.addOrientationChangeListener((event) => {
      const isLand =
        event.orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
        event.orientationInfo.orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT;
      setIsLandscape(isLand);
    });

    return () => {
      subscription.remove();
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    };
  }, []);

  const handleToggleOrientation = async () => {
    try {
      if (isLandscape) {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsLandscape(false);
      } else {
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsLandscape(true);
      }
    } catch {
      // Ignored
    }
  };

  // Scrubbing & Trickplay state
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPositionSeconds, setScrubPositionSeconds] = useState(0);
  const [scrubPositionPercent, setScrubPositionPercent] = useState(0);

  // Generate stream plan (direct-play > direct-stream > transcode)
  const plan = useMemo(() => {
    return createPlaybackPlan({
      item,
      serverUrl,
      token,
      localPath,
      audioStreamIndex: serverAudioIndex,
      subtitleStreamIndex: serverSubtitleIndex
    });
  }, [item, serverUrl, token, localPath, serverAudioIndex, serverSubtitleIndex]);

  // Initial resume position in seconds
  const initialPositionSeconds = useMemo(() => {
    if (item.playbackPositionTicks > 0 && item.playedPercentage < 90) {
      return item.playbackPositionTicks / 10000000;
    }
    return 0;
  }, [item.playbackPositionTicks, item.playedPercentage]);

  // Initial metadata duration in seconds (fallback for offline or before metadata arrives)
  const initialDurationSeconds = useMemo(() => {
    if (item.totalTicks && item.totalTicks > 0) {
      return item.totalTicks / 10000000;
    }
    return 0;
  }, [item.totalTicks]);

  // Auth headers for video engine (ExoPlayer sends these to master.m3u8, main.m3u8, and all segments).
  // Do NOT pass headers for local offline files ("file://") as local files don't require network headers.
  const playerHeaders = useMemo(() => {
    if (localPath || !token) return undefined;
    return {
      Authorization: formatAuthorizationHeader("finora-mobile", token),
      "X-Emby-Token": token,
      "X-MediaBrowser-Token": token
    };
  }, [token, localPath]);

  // Player Engine Hook
  const { engine, player, snapshot, controls } = useFinoraPlayer({
    sourceUrl: plan.url,
    headers: playerHeaders,
    initialPositionSeconds,
    initialDurationSeconds,
    autoPlay: true
  });

  // Jellyfin Playback Session Reporting Hook
  const { stopSession } = usePlaybackSession({
    itemId: item.id,
    mediaSourceId: plan.mediaSourceId,
    playMethod: plan.mode,
    engine,
    snapshot,
    repository: customPlaybackRepo,
    isOffline: Boolean(localPath)
  });

  // Track and synchronize native audio tracks from expo-video
  useEffect(() => {
    if (!player) return;

    const syncAudioTrack = (tracks: any[]) => {
      if (!tracks || tracks.length <= 1 || selectedAudioIndex === undefined) return;
      const audioStreams = item.mediaStreams?.filter((s) => s.type === "Audio") || [];
      const match = findMatchingAudioTrack(tracks, audioStreams, selectedAudioIndex);
      if (match && player.audioTrack?.id !== match.id) {
        try {
          player.audioTrack = match;
          logger.info(`[PlayerScreen] Synced native audio track to id=${match.id} (${match.label || match.language})`);
        } catch (e) {
          logger.warn("[PlayerScreen] Could not sync native audio track:", e);
        }
      }
    };

    if (player.availableAudioTracks && player.availableAudioTracks.length > 0) {
      setAvailableAudioTracks(player.availableAudioTracks);
      syncAudioTrack(player.availableAudioTracks);
    }

    const audioSub = player.addListener?.("availableAudioTracksChange", (payload: any) => {
      const tracks = payload?.availableAudioTracks || player.availableAudioTracks || [];
      setAvailableAudioTracks(tracks);
      syncAudioTrack(tracks);
    });

    return () => {
      audioSub?.remove?.();
    };
  }, [player, selectedAudioIndex, item.mediaStreams]);

  // Track and synchronize native subtitle tracks from expo-video
  useEffect(() => {
    if (!player) return;

    const syncSubtitleTrack = (tracks: any[]) => {
      // If high-fidelity custom subtitles are active, mute native system subtitles to avoid YouTube-2014 style double captions
      if (isCustomSubtitleActive) {
        if (player.subtitleTrack !== null) {
          try {
            player.subtitleTrack = null;
          } catch {
            // Ignored
          }
        }
        return;
      }

      if (selectedSubtitleIndex === null) {
        if (player.subtitleTrack !== null) {
          try {
            player.subtitleTrack = null;
          } catch {
            // Ignored
          }
        }
        return;
      }
      if (!tracks || tracks.length === 0) return;
      const subStreams = item.mediaStreams?.filter((s) => s.type === "Subtitle") || [];
      const match = findMatchingSubtitleTrack(tracks, subStreams, selectedSubtitleIndex);
      if (match && player.subtitleTrack?.id !== match.id) {
        try {
          player.subtitleTrack = match;
        } catch {
          // Ignored
        }
      }
    };

    if (player.availableSubtitleTracks && player.availableSubtitleTracks.length > 0) {
      setAvailableSubtitleTracks(player.availableSubtitleTracks);
      syncSubtitleTrack(player.availableSubtitleTracks);
    }

    const subTrackSub = player.addListener?.("availableSubtitleTracksChange", (payload: any) => {
      const tracks = payload?.availableSubtitleTracks || player.availableSubtitleTracks || [];
      setAvailableSubtitleTracks(tracks);
      syncSubtitleTrack(tracks);
    });

    return () => {
      subTrackSub?.remove?.();
    };
  }, [player, selectedSubtitleIndex, item.mediaStreams, isCustomSubtitleActive]);

  useEffect(() => {
    if (isCustomSubtitleActive && player && player.subtitleTrack !== null) {
      try {
        player.subtitleTrack = null;
      } catch {
        // Ignored
      }
    }
  }, [isCustomSubtitleActive, player]);

  // Automatic intro skip if preference is enabled
  useEffect(() => {
    if (!autoSkipIntro || hasAutoSkipped || !item.chapters || item.chapters.length === 0) {
      return;
    }

    const currentTicks = Math.round(snapshot.currentTimeSeconds * 10000000);
    let introStartTicks: number | null = null;
    let introEndTicks: number | null = null;

    for (let i = 0; i < item.chapters.length; i++) {
      const ch = item.chapters[i];
      const nameLower = ch.name.toLowerCase();
      const isIntro =
        ch.markerType === "IntroStart" ||
        nameLower.includes("intro") ||
        nameLower.includes("générique") ||
        nameLower.includes("generique");

      if (isIntro) {
        introStartTicks = ch.startPositionTicks;
        const next = item.chapters[i + 1];
        if (next) {
          introEndTicks = next.startPositionTicks;
        }
      } else if (ch.markerType === "IntroEnd") {
        introEndTicks = ch.startPositionTicks;
      }
    }

    if (
      introStartTicks !== null &&
      introEndTicks !== null &&
      currentTicks >= introStartTicks &&
      currentTicks < introEndTicks
    ) {
      const targetSeconds = introEndTicks / 10000000;
      logger.info(`[PlayerScreen] Auto-skipping intro to ${targetSeconds}s`);
      setHasAutoSkipped(true);
      controls.seekTo(targetSeconds);
    }
  }, [autoSkipIntro, hasAutoSkipped, item.chapters, snapshot.currentTimeSeconds, controls]);

  const handleBack = () => {
    stopSession();
    controls.pause();
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    onBack();
  };

  const handleToggleControls = () => {
    setControlsVisible((prev) => !prev);
  };

  const isBufferingOrLoading = snapshot.state === "loading" || snapshot.state === "buffering";

  useEffect(() => {
    // Only invalidate online library queries if an error occurs while streaming from server
    if (!localPath && snapshot.state === "error") {
      try {
        queryClient.setQueriesData({ queryKey: mediaKeys.all }, (oldData: any) => {
          if (Array.isArray(oldData)) {
            return oldData.filter((i: any) => i?.id !== item.id && i?.seriesId !== item.id);
          }
          return oldData;
        });
        queryClient.invalidateQueries({ queryKey: mediaKeys.all });
      } catch {
        // Ignored
      }
    }
  }, [localPath, snapshot.state, item.id, queryClient]);

  return (
    <View style={styles.container} testID="player-screen">
      <StatusBar hidden />

      {/* Video Gestures Wrapper */}
      <PlayerGestures
        onDoubleTapLeft={() => controls.seekBy(-10)}
        onDoubleTapRight={() => controls.seekBy(10)}
        onSingleTap={handleToggleControls}
        onLongPressStart={() => controls.setRate(2.0)}
        onLongPressEnd={() => controls.setRate(1.0)}
      >
        {/* Native Video Surface */}
        <VideoView
          player={player}
          style={styles.videoSurface}
          allowsPictureInPicture
          nativeControls={false}
        />
      </PlayerGestures>

      {/* Custom High-Fidelity Netflix-Style Subtitles */}
      {isCustomSubtitleActive && (
        <FinoraSubtitleOverlay
          cues={cues}
          currentTimeSeconds={snapshot.currentTimeSeconds}
          extraBottomOffset={controlsVisible ? 36 : 0}
        />
      )}

      {/* Buffering Indicator */}
      {isBufferingOrLoading && (
        <View style={styles.loaderOverlay} pointerEvents="none" testID="player-loading">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      {/* Trickplay Thumbnail Preview during timeline scrubbing */}
      <TrickplayPreview
        serverUrl={serverUrl}
        itemId={item.id}
        previewSeconds={scrubPositionSeconds}
        scrubPositionPercent={scrubPositionPercent}
        visible={!localPath && isScrubbing}
      />

      {/* Skip Intro & Skip Credits dynamic markers */}
      <SkipMarkerButton
        chapters={item.chapters}
        currentTimeSeconds={snapshot.currentTimeSeconds}
        durationSeconds={snapshot.durationSeconds}
        onSeek={(seconds) => controls.seekTo(seconds)}
      />

      {/* Cinematic Auto-Fading Overlay Controls */}
      <CinematicOverlay
        visible={controlsVisible}
        onToggleVisible={handleToggleControls}
        title={item.name}
        seriesTitle={item.seriesName ? `${item.seriesName} · S${item.seasonIndex || 1} E${item.episodeIndex || 1}` : undefined}
        isPlaying={snapshot.state === "playing"}
        currentTimeSeconds={snapshot.currentTimeSeconds}
        durationSeconds={snapshot.durationSeconds > 0 ? snapshot.durationSeconds : initialDurationSeconds}
        bufferedSeconds={localPath ? (snapshot.durationSeconds || initialDurationSeconds) : snapshot.bufferedPositionSeconds}
        onPlayPause={() => {
          if (snapshot.state === "playing") {
            controls.pause();
          } else {
            controls.play();
          }
        }}
        onSeekBy={(delta) => controls.seekBy(delta)}
        onSeekTo={(pos) => controls.seekTo(pos)}
        onBack={handleBack}
        onOpenTracks={() => setTracksModalVisible(true)}
        onOpenStats={() => setStatsModalVisible(true)}
        onToggleOrientation={handleToggleOrientation}
        isLandscape={isLandscape}
        onScrubbingChange={setIsScrubbing}
        onScrubMove={(seconds, percent) => {
          setScrubPositionSeconds(seconds);
          setScrubPositionPercent(percent);
        }}
        autoHideMs={overlayAutoHideMs}
      />

      {/* Audio / Subtitle / Quality Track Selection Bottom Sheet */}
      <TrackSelectionModal
        visible={tracksModalVisible}
        onClose={() => setTracksModalVisible(false)}
        streams={item.mediaStreams}
        availableAudioTracks={availableAudioTracks}
        availableSubtitleTracks={availableSubtitleTracks}
        selectedAudioIndex={selectedAudioIndex}
        selectedSubtitleIndex={selectedSubtitleIndex}
        selectedQuality={selectedQuality}
        onSelectAudio={(idx) => {
          setSelectedAudioIndex(idx);
          setTracksModalVisible(false);

          const audioStreams = item.mediaStreams?.filter((s) => s.type === "Audio") || [];
          const targetStream = audioStreams.find((s) => s.index === idx);

          // Persist audio language preference for this series / media
          if (item.seriesId && targetStream?.language) {
            setSeriesPreference(item.seriesId, {
              audioLanguage: normalizeLanguage(targetStream.language)
            });
          }

          const currentTracks =
            player.availableAudioTracks && player.availableAudioTracks.length > 0
              ? player.availableAudioTracks
              : availableAudioTracks;

          logger.info(
            `[PlayerScreen] onSelectAudio requested for stream index ${idx} (${targetStream?.displayTitle || targetStream?.language || "unknown"}). Available native tracks: ${currentTracks?.length || 0}`
          );

          if (currentTracks && currentTracks.length > 0) {
            const matchedNative = findMatchingAudioTrack(currentTracks, audioStreams, idx);
            if (matchedNative) {
              logger.info(`[PlayerScreen] Setting player.audioTrack directly to: ${matchedNative.id || matchedNative.label}`);
              player.audioTrack = matchedNative;
              return;
            }
          }

          logger.info(`[PlayerScreen] Native track not found in container. Switching server-side audio stream to index ${idx}`);
          setServerAudioIndex(idx);
        }}
        onSelectSubtitle={(idx) => {
          setSelectedSubtitleIndex(idx);
          setServerSubtitleIndex(idx);
          setTracksModalVisible(false);

          const subStreams = item.mediaStreams?.filter((s) => s.type === "Subtitle") || [];
          const targetSubStream = idx !== null ? subStreams.find((s) => s.index === idx) : null;

          // Persist subtitle language preference for this series / media
          if (item.seriesId) {
            setSeriesPreference(item.seriesId, {
              subtitleLanguage: targetSubStream?.language ? normalizeLanguage(targetSubStream.language) : null
            });
          }

          if (idx === null) {
            player.subtitleTrack = null;
            return;
          }

          const currentTracks =
            player.availableSubtitleTracks && player.availableSubtitleTracks.length > 0
              ? player.availableSubtitleTracks
              : availableSubtitleTracks;

          if (currentTracks && currentTracks.length > 0) {
            const matchedNative = findMatchingSubtitleTrack(currentTracks, subStreams, idx);
            if (matchedNative) {
              logger.info(`[PlayerScreen] Matched native track: ${matchedNative.id || matchedNative.label}`);
              if (!isCustomSubtitleActive) {
                player.subtitleTrack = matchedNative;
              }
            }
          }
        }}
        onSelectQuality={(q) => {
          setSelectedQuality(q);
          setTracksModalVisible(false);
        }}
        onOpenSubtitleStyle={() => setShowSubtitleStyleModal(true)}
      />

      {/* Subtitle Customization Kit Modal */}
      <SubtitleStyleModal
        visible={showSubtitleStyleModal}
        onClose={() => setShowSubtitleStyleModal(false)}
      />

      {/* Stats for Nerds Technical Diagnostic Modal */}
      <StatsForNerdsModal
        visible={statsModalVisible}
        onClose={() => setStatsModalVisible(false)}
        item={item}
        plan={plan}
        snapshot={snapshot}
      />

      {/* Error Banner if error occurs */}
      {snapshot.state === "error" && (
        <View style={styles.errorOverlay} testID="player-error">
          <Ionicons
            name="alert-circle-outline"
            size={48}
            color={colors.primary}
            style={{ marginBottom: spacing.sm }}
          />
          <FinoraText variant="title" style={styles.errorText}>
            Lecture impossible
          </FinoraText>
          <FinoraText variant="caption" style={styles.errorSubtext}>
            {localPath
              ? "Le fichier téléchargé ne peut pas être lu ou est endommagé."
              : snapshot.errorMessage?.includes("500") || snapshot.errorMessage?.includes("source")
              ? "Ce média n'est plus accessible sur le serveur Jellyfin."
              : snapshot.errorMessage || "Impossible de lire ce flux vidéo."}
          </FinoraText>
          <FinoraButton
            label="Retour"
            variant="secondary"
            onPress={handleBack}
            style={{ marginTop: spacing.md }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000"
  },
  videoSurface: {
    ...StyleSheet.absoluteFill
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center"
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl
  },
  errorText: {
    color: colors.primary,
    marginBottom: spacing.xs
  },
  errorSubtext: {
    color: colors.textMuted,
    textAlign: "center"
  }
});
