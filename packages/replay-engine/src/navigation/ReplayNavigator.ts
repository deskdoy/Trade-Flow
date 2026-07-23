import { ReplayClock } from '../timeline/ReplayClock.ts';
import { ReplayDataset } from '../dataset/ReplayDataset.ts';

export class ReplayNavigator {
  private dataset: ReplayDataset;
  private clock: ReplayClock;

  constructor(dataset: ReplayDataset, clock: ReplayClock) {
    this.dataset = dataset;
    this.clock = clock;
  }

  public goToBeginning(): number {
    return this.clock.seek(0);
  }

  public goToEnd(): number {
    const total = this.dataset.count();
    if (total === 0) return -1;
    return this.clock.seek(total - 1);
  }

  public goToIndex(index: number): number {
    return this.clock.seek(index);
  }

  public goToDate(date: string | Date): number {
    const total = this.dataset.count();
    if (total === 0) return -1;

    const targetMs = typeof date === 'string' ? Date.parse(date) : date.getTime();
    if (isNaN(targetMs)) return this.clock.getCurrentIndex();

    // Binary search to find closest candle timestamp
    let low = 0;
    let high = total - 1;
    let closestIndex = 0;
    let minDiff = Infinity;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const candle = this.dataset.get(mid);
      if (!candle) break;

      const rawTime = candle.time ?? (candle as any).timestamp;
      const candleMs = typeof rawTime === 'number' ? rawTime : Date.parse(String(rawTime));

      const diff = Math.abs(candleMs - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestIndex = mid;
      }

      if (candleMs === targetMs) {
        closestIndex = mid;
        break;
      } else if (candleMs < targetMs) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return this.clock.seek(closestIndex);
  }

  public nextTrade(tradeIndices?: number[]): number {
    const currentIndex = this.clock.getCurrentIndex();
    if (tradeIndices && tradeIndices.length > 0) {
      const nextIdx = tradeIndices.find((idx) => idx > currentIndex);
      if (nextIdx !== undefined) {
        return this.clock.seek(nextIdx);
      }
    }
    // Fallback to next step
    return this.clock.step();
  }

  public previousTrade(tradeIndices?: number[]): number {
    const currentIndex = this.clock.getCurrentIndex();
    if (tradeIndices && tradeIndices.length > 0) {
      const reversed = [...tradeIndices].reverse();
      const prevIdx = reversed.find((idx) => idx < currentIndex);
      if (prevIdx !== undefined) {
        return this.clock.seek(prevIdx);
      }
    }
    // Fallback to step back
    return this.clock.stepBack();
  }
}
