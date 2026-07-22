import { PositionSide } from '@tradeflow/trading-domain';

export class RealizedPnL {
  /**
   * Calculates realized PnL for closing or reducing a position
   */
  public static calculate(
    side: PositionSide,
    entryPrice: number,
    exitPrice: number,
    closedQuantity: number
  ): number {
    if (closedQuantity <= 0) {
      return 0;
    }

    if (side === PositionSide.LONG) {
      return (exitPrice - entryPrice) * closedQuantity;
    }

    if (side === PositionSide.SHORT) {
      return (entryPrice - exitPrice) * closedQuantity;
    }

    return 0;
  }
}
