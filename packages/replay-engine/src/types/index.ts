import { Candle } from '@tradeflow/shared';

export type ReplayPlaybackState =
  | 'IDLE'
  | 'PLAYING'
  | 'PAUSED'
  | 'STOPPED'
  | 'FINISHED'
  | 'COMPLETED'
  | 'FAILED'
  | 'ERROR';

export type ReplayPlaybackMode = 'REALTIME' | 'ASAP' | 'STEP';

export interface ReplayConfig {
  speed?: number;
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
  speed: number;
  state: ReplayPlaybackState;
}

export interface ReplaySnapshotData {
  version: string;
  engineVersion: string;
  schemaVersion: number;
  datasetHash: string;
  currentIndex: number;
  currentTime: string;
  speed: number;
  state: ReplayPlaybackState;
  createdAt: string;
  updatedAt: string;
  playbackMode: ReplayPlaybackMode;
}

export interface ReplayDatasetValidationResult {
  valid: boolean;
  errors: string[];
}
