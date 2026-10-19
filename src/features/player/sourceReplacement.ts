/**
 * Pure decision logic for switching the single native video player's source.
 *
 * Two very different events share the same "source URL changed" signal:
 *  - a track/quality/fallback change for the SAME content: the current position
 *    must be preserved and the play/pause state maintained;
 *  - a move to a NEW content item (e.g. next episode): the new item's resume
 *    position applies and auto-play follows the player configuration.
 *
 * Keeping this pure makes the ownership model (Model B: one persistent player,
 * FINORA drives `replace`) testable without a native player.
 */
export interface SourceChangeContext {
  /** True for the very first source application of a player instance. */
  isFirstApplication: boolean;
  /** True when the content item itself changed (new episode/movie). */
  contentChanged: boolean;
  /** Position (seconds) at the moment the change was requested. */
  previousPositionSeconds: number;
  /** True when the player was actively playing at the moment of the change. */
  isPlaying: boolean;
  /** Resume position for the incoming content, in seconds. */
  initialPositionSeconds: number;
  /** Whether the player is configured to auto-play new content. */
  autoPlay: boolean;
}

export interface SourceChangeDecision {
  /** Position to seek to after the new source is ready, or null to leave as-is. */
  seekToSeconds: number | null;
  /** Whether to play after the source is ready. */
  shouldPlay: boolean;
  /** Whether the engine snapshot must be reset for new content. */
  resetEngine: boolean;
}

export function decideSourceChange(ctx: SourceChangeContext): SourceChangeDecision {
  if (ctx.isFirstApplication || ctx.contentChanged) {
    return {
      seekToSeconds: ctx.initialPositionSeconds > 0 ? ctx.initialPositionSeconds : null,
      shouldPlay: ctx.autoPlay,
      resetEngine: ctx.contentChanged
    };
  }

  // Same content, new source (audio/subtitle/quality/fallback): preserve position
  // and only resume if the user was actually playing.
  return {
    seekToSeconds: ctx.previousPositionSeconds > 0 ? ctx.previousPositionSeconds : null,
    shouldPlay: ctx.isPlaying,
    resetEngine: false
  };
}

/**
 * A source application is stale when a newer source change has been issued while
 * it was still in flight. Stale completions must never seek, play or reset state.
 */
export function isStaleGeneration(generation: number, currentGeneration: number): boolean {
  return generation !== currentGeneration;
}

export interface SourceReplacementQueueCallbacks {
  onStart?: (generation: number) => void;
  onSuccess?: (generation: number) => void;
  onError?: (generation: number, error: unknown) => void;
}

/**
 * Serializes native source replacements and coalesces waiting work to the latest
 * request. If A is in flight and B then C are enqueued, B is discarded and the
 * native player receives A followed by C — never overlapping replace calls.
 */
export class LatestSourceReplacementQueue<TSource> {
  private inFlight = false;
  private latest: { generation: number; source: TSource } | null = null;
  private disposed = false;

  constructor(
    private readonly replace: (source: TSource) => Promise<void>,
    private readonly callbacks: SourceReplacementQueueCallbacks = {}
  ) {}

  enqueue(generation: number, source: TSource): void {
    if (this.disposed) return;
    this.latest = { generation, source };
    void this.drain();
  }

  clear(): void {
    this.latest = null;
  }

  dispose(): void {
    this.disposed = true;
    this.latest = null;
  }

  private async drain(): Promise<void> {
    if (this.inFlight || this.disposed) return;
    this.inFlight = true;

    try {
      while (!this.disposed && this.latest) {
        const request = this.latest;
        this.latest = null;
        this.callbacks.onStart?.(request.generation);

        try {
          await this.replace(request.source);
          if (!this.disposed) {
            this.callbacks.onSuccess?.(request.generation);
          }
        } catch (error) {
          if (!this.disposed) {
            this.callbacks.onError?.(request.generation, error);
          }
        }
      }
    } finally {
      this.inFlight = false;
      // An enqueue can land between the final loop check and this finally block.
      if (!this.disposed && this.latest) {
        void this.drain();
      }
    }
  }
}
