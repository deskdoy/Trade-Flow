import { OptimizationResultItem, RankingMetric } from '../types/index.ts';

export interface RankingStrategy {
  readonly name: string;
  compare(a: OptimizationResultItem, b: OptimizationResultItem): number;
  rank(results: OptimizationResultItem[]): OptimizationResultItem[];
}

export abstract class BaseRankingStrategy implements RankingStrategy {
  public abstract readonly name: string;
  public abstract compare(a: OptimizationResultItem, b: OptimizationResultItem): number;

  public rank(results: OptimizationResultItem[]): OptimizationResultItem[] {
    const copy = [...results];
    copy.sort((a, b) => this.compare(a, b));
    return copy.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }
}

export class HighestNetProfit extends BaseRankingStrategy {
  public readonly name = 'HighestNetProfit';
  public compare(a: OptimizationResultItem, b: OptimizationResultItem): number {
    return (b.metrics.netProfit ?? 0) - (a.metrics.netProfit ?? 0);
  }
}

export class HighestProfitFactor extends BaseRankingStrategy {
  public readonly name = 'HighestProfitFactor';
  public compare(a: OptimizationResultItem, b: OptimizationResultItem): number {
    return (b.metrics.profitFactor ?? 0) - (a.metrics.profitFactor ?? 0);
  }
}

export class LowestDrawdown extends BaseRankingStrategy {
  public readonly name = 'LowestDrawdown';
  public compare(a: OptimizationResultItem, b: OptimizationResultItem): number {
    const ddA = a.metrics.maxDrawdownPercent ?? a.metrics.maxDrawdown ?? 0;
    const ddB = b.metrics.maxDrawdownPercent ?? b.metrics.maxDrawdown ?? 0;
    return ddA - ddB;
  }
}

export class HighestSharpe extends BaseRankingStrategy {
  public readonly name = 'HighestSharpe';
  public compare(a: OptimizationResultItem, b: OptimizationResultItem): number {
    return (b.metrics.sharpeRatio ?? 0) - (a.metrics.sharpeRatio ?? 0);
  }
}

export class HighestSortino extends BaseRankingStrategy {
  public readonly name = 'HighestSortino';
  public compare(a: OptimizationResultItem, b: OptimizationResultItem): number {
    return (b.metrics.sortinoRatio ?? 0) - (a.metrics.sortinoRatio ?? 0);
  }
}

export class CustomRankingStrategy extends BaseRankingStrategy {
  public readonly name: string;
  private customComparator: (a: OptimizationResultItem, b: OptimizationResultItem) => number;

  constructor(
    name: string,
    comparator: (a: OptimizationResultItem, b: OptimizationResultItem) => number
  ) {
    super();
    this.name = name;
    this.customComparator = comparator;
  }

  public compare(a: OptimizationResultItem, b: OptimizationResultItem): number {
    return this.customComparator(a, b);
  }
}

export class MetricRankingStrategy extends BaseRankingStrategy {
  public readonly name: string;
  private metric: RankingMetric;

  constructor(metric: RankingMetric) {
    super();
    this.metric = metric;
    this.name = `Metric:${metric}`;
  }

  public compare(a: OptimizationResultItem, b: OptimizationResultItem): number {
    if (this.metric === 'maxDrawdown' || this.metric === 'maxDrawdownPercent') {
      const valA = (a.metrics as any)[this.metric] ?? 0;
      const valB = (b.metrics as any)[this.metric] ?? 0;
      return valA - valB;
    }
    const valA = (a.metrics as any)[this.metric] ?? 0;
    const valB = (b.metrics as any)[this.metric] ?? 0;
    return valB - valA;
  }
}
