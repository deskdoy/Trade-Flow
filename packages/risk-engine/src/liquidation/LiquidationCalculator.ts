import { PositionData, PositionSide } from '@tradeflow/trading-domain';
import { LiquidationInfo } from '../types/index.ts';

export class LiquidationCalculator {
  /**
   * Calculates liquidation price for a position
   * Long: EntryPrice * (1 - 1 / Leverage) / (1 - MaintenanceMarginPct)
   * Short: EntryPrice * (1 + 1 / Leverage) / (1 + MaintenanceMarginPct)
   */
  public calculateLiquidationPrice(
    side: PositionSide,
    entryPrice: number,
    leverage: number,
    minMaintenanceMarginPct: number = 0.005
  ): number {
    if (entryPrice <= 0 || leverage <= 0) return 0;

    if (side === PositionSide.LONG) {
      const numerator = entryPrice * (1 - 1 / leverage);
      const denominator = 1 - minMaintenanceMarginPct;
      return Math.max(0, numerator / denominator);
    }

    if (side === PositionSide.SHORT) {
      const numerator = entryPrice * (1 + 1 / leverage);
      const denominator = 1 + minMaintenanceMarginPct;
      return Math.max(0, numerator / denominator);
    }

    return 0;
  }

  /**
   * Evaluates liquidation metrics for an open position
   */
  public evaluatePositionLiquidation(
    position: PositionData,
    minMaintenanceMarginPct: number = 0.005
  ): LiquidationInfo {
    const markPrice = position.markPrice ?? position.entryPrice;
    const leverage = position.leverage || 1;

    const liquidationPrice = this.calculateLiquidationPrice(
      position.side,
      position.entryPrice,
      leverage,
      minMaintenanceMarginPct
    );

    const distanceToLiquidation = Math.abs(markPrice - liquidationPrice);
    const distanceToLiquidationPct = markPrice > 0 ? (distanceToLiquidation / markPrice) * 100 : 0;

    return {
      symbol: position.symbol,
      side: position.side,
      entryPrice: position.entryPrice,
      liquidationPrice,
      distanceToLiquidation,
      distanceToLiquidationPct,
    };
  }
}
