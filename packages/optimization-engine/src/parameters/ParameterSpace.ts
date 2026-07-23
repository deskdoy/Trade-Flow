import { ParameterRange } from '../types/index.ts';

export class ParameterSpace {
  private ranges: ParameterRange[] = [];

  constructor(ranges: ParameterRange[] = []) {
    this.ranges = [...ranges];
  }

  public addRange(range: ParameterRange): void {
    this.ranges.push(range);
  }

  public getRanges(): ReadonlyArray<ParameterRange> {
    return this.ranges;
  }

  public clear(): void {
    this.ranges = [];
  }
}
