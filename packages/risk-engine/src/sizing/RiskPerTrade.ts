export class RiskPerTrade {
  /**
   * Calculates total monetary risk amount based on balance and risk percentage
   */
  public calculateRiskAmount(accountBalance: number, riskPercentage: number): number {
    if (accountBalance <= 0 || riskPercentage <= 0) return 0;
    return accountBalance * (riskPercentage / 100);
  }

  /**
   * Calculates maximum recommended position quantity based on entry price and stop loss price
   */
  public calculateQuantityByRisk(
    accountBalance: number,
    riskPercentage: number,
    entryPrice: number,
    stopLossPrice: number
  ): number {
    const riskAmount = this.calculateRiskAmount(accountBalance, riskPercentage);
    const priceRisk = Math.abs(entryPrice - stopLossPrice);

    if (riskAmount <= 0 || priceRisk <= 0) return 0;

    return riskAmount / priceRisk;
  }
}
