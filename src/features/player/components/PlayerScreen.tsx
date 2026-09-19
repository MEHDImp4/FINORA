import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
  AppState
} from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { VideoView } from "expo-video";
import { MediaItem } from "../../../types/media";
import { useFinoraPlayer } from "../useFinoraPlayer";
import { usePlaybackSession } from "../usePlaybackSession";
import { createPlaybackPlan, PlaybackMode } from "../playbackPlanner";
import { offlineStorageService } from "../../offline/offlineStorage";
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
import { NextEpisodeOverlay } from "./NextEpisodeOverlay";
import { usePlaybackPreferencesStore } from "../../../stores/playbackPreferencesStore";
import { useSubtitleCues } from "../useSubtitleCues";
import { useTranslation } from "../../../i18n";
import { hapticService } from "../../../core/feedback/hapticService";

const SPEED_OPTIONS = [1.0, 1.25, 1.5, 2.0];

// expo-brightness drives the real screen brightness from the player slider.
// Imported with a try/catch fallback so unit tests (which mock native modules)
// don't fail when the native module is absent in the Jest environment.
let BrightnessModule: typeof import("expo-brightness") | null = null;
try {
  BrightnessModule = require("expo-brightness");
} catch {
  // Non-native environment (e.g., tests). Brightness control disabled.
}

export interface PlayerScreenProps {
  item: MediaItem;
  serverUrl: string;
  token?: string;
  localPath?: string;
  onBack: () => void;
  onNextEpisode?: (episodeId: string) => void;
  playbackRepository?: any;
  overlayAutoHideMs?: number;
}

