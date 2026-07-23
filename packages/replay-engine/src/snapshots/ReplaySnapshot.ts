import { ReplaySnapshotData, ReplayPlaybackState, ReplayPlaybackMode } from '../types/index.ts';

export class ReplaySnapshot {
  public static create(params: {
    version?: string;
    engineVersion: string;
    schemaVersion?: number;
    datasetHash: string;
    currentIndex: number;
    currentTime?: string;
    speed: number;
    state: ReplayPlaybackState;
    playbackMode?: ReplayPlaybackMode;
    createdAt?: string;
  }): ReplaySnapshotData {
    const now = new Date().toISOString();
    return {
      version: params.version ?? '1.0.0',
      engineVersion: params.engineVersion,
      schemaVersion: params.schemaVersion ?? 1,
      datasetHash: params.datasetHash,
      currentIndex: params.currentIndex,
      currentTime: params.currentTime ?? now,
      speed: params.speed,
      state: params.state,
      createdAt: params.createdAt ?? now,
      updatedAt: now,
      playbackMode: params.playbackMode ?? 'REALTIME',
    };
  }

  public static validate(snapshot: ReplaySnapshotData): boolean {
    if (!snapshot || typeof snapshot !== 'object') return false;
    if (typeof snapshot.datasetHash !== 'string') return false;
    if (typeof snapshot.currentIndex !== 'number') return false;
    if (typeof snapshot.speed !== 'number') return false;
    return true;
  }
}
