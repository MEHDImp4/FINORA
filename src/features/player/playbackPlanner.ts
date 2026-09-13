import { MediaItem } from "../../types/media";
import { DeviceProfile, getDefaultDeviceProfile } from "./deviceProfile";
import { sanitizeData } from "../../core/network/logger";
import { QUALITY_PRESETS, PlaybackQuality } from "./qualityPresets";

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
  token?: string;
  deviceProfile?: DeviceProfile;
  platform?: string;
  quality?: string;
  container?: string;
  localPath?: string;
  audioStreamIndex?: number;
  subtitleStreamIndex?: number | null;
}

export function getSanitizedPlaybackUrl(url: string): string {
  return sanitizeData(url);
}

export function createPlaybackPlan(options: PlaybackPlanOptions): PlaybackPlan {
  const {
    item,
    serverUrl,
    token = "",
    platform,
    deviceProfile = getDefaultDeviceProfile(platform),
    quality = "auto",
    container,
    localPath,
    audioStreamIndex,
    subtitleStreamIndex
  } = options;

  if (localPath) {
    return {
      mode: "direct-play",
      url: localPath,
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

  const isContainerSupported = deviceProfile.supportedContainers.includes(mediaContainer);
  const isVideoSupported =
    !normVideoCodec || deviceProfile.supportedVideoCodecs.includes(normVideoCodec);
  const isAudioSupported =
    !normAudioCodec || deviceProfile.supportedAudioCodecs.includes(normAudioCodec);

  // Quality evaluation
  const qualityPreset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.auto;
  const isConstrainedQuality =
    quality !== "auto" &&
    quality !== "original" &&
    Boolean(qualityPreset.maxBitrate && qualityPreset.maxWidth && qualityPreset.maxHeight);

  // If user explicitly picked a constrained quality profile (4k, 1080p, 720p, 480p):
  if (isConstrainedQuality && qualityPreset.maxBitrate && qualityPreset.maxWidth && qualityPreset.maxHeight) {
    const qualityParams = `&maxWidth=${qualityPreset.maxWidth}&maxHeight=${qualityPreset.maxHeight}&videoBitRate=${qualityPreset.maxBitrate}&maxVideoBitRate=${qualityPreset.maxBitrate}&audioBitRate=192000`;

    // If video is natively supported and its resolution/bitrate are already <= requested target, we can copy video
    const sourceWidth = videoStream?.width || 0;
    const sourceHeight = videoStream?.height || 0;
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

    const qualityStreamUrl = `${cleanServerUrl}/Videos/${item.id}/master.m3u8?videoCodec=${targetVideoCodec}&audioCodec=${targetAudioCodec}${audioChannelsParam}${qualityParams}${
      token ? `&api_key=${encodeURIComponent(token)}` : ""
    }${hlsMediaSourceParam}${audioIndexParam}${subtitleIndexParam}&deviceId=finora-mobile&transcodingProtocol=hls`;

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
  // Use Direct Stream with copy video and copy/transcode audio with AudioStreamIndex
  if (!isDefaultAudioSelected && isVideoSupported) {
    const isSourceAac = normAudioCodec === "aac";
    const targetAudioCodec = isSourceAac ? "copy" : "aac";
    const audioChannelsParam = !isSourceAac ? "&audioChannels=2" : "";
    const directStreamUrl = `${cleanServerUrl}/Videos/${item.id}/master.m3u8?videoCodec=copy&audioCodec=${targetAudioCodec}${audioChannelsParam}${
      token ? `&api_key=${encodeURIComponent(token)}` : ""
    }${hlsMediaSourceParam}${audioIndexParam}${subtitleIndexParam}&deviceId=finora-mobile&transcodingProtocol=hls&allowVideoStreamCopy=true`;

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

  // Direct Play: container, video codec, and audio codec are all natively supported
  if (isDefaultAudioSelected && isContainerSupported && isVideoSupported && isAudioSupported) {
    const directPlayUrl = `${cleanServerUrl}/Videos/${item.id}/stream?static=true${
      token ? `&api_key=${encodeURIComponent(token)}` : ""
    }${mediaSourceParam}`;

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

  // Direct Stream: Video and audio codecs match, but container is incompatible -> remux
  if (isVideoSupported && isAudioSupported && !isContainerSupported) {
    const directStreamUrl = `${cleanServerUrl}/Videos/${item.id}/stream?videoCodec=copy&audioCodec=copy${
      token ? `&api_key=${encodeURIComponent(token)}` : ""
    }${mediaSourceParam}${audioIndexParam}${subtitleIndexParam}`;

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

  // Transcoding: Video or audio codec requires re-encoding -> HLS stream
  // When video codec is already supported, copy video directly (0% server overhead, 60fps)
  // and only transcode audio to AAC stereo to fix audio stutter/silence.
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
  const transcodeUrl = `${cleanServerUrl}/Videos/${item.id}/master.m3u8?videoCodec=${targetVideoCodec}&audioCodec=aac&audioChannels=2${
    token ? `&api_key=${encodeURIComponent(token)}` : ""
  }${hlsMediaSourceParam}${audioIndexParam}${subtitleIndexParam}&deviceId=finora-mobile&transcodingProtocol=hls`;

  return {
    mode: "transcode",
    url: transcodeUrl,
    mediaSourceId,
    videoCodec: targetVideoCodec,
    audioCodec: "aac",
    container: "m3u8",
    quality: quality === "original" ? "original" : "auto",
    reason: `Transcoding required: unsupported ${unsupportedReasons.join(", ") || "format"}.`
  };
}
