import { PositionData } from '@tradeflow/trading-domain';
import { PaperAccountState, PaperOrderParams } from '@tradeflow/paper-trading';
import { MarginCalculation } from '../types/index.ts';

export class MarginCalculator {
  /**
   * Calculates initial margin required for an order or position
   */
  public calculateInitialMargin(price: number, quantity: number, leverage: number = 1): number {
    if (leverage <= 0) return price * quantity;
    return (price * quantity) / leverage;
  }

  /**
   * Calculates maintenance margin for a position given maintenance margin percentage
   */
  public calculateMaintenanceMargin(
    position: PositionData,
    minMaintenanceMarginPct: number = 0.005
  ): number {
    if (!position.isOpen || position.quantity <= 0) return 0;
    const markPrice = position.markPrice ?? position.entryPrice;
    return markPrice * position.quantity * minMaintenanceMarginPct;
  }

  /**
   * Computes full account margin metrics
   */
  public calculateAccountMargin(
    accountState: PaperAccountState,
    openPositions: PositionData[],
    minMaintenanceMarginPct: number = 0.005
  ): MarginCalculation {
    let totalInitialMargin = 0;
    let totalMaintMargin = 0;

    for (const pos of openPositions) {
      if (!pos.isOpen) continue;
      const initial = this.calculateInitialMargin(pos.entryPrice, pos.quantity, pos.leverage || 1);
      const maint = this.calculateMaintenanceMargin(pos, minMaintenanceMarginPct);
      totalInitialMargin += initial;
      totalMaintMargin += maint;
    }

    const usedMargin = totalInitialMargin;
    const freeMargin = Math.max(0, accountState.equity - usedMargin);
    const marginLevelPct = usedMargin > 0 ? (accountState.equity / usedMargin) * 100 : Number.POSITIVE_INFINITY;

    return {
      initialMargin: totalInitialMargin,
      maintenanceMargin: totalMaintMargin,
      usedMargin,
      freeMargin,
      marginLevelPct,
    };
  }

  /**
   * Estimates required initial margin for a prospective paper order
   */
  public calculateOrderMargin(params: PaperOrderParams, defaultLeverage: number = 1): number {
    const price = params.price || 0;
    const quantity = params.quantity || 0;
    return this.calculateInitialMargin(price, quantity, defaultLeverage);
  }
}
