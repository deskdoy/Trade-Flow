import { PositionData } from '@tradeflow/trading-domain';
import { PaperAccountState, PaperOrderParams } from '@tradeflow/paper-trading';
import { RiskLimits, RiskValidationResult } from '../types/index.ts';
import { AccountRiskValidator } from './AccountRiskValidator.ts';
import { OrderRiskValidator } from './OrderRiskValidator.ts';

export class RiskValidator {
  private orderRiskValidator: OrderRiskValidator = new OrderRiskValidator();
  private accountRiskValidator: AccountRiskValidator = new AccountRiskValidator();

  /**
   * Complete risk check combining account state check and order specification check
   */
  public validate(
    orderParams: PaperOrderParams,
    accountState: PaperAccountState,
    initialBalance: number,
    openPositions: PositionData[],
    limits: RiskLimits,
    leverage: number = 1
  ): RiskValidationResult {
    const accResult = this.accountRiskValidator.validateAccount(
      accountState,
      initialBalance,
      openPositions,
      limits
    );

    const orderResult = this.orderRiskValidator.validateOrder(
      orderParams,
      accountState,
      openPositions,
      limits,
      leverage
    );

    const allReasons = [...accResult.reasons, ...orderResult.reasons];
    const approved = allReasons.length === 0;

    return {
      approved,
      reasons: allReasons,
      metrics: {
        ...accResult.metrics,
        ...orderResult.metrics,
      },
    };
  }
}
