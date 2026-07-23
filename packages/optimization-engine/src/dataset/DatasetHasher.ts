import { Candle } from '@tradeflow/shared';

export class DatasetHasher {
  /**
   * Generates a deterministic hash identifier based on dataset metadata and candles
   */
  public static hash(dataset: Candle[]): string {
    if (!dataset || dataset.length === 0) {
      return 'empty-dataset';
    }

    const first = dataset[0];
    const last = dataset[dataset.length - 1];
    const firstAny = first as any;
    const lastAny = last as any;
    const symbol = firstAny.symbol ?? 'UNKNOWN';
    const timeframe = firstAny.timeframe ?? '1h';
    const count = dataset.length;
    const startTime = firstAny.timestamp || first.time || '';
    const endTime = lastAny.timestamp || last.time || '';
    const startClose = first.close;
    const endClose = last.close;

    const rawString = `${symbol}:${timeframe}:${count}:${startTime}:${endTime}:${startClose}:${endClose}`;

    let hash = 2166136261;
    for (let i = 0; i < rawString.length; i++) {
      hash ^= rawString.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0).toString(16).padStart(8, '0');
  }
}
