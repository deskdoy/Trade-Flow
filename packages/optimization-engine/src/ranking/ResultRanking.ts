import { OptimizationResultItem, RankingMetric } from '../types/index.ts';
import {
  CustomRankingStrategy,
  MetricRankingStrategy,
  RankingStrategy,
} from './RankingStrategy.ts';

export type CustomComparator = (a: OptimizationResultItem, b: OptimizationResultItem) => number;

export class ResultRanking {
  /**
   * Ranks optimization items in descending order of performance using a strategy or metric
   */
  public static rank(
    results: OptimizationResultItem[],
    strategyOrMetric: RankingStrategy | RankingMetric = 'netProfit',
    customComparator?: CustomComparator
  ): OptimizationResultItem[] {
    let strategy: RankingStrategy;

    if (customComparator) {
      strategy = new CustomRankingStrategy('Custom', customComparator);
    } else if (typeof strategyOrMetric === 'string') {
      strategy = new MetricRankingStrategy(strategyOrMetric);
    } else {
      strategy = strategyOrMetric;
    }

    return strategy.rank(results);
  }
}
