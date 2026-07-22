import { PositionData } from '@tradeflow/trading-domain';
import { PaperAccountState } from '@tradeflow/paper-trading';
import { MarginCalculator } from '../margin/MarginCalculator.ts';
import { RiskLimits, RiskValidationResult } from '../types/index.ts';

export class AccountRiskValidator {
  private marginCalculator: MarginCalculator = new MarginCalculator();

  /**
   * Validates account solvency, drawdown, and margin health
   */
  public validateAccount(
    accountState: PaperAccountState,
    initialBalance: number,
    openPositions: PositionData[],
    limits: RiskLimits
  ): RiskValidationResult {
    const reasons: string[] = [];

    // 1. Solvency check
    if (accountState.equity <= 0) {
      reasons.push('Account equity is non-positive (insolvent).');
    }

    // 2. Max drawdown check
    if (initialBalance > 0) {
      const drawdownPct = ((initialBalance - accountState.equity) / initialBalance) * 100;
      if (drawdownPct > limits.maxDrawdownPct) {
        reasons.push(
          `Max drawdown exceeded: Current drawdown is ${drawdownPct.toFixed(2)}%, max allowed is ${limits.maxDrawdownPct}%.`
        );
      }
    }

    // 3. Margin level check
    const marginCalc = this.marginCalculator.calculateAccountMargin(
      accountState,
      openPositions,
      limits.minMaintenanceMarginPct
    );

    if (marginCalc.usedMargin > 0 && marginCalc.marginLevelPct < 100) {
      reasons.push(
        `Critical margin level warning: Margin level is ${marginCalc.marginLevelPct.toFixed(2)}%, below 100%.`
      );
    }

    return {
      approved: reasons.length === 0,
      reasons,
      metrics: {
        freeMargin: marginCalc.freeMargin,
      },
    };
  }
}
