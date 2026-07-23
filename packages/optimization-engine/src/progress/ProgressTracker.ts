import { OptimizationProgressData, ParameterSet } from '../types/index.ts';

export class ProgressTracker {
  private totalRuns: number = 0;
  private completedRuns: number = 0;
  private startTime: number = 0;

  public start(totalRuns: number): void {
    this.totalRuns = totalRuns;
    this.completedRuns = 0;
    this.startTime = Date.now();
  }

  public recordCompletedRun(): void {
    this.completedRuns = Math.min(this.completedRuns + 1, this.totalRuns);
  }

  public getProgress(currentParameters?: ParameterSet): OptimizationProgressData {
    const now = Date.now();
    const elapsedMs = Math.max(0, now - (this.startTime || now));
    const remainingRuns = Math.max(0, this.totalRuns - this.completedRuns);
    const percentage =
      this.totalRuns > 0 ? Math.round((this.completedRuns / this.totalRuns) * 100) : 0;

    const averageRunDurationMs =
      this.completedRuns > 0 ? Math.round(elapsedMs / this.completedRuns) : 0;
    const estimatedRemainingMs = Math.round(averageRunDurationMs * remainingRuns);

    const throughputRunsPerSecond =
      elapsedMs > 0 ? Number(((this.completedRuns / elapsedMs) * 1000).toFixed(2)) : 0;

    const estimatedCompletionTime =
      this.completedRuns > 0
        ? new Date(now + estimatedRemainingMs).toISOString()
        : undefined;

    return {
      completedRuns: this.completedRuns,
      totalRuns: this.totalRuns,
      remainingRuns,
      percentage,
      elapsedMs,
      estimatedRemainingMs,
      estimatedRemainingTime: estimatedRemainingMs,
      averageRunDurationMs,
      averageRunDuration: averageRunDurationMs,
      estimatedCompletionTime,
      throughputRunsPerSecond,
      currentParameters,
    };
  }

  public reset(): void {
    this.totalRuns = 0;
    this.completedRuns = 0;
    this.startTime = 0;
  }
}
