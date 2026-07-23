import { OptimizationResultItem, RankingMetric } from '../types/index.ts';

export type CustomComparator = (a: OptimizationResultItem, b: OptimizationResultItem) => number;

export class ResultRanking {
  /**
   * Ranks optimization items in descending order of performance
   */
  public static rank(
    results: OptimizationResultItem[],
    metric: RankingMetric = 'netProfit',
    customComparator?: CustomComparator
  ): OptimizationResultItem[] {
    const copy = [...results];

    const comparator = customComparator ?? this.getDefaultComparator(metric);

    copy.sort(comparator);

    return copy.map((item, index) => ({
      ...item,
      rank: index + 1,
    }));
  }

  private static getDefaultComparator(metric: RankingMetric): CustomComparator {
    return (a, b) => {
      if (metric === 'maxDrawdown' || metric === 'maxDrawdownPercent') {
        return a.metrics[metric] - b.metrics[metric];
      }

      const valA = (a.metrics as any)[metric] ?? 0;
      const valB = (b.metrics as any)[metric] ?? 0;
      return valB - valA;
    };
  }
}
