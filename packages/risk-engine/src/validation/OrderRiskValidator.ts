import { OrderType, PositionData, PositionSide } from '@tradeflow/trading-domain';
import { PaperAccountState, PaperOrderParams } from '@tradeflow/paper-trading';
import { ExposureCalculator } from '../exposure/ExposureCalculator.ts';
import { MarginCalculator } from '../margin/MarginCalculator.ts';
import { RiskLimits, RiskValidationResult } from '../types/index.ts';

export class OrderRiskValidator {
  private marginCalculator: MarginCalculator = new MarginCalculator();
  private exposureCalculator: ExposureCalculator = new ExposureCalculator();

  /**
   * Validates a proposed order against risk limits and account state
   */
  public validateOrder(
    orderParams: PaperOrderParams,
    accountState: PaperAccountState,
    openPositions: PositionData[],
    limits: RiskLimits,
    leverage: number = 1
  ): RiskValidationResult {
    const reasons: string[] = [];

    // 1. Basic validation
    if (!orderParams.quantity || orderParams.quantity <= 0) {
      reasons.push('Order quantity must be greater than zero.');
    }

    let orderPrice = orderParams.price || orderParams.stopPrice || 0;
    if (orderPrice <= 0) {
      const pos = openPositions.find((p) => p.symbol === orderParams.symbol && p.isOpen);
      if (pos) {
        orderPrice = pos.markPrice || pos.entryPrice || 0;
      }
    }

    if (orderPrice <= 0 && orderParams.type !== OrderType.MARKET) {
      reasons.push('Order price or stop price must be greater than zero for risk validation.');
    }

    // 2. Margin check
    const requiredMargin = this.marginCalculator.calculateOrderMargin(orderParams, leverage);
    const accountMargin = this.marginCalculator.calculateAccountMargin(accountState, openPositions, limits.minMaintenanceMarginPct);

    if (requiredMargin > accountMargin.freeMargin) {
      reasons.push(
        `Insufficient free margin. Required: ${requiredMargin.toFixed(2)}, Available: ${accountMargin.freeMargin.toFixed(2)}.`
      );
    }

    // 3. Leverage check
    if (leverage > limits.maxLeverage) {
      reasons.push(`Requested leverage (${leverage}x) exceeds maximum allowed leverage (${limits.maxLeverage}x).`);
    }

    // 4. Exposure checks
    const orderValue = orderParams.quantity * orderPrice;
    const exposures = this.exposureCalculator.calculateExposures(openPositions);

    const symbolExp = exposures.symbolExposures.get(orderParams.symbol);
    const currentSymbolGross = symbolExp ? symbolExp.grossExposure : 0;
    const newSymbolGross = currentSymbolGross + orderValue;

    if (newSymbolGross > limits.maxSymbolExposure) {
      reasons.push(
        `Symbol exposure limit exceeded for ${orderParams.symbol}. New: ${newSymbolGross.toFixed(2)}, Max: ${limits.maxSymbolExposure.toFixed(2)}.`
      );
    }

    const newTotalGross = exposures.totalGrossExposure + orderValue;
    if (newTotalGross > limits.maxAccountExposure) {
      reasons.push(
        `Account total gross exposure limit exceeded. New: ${newTotalGross.toFixed(2)}, Max: ${limits.maxAccountExposure.toFixed(2)}.`
      );
    }

    // 5. Max open positions check
    if (limits.maxOpenPositions !== undefined && limits.maxOpenPositions > 0) {
      const hasExistingPosition = openPositions.some((p) => p.symbol === orderParams.symbol && p.isOpen);
      if (!hasExistingPosition && openPositions.filter((p) => p.isOpen).length >= limits.maxOpenPositions) {
        reasons.push(`Maximum open positions limit (${limits.maxOpenPositions}) reached.`);
      }
    }

    return {
      approved: reasons.length === 0,
      reasons,
      metrics: {
        requiredMargin,
        freeMargin: accountMargin.freeMargin,
        newExposure: newTotalGross,
        maxExposure: limits.maxAccountExposure,
        effectiveLeverage: leverage,
        maxLeverage: limits.maxLeverage,
      },
    };
  }
}
