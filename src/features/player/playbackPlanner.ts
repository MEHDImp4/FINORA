import { MediaItem } from "../../types/media";
import { DeviceProfile, getDefaultDeviceProfile } from "./deviceProfile";
import { sanitizeData } from "../../core/network/logger";
import { QUALITY_PRESETS } from "./qualityPresets";

export type PlaybackMode = "direct-play" | "direct-stream" | "transcode";

export interface PlaybackPlan {
  mode: PlaybackMode;
  url: string;
  mediaSourceId?: string;
  videoCodec?: string;
  audioCodec?: string;
  container?: string;
  quality?: string;
  bitrate?: number;
  maxWidth?: number;
  maxHeight?: number;
  reason: string;
}

export interface PlaybackPlanOptions {
  item: MediaItem;
  serverUrl: string;
  /**
   * Kept for API compatibility with callers. Authentication is deliberately
   * supplied through the native player's request headers, never the media URL.
   */
  token?: string;
  deviceProfile?: DeviceProfile;
  platform?: string;
  quality?: string;
  container?: string;
  localPath?: string;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number | null;
  /**
   * Forces a specific transport. Used by the controlled Direct Play -> Transcode
   * fallback (PLR-01) so a decode failure can be recovered deterministically.
   */
  forceMode?: PlaybackMode;
}

export function getSanitizedPlaybackUrl(url: string): string {
  return sanitizeData(url);
}

interface VideoTarget {
  quality: string;
  maxWidth: number;
  maxHeight: number;
  maxBitrate: number;
  label: string;
}

/**
 * High-quality compatibility target for an automatic H.264 fallback.
 *
 * Jellyfin can otherwise pick a conservative encoder default when a client asks
 * for H.264 without a resolution/bitrate. That is especially visible on large,
 * high-density tablets. Keep the source resolution when known, cap it to the
 * device profile, and use a bitrate appropriate for that resolution.
 */
function getAutoCompatibilityTarget(
  sourceWidth: number,
  sourceHeight: number,
  deviceProfile: DeviceProfile,
  quality: string
): VideoTarget {
  const profileWidth = Math.max(1, deviceProfile.maxResolution.width || 1920);
  const profileHeight = Math.max(1, deviceProfile.maxResolution.height || 1080);
  const maxWidth = Math.min(sourceWidth > 0 ? sourceWidth : 1920, profileWidth);
  const maxHeight = Math.min(sourceHeight > 0 ? sourceHeight : 1080, profileHeight);

  let maxBitrate: number;
  if (maxHeight >= 2160 || maxWidth >= 3000) {
    maxBitrate = 50_000_000;
  } else if (maxHeight >= 1080 || maxWidth >= 1900) {
    maxBitrate = 20_000_000;
  } else if (maxHeight >= 720 || maxWidth >= 1200) {
    maxBitrate = 8_000_000;
  } else {
    maxBitrate = 2_500_000;
  }

  if (deviceProfile.maxBitrate && deviceProfile.maxBitrate > 0) {
    maxBitrate = Math.min(maxBitrate, deviceProfile.maxBitrate);
  }

  return {
    quality,
    maxWidth,
    maxHeight,
    maxBitrate,
    label: `${maxWidth}x${maxHeight} @ ${(maxBitrate / 1_000_000).toFixed(1)} Mbps`
  };
}

interface ForcedPlanContext {
  cleanServerUrl: string;
  itemId: string;
  mediaSourceId?: string;
  mediaSourceParam: string;
  hlsMediaSourceParam: string;
  audioIndexParam: string;
  subtitleIndexParam: string;
  normVideoCodec?: string;
  normAudioCodec?: string;
  mediaContainer: string;
  quality: string;
  transcodeTarget: VideoTarget;
}

