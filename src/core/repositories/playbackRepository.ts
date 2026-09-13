import { HttpClient } from "../network/httpClient";
import { jellyfinClient, JellyfinClient } from "../jellyfin/jellyfinClient";
import { logger } from "../network/logger";

export interface PlaybackStartOptions {
  itemId: string;
  mediaSourceId?: string;
  positionTicks?: number;
  playMethod?: "DirectPlay" | "DirectStream" | "Transcode";
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
}

export interface PlaybackProgressOptions {
  itemId: string;
  mediaSourceId?: string;
  positionTicks?: number;
  isPaused?: boolean;
  eventName?: "TimeUpdate" | "Pause" | "Unpause";
}

export interface PlaybackStopOptions {
  itemId: string;
  mediaSourceId?: string;
  positionTicks?: number;
}

export class PlaybackRepository {
  private client: JellyfinClient;

  constructor(client: JellyfinClient = jellyfinClient) {
    this.client = client;
  }

  private getHttp(customClient?: HttpClient): HttpClient {
    return customClient || this.client.getHttpClient();
  }

  public async reportPlaybackStart(
    options: PlaybackStartOptions,
    customClient?: HttpClient
  ): Promise<void> {
    try {
      const http = this.getHttp(customClient);
      await http.request("/Sessions/Playing", {
        method: "POST",
        body: JSON.stringify({
          ItemId: options.itemId,
          MediaSourceId: options.mediaSourceId || options.itemId,
          PositionTicks: options.positionTicks || 0,
          PlayMethod: options.playMethod || "DirectPlay",
          AudioStreamIndex: options.audioStreamIndex,
          SubtitleStreamIndex: options.subtitleStreamIndex,
          CanSeek: true
        })
      });
    } catch (error) {
      logger.warn(`Failed to report playback start for item ${options.itemId}:`, error);
    }
  }

  public async reportPlaybackProgress(
    options: PlaybackProgressOptions,
    customClient?: HttpClient
  ): Promise<void> {
    try {
      const http = this.getHttp(customClient);
      await http.request("/Sessions/Playing/Progress", {
        method: "POST",
        body: JSON.stringify({
          ItemId: options.itemId,
          MediaSourceId: options.mediaSourceId || options.itemId,
          PositionTicks: options.positionTicks || 0,
          IsPaused: Boolean(options.isPaused),
          EventName: options.eventName || "TimeUpdate"
        })
      });
    } catch (error) {
      logger.warn(`Failed to report playback progress for item ${options.itemId}:`, error);
    }
  }

  public async reportPlaybackStopped(
    options: PlaybackStopOptions,
    customClient?: HttpClient
  ): Promise<void> {
    try {
      const http = this.getHttp(customClient);
      const mediaSourceId = options.mediaSourceId || options.itemId;
      const positionTicks = options.positionTicks || 0;
      await http.request("/Sessions/Playing/Stopped", {
        method: "POST",
        params: {
          ItemId: options.itemId,
          MediaSourceId: mediaSourceId,
          PositionTicks: positionTicks
        },
        body: JSON.stringify({
          ItemId: options.itemId,
          MediaSourceId: mediaSourceId,
          PositionTicks: positionTicks
        })
      });
    } catch (error) {
      logger.warn(`Failed to report playback stop for item ${options.itemId}:`, error);
    }
  }
}

export const playbackRepository = new PlaybackRepository();
