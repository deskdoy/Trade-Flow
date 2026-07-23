import { Candle } from '@tradeflow/shared';
import { ValidationError, ValidationResult } from '@tradeflow/trading-domain';

export class HistoricalDataset {
  private candles: Candle[] = [];

  /**
   * Loads a candle dataset into memory
   */
  public load(candles: Candle[]): void {
    if (!candles) {
      throw new Error('Candle dataset cannot be null or undefined');
    }
    this.candles = candles;
  }

  /**
   * Validates dataset integrity and chronological order
   */
  public validate(): ValidationResult {
    const errors: ValidationError[] = [];

    if (!this.candles || this.candles.length === 0) {
      errors.push({ field: 'candles', message: 'Dataset is empty' });
      return { valid: false, errors };
    }

    for (let i = 0; i < this.candles.length; i++) {
      const candle = this.candles[i];

      if (!candle.time) {
        errors.push({ field: `candles[${i}].time`, message: 'Missing time stamp' });
      }

      if (
        typeof candle.open !== 'number' ||
        typeof candle.high !== 'number' ||
        typeof candle.low !== 'number' ||
        typeof candle.close !== 'number'
      ) {
        errors.push({ field: `candles[${i}]`, message: 'Invalid or non-numeric OHLC price data' });
      }

      if (candle.low > candle.high) {
        errors.push({
          field: `candles[${i}]`,
          message: `Low price (${candle.low}) is greater than High price (${candle.high})`,
        });
      }

      if (i > 0) {
        const prevTime = new Date(this.candles[i - 1].time).getTime();
        const currTime = new Date(candle.time).getTime();
        if (currTime < prevTime) {
          errors.push({
            field: `candles[${i}].time`,
            message: `Chronological sequence error at index ${i}: ${candle.time} comes before ${this.candles[i - 1].time}`,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Returns total candle count
   */
  public length(): number {
    return this.candles.length;
  }

  /**
   * Returns candle at specified index without array copying
   */
  public get(index: number): Candle | undefined {
    if (index < 0 || index >= this.candles.length) {
      return undefined;
    }
    return this.candles[index];
  }

  /**
   * Returns range slice of candles [startIdx, endIdx) efficiently
   */
  public range(startIdx: number, endIdx: number): ReadonlyArray<Candle> {
    const start = Math.max(0, startIdx);
    const end = Math.min(this.candles.length, endIdx);
    return this.candles.slice(start, end);
  }

  /**
   * Returns reference to underlying candle array for performance-critical evaluation
   */
  public getAll(): ReadonlyArray<Candle> {
    return this.candles;
  }

  /**
   * Clears historical candles
   */
  public clear(): void {
    this.candles = [];
  }
}