/** Builds a transport plan for a mode that has been explicitly forced by the caller. */
function buildForcedPlan(mode: PlaybackMode, ctx: ForcedPlanContext): PlaybackPlan {
  if (mode === "direct-play") {
    return {
      mode: "direct-play",
      url: `${ctx.cleanServerUrl}/Videos/${ctx.itemId}/stream?static=true${ctx.mediaSourceParam}`,
      mediaSourceId: ctx.mediaSourceId,
      videoCodec: ctx.normVideoCodec,
      audioCodec: ctx.normAudioCodec,
      container: ctx.mediaContainer,
      quality: ctx.quality,
      reason: "Forced direct play."
    };
  }

  if (mode === "direct-stream") {
    return {
      mode: "direct-stream",
      url: `${ctx.cleanServerUrl}/Videos/${ctx.itemId}/stream?videoCodec=copy&audioCodec=copy${ctx.mediaSourceParam}${ctx.audioIndexParam}${ctx.subtitleIndexParam}`,
      mediaSourceId: ctx.mediaSourceId,
      videoCodec: ctx.normVideoCodec,
      audioCodec: ctx.normAudioCodec,
      container: ctx.mediaContainer,
      quality: ctx.quality,
      reason: "Forced direct stream (remux)."
    };
  }

  // A decode/container failure requires a real video re-encode. Keep the user's
  // selected quality authoritative even while transport remains forced to H.264.
  const target = ctx.transcodeTarget;
  const qualityParams = `&maxWidth=${target.maxWidth}&maxHeight=${target.maxHeight}&videoBitRate=${target.maxBitrate}&maxVideoBitRate=${target.maxBitrate}&audioBitRate=192000`;

  return {
    mode: "transcode",
    url: `${ctx.cleanServerUrl}/Videos/${ctx.itemId}/master.m3u8?videoCodec=h264&audioCodec=aac&audioChannels=2${qualityParams}${ctx.hlsMediaSourceParam}${ctx.audioIndexParam}${ctx.subtitleIndexParam}&deviceId=finora-mobile&transcodingProtocol=hls`,
    mediaSourceId: ctx.mediaSourceId,
    videoCodec: "h264",
    audioCodec: "aac",
    container: "m3u8",
    quality: target.quality,
    bitrate: target.maxBitrate,
    maxWidth: target.maxWidth,
    maxHeight: target.maxHeight,
    reason: `Forced compatibility transcode after a direct playback failure (${target.label}).`
  };
}

