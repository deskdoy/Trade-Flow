import { ReplayClock } from '../timeline/ReplayClock.ts';
import {
  ReplayPlaybackMode,
  ReplayPlaybackState,
  StateTransitionResult,
  parseReplaySpeed,
} from '../types/index.ts';

export interface ReplayControllerOptions {
  stepIntervalMs?: number;
  playbackMode?: ReplayPlaybackMode;
  autoLoop?: boolean;
}

export type TickCallback = () => void;
export type CompletionCallback = () => void;

const ALLOWED_TRANSITIONS: Record<ReplayPlaybackState, Set<ReplayPlaybackState>> = {
  IDLE: new Set(['LOADED', 'ERROR']),
  LOADED: new Set(['PLAYING', 'STOPPED', 'IDLE', 'ERROR']),
  PLAYING: new Set(['PAUSED', 'COMPLETED', 'STOPPED', 'ERROR', 'PLAYING']),
  PAUSED: new Set(['PLAYING', 'STOPPED', 'LOADED', 'ERROR']),
  COMPLETED: new Set(['PLAYING', 'LOADED', 'STOPPED', 'IDLE', 'ERROR']),
  STOPPED: new Set(['LOADED', 'PLAYING', 'IDLE', 'ERROR']),
  ERROR: new Set(['IDLE', 'LOADED', 'STOPPED']),
  FAILED: new Set(['IDLE', 'LOADED', 'STOPPED']),
  FINISHED: new Set(['PLAYING', 'LOADED', 'STOPPED', 'IDLE', 'ERROR']),
};

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

  public getCurrentState(): ReplayPlaybackState {
    return this.clock.getState();
  }

  public validateTransition(
    from: ReplayPlaybackState,
    to: ReplayPlaybackState
  ): StateTransitionResult {
    const allowed = ALLOWED_TRANSITIONS[from];
    if (allowed && allowed.has(to)) {
      return { valid: true, from, to };
    }
    return {
      valid: false,
      error: `Illegal state transition from ${from} to ${to}`,
      from,
      to,
    };
  }

  public canTransition(to: ReplayPlaybackState): boolean {
    const from = this.getCurrentState();
    return this.validateTransition(from, to).valid;
  }

  public transitionTo(to: ReplayPlaybackState): StateTransitionResult {
    const from = this.getCurrentState();
    const result = this.validateTransition(from, to);
    if (result.valid) {
      this.clock.setState(to);
    }
    return result;
  }

  public setTickCallback(callback: TickCallback | null): void {
    this.onTickCallback = callback;
  }

  public setCompletionCallback(callback: CompletionCallback | null): void {
    this.onCompletionCallback = callback;
  }

  public setStepIntervalMs(intervalMs: number): void {
    this.stepIntervalMs = Math.max(1, intervalMs);
    if (this.getCurrentState() === 'PLAYING') {
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

  public play(): StateTransitionResult {
    const res = this.transitionTo('PLAYING');
    if (!res.valid) return res;

    this.clock.play();
    if (this.playbackMode === 'REALTIME' || this.playbackMode === 'ASAP') {
      this.startTimer();
    }
    return res;
  }

  public pause(): StateTransitionResult {
    const res = this.transitionTo('PAUSED');
    if (!res.valid) return res;

    this.stopTimer();
    this.clock.pause();
    return res;
  }

  public resume(): StateTransitionResult {
    const res = this.transitionTo('PLAYING');
    if (!res.valid) return res;

    this.clock.resume();
    if (this.playbackMode === 'REALTIME' || this.playbackMode === 'ASAP') {
      this.startTimer();
    }
    return res;
  }

  public stop(): StateTransitionResult {
    const res = this.transitionTo('STOPPED');
    if (!res.valid) return res;

    this.stopTimer();
    this.clock.stop();
    return res;
  }

  public tick(): void {
    if (this.clock.isAtEnd()) {
      if (this.autoLoop) {
        this.clock.rewind();
      } else {
        this.stopTimer();
        this.transitionTo('COMPLETED');
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
      this.timer = setInterval(() => {
        this.tick();
      }, 0);
    } else {
      const speed = parseReplaySpeed(this.clock.getSpeed());
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
