import { ReplayDataset } from '../dataset/ReplayDataset.ts';
import {
  ReplayPlaybackState,
  ReplaySpeed,
  ReplayCursor,
  parseReplaySpeed,
} from '../types/index.ts';

export class ReplayClock {
  private dataset: ReplayDataset;
  private currentIndex: number = -1;
  private speed: ReplaySpeed | number = '1x';
  private state: ReplayPlaybackState = 'IDLE';

  constructor(dataset: ReplayDataset, speed: ReplaySpeed | number = '1x') {
    this.dataset = dataset;
    this.speed = speed;
  }

  public getCurrentTime(): string | undefined {
    if (this.currentIndex < 0) return undefined;
    const candle = this.dataset.get(this.currentIndex);
    if (!candle) return undefined;
    return candle.time ?? (candle as any).timestamp;
  }

  public getCurrentIndex(): number {
    return this.currentIndex;
  }

  public setCurrentIndex(index: number): number {
    const total = this.dataset.count();
    if (total === 0) {
      this.currentIndex = -1;
      return -1;
    }

    this.currentIndex = Math.max(0, Math.min(total - 1, index));
    return this.currentIndex;
  }

  public getSpeed(): ReplaySpeed | number {
    return this.speed;
  }

  public getSpeedNumeric(): number {
    return parseReplaySpeed(this.speed);
  }

  public setSpeed(speed: ReplaySpeed | number): void {
    this.speed = speed;
  }

  public getState(): ReplayPlaybackState {
    return this.state;
  }

  public setState(state: ReplayPlaybackState): void {
    this.state = state;
  }

  public play(): void {
    if (this.dataset.count() === 0) return;
    if (this.currentIndex < 0) {
      this.currentIndex = 0;
    } else if (this.currentIndex >= this.dataset.count() - 1) {
      this.currentIndex = 0;
    }
    this.state = 'PLAYING';
  }

  public pause(): void {
    if (this.state === 'PLAYING') {
      this.state = 'PAUSED';
    }
  }

  public resume(): void {
    if (this.state === 'PAUSED' || this.state === 'STOPPED' || this.state === 'LOADED') {
      this.state = 'PLAYING';
    }
  }

  public stop(): void {
    this.state = 'STOPPED';
  }

  public step(): number {
    const total = this.dataset.count();
    if (total === 0) return -1;

    if (this.currentIndex < total - 1) {
      this.currentIndex++;
    }
    return this.currentIndex;
  }

  public stepBack(): number {
    if (this.currentIndex > 0) {
      this.currentIndex--;
    }
    return this.currentIndex;
  }

  public seek(index: number): number {
    return this.setCurrentIndex(index);
  }

  public rewind(): number {
    this.currentIndex = 0;
    return this.currentIndex;
  }

  public fastForward(): number {
    const total = this.dataset.count();
    if (total > 0) {
      this.currentIndex = total - 1;
    }
    return this.currentIndex;
  }

  public isAtEnd(): boolean {
    const total = this.dataset.count();
    if (total === 0) return true;
    return this.currentIndex >= total - 1;
  }

  public isAtBeginning(): boolean {
    return this.currentIndex <= 0;
  }

  public reset(): void {
    this.currentIndex = -1;
    this.state = 'IDLE';
  }

  public getCursor(): ReplayCursor {
    const total = this.dataset.count();
    const idx = this.currentIndex;
    const currentCandle = idx >= 0 ? this.dataset.get(idx) : undefined;
    const progressPercentage =
      total > 0 && idx >= 0 ? Math.round(((idx + 1) / total) * 100) : 0;
    const remainingCandles =
      total > 0 && idx >= 0 ? Math.max(0, total - (idx + 1)) : total;

    return Object.freeze({
      index: idx,
      timestamp: this.getCurrentTime(),
      progressPercentage,
      remainingCandles,
      currentCandle,
      playbackState: this.state,
      playbackSpeed: this.speed,
    });
  }
}
