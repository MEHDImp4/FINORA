import { Platform } from "react-native";

export interface DeviceProfile {
  supportedContainers: string[];
  supportedVideoCodecs: string[];
  supportedAudioCodecs: string[];
  maxResolution: {
    width: number;
    height: number;
  };
  maxBitrate?: number;
}

export function getDefaultDeviceProfile(platform?: string): DeviceProfile {
  const targetPlatform = platform && platform !== "default" ? platform : Platform.OS;
  const isIOS = targetPlatform?.toLowerCase() === "ios";

  if (isIOS) {
    return {
      supportedContainers: ["mp4", "m4v", "mov", "ts", "m3u8"],
      supportedVideoCodecs: ["h264", "hevc", "h265", "av1"],
      supportedAudioCodecs: ["aac", "mp3", "ac3", "eac3", "flac", "alac"],
      maxResolution: {
        width: 3840,
        height: 2160
      },
      maxBitrate: 80000000 // 80 Mbps
    };
  }

  // Android Media3 / ExoPlayer baseline
  return {
    supportedContainers: ["mp4", "m4v", "mkv", "webm", "ts", "m3u8"],
    supportedVideoCodecs: ["h264", "hevc", "h265", "vp9", "av1"],
    supportedAudioCodecs: ["aac", "mp3", "ac3", "eac3", "flac", "opus", "vorbis"],
    maxResolution: {
      width: 3840,
      height: 2160
    },
    maxBitrate: 100000000 // 100 Mbps
  };
}
