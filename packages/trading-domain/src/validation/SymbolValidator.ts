import { SymbolConfig, ValidationError, ValidationResult } from '../types/index.ts';

export class SymbolValidator {
  public validate(symbol: Partial<SymbolConfig>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!symbol.id || typeof symbol.id !== 'string' || symbol.id.trim() === '') {
      errors.push({ field: 'id', message: 'Symbol ID is required' });
    }

    if (!symbol.baseAsset || typeof symbol.baseAsset !== 'string' || symbol.baseAsset.trim() === '') {
      errors.push({ field: 'baseAsset', message: 'Base asset is required' });
    }

    if (!symbol.quoteAsset || typeof symbol.quoteAsset !== 'string' || symbol.quoteAsset.trim() === '') {
      errors.push({ field: 'quoteAsset', message: 'Quote asset is required' });
    }

    if (
      typeof symbol.pricePrecision !== 'number' ||
      !Number.isInteger(symbol.pricePrecision) ||
      symbol.pricePrecision < 0
    ) {
      errors.push({ field: 'pricePrecision', message: 'Price precision must be a non-negative integer' });
    }

    if (
      typeof symbol.quantityPrecision !== 'number' ||
      !Number.isInteger(symbol.quantityPrecision) ||
      symbol.quantityPrecision < 0
    ) {
      errors.push({ field: 'quantityPrecision', message: 'Quantity precision must be a non-negative integer' });
    }

    if (typeof symbol.minQuantity !== 'number' || !isFinite(symbol.minQuantity) || symbol.minQuantity <= 0) {
      errors.push({ field: 'minQuantity', message: 'minQuantity must be a positive number' });
    }

    if (
      typeof symbol.maxQuantity !== 'number' ||
      !isFinite(symbol.maxQuantity) ||
      (typeof symbol.minQuantity === 'number' && symbol.maxQuantity < symbol.minQuantity)
    ) {
      errors.push({ field: 'maxQuantity', message: 'maxQuantity must be greater than or equal to minQuantity' });
    }

    if (typeof symbol.stepSize !== 'number' || !isFinite(symbol.stepSize) || symbol.stepSize <= 0) {
      errors.push({ field: 'stepSize', message: 'stepSize must be a positive number' });
    }

    if (typeof symbol.minNotional !== 'number' || !isFinite(symbol.minNotional) || symbol.minNotional < 0) {
      errors.push({ field: 'minNotional', message: 'minNotional must be a non-negative number' });
    }

    if (!symbol.status || !['TRADING', 'HALTED', 'BREAK'].includes(symbol.status)) {
      errors.push({ field: 'status', message: 'Status must be one of TRADING, HALTED, or BREAK' });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
