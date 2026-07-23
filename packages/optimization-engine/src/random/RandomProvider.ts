export interface RandomProvider {
  next(): number;
  reset(seed?: number): void;
}

export class SeededRandomProvider implements RandomProvider {
  private seed: number;
  private current: number;

  constructor(seed: number = 123456) {
    this.seed = seed;
    this.current = seed;
  }

  public next(): number {
    this.current = (this.current * 1664525 + 1013904223) % 4294967296;
    return this.current / 4294967296;
  }

  public reset(seed?: number): void {
    if (seed !== undefined) {
      this.seed = seed;
    }
    this.current = this.seed;
  }
}
