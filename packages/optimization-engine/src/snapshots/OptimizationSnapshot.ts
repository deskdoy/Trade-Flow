import {
  OptimizationProgressData,
  OptimizationResultItem,
  OptimizationSnapshotData,
  OptimizationState,
} from '../types/index.ts';

export class OptimizationSnapshot {
  public static create(
    state: OptimizationState,
    completedRuns: number,
    totalRuns: number,
    results: OptimizationResultItem[],
    progress: OptimizationProgressData,
    createdAt?: string
  ): OptimizationSnapshotData {
    const now = new Date().toISOString();
    return {
      version: 1,
      engineVersion: '0.1.0',
      schemaVersion: 1,
      state,
      completedRuns,
      totalRuns,
      results: [...results],
      progress: { ...progress },
      timestamp: now,
      createdAt: createdAt ?? now,
      updatedAt: now,
    };
  }
}
