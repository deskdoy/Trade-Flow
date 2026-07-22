import { PositionData, PositionSide } from '@tradeflow/trading-domain';
import { SymbolExposure, TotalExposure } from '../types/index.ts';

export class ExposureCalculator {
  /**
   * Calculates gross and net exposures by symbol and in total across all open positions
   */
  public calculateExposures(openPositions: PositionData[]): TotalExposure {
    const symbolExposures = new Map<string, SymbolExposure>();
    let totalGross = 0;
    let totalNet = 0;

    for (const pos of openPositions) {
      if (!pos.isOpen) continue;

      const markPrice = pos.markPrice ?? pos.entryPrice;
      const positionValue = pos.quantity * markPrice;

      let exp = symbolExposures.get(pos.symbol);
      if (!exp) {
        exp = {
          symbol: pos.symbol,
          longExposure: 0,
          shortExposure: 0,
          netExposure: 0,
          grossExposure: 0,
        };
        symbolExposures.set(pos.symbol, exp);
      }

      if (pos.side === PositionSide.LONG) {
        exp.longExposure += positionValue;
      } else if (pos.side === PositionSide.SHORT) {
        exp.shortExposure += positionValue;
      }

      exp.netExposure = exp.longExposure - exp.shortExposure;
      exp.grossExposure = exp.longExposure + exp.shortExposure;
    }

    for (const exp of symbolExposures.values()) {
      totalGross += exp.grossExposure;
      totalNet += exp.netExposure;
    }

    return {
      totalGrossExposure: totalGross,
      totalNetExposure: totalNet,
      symbolExposures,
    };
  }
}