export function createPlaybackPlan(options: PlaybackPlanOptions): PlaybackPlan {
  const {
    item,
    serverUrl,
    platform,
    deviceProfile = getDefaultDeviceProfile(platform),
    quality = "auto",
    container,
    localPath,
    audioStreamIndex,
    subtitleStreamIndex,
    forceMode
  } = options;

  if (localPath) {
    return {
      mode: "direct-play",
      url: localPath,
      quality,
      reason: "Offline local file playback"
    };
  }

  const cleanServerUrl = serverUrl.replace(/\/+$/, "");

  // Find video and audio streams
  const streams = item.mediaStreams || [];
  const videoStream = streams.find((s) => s.type === "Video");
  const audioStreams = streams.filter((s) => s.type === "Audio");
  const audioStream =
    (audioStreamIndex !== undefined
      ? audioStreams.find((s) => s.index === audioStreamIndex)
      : undefined) ||
    audioStreams.find((s) => s.isDefault) ||
    audioStreams[0];

  const defaultAudio = audioStreams.find((s) => s.isDefault) || audioStreams[0];
  const isDefaultAudioSelected =
    audioStreamIndex === undefined ||
    (defaultAudio && audioStream?.index === defaultAudio.index);

  const videoCodec = videoStream?.codec?.toLowerCase();
  const audioCodec = audioStream?.codec?.toLowerCase();
  const mediaContainer = (container || item.container || "mp4").toLowerCase();
  const mediaSourceId = item.mediaSourceId;
  const mediaSourceParam = mediaSourceId ? `&mediaSourceId=${encodeURIComponent(mediaSourceId)}` : "";
  const hlsMediaSourceId = item.mediaSourceId || item.id;
  const hlsMediaSourceParam = `&mediaSourceId=${encodeURIComponent(hlsMediaSourceId)}&MediaSourceId=${encodeURIComponent(hlsMediaSourceId)}`;
  const audioIndexParam =
    audioStreamIndex !== undefined
      ? `&audioStreamIndex=${audioStreamIndex}&AudioStreamIndex=${audioStreamIndex}`
      : "";
  const subtitleIndexParam =
    subtitleStreamIndex !== undefined && subtitleStreamIndex !== null
      ? `&subtitleStreamIndex=${subtitleStreamIndex}&SubtitleStreamIndex=${subtitleStreamIndex}`
      : "";

  // Normalize codecs (e.g. h265 -> hevc, dca -> dts)
  const normVideoCodec = videoCodec === "h265" ? "hevc" : videoCodec;
  const normAudioCodec = audioCodec;

  const sourceWidth = videoStream?.width || 0;
  const sourceHeight = videoStream?.height || 0;

  // Quality evaluation must happen before forced fallback handling. Previously a
  // forced transcode returned early and silently ignored later quality changes.
  const qualityPreset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.auto;
  const isConstrainedQuality =
    quality !== "auto" &&
    quality !== "original" &&
    Boolean(qualityPreset.maxBitrate && qualityPreset.maxWidth && qualityPreset.maxHeight);

  const autoCompatibilityTarget = getAutoCompatibilityTarget(
    sourceWidth,
    sourceHeight,
    deviceProfile,
    quality === "original" ? "original" : "auto"
  );

  const selectedTranscodeTarget: VideoTarget =
    isConstrainedQuality &&
    qualityPreset.maxBitrate &&
    qualityPreset.maxWidth &&
    qualityPreset.maxHeight
      ? {
          quality: qualityPreset.id,
          maxWidth: qualityPreset.maxWidth,
          maxHeight: qualityPreset.maxHeight,
          maxBitrate: qualityPreset.maxBitrate,
          label: qualityPreset.label
        }
      : autoCompatibilityTarget;

  // A forced transport (PLR-01 fallback) still obeys the selected quality.
  if (forceMode) {
    return buildForcedPlan(forceMode, {
      cleanServerUrl,
      itemId: item.id,
      mediaSourceId,
      mediaSourceParam,
      hlsMediaSourceParam,
      audioIndexParam,
      subtitleIndexParam,
      normVideoCodec,
      normAudioCodec,
      mediaContainer,
      quality,
      transcodeTarget: selectedTranscodeTarget
    });
  }

  const isContainerSupported = deviceProfile.supportedContainers.includes(mediaContainer);
  const isVideoSupported =
    !normVideoCodec || deviceProfile.supportedVideoCodecs.includes(normVideoCodec);
  const isAudioSupported =
    !normAudioCodec || deviceProfile.supportedAudioCodecs.includes(normAudioCodec);

  // If user explicitly picked a constrained quality profile (4k, 1080p, 720p, 480p):
  if (isConstrainedQuality && qualityPreset.maxBitrate && qualityPreset.maxWidth && qualityPreset.maxHeight) {
    const qualityParams = `&maxWidth=${qualityPreset.maxWidth}&maxHeight=${qualityPreset.maxHeight}&videoBitRate=${qualityPreset.maxBitrate}&maxVideoBitRate=${qualityPreset.maxBitrate}&audioBitRate=192000`;

    // If video is natively supported and its resolution/bitrate are already <= requested target, we can copy video.
    const sourceBitrate = videoStream?.bitRate || item.bitRate || 0;
    const canCopyVideo =
      isVideoSupported &&
      sourceWidth > 0 &&
      sourceWidth <= qualityPreset.maxWidth &&
      sourceHeight > 0 &&
      sourceHeight <= qualityPreset.maxHeight &&
      (!sourceBitrate || sourceBitrate <= qualityPreset.maxBitrate);

    const targetVideoCodec = canCopyVideo ? "copy" : "h264";
    const targetAudioCodec = isAudioSupported && normAudioCodec === "aac" ? "copy" : "aac";
    const audioChannelsParam = targetAudioCodec === "aac" ? "&audioChannels=2" : "";

    const qualityStreamUrl = `${cleanServerUrl}/Videos/${item.id}/master.m3u8?videoCodec=${targetVideoCodec}&audioCodec=${targetAudioCodec}${audioChannelsParam}${qualityParams}${hlsMediaSourceParam}${audioIndexParam}${subtitleIndexParam}&deviceId=finora-mobile&transcodingProtocol=hls`;

    return {
      mode: "transcode",
      url: qualityStreamUrl,
      mediaSourceId,
      videoCodec: targetVideoCodec,
      audioCodec: targetAudioCodec,
      container: "m3u8",
      quality: qualityPreset.id,
      bitrate: qualityPreset.maxBitrate,
      maxWidth: qualityPreset.maxWidth,
      maxHeight: qualityPreset.maxHeight,
      reason: `Transcoding to requested quality: ${qualityPreset.label}.`
    };
  }

  // If user selected a non-default audio track and video is supported:
  // Use Direct Stream with copy video and copy/transcode audio with AudioStreamIndex.
  if (!isDefaultAudioSelected && isVideoSupported) {
    const isSourceAac = normAudioCodec === "aac";
    const targetAudioCodec = isSourceAac ? "copy" : "aac";
    const audioChannelsParam = !isSourceAac ? "&audioChannels=2" : "";
    const directStreamUrl = `${cleanServerUrl}/Videos/${item.id}/master.m3u8?videoCodec=copy&audioCodec=${targetAudioCodec}${audioChannelsParam}${hlsMediaSourceParam}${audioIndexParam}${subtitleIndexParam}&deviceId=finora-mobile&transcodingProtocol=hls&allowVideoStreamCopy=true`;

    return {
      mode: "direct-stream",
      url: directStreamUrl,
      mediaSourceId,
      videoCodec: normVideoCodec,
      audioCodec: targetAudioCodec,
      container: "m3u8",
      quality: quality === "original" ? "original" : "auto",
      reason: `Selected audio track index ${audioStreamIndex}; streaming with video copy.`
    };
  }

  // Direct Play: container, video codec, and audio codec are all natively supported.
  if (isDefaultAudioSelected && isContainerSupported && isVideoSupported && isAudioSupported) {
    const directPlayUrl = `${cleanServerUrl}/Videos/${item.id}/stream?static=true${mediaSourceParam}`;

    return {
      mode: "direct-play",
      url: directPlayUrl,
      mediaSourceId,
      videoCodec: normVideoCodec,
      audioCodec: normAudioCodec,
      container: mediaContainer,
      quality: quality === "original" ? "original" : "auto",
      reason: "Container and all codecs are natively supported by client profile."
    };
  }

  // Direct Stream: Video and audio codecs match, but container is incompatible -> remux.
  if (isVideoSupported && isAudioSupported && !isContainerSupported) {
    const directStreamUrl = `${cleanServerUrl}/Videos/${item.id}/stream?videoCodec=copy&audioCodec=copy${mediaSourceParam}${audioIndexParam}${subtitleIndexParam}`;

    return {
      mode: "direct-stream",
      url: directStreamUrl,
      mediaSourceId,
      videoCodec: normVideoCodec,
      audioCodec: normAudioCodec,
      container: mediaContainer,
      quality: quality === "original" ? "original" : "auto",
      reason: `Container '${mediaContainer}' unsupported; remuxing codecs directly.`
    };
  }

  // Transcoding: Video or audio codec requires re-encoding -> HLS stream.
  // If video itself is supported, copy it and only transcode audio. If video must
  // be re-encoded, explicitly request a high-quality source-aware target instead
  // of relying on Jellyfin's conservative default.
  const unsupportedReasons: string[] = [];
  if (!isVideoSupported && normVideoCodec) {
    unsupportedReasons.push(`video codec '${normVideoCodec}'`);
  }
  if (!isAudioSupported && normAudioCodec) {
    unsupportedReasons.push(`audio codec '${normAudioCodec}'`);
  }
  if (!isContainerSupported) {
    unsupportedReasons.push(`container '${mediaContainer}'`);
  }

  const targetVideoCodec = isVideoSupported ? "copy" : "h264";
  const compatibilityParams =
    targetVideoCodec === "h264"
      ? `&maxWidth=${autoCompatibilityTarget.maxWidth}&maxHeight=${autoCompatibilityTarget.maxHeight}&videoBitRate=${autoCompatibilityTarget.maxBitrate}&maxVideoBitRate=${autoCompatibilityTarget.maxBitrate}&audioBitRate=192000`
      : "";
  const transcodeUrl = `${cleanServerUrl}/Videos/${item.id}/master.m3u8?videoCodec=${targetVideoCodec}&audioCodec=aac&audioChannels=2${compatibilityParams}${hlsMediaSourceParam}${audioIndexParam}${subtitleIndexParam}&deviceId=finora-mobile&transcodingProtocol=hls`;

  return {
    mode: "transcode",
    url: transcodeUrl,
    mediaSourceId,
    videoCodec: targetVideoCodec,
    audioCodec: "aac",
    container: "m3u8",
    quality: quality === "original" ? "original" : "auto",
    bitrate: targetVideoCodec === "h264" ? autoCompatibilityTarget.maxBitrate : undefined,
    maxWidth: targetVideoCodec === "h264" ? autoCompatibilityTarget.maxWidth : undefined,
    maxHeight: targetVideoCodec === "h264" ? autoCompatibilityTarget.maxHeight : undefined,
    reason:
      targetVideoCodec === "h264"
        ? `Transcoding required: unsupported ${unsupportedReasons.join(", ") || "format"}; compatibility target ${autoCompatibilityTarget.label}.`
        : `Transcoding required: unsupported ${unsupportedReasons.join(", ") || "format"}.`
  };
}
