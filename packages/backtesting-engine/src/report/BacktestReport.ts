import { BacktestReportMetrics } from '../types/index.ts';

export class BacktestReport {
  private readonly metrics: Readonly<BacktestReportMetrics>;

  constructor(metrics: BacktestReportMetrics) {
    this.metrics = Object.freeze({ ...metrics });
  }

  public getMetrics(): Readonly<BacktestReportMetrics> {
    return this.metrics;
  }

  public toJSON(): BacktestReportMetrics {
    return { ...this.metrics };
  }
}