export function PlayerScreen({
  item,
  serverUrl,
  token = "",
  localPath,
  onBack,
  onNextEpisode,
  playbackRepository: customPlaybackRepo,
  overlayAutoHideMs = 4000
}: PlayerScreenProps) {
  const { t } = useTranslation();
  // Modal & Overlay states
  const [controlsVisible, setControlsVisible] = useState(true);
  const [tracksModalVisible, setTracksModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const queryClient = useQueryClient();

  // Persistent preferences store
  const resolveBestTracks = usePlaybackPreferencesStore((state) => state.resolveBestTracks);
  const setSeriesPreference = usePlaybackPreferencesStore((state) => state.setSeriesPreference);
  const autoSkipIntro = usePlaybackPreferencesStore((state) => state.preferences.autoSkipIntro);
  const preferredPlaybackSpeed = usePlaybackPreferencesStore((state) => state.preferences.playbackSpeed) || 1.0;
  const [hasAutoSkipped, setHasAutoSkipped] = useState(false);

  // Brightness / volume shared by the overlay sliders and the swipe gestures
  const [brightness, setBrightness] = useState(0.7);
  const [volume, setVolume] = useState(1.0);

  // Compute best initial audio and subtitle stream index according to user / series preferences
  const { initialAudioIndex: bestAudioIndex, initialSubtitleIndex: bestSubtitleIndex } = useMemo(() => {
    return resolveBestTracks(item);
  }, [item, resolveBestTracks]);

  // UI Selection states (controls checkmarks in TrackSelectionModal)
  const [selectedAudioIndex, setSelectedAudioIndex] = useState<number | undefined>(bestAudioIndex);
  const [selectedSubtitleIndex, setSelectedSubtitleIndex] = useState<number | null>(bestSubtitleIndex);
  const [selectedQuality, setSelectedQuality] = useState<string>("auto");
  // Controlled Direct Play -> Transcode fallback (PLR-01). Keyed by content id so a
  // new item never inherits a forced transport from the previous one.
  const [playbackFallback, setPlaybackFallback] = useState<{
    contentId: string;
    mode: PlaybackMode;
  } | null>(null);
  const playbackFallbackAttemptedRef = useRef<string | null>(null);
  const forcedMode = playbackFallback?.contentId === item.id ? playbackFallback.mode : undefined;
  const [isLandscape, setIsLandscape] = useState(false);
  const [showSubtitleStyleModal, setShowSubtitleStyleModal] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(preferredPlaybackSpeed);

  const handleCycleSpeed = () => {
    const currentIndex = SPEED_OPTIONS.indexOf(currentSpeed);
    const nextIndex = (currentIndex + 1) % SPEED_OPTIONS.length;
    const nextSpeed = SPEED_OPTIONS[nextIndex];
    setCurrentSpeed(nextSpeed);
    controls.setRate(nextSpeed);
  };

  // Next episode state (for series)
  const [nextEpisode, setNextEpisode] = useState<{ id: string; name: string; label: string } | null>(null);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const nextEpisodeFetchedRef = useRef(false);
  // A player-to-player transition (next episode) must preserve the current
  // device orientation. A real exit still restores portrait.
  const preserveOrientationOnUnmountRef = useRef(false);

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
      if (!preserveOrientationOnUnmountRef.current) {
        ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      }
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

  // VideoView ref & Picture-in-Picture (PiP) state
  const videoViewRef = useRef<any>(null);
  const [isInPiP, setIsInPiP] = useState(false);
  const isInPiPRef = useRef(false);
  const pipRecentlyStoppedRef = useRef(false);
  const pipExitGuardTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      // Android can report the PiP stop event just before the Activity finishes
      // moving to the background. If the user actually dismissed PiP (instead
      // of restoring the app), stop playback as soon as that transition lands.
      if (
        nextState !== "active" &&
        pipRecentlyStoppedRef.current &&
        !isInPiPRef.current
      ) {
        controls.pause();
        pipRecentlyStoppedRef.current = false;
        if (pipExitGuardTimerRef.current) {
          clearTimeout(pipExitGuardTimerRef.current);
          pipExitGuardTimerRef.current = null;
        }
      }
    });

    return () => {
      subscription.remove();
      if (pipTimerRef.current) {
        clearTimeout(pipTimerRef.current);
        pipTimerRef.current = null;
      }
      if (pipExitGuardTimerRef.current) {
        clearTimeout(pipExitGuardTimerRef.current);
        pipExitGuardTimerRef.current = null;
      }
    };
  }, [controls]);

  const handleTogglePiP = () => {
    hapticService.impactLight();
    setControlsVisible(false);
    setIsInPiP(true);
    if (pipTimerRef.current) {
      clearTimeout(pipTimerRef.current);
    }
    pipTimerRef.current = setTimeout(() => {
      pipTimerRef.current = null;
      try {
        const result = videoViewRef.current?.startPictureInPicture?.();
        // Some implementations return a promise that can reject (PLR-05): on any
        // failure the UI must be unlocked again rather than staying stuck in PiP.
        if (result && typeof result.catch === "function") {
          result.catch((error: unknown) => {
            logger.warn("Failed to start Picture-in-Picture:", error);
            setIsInPiP(false);
            setControlsVisible(true);
          });
        }
      } catch (error) {
        logger.warn("Failed to start Picture-in-Picture:", error);
        setIsInPiP(false);
        setControlsVisible(true);
      }
    }, 50);
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
      platform: Platform.OS,
      quality: selectedQuality,
      localPath,
      audioStreamIndex: serverAudioIndex,
      subtitleStreamIndex: serverSubtitleIndex,
      forceMode: forcedMode
    });
  }, [item, serverUrl, token, selectedQuality, localPath, serverAudioIndex, serverSubtitleIndex, forcedMode]);

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
    autoPlay: true,
    initialPlaybackRate: preferredPlaybackSpeed,
    contentId: item.id
  });

  // Sync preferred speed if changed
  useEffect(() => {
    if (preferredPlaybackSpeed) {
      controls.setRate(preferredPlaybackSpeed);
    }
  }, [preferredPlaybackSpeed, controls]);

  const lastBrightnessNativeCallRef = useRef(0);
  const pendingBrightnessNativeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed the brightness slider from the current screen brightness, and hand the
  // screen back on exit so the player's override doesn't linger after leaving.
  useEffect(() => {
    let active = true;
    let originalBrightness: number | null = null;

    if (BrightnessModule?.getBrightnessAsync) {
      BrightnessModule.getBrightnessAsync()
        .then((value) => {
          if (active && typeof value === "number" && !isNaN(value) && value >= 0 && value <= 1) {
            originalBrightness = value;
            setBrightness(Math.round(value * 100) / 100);
          }
        })
        .catch(() => {});
    }

    return () => {
      active = false;
      if (pendingBrightnessNativeTimerRef.current) {
        clearTimeout(pendingBrightnessNativeTimerRef.current);
      }
      if (!BrightnessModule) return;

      // Android keeps the activity brightness override after the player closes, so
      // hand control back to the OS. iOS persists the value, so restore the one
      // captured when the player opened.
      if (Platform.OS === "android" && BrightnessModule.restoreSystemBrightnessAsync) {
        BrightnessModule.restoreSystemBrightnessAsync().catch(() => {});
      } else if (originalBrightness !== null && BrightnessModule.setBrightnessAsync) {
        BrightnessModule.setBrightnessAsync(originalBrightness).catch(() => {});
      }
    };
  }, []);

  // Jellyfin Playback Session Reporting Hook
  const { stopSession } = usePlaybackSession({
    itemId: item.id,
    mediaSourceId: plan.mediaSourceId,
    playMethod: plan.mode,
    engine,
    snapshot,
    repository: customPlaybackRepo,
    isOffline: Boolean(localPath),
    audioStreamIndex: selectedAudioIndex,
    subtitleStreamIndex: selectedSubtitleIndex,
    allowBackground: isInPiP
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
      setAvailableAudioTracks((prev) => {
        if (
          prev === player.availableAudioTracks ||
          (prev.length === player.availableAudioTracks.length &&
            prev[0]?.id === player.availableAudioTracks[0]?.id)
        ) {
          return prev;
        }
        return player.availableAudioTracks;
      });
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
      setAvailableSubtitleTracks((prev) => {
        if (
          prev === player.availableSubtitleTracks ||
          (prev.length === player.availableSubtitleTracks.length &&
            prev[0]?.id === player.availableSubtitleTracks[0]?.id)
        ) {
          return prev;
        }
        return player.availableSubtitleTracks;
      });
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

  // Query next episode in advance for series
  useEffect(() => {
    let active = true;

    if (item.type === "Episode" && item.seriesId) {
      const fetchNextEpisode = async () => {
        try {
          // Mode hors ligne
          if (localPath) {
            const allRecords = await offlineStorageService.getAllOfflineMedia();
            if (!active) return;
            const downloaded = allRecords.filter((r) => r.seriesId === item.seriesId);
            const sorted = downloaded.sort((a, b) => {
              const sA = a.seasonIndex ?? 1;
              const sB = b.seasonIndex ?? 1;
              if (sA !== sB) return sA - sB;
              return (a.episodeIndex ?? 0) - (b.episodeIndex ?? 0);
            });
            const currentIndex = sorted.findIndex((ep) => ep.itemId === item.id);
            if (currentIndex !== -1 && currentIndex + 1 < sorted.length) {
              const next = sorted[currentIndex + 1];
              setNextEpisode({
                id: next.itemId,
                name: next.title,
                label: `S${next.seasonIndex || 1} E${next.episodeIndex || (item.episodeIndex || 0) + 1}`
              });
              return;
            }
          }

          // Mode en ligne : interroger Jellyfin pour tous les épisodes de la saison ou de la série
          const endpoint = item.seasonId
            ? `/Shows/${item.seriesId}/Episodes?seasonId=${item.seasonId}&fields=IndexNumber,ParentIndexNumber,Name,Id`
            : `/Shows/${item.seriesId}/Episodes?fields=IndexNumber,ParentIndexNumber,Name,Id`;
          // SEC-01: authenticate with headers only — never put the token in the
          // URL (and never both at once). URLs leak through logs and proxies.
          const url = `${serverUrl}${endpoint}`;
          const res = await fetch(url, {
            headers: {
              Authorization: formatAuthorizationHeader("finora-mobile", token),
              ...(token ? { "X-Emby-Token": token } : {})
            }
          });
          if (!res.ok || !active) return;
          const data = await res.json();
          const items: any[] = data.Items || [];
          if (!active || items.length === 0) return;

          let next: any = null;
          // 1. Chercher par ID exact
          const currentIndex = items.findIndex((ep) => ep.Id === item.id);
          if (currentIndex !== -1 && currentIndex + 1 < items.length) {
            next = items[currentIndex + 1];
          } else if (item.episodeIndex != null) {
            // 2. Fallback par numéro d'épisode dans la saison
            next = items.find(
              (ep) =>
                ep.IndexNumber === (item.episodeIndex || 0) + 1 &&
                (item.seasonIndex == null || ep.ParentIndexNumber == null || ep.ParentIndexNumber === item.seasonIndex)
            );
          }

          // 3. Si on était au dernier épisode de la saison, interroger la série complète pour la saison d'après
          if (!next && item.seasonId) {
            const seriesUrl = `${serverUrl}/Shows/${item.seriesId}/Episodes?fields=IndexNumber,ParentIndexNumber,Name,Id`;
            const seriesRes = await fetch(seriesUrl, {
              headers: {
                Authorization: formatAuthorizationHeader("finora-mobile", token),
                ...(token ? { "X-Emby-Token": token } : {})
              }
            });
            if (seriesRes.ok && active) {
              const seriesData = await seriesRes.json();
              const allItems: any[] = seriesData.Items || [];
              const cIdx = allItems.findIndex((ep) => ep.Id === item.id);
              if (cIdx !== -1 && cIdx + 1 < allItems.length) {
                next = allItems[cIdx + 1];
              }
            }
          }

          if (next && active) {
            const sNum = next.ParentIndexNumber ?? item.seasonIndex ?? 1;
            const eNum = next.IndexNumber ?? ((item.episodeIndex || 0) + 1);
            logger.info(`[PlayerScreen] Next episode identified: id=${next.Id} (S${sNum} E${eNum})`);
            setNextEpisode({
              id: next.Id,
              name: next.Name || "",
              label: `S${sNum} E${eNum}`
            });
          }
        } catch {
          // Silently ignore — next episode button simply won't show
        }
      };

      fetchNextEpisode();
    } else {
      setNextEpisode(null);
    }

    return () => {
      active = false;
    };
  }, [item.id, item.type, item.seriesId, item.seasonId, item.episodeIndex, item.seasonIndex, serverUrl, token, localPath]);

  // Trigger next episode countdown overlay when playback ends
  useEffect(() => {
    if (snapshot.state === "ended" && nextEpisode && !nextEpisodeFetchedRef.current) {
      nextEpisodeFetchedRef.current = true;
      setShowNextEpisode(true);
    }
  }, [snapshot.state, nextEpisode]);

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
    preserveOrientationOnUnmountRef.current = false;
    stopSession();
    controls.pause();
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
    onBack();
  };

  const handlePlayNextEpisode = () => {
    if (!nextEpisode) return;
    setShowNextEpisode(false);
    nextEpisodeFetchedRef.current = false;
    stopSession();
    controls.pause();
    if (onNextEpisode) {
      // router.replace() unmounts this PlayerScreen before mounting the next
      // episode. Do not force portrait during that player-to-player handoff.
      preserveOrientationOnUnmountRef.current = true;
      onNextEpisode(nextEpisode.id);
    } else {
      preserveOrientationOnUnmountRef.current = false;
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
      onBack();
    }
  };

  const handleToggleControls = () => {
    setControlsVisible((prev) => !prev);
  };

  const handleBrightnessChange = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setBrightness(clamped);

    if (BrightnessModule?.setBrightnessAsync) {
      // Prevent screen blackout on Android OLED devices where 0.0 turns off backlight completely
      const safeBrightness = Math.max(0.01, clamped);
      const now = Date.now();

      if (now - lastBrightnessNativeCallRef.current > 40) {
        lastBrightnessNativeCallRef.current = now;
        BrightnessModule.setBrightnessAsync(safeBrightness).catch(() => {});
      }

      if (pendingBrightnessNativeTimerRef.current) {
        clearTimeout(pendingBrightnessNativeTimerRef.current);
      }
      pendingBrightnessNativeTimerRef.current = setTimeout(() => {
        BrightnessModule?.setBrightnessAsync?.(safeBrightness).catch(() => {});
      }, 50);
    }
  };

  const handleVolumeChange = (value: number) => {
    const clamped = Math.min(1, Math.max(0, value));
    setVolume(clamped);
    controls.setVolume(clamped);
  };

  const isBufferingOrLoading = snapshot.state === "loading" || snapshot.state === "buffering";

  // Controlled fallback (PLR-01): a direct-play/direct-stream decode error retries
  // once through a full transcode. A transcode error is terminal (no loop).
  useEffect(() => {
    if (localPath || snapshot.state !== "error") return;
    if (plan.mode === "transcode") return;
    if (playbackFallbackAttemptedRef.current === item.id) return;

    playbackFallbackAttemptedRef.current = item.id;
    logger.warn(
      `[PlayerScreen] ${plan.mode} playback failed for ${item.id}; falling back to transcode.`
    );
    setPlaybackFallback({ contentId: item.id, mode: "transcode" });
  }, [localPath, snapshot.state, plan.mode, item.id]);

  // Only surface a terminal failure: drop the item from library caches when the
  // transcode fallback itself failed — never on a transient, recoverable error.
  useEffect(() => {
    if (localPath || snapshot.state !== "error" || plan.mode !== "transcode") return;
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
  }, [localPath, snapshot.state, plan.mode, item.id, queryClient]);

  return (
    <View style={styles.container} testID="player-screen">
      <StatusBar hidden translucent backgroundColor="#000000" barStyle="light-content" />
      <ExpoStatusBar hidden style="light" />

      {/* Video Gestures Wrapper */}
      <PlayerGestures
        onDoubleTapLeft={() => controls.seekBy(-10)}
        onDoubleTapRight={() => controls.seekBy(10)}
        onSingleTap={handleToggleControls}
        onLongPressStart={() => controls.setRate(2.0)}
        onLongPressEnd={() => controls.setRate(preferredPlaybackSpeed)}
        brightness={brightness}
        onBrightnessChange={handleBrightnessChange}
        volume={volume}
        onVolumeChange={handleVolumeChange}
        disabled={isInPiP}
      >
        {/* Native Video Surface */}
        <VideoView
          ref={videoViewRef}
          player={player}
          style={[styles.videoSurface, { backgroundColor: "#000000" }]}
          contentFit="contain"
          allowsPictureInPicture
          startsPictureInPictureAutomatically
          onPictureInPictureStart={() => {
            isInPiPRef.current = true;
            pipRecentlyStoppedRef.current = false;
            if (pipExitGuardTimerRef.current) {
              clearTimeout(pipExitGuardTimerRef.current);
              pipExitGuardTimerRef.current = null;
            }
            setIsInPiP(true);
            setControlsVisible(false);
          }}
          onPictureInPictureStop={() => {
            isInPiPRef.current = false;
            pipRecentlyStoppedRef.current = true;
            setIsInPiP(false);
            setControlsVisible(true);

            // Restoring the PiP window back into FINORA should continue playing.
            // Dismissing/swiping away PiP leaves the Activity backgrounded and
            // must stop audio instead of leaking playback invisibly.
            if (AppState.currentState !== "active") {
              controls.pause();
              pipRecentlyStoppedRef.current = false;
            } else {
              if (pipExitGuardTimerRef.current) {
                clearTimeout(pipExitGuardTimerRef.current);
              }
              pipExitGuardTimerRef.current = setTimeout(() => {
                pipRecentlyStoppedRef.current = false;
                pipExitGuardTimerRef.current = null;
              }, 750);
            }
          }}
          nativeControls={false}
        />
      </PlayerGestures>

      {/* Custom High-Fidelity Netflix-Style Subtitles */}
      {!isInPiP && isCustomSubtitleActive && (
        <FinoraSubtitleOverlay
          cues={cues}
          currentTimeSeconds={snapshot.currentTimeSeconds}
          extraBottomOffset={controlsVisible ? 36 : 0}
        />
      )}

      {/* Buffering Indicator */}
      {!isInPiP && isBufferingOrLoading && (
        <View style={styles.loaderOverlay} pointerEvents="none" testID="player-loading">
          <View style={styles.loaderCapsule}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        </View>
      )}

      {/* Skip Intro & Skip Credits dynamic markers */}
      {!isInPiP && (
        <SkipMarkerButton
          chapters={item.chapters}
          currentTimeSeconds={snapshot.currentTimeSeconds}
          durationSeconds={snapshot.durationSeconds}
          onSeek={(seconds) => controls.seekTo(seconds)}
        />
      )}

      {/* Cinematic Auto-Fading Overlay Controls */}
      {!isInPiP && (
        <CinematicOverlay
          visible={controlsVisible}
          onToggleVisible={handleToggleControls}
          title={item.name}
          seriesTitle={item.seriesName ? `${item.seriesName} · S${item.seasonIndex || 1} E${item.episodeIndex || 1}` : undefined}
          isPlaying={snapshot.state === "playing"}
          currentTimeSeconds={snapshot.currentTimeSeconds}
          durationSeconds={snapshot.durationSeconds > 0 ? snapshot.durationSeconds : initialDurationSeconds}
          bufferedSeconds={localPath ? (snapshot.durationSeconds || initialDurationSeconds) : snapshot.bufferedPositionSeconds}
          chapters={item.chapters}
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
          brightness={brightness}
          onBrightnessChange={handleBrightnessChange}
          volume={volume}
          onVolumeChange={handleVolumeChange}
          autoHideMs={overlayAutoHideMs}
          playbackMode={plan.mode}
          playbackRate={currentSpeed}
          onCycleSpeed={handleCycleSpeed}
          onTogglePiP={handleTogglePiP}
          hasNextEpisode={Boolean(nextEpisode)}
          onPlayNextEpisode={handlePlayNextEpisode}
          nextEpisodeLabel={nextEpisode?.label}
        />
      )}

      {/* Trickplay Thumbnail Preview during timeline scrubbing (rendered on topmost layer) */}
      {!isInPiP && (
        <TrickplayPreview
          serverUrl={serverUrl}
          itemId={item.id}
          token={token}
          previewSeconds={scrubPositionSeconds}
          scrubPositionPercent={scrubPositionPercent}
          visible={isScrubbing}
          chapters={item.chapters}
          trickplayManifest={item.trickplay}
        />
      )}

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

      {/* Next Episode Overlay (series only) */}
      <NextEpisodeOverlay
        visible={showNextEpisode && Boolean(nextEpisode)}
        nextEpisodeName={nextEpisode?.name || ""}
        nextEpisodeLabel={nextEpisode?.label || ""}
        countdownSeconds={8}
        onPlayNext={handlePlayNextEpisode}
        onCancel={() => {
          setShowNextEpisode(false);
          nextEpisodeFetchedRef.current = false;
        }}
      />

      {/* Stats for Nerds Technical Diagnostic Modal */}
      <StatsForNerdsModal
        visible={statsModalVisible}
        onClose={() => setStatsModalVisible(false)}
        item={item}
        plan={plan}
        snapshot={snapshot}
      />

      {/* Error Banner if a TERMINAL error occurs (fallback exhausted or local file) */}
      {snapshot.state === "error" && (Boolean(localPath) || plan.mode === "transcode") && (
        <View style={styles.errorOverlay} testID="player-error">
          <View style={styles.errorCard}>
            <View style={styles.errorIconBadge}>
              <Ionicons
                name="alert-circle"
                size={36}
                color={colors.primary}
              />
            </View>
            <FinoraText variant="title" style={styles.errorText}>
              {t("player.cantPlayMedia")}
            </FinoraText>
            <FinoraText variant="caption" style={styles.errorSubtext}>
              {localPath
                ? t("player.corruptedFile")
                : snapshot.errorMessage?.includes("500") || snapshot.errorMessage?.includes("source")
                ? t("player.serverLostMedia")
                : snapshot.errorMessage || t("player.playbackError")}
            </FinoraText>
            <FinoraButton
              label={t("common.back")}
              variant="secondary"
              onPress={handleBack}
              style={{ marginTop: spacing.md }}
            />
          </View>
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
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000000"
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center"
  },
  loaderCapsule: {
    padding: spacing.md,
    borderRadius: 24,
    backgroundColor: "rgba(16, 16, 24, 0.72)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(6, 6, 10, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl
  },
  errorCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "rgba(20, 20, 28, 0.95)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    padding: spacing.xl,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12
  },
  errorIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "rgba(229, 9, 20, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.md
  },
  errorText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: spacing.xs,
    textAlign: "center"
  },
  errorSubtext: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 13,
    lineHeight: 18
  }
});
