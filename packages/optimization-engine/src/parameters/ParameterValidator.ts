import { ParameterRange } from '../types/index.ts';

export class ParameterValidator {
  public static validateRange(range: ParameterRange): { valid: boolean; error?: string } {
    if (!range.name || range.name.trim().length === 0) {
      return { valid: false, error: 'Parameter name is required' };
    }

    if (range.type === 'NUMBER') {
      if (typeof range.min !== 'number' || typeof range.max !== 'number') {
        return { valid: false, error: `Parameter ${range.name} must have numeric min and max` };
      }
      if (range.min > range.max) {
        return { valid: false, error: `Parameter ${range.name} min (${range.min}) cannot exceed max (${range.max})` };
      }
      if (typeof range.step !== 'number' || range.step <= 0) {
        return { valid: false, error: `Parameter ${range.name} step must be greater than 0` };
      }
    } else if (range.type === 'CATEGORY') {
      if (!Array.isArray(range.options) || range.options.length === 0) {
        return { valid: false, error: `Parameter ${range.name} must have at least one categorical option` };
      }
    } else {
      return { valid: false, error: `Parameter ${(range as any).name} has unknown type` };
    }

    return { valid: true };
  }

  public static validateSpace(ranges: ParameterRange[]): { valid: boolean; error?: string } {
    if (!ranges || ranges.length === 0) {
      return { valid: false, error: 'Parameter space cannot be empty' };
    }

    const names = new Set<string>();
    for (const range of ranges) {
      if (names.has(range.name)) {
        return { valid: false, error: `Duplicate parameter name: ${range.name}` };
      }
      names.add(range.name);

      const val = this.validateRange(range);
      if (!val.valid) return val;
    }

    return { valid: true };
  }
}
