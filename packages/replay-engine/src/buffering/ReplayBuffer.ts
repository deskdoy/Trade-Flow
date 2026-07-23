import { Candle } from '@tradeflow/shared';

export class ReplayBuffer {
  private buffer: Candle[] = [];
  private _capacity: number;

  constructor(capacity: number = 1000) {
    this._capacity = Math.max(1, capacity);
  }

  public get capacity(): number {
    return this._capacity;
  }

  public setCapacity(capacity: number): void {
    this._capacity = Math.max(1, capacity);
    if (this.buffer.length > this._capacity) {
      this.buffer = this.buffer.slice(this.buffer.length - this._capacity);
    }
  }

  public push(candle: Candle): void {
    this.buffer.push(candle);
    if (this.buffer.length > this._capacity) {
      this.buffer.shift();
    }
  }

  public pop(): Candle | undefined {
    return this.buffer.pop();
  }

  public peekLast(): Candle | undefined {
    if (this.buffer.length === 0) return undefined;
    return this.buffer[this.buffer.length - 1];
  }

  public getHistory(): readonly Candle[] {
    return this.buffer;
  }

  public clear(): void {
    this.buffer = [];
  }

  public size(): number {
    return this.buffer.length;
  }
}
