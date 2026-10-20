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

interface TranscodeTarget {
  quality: string;
  maxWidth?: number;
  maxHeight?: number;
  maxBitrate?: number;
  label: string;
}

function getAutoCompatibilityTarget(
  sourceWidth: number,
  sourceHeight: number,
  deviceProfile: DeviceProfile
): TranscodeTarget {
  const profileWidth = Math.max(1, deviceProfile.maxResolution.width || 1920);
  const profileHeight = Math.max(1, deviceProfile.maxResolution.height || 1080);
  const fallbackWidth = Math.min(1920, profileWidth);
  const fallbackHeight = Math.min(1080, profileHeight);
  const maxWidth = Math.min(sourceWidth > 0 ? sourceWidth : fallbackWidth, profileWidth);
  const maxHeight = Math.min(sourceHeight > 0 ? sourceHeight : fallbackHeight, profileHeight);

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
    quality: "auto",
    maxWidth,
    maxHeight,
    maxBitrate,
    label: `${maxWidth}x${maxHeight} @ ${(maxBitrate / 1_000_000).toFixed(1)} Mbps`
  };
}

function getForcedTranscodeTarget(
  quality: string,
  sourceWidth: number,
  sourceHeight: number,
  deviceProfile: DeviceProfile
): TranscodeTarget {
  const qualityPreset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.auto;
  const isConstrainedQuality =
    quality !== "auto" &&
    quality !== "original" &&
    Boolean(qualityPreset.maxBitrate && qualityPreset.maxWidth && qualityPreset.maxHeight);

  if (
    isConstrainedQuality &&
    qualityPreset.maxBitrate &&
    qualityPreset.maxWidth &&
    qualityPreset.maxHeight
  ) {
    return {
      quality: qualityPreset.id,
      maxWidth: qualityPreset.maxWidth,
      maxHeight: qualityPreset.maxHeight,
      maxBitrate: qualityPreset.maxBitrate,
      label: qualityPreset.label
    };
  }

  // "Original" deliberately remains unrestricted. A forced fallback still
  // changes codecs for compatibility, but it must not silently apply Auto caps.
  if (quality === "original") {
    return {
      quality: "original",
      label: "Original"
    };
  }

  return getAutoCompatibilityTarget(sourceWidth, sourceHeight, deviceProfile);
}

