import { Candle } from '@tradeflow/shared';

export type ReplayPlaybackState =
  | 'IDLE'
  | 'LOADED'
  | 'PLAYING'
  | 'PAUSED'
  | 'STOPPED'
  | 'FINISHED'
  | 'COMPLETED'
  | 'FAILED'
  | 'ERROR';

export type ReplayPlaybackMode = 'REALTIME' | 'ASAP' | 'STEP';

export type ReplaySpeed =
  | '0.25x'
  | '0.5x'
  | '1x'
  | '2x'
  | '4x'
  | '8x'
  | '16x'
  | '32x'
  | 'MAX';

export function parseReplaySpeed(speed: ReplaySpeed | number): number {
  if (typeof speed === 'number') return Math.max(0.01, speed);
  switch (speed) {
    case '0.25x':
      return 0.25;
    case '0.5x':
      return 0.5;
    case '1x':
      return 1;
    case '2x':
      return 2;
    case '4x':
      return 4;
    case '8x':
      return 8;
    case '16x':
      return 16;
    case '32x':
      return 32;
    case 'MAX':
      return 1000;
    default:
      return 1;
  }
}

export function formatReplaySpeed(speed: number | ReplaySpeed): ReplaySpeed {
  if (typeof speed === 'string') return speed;
  if (speed <= 0.25) return '0.25x';
  if (speed <= 0.5) return '0.5x';
  if (speed <= 1) return '1x';
  if (speed <= 2) return '2x';
  if (speed <= 4) return '4x';
  if (speed <= 8) return '8x';
  if (speed <= 16) return '16x';
  if (speed <= 32) return '32x';
  return 'MAX';
}

export interface ReplayCursor {
  readonly index: number;
  readonly timestamp?: string;
  readonly progressPercentage: number;
  readonly remainingCandles: number;
  readonly currentCandle?: Candle;
  readonly playbackState: ReplayPlaybackState;
  readonly playbackSpeed: ReplaySpeed | number;
}

export interface ReplaySession {
  sessionId: string;
  startedAt?: string;
  endedAt?: string;
  elapsedTime: number;
  playCount: number;
  pauseCount: number;
  stepCount: number;
  seekCount: number;
  rewindCount: number;
  fastForwardCount: number;
  currentPlaybackSpeed: ReplaySpeed | number;
  datasetHash: string;
  datasetVersion: string;
  datasetSource: string;
}

export interface ReplayStatistics {
  processedCandles: number;
  averageReplaySpeed: number;
  averageStepsPerSecond: number;
  totalPauseDuration: number;
  totalPlayDuration: number;
  numberOfSeeks: number;
  numberOfSteps: number;
  numberOfRewinds: number;
  numberOfFastForwards: number;
  memoryBufferUsage: number;
}

export interface ReplayDatasetMetadata {
  datasetHash: string;
  datasetVersion: string;
  datasetSource: string;
  loadedAt: string;
  candleCount: number;
  symbol: string;
  timeframe: string;
}

export interface ReplaySynchronizationTarget {
  name: string;
  synchronize(
    candle: Candle,
    index: number,
    history: Candle[],
    datasetHash: string
  ): void;
  reset?(): void;
}

export interface StateTransitionResult {
  valid: boolean;
  error?: string;
  from?: ReplayPlaybackState;
  to?: ReplayPlaybackState;
}

export interface ReplayConfig {
  speed?: ReplaySpeed | number;
  stepIntervalMs?: number;
  bufferCapacity?: number;
  playbackMode?: ReplayPlaybackMode;
  autoLoop?: boolean;
}

export interface ReplayProgressData {
  currentIndex: number;
  totalCount: number;
  percentage: number;
  currentTime?: string;
  currentCandle?: Candle;
  speed: ReplaySpeed | number;
  state: ReplayPlaybackState;
}

export interface ReplaySnapshotData {
  version: string;
  engineVersion: string;
  schemaVersion: number;
  datasetHash: string;
  currentIndex: number;
  currentTime: string;
  speed: ReplaySpeed | number;
  state: ReplayPlaybackState;
  createdAt: string;
  updatedAt: string;
  playbackMode: ReplayPlaybackMode;
  cursor?: ReplayCursor;
  session?: ReplaySession;
  statistics?: ReplayStatistics;
  metadata?: ReplayDatasetMetadata;
}

export interface ReplayDatasetValidationResult {
  valid: boolean;
  errors: string[];
}
