import { ValidationError, ValidationResult } from '@tradeflow/trading-domain';
import { StrategyContext } from '../context/StrategyContext.ts';
import { Strategy } from '../types/index.ts';

export class StrategyValidator {
  /**
   * Validates strategy metadata registration
   */
  public static validateRegistration(
    strategy: Strategy,
    existingIds: Set<string>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!strategy) {
      errors.push({ field: 'strategy', message: 'Strategy instance cannot be null or undefined' });
      return { valid: false, errors };
    }

    const { metadata } = strategy;
    if (!metadata) {
      errors.push({ field: 'metadata', message: 'Strategy must include metadata' });
      return { valid: false, errors };
    }

    if (!metadata.id || metadata.id.trim() === '') {
      errors.push({ field: 'metadata.id', message: 'Strategy metadata must include a non-empty id' });
    } else if (existingIds.has(metadata.id)) {
      errors.push({
        field: 'metadata.id',
        message: `Duplicate strategy ID "${metadata.id}" already registered`,
      });
    }

    if (!metadata.name || metadata.name.trim() === '') {
      errors.push({ field: 'metadata.name', message: 'Strategy metadata must include a name' });
    }

    if (!metadata.version || metadata.version.trim() === '') {
      errors.push({ field: 'metadata.version', message: 'Strategy metadata must include a version' });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates strategy evaluation against context
   */
  public static validateEvaluationContext(
    strategy: Strategy,
    context: StrategyContext
  ): ValidationResult {
    const errors: ValidationError[] = [];

    if (!strategy.isEnabled) {
      errors.push({
        field: 'isEnabled',
        message: `Strategy "${strategy.metadata.id}" is disabled`,
      });
    }

    if (!context) {
      errors.push({ field: 'context', message: 'Evaluation context is missing' });
      return { valid: false, errors };
    }

    if (!context.symbol || context.symbol.trim() === '') {
      errors.push({ field: 'context.symbol', message: 'Context must specify a valid symbol' });
    }

    const { supportedSymbols, supportedTimeframes } = strategy.metadata;

    if (supportedSymbols && supportedSymbols.length > 0 && context.symbol) {
      if (!supportedSymbols.includes(context.symbol)) {
        errors.push({
          field: 'context.symbol',
          message: `Symbol "${context.symbol}" is not supported by strategy "${strategy.metadata.id}"`,
        });
      }
    }

    if (supportedTimeframes && supportedTimeframes.length > 0 && context.timeframe) {
      if (!supportedTimeframes.includes(context.timeframe)) {
        errors.push({
          field: 'context.timeframe',
          message: `Timeframe "${context.timeframe}" is not supported by strategy "${strategy.metadata.id}"`,
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
