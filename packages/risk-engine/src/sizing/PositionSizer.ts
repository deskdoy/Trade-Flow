import { PositionSizingParams, PositionSizingResult } from '../types/index.ts';
import { RiskPerTrade } from './RiskPerTrade.ts';

export class PositionSizer {
  private riskPerTrade: RiskPerTrade = new RiskPerTrade();

  /**
   * Calculates recommended position size and verifies feasibility against balance and margin
   */
  public calculatePositionSize(params: PositionSizingParams): PositionSizingResult {
    const { accountBalance, riskPercentage, entryPrice, stopLossPrice, leverage = 1 } = params;

    if (entryPrice <= 0) {
      return {
        recommendedQuantity: 0,
        riskAmount: 0,
        positionValue: 0,
        initialMarginRequired: 0,
        isFeasible: false,
        reason: 'Entry price must be greater than zero.',
      };
    }

    if (stopLossPrice <= 0 || stopLossPrice === entryPrice) {
      return {
        recommendedQuantity: 0,
        riskAmount: 0,
        positionValue: 0,
        initialMarginRequired: 0,
        isFeasible: false,
        reason: 'Stop loss price must be positive and different from entry price.',
      };
    }

    const riskAmount = this.riskPerTrade.calculateRiskAmount(accountBalance, riskPercentage);
    const recommendedQuantity = this.riskPerTrade.calculateQuantityByRisk(
      accountBalance,
      riskPercentage,
      entryPrice,
      stopLossPrice
    );

    const positionValue = recommendedQuantity * entryPrice;
    const initialMarginRequired = leverage > 0 ? positionValue / leverage : positionValue;
    const isFeasible = initialMarginRequired <= accountBalance;

    return {
      recommendedQuantity,
      riskAmount,
      positionValue,
      initialMarginRequired,
      isFeasible,
      reason: isFeasible
        ? undefined
        : `Initial margin required (${initialMarginRequired.toFixed(2)}) exceeds account balance (${accountBalance.toFixed(2)}).`,
    };
  }
}
