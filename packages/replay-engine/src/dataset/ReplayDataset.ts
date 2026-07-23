import { Candle } from '@tradeflow/shared';
import { ReplayDatasetValidationResult } from '../types/index.ts';
import { ReplayValidator } from '../validation/ReplayValidator.ts';

export class ReplayDataset {
  private candles: Candle[] = [];
  private _hash: string = 'empty-dataset';

  public load(candles: Candle[]): void {
    if (!candles || !Array.isArray(candles)) {
      this.candles = [];
      this._hash = 'empty-dataset';
      return;
    }

    this.candles = candles;
    this._hash = this.generateHash(candles);
  }

  public validate(): ReplayDatasetValidationResult {
    return ReplayValidator.validate(this.candles);
  }

  public count(): number {
    return this.candles.length;
  }

  public get(index: number): Candle | undefined {
    if (index < 0 || index >= this.candles.length) {
      return undefined;
    }
    return this.candles[index];
  }

  public range(start: number, end: number): Candle[] {
    if (this.candles.length === 0) return [];
    const s = Math.max(0, start);
    const e = Math.min(this.candles.length, end);
    if (s >= e) return [];
    return this.candles.slice(s, e);
  }

  public getFirst(): Candle | undefined {
    return this.candles[0];
  }

  public getLast(): Candle | undefined {
    if (this.candles.length === 0) return undefined;
    return this.candles[this.candles.length - 1];
  }

  public get datasetHash(): string {
    return this._hash;
  }

  public getDatasetHash(): string {
    return this._hash;
  }

  public getRawCandles(): readonly Candle[] {
    return this.candles;
  }

  private generateHash(candles: Candle[]): string {
    if (!candles || candles.length === 0) {
      return 'empty-dataset';
    }

    const first = candles[0];
    const last = candles[candles.length - 1];
    const firstAny = first as any;
    const lastAny = last as any;

    const symbol = firstAny.symbol ?? 'UNKNOWN';
    const timeframe = firstAny.timeframe ?? '1h';
    const count = candles.length;
    const startTime = first.time || firstAny.timestamp || '';
    const endTime = last.time || lastAny.timestamp || '';
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
