import { MarginMode, PositionSide } from '../enums/index.ts';
import { PositionData, ValidationError, ValidationResult } from '../types/index.ts';

export class PositionValidator {
  public validate(position: Partial<PositionData>): ValidationResult {
    const errors: ValidationError[] = [];

    if (!position.id || typeof position.id !== 'string' || position.id.trim() === '') {
      errors.push({ field: 'id', message: 'Position ID is required' });
    }

    if (!position.symbol || typeof position.symbol !== 'string' || position.symbol.trim() === '') {
      errors.push({ field: 'symbol', message: 'Symbol is required' });
    }

    if (!position.side || !Object.values(PositionSide).includes(position.side)) {
      errors.push({ field: 'side', message: `Invalid position side: ${String(position.side)}` });
    }

    if (typeof position.quantity !== 'number' || !isFinite(position.quantity) || position.quantity < 0) {
      errors.push({ field: 'quantity', message: 'Quantity must be a non-negative finite number' });
    }

    if (typeof position.entryPrice !== 'number' || !isFinite(position.entryPrice) || position.entryPrice < 0) {
      errors.push({ field: 'entryPrice', message: 'Entry price must be a non-negative finite number' });
    }

    if (typeof position.leverage !== 'number' || !isFinite(position.leverage) || position.leverage < 1) {
      errors.push({ field: 'leverage', message: 'Leverage must be a finite number greater than or equal to 1' });
    }

    if (position.marginMode && !Object.values(MarginMode).includes(position.marginMode)) {
      errors.push({ field: 'marginMode', message: `Invalid margin mode: ${String(position.marginMode)}` });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
