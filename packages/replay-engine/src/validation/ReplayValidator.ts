import { Candle } from '@tradeflow/shared';
import { ReplayDatasetValidationResult } from '../types/index.ts';

export class ReplayValidator {
  public static validate(candles: Candle[]): ReplayDatasetValidationResult {
    const errors: string[] = [];

    if (!Array.isArray(candles)) {
      return { valid: false, errors: ['Dataset must be an array'] };
    }

    if (candles.length === 0) {
      return { valid: true, errors: [] };
    }

    let previousTime = -Infinity;

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i];
      if (!c) {
        errors.push(`Candle at index ${i} is null or undefined`);
        continue;
      }

      if (c.open === undefined || typeof c.open !== 'number' || isNaN(c.open)) {
        errors.push(`Candle at index ${i} has invalid open price`);
      }
      if (c.high === undefined || typeof c.high !== 'number' || isNaN(c.high)) {
        errors.push(`Candle at index ${i} has invalid high price`);
      }
      if (c.low === undefined || typeof c.low !== 'number' || isNaN(c.low)) {
        errors.push(`Candle at index ${i} has invalid low price`);
      }
      if (c.close === undefined || typeof c.close !== 'number' || isNaN(c.close)) {
        errors.push(`Candle at index ${i} has invalid close price`);
      }

      if (c.high < c.low) {
        errors.push(`Candle at index ${i} high (${c.high}) is lower than low (${c.low})`);
      }

      const rawTime = c.time ?? (c as any).timestamp;
      if (!rawTime) {
        errors.push(`Candle at index ${i} missing timestamp/time`);
      } else {
        const timeMs = typeof rawTime === 'number' ? rawTime : Date.parse(String(rawTime));
        if (isNaN(timeMs)) {
          errors.push(`Candle at index ${i} has unparseable time '${rawTime}'`);
        } else if (timeMs < previousTime) {
          errors.push(`Candle at index ${i} time is out of chronological order`);
        } else {
          previousTime = timeMs;
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
