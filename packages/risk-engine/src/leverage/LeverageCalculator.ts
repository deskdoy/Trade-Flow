import { PositionData } from '@tradeflow/trading-domain';
import { PaperAccountState } from '@tradeflow/paper-trading';
import { LeverageInfo } from '../types/index.ts';

export class LeverageCalculator {
  /**
   * Calculates effective leverage based on total gross position exposure and account equity
   */
  public calculateEffectiveLeverage(
    accountState: PaperAccountState,
    openPositions: PositionData[]
  ): number {
    if (accountState.equity <= 0) return 0;

    let totalExposure = 0;
    for (const pos of openPositions) {
      if (!pos.isOpen) continue;
      const markPrice = pos.markPrice ?? pos.entryPrice;
      totalExposure += pos.quantity * markPrice;
    }

    return totalExposure / accountState.equity;
  }

  /**
   * Evaluates effective leverage against maximum allowed leverage
   */
  public evaluateLeverage(
    accountState: PaperAccountState,
    openPositions: PositionData[],
    maxAllowedLeverage: number
  ): LeverageInfo {
    const effectiveLeverage = this.calculateEffectiveLeverage(accountState, openPositions);
    const isLeverageAllowed = effectiveLeverage <= maxAllowedLeverage;

    return {
      effectiveLeverage,
      maxAllowedLeverage,
      isLeverageAllowed,
    };
  }
}
