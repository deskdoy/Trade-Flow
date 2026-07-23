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
    const elapsedMs = Math.max(0, Date.now() - this.startTime);
    const remainingRuns = Math.max(0, this.totalRuns - this.completedRuns);
    const percentage =
      this.totalRuns > 0 ? Math.round((this.completedRuns / this.totalRuns) * 100) : 0;

    const avgMsPerRun =
      this.completedRuns > 0 ? elapsedMs / this.completedRuns : 0;
    const estimatedRemainingMs = Math.round(avgMsPerRun * remainingRuns);

    return {
      completedRuns: this.completedRuns,
      totalRuns: this.totalRuns,
      remainingRuns,
      percentage,
      elapsedMs,
      estimatedRemainingMs,
      currentParameters,
    };
  }

  public reset(): void {
    this.totalRuns = 0;
    this.completedRuns = 0;
    this.startTime = 0;
  }
}
