export type PlaybackQuality = "auto" | "original" | "4k" | "1080p" | "720p" | "480p";

export interface QualityPreset {
  id: PlaybackQuality;
  label: string;
  maxWidth?: number;
  maxHeight?: number;
  maxBitrate?: number; // in bps
}

export const QUALITY_OPTIONS: QualityPreset[] = [
  { id: "auto", label: "Auto" },
  { id: "original", label: "Original" },
  { id: "4k", label: "4K (2160p) - 40 Mbps", maxWidth: 3840, maxHeight: 2160, maxBitrate: 40000000 },
  { id: "1080p", label: "1080p HD - 10 Mbps", maxWidth: 1920, maxHeight: 1080, maxBitrate: 10000000 },
  { id: "720p", label: "720p HD - 4 Mbps", maxWidth: 1280, maxHeight: 720, maxBitrate: 4000000 },
  { id: "480p", label: "480p SD - 1.5 Mbps", maxWidth: 854, maxHeight: 480, maxBitrate: 1500000 }
];

export const QUALITY_PRESETS: Record<string, QualityPreset> = {
  auto: QUALITY_OPTIONS[0],
  original: QUALITY_OPTIONS[1],
  "4k": QUALITY_OPTIONS[2],
  "1080p": QUALITY_OPTIONS[3],
  "720p": QUALITY_OPTIONS[4],
  "480p": QUALITY_OPTIONS[5]
};
