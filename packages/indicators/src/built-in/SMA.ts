import { Candle } from "@tradeflow/shared";
import { Indicator, IndicatorPoint } from "../types/index.ts";

export class SMAIndicator implements Indicator {
  public readonly id: string;
  public readonly name = "Simple Moving Average";
  public readonly type = "SMA";
  public readonly parameters: { period: number };

  constructor(id: string, parameters: { period: number }) {
    this.id = id;
    this.parameters = parameters;
  }

  public get shortName(): string {
    return `SMA (${this.parameters.period})`;
  }

  public calculate(candles: Candle[]): IndicatorPoint[] {
    const period = this.parameters.period;
    if (candles.length < period || period <= 0) {
      return [];
    }

    const results: IndicatorPoint[] = [];

    for (let i = period - 1; i < candles.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close;
      }
      const avg = sum / period;
      results.push({
        time: candles[i].time,
        value: parseFloat(avg.toFixed(2)),
      });
    }

    return results;
  }
}
