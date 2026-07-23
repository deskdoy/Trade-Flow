import { OptimizationExporter } from '../exporters/OptimizationExporter.ts';
import { OptimizationResultItem, RankingMetric } from '../types/index.ts';

export class OptimizationReport {
  private readonly results: ReadonlyArray<OptimizationResultItem>;
  private readonly rankingMetric: RankingMetric;
  private readonly durationMs: number;

  constructor(
    results: OptimizationResultItem[],
    rankingMetric: RankingMetric,
    durationMs: number
  ) {
    this.results = Object.freeze([...results]);
    this.rankingMetric = rankingMetric;
    this.durationMs = durationMs;
  }

  public getResults(): ReadonlyArray<OptimizationResultItem> {
    return this.results;
  }

  public getBestResult(): OptimizationResultItem | undefined {
    return this.results.length > 0 ? this.results[0] : undefined;
  }

  public getRankingMetric(): RankingMetric {
    return this.rankingMetric;
  }

  public getDurationMs(): number {
    return this.durationMs;
  }

  public export(exporter: OptimizationExporter): string {
    return exporter.export(this);
  }

  public toJSON() {
    return {
      results: this.results,
      rankingMetric: this.rankingMetric,
      durationMs: this.durationMs,
      bestResult: this.getBestResult(),
    };
  }
}
