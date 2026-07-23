import { OptimizationMode, ParameterRange, ParameterSet } from '../types/index.ts';

export class ParameterGenerator {
  /**
   * Generates all discrete values for a single parameter range
   */
  public static getValuesForRange(range: ParameterRange): any[] {
    if (range.type === 'CATEGORY') {
      return [...range.options];
    }

    const values: number[] = [];
    const precision = 1000000;
    const min = range.min;
    const max = range.max;
    const step = range.step;

    for (let current = min; current <= max + step / 1000; current += step) {
      const rounded = Math.round(current * precision) / precision;
      if (rounded <= max) {
        values.push(rounded);
      }
    }
    return values;
  }

  /**
   * Generates full grid space (Cartesian product)
   */
  public static generateGrid(ranges: ParameterRange[]): ParameterSet[] {
    if (ranges.length === 0) return [];

    let combinations: ParameterSet[] = [{}];

    for (const range of ranges) {
      const values = this.getValuesForRange(range);
      const newCombinations: ParameterSet[] = [];

      for (const comb of combinations) {
        for (const val of values) {
          newCombinations.push({
            ...comb,
            [range.name]: val,
          });
        }
      }

      combinations = newCombinations;
    }

    return combinations;
  }

  /**
   * Generates random search samples from parameter space using pseudo-random seed generator
   */
  public static generateRandomSearch(
    ranges: ParameterRange[],
    sampleCount: number,
    seed: number = 123456
  ): ParameterSet[] {
    if (ranges.length === 0 || sampleCount <= 0) return [];

    let currentSeed = seed;
    const lcg = () => {
      currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
      return currentSeed / 4294967296;
    };

    const results: ParameterSet[] = [];
    const grid = this.generateGrid(ranges);

    if (grid.length <= sampleCount) {
      return grid;
    }

    const copy = [...grid];
    for (let i = 0; i < sampleCount && copy.length > 0; i++) {
      const randIdx = Math.floor(lcg() * copy.length);
      results.push(copy.splice(randIdx, 1)[0]);
    }

    return results;
  }

  /**
   * Main entrypoint to generate parameter sets based on mode
   */
  public static generate(
    ranges: ParameterRange[],
    mode: OptimizationMode,
    sampleCount: number = 20,
    seed: number = 123456
  ): ParameterSet[] {
    if (mode === 'GRID_SEARCH') {
      return this.generateGrid(ranges);
    } else {
      return this.generateRandomSearch(ranges, sampleCount, seed);
    }
  }
}
