import { ValidationError, ValidationResult } from '@tradeflow/trading-domain';
import { HistoricalDataset } from '../dataset/HistoricalDataset.ts';
import { BacktestConfig } from '../types/index.ts';

export class BacktestValidator {
  public validateConfig(config: BacktestConfig): ValidationResult {
    const errors: ValidationError[] = [];

    if (!config.symbol || config.symbol.trim().length === 0) {
      errors.push({ field: 'symbol', message: 'Symbol is required' });
    }

    if (!config.timeframe || config.timeframe.trim().length === 0) {
      errors.push({ field: 'timeframe', message: 'Timeframe is required' });
    }

    if (config.initialBalance !== undefined && config.initialBalance <= 0) {
      errors.push({ field: 'initialBalance', message: 'Initial balance must be greater than 0' });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  public validateDataset(dataset: HistoricalDataset): ValidationResult {
    return dataset.validate();
  }

  public validateEngineReady(
    config: BacktestConfig,
    dataset: HistoricalDataset
  ): ValidationResult {
    const configVal = this.validateConfig(config);
    if (!configVal.valid) return configVal;

    const datasetVal = this.validateDataset(dataset);
    if (!datasetVal.valid) return datasetVal;

    return { valid: true, errors: [] };
  }
}
