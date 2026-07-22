import { PositionData } from '@tradeflow/trading-domain';
import { PaperAccountState, PaperOrderParams } from '@tradeflow/paper-trading';
import { RiskValidationResult } from '../types/index.ts';
import { MarginCalculator } from './MarginCalculator.ts';

export class MarginValidator {
  private marginCalculator: MarginCalculator = new MarginCalculator();

  /**
   * Validates if account has sufficient free margin for a prospective order
   */
  public validateOrderMargin(
    orderParams: PaperOrderParams,
    accountState: PaperAccountState,
    openPositions: PositionData[],
    leverage: number = 1
  ): RiskValidationResult {
    const reasons: string[] = [];
    const requiredMargin = this.marginCalculator.calculateOrderMargin(orderParams, leverage);
    const marginCalc = this.marginCalculator.calculateAccountMargin(accountState, openPositions);

    if (requiredMargin > marginCalc.freeMargin) {
      reasons.push(
        `Insufficient free margin: Order requires ${requiredMargin.toFixed(2)}, available free margin is ${marginCalc.freeMargin.toFixed(2)}.`
      );
    }

    return {
      approved: reasons.length === 0,
      reasons,
      metrics: {
        requiredMargin,
        freeMargin: marginCalc.freeMargin,
      },
    };
  }
}
