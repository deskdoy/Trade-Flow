import { Candle } from "@tradeflow/shared";
import { Indicator, IndicatorPoint } from "../types/index.ts";

export class EMAIndicator implements Indicator {
  public readonly id: string;
  public readonly name = "Exponential Moving Average";
  public readonly type = "EMA";
  public readonly parameters: { period: number };

  constructor(id: string, parameters: { period: number }) {
    this.id = id;
    this.parameters = parameters;
  }

  public get shortName(): string {
    return `EMA (${this.parameters.period})`;
  }

  public calculate(candles: Candle[]): IndicatorPoint[] {
    const period = this.parameters.period;
    if (candles.length < period || period <= 0) {
      return [];
    }

    const results: IndicatorPoint[] = [];

    // 1. Compute the SMA for the initial value
    let initialSum = 0;
    for (let i = 0; i < period; i++) {
      initialSum += candles[i].close;
    }
    let currentEma = initialSum / period;

    results.push({
      time: candles[period - 1].time,
      value: parseFloat(currentEma.toFixed(2)),
    });

    // 2. Compute the rest using the EMA recurrence relation
    const k = 2 / (period + 1); // multiplier

    for (let i = period; i < candles.length; i++) {
      currentEma = candles[i].close * k + currentEma * (1 - k);
      results.push({
        time: candles[i].time,
        value: parseFloat(currentEma.toFixed(2)),
      });
    }

    return results;
  }
}
