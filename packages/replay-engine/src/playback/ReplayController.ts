import { ReplayClock } from '../timeline/ReplayClock.ts';
import { ReplayPlaybackMode } from '../types/index.ts';

export interface ReplayControllerOptions {
  stepIntervalMs?: number;
  playbackMode?: ReplayPlaybackMode;
  autoLoop?: boolean;
}

export type TickCallback = () => void;
export type CompletionCallback = () => void;

export class ReplayController {
  private clock: ReplayClock;
  private timer: any = null;
  private stepIntervalMs: number = 100;
  private playbackMode: ReplayPlaybackMode = 'REALTIME';
  private autoLoop: boolean = false;
  private onTickCallback: TickCallback | null = null;
  private onCompletionCallback: CompletionCallback | null = null;

  constructor(clock: ReplayClock, options?: ReplayControllerOptions) {
    this.clock = clock;
    if (options?.stepIntervalMs !== undefined) {
      this.stepIntervalMs = Math.max(1, options.stepIntervalMs);
    }
    if (options?.playbackMode !== undefined) {
      this.playbackMode = options.playbackMode;
    }
    if (options?.autoLoop !== undefined) {
      this.autoLoop = options.autoLoop;
    }
  }

  public setTickCallback(callback: TickCallback | null): void {
    this.onTickCallback = callback;
  }

  public setCompletionCallback(callback: CompletionCallback | null): void {
    this.onCompletionCallback = callback;
  }

  public setStepIntervalMs(intervalMs: number): void {
    this.stepIntervalMs = Math.max(1, intervalMs);
    if (this.clock.getState() === 'PLAYING') {
      this.stopTimer();
      this.startTimer();
    }
  }

  public setPlaybackMode(mode: ReplayPlaybackMode): void {
    this.playbackMode = mode;
  }

  public setAutoLoop(autoLoop: boolean): void {
    this.autoLoop = autoLoop;
  }

  public play(): void {
    this.clock.play();
    if (this.playbackMode === 'REALTIME' || this.playbackMode === 'ASAP') {
      this.startTimer();
    }
  }

  public pause(): void {
    this.stopTimer();
    this.clock.pause();
  }

  public resume(): void {
    this.clock.resume();
    if (this.playbackMode === 'REALTIME' || this.playbackMode === 'ASAP') {
      this.startTimer();
    }
  }

  public stop(): void {
    this.stopTimer();
    this.clock.stop();
  }

  public tick(): void {
    if (this.clock.isAtEnd()) {
      if (this.autoLoop) {
        this.clock.rewind();
      } else {
        this.stopTimer();
        this.clock.setState('COMPLETED');
        if (this.onCompletionCallback) {
          this.onCompletionCallback();
        }
        return;
      }
    }

    if (this.onTickCallback) {
      this.onTickCallback();
    }
  }

  private startTimer(): void {
    this.stopTimer();

    if (this.playbackMode === 'ASAP') {
      // Execute steps continuously with minimal interval
      this.timer = setInterval(() => {
        this.tick();
      }, 0);
    } else {
      const speed = Math.max(0.01, this.clock.getSpeed());
      const effectiveInterval = Math.max(1, Math.floor(this.stepIntervalMs / speed));
      this.timer = setInterval(() => {
        this.tick();
      }, effectiveInterval);
    }
  }

  private stopTimer(): void {
    if (this.timer !== null) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public destroy(): void {
    this.stopTimer();
    this.onTickCallback = null;
    this.onCompletionCallback = null;
  }
}