function buildTranscodeTargetParams(target: TranscodeTarget): string {
  if (!target.maxWidth || !target.maxHeight || !target.maxBitrate) {
    return "";
  }

  return `&maxWidth=${target.maxWidth}&maxHeight=${target.maxHeight}&videoBitRate=${target.maxBitrate}&maxVideoBitRate=${target.maxBitrate}&audioBitRate=192000`;
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
  transcodeTarget: TranscodeTarget;
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

  // Decode/container recovery always re-encodes video to H.264 and audio to AAC,
  // while preserving the user's selected quality semantics.
  const target = ctx.transcodeTarget;
  const targetParams = buildTranscodeTargetParams(target);

  return {
    mode: "transcode",
    url: `${ctx.cleanServerUrl}/Videos/${ctx.itemId}/master.m3u8?videoCodec=h264&audioCodec=aac&audioChannels=2${targetParams}${ctx.hlsMediaSourceParam}${ctx.audioIndexParam}${ctx.subtitleIndexParam}&deviceId=finora-mobile&transcodingProtocol=hls`,
    mediaSourceId: ctx.mediaSourceId,
    videoCodec: "h264",
    audioCodec: "aac",
    container: "m3u8",
    quality: target.quality,
    bitrate: target.maxBitrate,
    maxWidth: target.maxWidth,
    maxHeight: target.maxHeight,
    reason: target.maxBitrate
      ? `Forced transcode fallback after a direct playback failure (${target.label}).`
      : "Forced transcode fallback after a direct playback failure (Original quality)."
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
  const sourceBitrate = videoStream?.bitRate || item.bitRate || 0;

  // Forced compatibility fallback must resolve quality before returning, otherwise
  // a later Auto/1080p/720p/480p change can keep the exact same HLS source.
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
      transcodeTarget: getForcedTranscodeTarget(
        quality,
        sourceWidth,
        sourceHeight,
        deviceProfile
      )
    });
  }

  const isContainerSupported = deviceProfile.supportedContainers.includes(mediaContainer);
  const isVideoCodecSupported =
    !normVideoCodec || deviceProfile.supportedVideoCodecs.includes(normVideoCodec);
  const isAudioSupported =
    !normAudioCodec || deviceProfile.supportedAudioCodecs.includes(normAudioCodec);

  const isAutoQuality = quality === "auto";
  const sourceExceedsDeviceResolution =
    isAutoQuality &&
    sourceWidth > 0 &&
    sourceHeight > 0 &&
    (sourceWidth > deviceProfile.maxResolution.width ||
      sourceHeight > deviceProfile.maxResolution.height);
  const sourceExceedsDeviceBitrate =
    isAutoQuality &&
    typeof deviceProfile.maxBitrate === "number" &&
    sourceBitrate > 0 &&
    sourceBitrate > deviceProfile.maxBitrate;
  const isVideoSupported =
    isVideoCodecSupported &&
    !sourceExceedsDeviceResolution &&
    !sourceExceedsDeviceBitrate;

  // Quality evaluation
  const qualityPreset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.auto;
  const isConstrainedQuality =
    quality !== "auto" &&
    quality !== "original" &&
    Boolean(qualityPreset.maxBitrate && qualityPreset.maxWidth && qualityPreset.maxHeight);

  // If user explicitly picked a constrained quality profile (4k, 1080p, 720p, 480p):
  if (isConstrainedQuality && qualityPreset.maxBitrate && qualityPreset.maxWidth && qualityPreset.maxHeight) {
    const qualityParams = `&maxWidth=${qualityPreset.maxWidth}&maxHeight=${qualityPreset.maxHeight}&videoBitRate=${qualityPreset.maxBitrate}&maxVideoBitRate=${qualityPreset.maxBitrate}&audioBitRate=192000`;

    // Only copy video when the source is fully known to fit under the selected cap.
    // Unknown bitrate must be transcoded; otherwise a "1080p 10 Mbps" selection can
    // silently keep a much higher-bitrate source unchanged.
    const canCopyVideo =
      isVideoCodecSupported &&
      sourceWidth > 0 &&
      sourceWidth <= qualityPreset.maxWidth &&
      sourceHeight > 0 &&
      sourceHeight <= qualityPreset.maxHeight &&
      sourceBitrate > 0 &&
      sourceBitrate <= qualityPreset.maxBitrate;

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
  // Use Direct Stream with copy video and copy/transcode audio with AudioStreamIndex
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

  // Direct Play: container, video codec, audio codec and Auto device limits all match.
  // "original" deliberately bypasses device resolution/bitrate caps above.
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

  // Direct Stream: Video and audio codecs match, but container is incompatible -> remux
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

  // Transcoding: Video/audio codec or the Auto device profile requires re-encoding.
  const unsupportedReasons: string[] = [];
  if (!isVideoCodecSupported && normVideoCodec) {
    unsupportedReasons.push(`video codec '${normVideoCodec}'`);
  }
  if (sourceExceedsDeviceResolution) {
    unsupportedReasons.push(
      `resolution ${sourceWidth}x${sourceHeight} exceeds ${deviceProfile.maxResolution.width}x${deviceProfile.maxResolution.height}`
    );
  }
  if (sourceExceedsDeviceBitrate && deviceProfile.maxBitrate) {
    unsupportedReasons.push(
      `bitrate ${sourceBitrate} exceeds ${deviceProfile.maxBitrate}`
    );
  }
  if (!isAudioSupported && normAudioCodec) {
    unsupportedReasons.push(`audio codec '${normAudioCodec}'`);
  }
  if (!isContainerSupported) {
    unsupportedReasons.push(`container '${mediaContainer}'`);
  }

  const targetVideoCodec = isVideoSupported ? "copy" : "h264";
  const shouldApplyDeviceCaps =
    isAutoQuality && (sourceExceedsDeviceResolution || sourceExceedsDeviceBitrate);
  const deviceResolutionParams = shouldApplyDeviceCaps
    ? `&maxWidth=${deviceProfile.maxResolution.width}&maxHeight=${deviceProfile.maxResolution.height}`
    : "";
  const deviceBitrateParams =
    shouldApplyDeviceCaps && typeof deviceProfile.maxBitrate === "number"
      ? `&videoBitRate=${deviceProfile.maxBitrate}&maxVideoBitRate=${deviceProfile.maxBitrate}`
      : "";
  const transcodeUrl = `${cleanServerUrl}/Videos/${item.id}/master.m3u8?videoCodec=${targetVideoCodec}&audioCodec=aac&audioChannels=2${deviceResolutionParams}${deviceBitrateParams}${hlsMediaSourceParam}${audioIndexParam}${subtitleIndexParam}&deviceId=finora-mobile&transcodingProtocol=hls`;

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
