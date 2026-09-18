import { HttpClient } from "../network/httpClient";
import { jellyfinClient, JellyfinClient } from "../jellyfin/jellyfinClient";
import { logger } from "../network/logger";

export interface PlaybackStartOptions {
  itemId: string;
  mediaSourceId?: string;
  /** Stable Jellyfin playback session id for this media session. */
  playSessionId?: string;
  positionTicks?: number;
  playMethod?: "DirectPlay" | "DirectStream" | "Transcode";
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
}

export interface PlaybackProgressOptions {
  itemId: string;
  mediaSourceId?: string;
  playSessionId?: string;
  positionTicks?: number;
  isPaused?: boolean;
  eventName?: "TimeUpdate" | "Pause" | "Unpause";
  audioStreamIndex?: number;
  subtitleStreamIndex?: number;
}

export interface PlaybackStopOptions {
  itemId: string;
  mediaSourceId?: string;
  playSessionId?: string;
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
          PlaySessionId: options.playSessionId,
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
          PlaySessionId: options.playSessionId,
          PositionTicks: options.positionTicks || 0,
          IsPaused: Boolean(options.isPaused),
          EventName: options.eventName || "TimeUpdate",
          AudioStreamIndex: options.audioStreamIndex,
          SubtitleStreamIndex: options.subtitleStreamIndex
        })
      });
    } catch (error) {
      logger.warn(`Failed to report playback progress for item ${options.itemId}:`, error);
    }
  }

  /**
   * Stop is the most important report: a lost Stop leaves a phantom session and a
   * wrong resume point. It is retried a bounded number of times (2 attempts total)
   * since it is idempotent from Jellyfin's point of view. Reporting never throws.
   */
  public async reportPlaybackStopped(
    options: PlaybackStopOptions,
    customClient?: HttpClient
  ): Promise<void> {
    const http = this.getHttp(customClient);
    const mediaSourceId = options.mediaSourceId || options.itemId;
    const positionTicks = options.positionTicks || 0;
    const params: Record<string, string | number> = {
      ItemId: options.itemId,
      MediaSourceId: mediaSourceId,
      PositionTicks: positionTicks
    };
    if (options.playSessionId) {
      params.PlaySessionId = options.playSessionId;
    }

    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await http.request("/Sessions/Playing/Stopped", {
          method: "POST",
          params,
          body: JSON.stringify({
            ItemId: options.itemId,
            MediaSourceId: mediaSourceId,
            PlaySessionId: options.playSessionId,
            PositionTicks: positionTicks
          })
        });
        return;
      } catch (error) {
        if (attempt >= maxAttempts) {
          logger.warn(`Failed to report playback stop for item ${options.itemId}:`, error);
          return;
        }
        await new Promise<void>((resolve) => {
          const timer = setTimeout(resolve, 400);
          if (typeof (timer as any)?.unref === "function") {
            (timer as any).unref();
          }
        });
      }
    }
  }
}

export const playbackRepository = new PlaybackRepository();
