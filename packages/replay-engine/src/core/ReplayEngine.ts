import { Candle } from '@tradeflow/shared';
import { EngineHealth, EngineLifecycle, SnapshotProvider } from '@tradeflow/core';
import { ReplayDataset } from '../dataset/ReplayDataset.ts';
import { ReplayClock } from '../timeline/ReplayClock.ts';
import { ReplayController } from '../playback/ReplayController.ts';
import { ReplayBuffer } from '../buffering/ReplayBuffer.ts';
import { ReplayNavigator } from '../navigation/ReplayNavigator.ts';
import { ReplaySynchronizer } from '../synchronization/ReplaySynchronizer.ts';
import {
  ReplayEventEmitter,
  ReplayEventListener,
  ReplayEventType,
} from '../events/ReplayEvents.ts';
import { ReplaySnapshot } from '../snapshots/ReplaySnapshot.ts';
import {
  ReplayConfig,
  ReplayProgressData,
  ReplaySnapshotData,
  ReplayPlaybackState,
  ReplayPlaybackMode,
  ReplaySpeed,
  ReplayCursor,
  ReplaySession,
  ReplayStatistics,
  parseReplaySpeed,
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

  // ReplaySession tracking
  private sessionId: string;
  private sessionStartedAt?: string;
  private sessionEndedAt?: string;
  private playCount: number = 0;
  private pauseCount: number = 0;
  private stepCount: number = 0;
  private seekCount: number = 0;
  private rewindCount: number = 0;
  private fastForwardCount: number = 0;

  // ReplayStatistics tracking
  private processedCandlesSet: Set<number> = new Set();
  private totalPlayMs: number = 0;
  private totalPauseMs: number = 0;
  private lastStateChangeTime: number = Date.now();

  constructor(config?: ReplayConfig) {
    this.sessionId = `session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.dataset = new ReplayDataset();
    this.clock = new ReplayClock(this.dataset, config?.speed ?? '1x');
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
    this.startTime = Date.now();
    this.sessionStartedAt = new Date().toISOString();
  }

  public getVersion(): string {
    return this.engineVersion;
  }

  public getHealth(): EngineHealth {
    const total = this.dataset.count();
    const idx = this.clock.getCurrentIndex();
    const remainingCandles =
      total > 0 && idx >= 0 ? Math.max(0, total - (idx + 1)) : total;
    const bufferUsage =
      this.buffer.capacity > 0 ? this.buffer.size() / this.buffer.capacity : 0;

    return {
      healthy: true,
      version: this.getVersion(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      state: this.clock.getState(),
      playbackState: this.clock.getState(),
      currentIndex: idx,
      totalCandles: total,
      remainingCandles,
      bufferedCount: this.buffer.size(),
      bufferUsage,
      eventsPublished: this.emitter.eventsPublished,
      datasetLoaded: total > 0,
      datasetHash: this.dataset.datasetHash,
      currentSpeed: this.clock.getSpeed(),
    };
  }

  public reset(): void {
    this.controller.stop();
    this.clock.reset();
    this.buffer.clear();
    this.synchronizer.reset();
    this.processedCandlesSet.clear();
    this.stepCount = 0;
    this.seekCount = 0;
    this.playCount = 0;
    this.pauseCount = 0;
    this.rewindCount = 0;
    this.fastForwardCount = 0;
  }

  public destroy(): void {
    this.controller.destroy();
    this.clock.reset();
    this.buffer.clear();
    this.synchronizer.reset();
    this.emitter.clear();
    this.sessionEndedAt = new Date().toISOString();
  }

  public loadDataset(
    candles: Candle[],
    source: string = 'IN_MEMORY',
    version: string = '1.0.0'
  ): void {
    this.controller.stop();
    this.dataset.load(candles, source, version);
    this.clock.reset();
    this.buffer.clear();
    this.processedCandlesSet.clear();
    this.clock.setState('LOADED');
  }

  public setSpeed(speed: ReplaySpeed | number): void {
    this.clock.setSpeed(speed);
  }

  public play(): void {
    if (this.dataset.count() === 0) return;

    this.updateStateDurations();
    const transitionRes = this.controller.play();
    if (!transitionRes.valid) return;

    this.playCount++;
    this.lastStateChangeTime = Date.now();

    const timestamp = this.clock.getCurrentTime() ?? new Date().toISOString();

    this.emitter.emit('replay.started', {
      timestamp,
      totalCandles: this.dataset.count(),
      speed: this.clock.getSpeed(),
    });

    this.emitter.emit('replay.playing', {
      timestamp,
      currentIndex: this.clock.getCurrentIndex(),
    });
  }

  public pause(): void {
    this.updateStateDurations();
    const transitionRes = this.controller.pause();
    if (!transitionRes.valid) return;

    this.pauseCount++;
    this.lastStateChangeTime = Date.now();

    this.emitter.emit('replay.paused', {
      timestamp: this.clock.getCurrentTime() ?? new Date().toISOString(),
      currentIndex: this.clock.getCurrentIndex(),
    });
  }

  public resume(): void {
    this.updateStateDurations();
    const transitionRes = this.controller.resume();
    if (!transitionRes.valid) return;

    this.playCount++;
    this.lastStateChangeTime = Date.now();

    const timestamp = this.clock.getCurrentTime() ?? new Date().toISOString();

    this.emitter.emit('replay.resumed', {
      timestamp,
      currentIndex: this.clock.getCurrentIndex(),
    });

    this.emitter.emit('replay.playing', {
      timestamp,
      currentIndex: this.clock.getCurrentIndex(),
    });
  }

  public stop(): void {
    this.updateStateDurations();
    this.controller.stop();
    this.lastStateChangeTime = Date.now();
  }

  public step(): void {
    this.stepCount++;
    const idx = this.clock.step();
    if (idx < 0) return;

    this.processedCandlesSet.add(idx);
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
      this.sessionEndedAt = new Date().toISOString();
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
    this.stepCount++;
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
    this.seekCount++;
    const prevIdx = this.clock.getCurrentIndex();
    const newIdx = this.clock.seek(index);
    if (newIdx < 0) return;

    this.processedCandlesSet.add(newIdx);
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
    this.seekCount++;
    const prevIdx = this.clock.getCurrentIndex();
    const newIdx = this.navigator.goToDate(date);
    if (newIdx < 0) return;

    this.processedCandlesSet.add(newIdx);
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
    this.rewindCount++;
    const targetIdx = this.navigator.goToBeginning();
    this.buffer.clear();
    this.emitter.emit('replay.rewind', { targetIndex: targetIdx });

    if (targetIdx >= 0) {
      this.processedCandlesSet.add(targetIdx);
      const candle = this.dataset.get(targetIdx);
      if (candle) {
        this.synchronizer.sync(candle, targetIdx, this.dataset);
      }
    }
  }

  public fastForward(): void {
    this.fastForwardCount++;
    const targetIdx = this.navigator.goToEnd();
    this.emitter.emit('replay.fastforward', { targetIndex: targetIdx });

    if (targetIdx >= 0) {
      this.processedCandlesSet.add(targetIdx);
      const candle = this.dataset.get(targetIdx);
      if (candle) {
        this.synchronizer.sync(candle, targetIdx, this.dataset);
      }
    }
  }

  public getCursor(): ReplayCursor {
    return this.clock.getCursor();
  }

  public getSession(): ReplaySession {
    const meta = this.dataset.getMetadata();
    return {
      sessionId: this.sessionId,
      startedAt: this.sessionStartedAt,
      endedAt: this.sessionEndedAt,
      elapsedTime: Date.now() - this.startTime,
      playCount: this.playCount,
      pauseCount: this.pauseCount,
      stepCount: this.stepCount,
      seekCount: this.seekCount,
      rewindCount: this.rewindCount,
      fastForwardCount: this.fastForwardCount,
      currentPlaybackSpeed: this.clock.getSpeed(),
      datasetHash: meta.datasetHash,
      datasetVersion: meta.datasetVersion,
      datasetSource: meta.datasetSource,
    };
  }

  public getStatistics(): ReplayStatistics {
    this.updateStateDurations();
    const elapsedTimeSec = Math.max(0.001, (Date.now() - this.startTime) / 1000);
    const stepsPerSec = Math.round((this.stepCount / elapsedTimeSec) * 100) / 100;
    const numSpeed = parseReplaySpeed(this.clock.getSpeed());

    return {
      processedCandles: this.processedCandlesSet.size,
      averageReplaySpeed: numSpeed,
      averageStepsPerSecond: stepsPerSec,
      totalPauseDuration: this.totalPauseMs,
      totalPlayDuration: this.totalPlayMs,
      numberOfSeeks: this.seekCount,
      numberOfSteps: this.stepCount,
      numberOfRewinds: this.rewindCount,
      numberOfFastForwards: this.fastForwardCount,
      memoryBufferUsage: this.buffer.size() * 256,
    };
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
      cursor: this.getCursor(),
      session: this.getSession(),
      statistics: this.getStatistics(),
      metadata: this.dataset.getMetadata(),
    });
  }

  public restoreSnapshot(snapshot: ReplaySnapshotData): void {
    if (!ReplaySnapshot.validate(snapshot)) {
      throw new Error('Invalid ReplaySnapshotData');
    }

    if (snapshot.speed !== undefined) {
      this.clock.setSpeed(snapshot.speed);
    }
    if (snapshot.currentIndex >= 0) {
      this.seek(snapshot.currentIndex);
    }
    if (snapshot.state) {
      this.clock.setState(snapshot.state);
    }
    if (snapshot.session) {
      this.sessionId = snapshot.session.sessionId || this.sessionId;
      this.playCount = snapshot.session.playCount ?? this.playCount;
      this.pauseCount = snapshot.session.pauseCount ?? this.pauseCount;
      this.stepCount = snapshot.session.stepCount ?? this.stepCount;
      this.seekCount = snapshot.session.seekCount ?? this.seekCount;
      this.rewindCount = snapshot.session.rewindCount ?? this.rewindCount;
      this.fastForwardCount = snapshot.session.fastForwardCount ?? this.fastForwardCount;
    }
    if (snapshot.statistics) {
      this.totalPlayMs = snapshot.statistics.totalPlayDuration ?? this.totalPlayMs;
      this.totalPauseMs = snapshot.statistics.totalPauseDuration ?? this.totalPauseMs;
    }
  }

  public getProgress(): ReplayProgressData {
    const total = this.dataset.count();
    const idx = this.clock.getCurrentIndex();
    const currentCandle = idx >= 0 ? this.dataset.get(idx) : undefined;
    const percentage =
      total > 0 && idx >= 0 ? Math.round(((idx + 1) / total) * 100) : 0;

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

  private updateStateDurations(): void {
    const now = Date.now();
    const elapsed = now - this.lastStateChangeTime;
    const state = this.clock.getState();

    if (state === 'PLAYING') {
      this.totalPlayMs += elapsed;
    } else if (state === 'PAUSED') {
      this.totalPauseMs += elapsed;
    }
    this.lastStateChangeTime = now;
  }

  private setupControllerCallbacks(): void {
    this.controller.setTickCallback(() => {
      this.step();
    });

    this.controller.setCompletionCallback(() => {
      this.sessionEndedAt = new Date().toISOString();
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
