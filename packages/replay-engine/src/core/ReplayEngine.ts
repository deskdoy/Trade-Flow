import { Candle } from '@tradeflow/shared';
import { EngineHealth, EngineLifecycle, SnapshotProvider } from '@tradeflow/core';
import { ReplayDataset } from '../dataset/ReplayDataset.ts';
import { ReplayClock } from '../timeline/ReplayClock.ts';
import { ReplayController } from '../playback/ReplayController.ts';
import { ReplayBuffer } from '../buffering/ReplayBuffer.ts';
import { ReplayNavigator } from '../navigation/ReplayNavigator.ts';
import { ReplaySynchronizer } from '../synchronization/ReplaySynchronizer.ts';
import { ReplayEventEmitter, ReplayEventListener, ReplayEventType } from '../events/ReplayEvents.ts';
import { ReplaySnapshot } from '../snapshots/ReplaySnapshot.ts';
import {
  ReplayConfig,
  ReplayProgressData,
  ReplaySnapshotData,
  ReplayPlaybackState,
  ReplayPlaybackMode,
} from '../types/index.ts';

export class ReplayEngine
  implements SnapshotProvider<ReplaySnapshotData>, EngineLifecycle
{
  private dataset: ReplayDataset;
  private clock: ReplayClock;
  private controller: ReplayController;
  private buffer: ReplayBuffer;
  private navigator: ReplayNavigator;
  private synchronizer: ReplaySynchronizer;
  private emitter: ReplayEventEmitter;

  private startTime: number = Date.now();
  private playbackMode: ReplayPlaybackMode = 'REALTIME';
  private engineVersion: string = '0.1.0';

  constructor(config?: ReplayConfig) {
    this.dataset = new ReplayDataset();
    this.clock = new ReplayClock(this.dataset, config?.speed ?? 1);
    this.buffer = new ReplayBuffer(config?.bufferCapacity ?? 1000);
    this.navigator = new ReplayNavigator(this.dataset, this.clock);
    this.synchronizer = new ReplaySynchronizer();
    this.emitter = new ReplayEventEmitter();
    this.playbackMode = config?.playbackMode ?? 'REALTIME';

    this.controller = new ReplayController(this.clock, {
      stepIntervalMs: config?.stepIntervalMs ?? 100,
      playbackMode: this.playbackMode,
      autoLoop: config?.autoLoop ?? false,
    });

    this.setupControllerCallbacks();
  }

  public initialize(): void {
    // Standard EngineLifecycle initialization
    this.startTime = Date.now();
  }

  public getVersion(): string {
    return this.engineVersion;
  }

  public getHealth(): EngineHealth {
    return {
      healthy: true,
      version: this.getVersion(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      state: this.clock.getState(),
      currentIndex: this.clock.getCurrentIndex(),
      totalCandles: this.dataset.count(),
      bufferedCount: this.buffer.size(),
      eventsPublished: this.emitter.eventsPublished,
      datasetHash: this.dataset.datasetHash,
    };
  }

  public reset(): void {
    this.controller.stop();
    this.clock.reset();
    this.buffer.clear();
    this.synchronizer.reset();
  }

  public destroy(): void {
    this.controller.destroy();
    this.clock.reset();
    this.buffer.clear();
    this.synchronizer.reset();
    this.emitter.clear();
  }

  public loadDataset(candles: Candle[]): void {
    this.controller.stop();
    this.dataset.load(candles);
    this.clock.reset();
    this.buffer.clear();
  }

  public play(): void {
    if (this.dataset.count() === 0) return;

    this.clock.play();
    this.controller.play();

    this.emitter.emit('replay.started', {
      timestamp: this.clock.getCurrentTime() ?? new Date().toISOString(),
      totalCandles: this.dataset.count(),
      speed: this.clock.getSpeed(),
    });
  }

  public pause(): void {
    this.controller.pause();
    this.clock.pause();

    this.emitter.emit('replay.paused', {
      timestamp: this.clock.getCurrentTime() ?? new Date().toISOString(),
      currentIndex: this.clock.getCurrentIndex(),
    });
  }

  public resume(): void {
    this.clock.resume();
    this.controller.resume();

    this.emitter.emit('replay.resumed', {
      timestamp: this.clock.getCurrentTime() ?? new Date().toISOString(),
      currentIndex: this.clock.getCurrentIndex(),
    });
  }

  public stop(): void {
    this.controller.stop();
    this.clock.stop();
  }

  public step(): void {
    const idx = this.clock.step();
    if (idx < 0) return;

    const candle = this.dataset.get(idx);
    if (candle) {
      this.buffer.push(candle);
      this.synchronizer.sync(candle, idx, this.dataset);

      this.emitter.emit('replay.step', {
        candle,
        index: idx,
        total: this.dataset.count(),
      });
    }

    if (this.clock.isAtEnd()) {
      this.emitter.emit('replay.completed', {
        totalCandles: this.dataset.count(),
      });
      this.emitter.emit('replay.finished', {
        totalCandles: this.dataset.count(),
        durationMs: Date.now() - this.startTime,
      });
    }
  }

  public stepBack(): void {
    const prevIdx = this.clock.getCurrentIndex();
    const idx = this.clock.stepBack();
    if (idx < 0) return;

    const candle = this.dataset.get(idx);
    if (candle) {
      this.synchronizer.sync(candle, idx, this.dataset);
      this.emitter.emit('replay.seek', {
        previousIndex: prevIdx,
        newIndex: idx,
        candle,
      });
    }
  }

  public seek(index: number): void {
    const prevIdx = this.clock.getCurrentIndex();
    const newIdx = this.clock.seek(index);
    if (newIdx < 0) return;

    const candle = this.dataset.get(newIdx);
    if (candle) {
      this.synchronizer.sync(candle, newIdx, this.dataset);
      this.emitter.emit('replay.seek', {
        previousIndex: prevIdx,
        newIndex: newIdx,
        candle,
      });
    }
  }

  public seekToDate(date: string | Date): void {
    const prevIdx = this.clock.getCurrentIndex();
    const newIdx = this.navigator.goToDate(date);
    if (newIdx < 0) return;

    const candle = this.dataset.get(newIdx);
    if (candle) {
      this.synchronizer.sync(candle, newIdx, this.dataset);
      this.emitter.emit('replay.seek', {
        previousIndex: prevIdx,
        newIndex: newIdx,
        candle,
      });
    }
  }

  public rewind(): void {
    const targetIdx = this.navigator.goToBeginning();
    this.buffer.clear();
    this.emitter.emit('replay.rewind', { targetIndex: targetIdx });

    if (targetIdx >= 0) {
      const candle = this.dataset.get(targetIdx);
      if (candle) {
        this.synchronizer.sync(candle, targetIdx, this.dataset);
      }
    }
  }

  public fastForward(): void {
    const targetIdx = this.navigator.goToEnd();
    this.emitter.emit('replay.fastforward', { targetIndex: targetIdx });

    if (targetIdx >= 0) {
      const candle = this.dataset.get(targetIdx);
      if (candle) {
        this.synchronizer.sync(candle, targetIdx, this.dataset);
      }
    }
  }

  public getSnapshot(): ReplaySnapshotData {
    return ReplaySnapshot.create({
      engineVersion: this.getVersion(),
      datasetHash: this.dataset.datasetHash,
      currentIndex: this.clock.getCurrentIndex(),
      currentTime: this.clock.getCurrentTime(),
      speed: this.clock.getSpeed(),
      state: this.clock.getState(),
      playbackMode: this.playbackMode,
    });
  }

  public restoreSnapshot(snapshot: ReplaySnapshotData): void {
    if (!ReplaySnapshot.validate(snapshot)) {
      throw new Error('Invalid ReplaySnapshotData');
    }

    this.clock.setSpeed(snapshot.speed);
    if (snapshot.currentIndex >= 0) {
      this.seek(snapshot.currentIndex);
    }
    this.clock.setState(snapshot.state);
  }

  public getProgress(): ReplayProgressData {
    const total = this.dataset.count();
    const idx = this.clock.getCurrentIndex();
    const currentCandle = idx >= 0 ? this.dataset.get(idx) : undefined;
    const percentage = total > 0 && idx >= 0 ? Math.round(((idx + 1) / total) * 100) : 0;

    return {
      currentIndex: idx,
      totalCount: total,
      percentage,
      currentTime: this.clock.getCurrentTime(),
      currentCandle,
      speed: this.clock.getSpeed(),
      state: this.clock.getState(),
    };
  }

  // Getters for subsystems
  public getDataset(): ReplayDataset {
    return this.dataset;
  }

  public getClock(): ReplayClock {
    return this.clock;
  }

  public getSynchronizer(): ReplaySynchronizer {
    return this.synchronizer;
  }

  public getNavigator(): ReplayNavigator {
    return this.navigator;
  }

  public getBuffer(): ReplayBuffer {
    return this.buffer;
  }

  public getController(): ReplayController {
    return this.controller;
  }

  // Event subscription
  public on<K extends ReplayEventType>(
    event: K,
    listener: ReplayEventListener<K>
  ): void {
    this.emitter.on(event, listener);
  }

  public off<K extends ReplayEventType>(
    event: K,
    listener: ReplayEventListener<K>
  ): void {
    this.emitter.off(event, listener);
  }

  private setupControllerCallbacks(): void {
    this.controller.setTickCallback(() => {
      this.step();
    });

    this.controller.setCompletionCallback(() => {
      this.emitter.emit('replay.completed', {
        totalCandles: this.dataset.count(),
      });
      this.emitter.emit('replay.finished', {
        totalCandles: this.dataset.count(),
        durationMs: Date.now() - this.startTime,
      });
    });
  }
}
