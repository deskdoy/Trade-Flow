import { ValidationResult, WorkspaceEnvelope } from '../types/index.ts';

export class WorkspaceValidator {
  private knownDrawingTypes: Set<string> = new Set(['horizontal-line', 'trend-line', 'horizontal_line']);
  private knownIndicatorTypes: Set<string> = new Set(['sma', 'ema', 'rsi', 'macd', 'bollinger', 'volume']);

  public registerKnownDrawingType(type: string): void {
    this.knownDrawingTypes.add(type.toLowerCase().replace(/_/g, '-'));
  }

  public registerKnownIndicatorType(type: string): void {
    this.knownIndicatorTypes.add(type.toLowerCase());
  }

  /**
   * Validates workspace JSON or Envelope object
   */
  public validate(envelope: unknown): ValidationResult {
    const errors: ValidationResult['errors'] = [];

    if (!envelope || typeof envelope !== 'object') {
      return {
        valid: false,
        errors: [{ field: 'root', message: 'Workspace payload must be a non-null object' }],
      };
    }

    const env = envelope as Partial<WorkspaceEnvelope>;

    // 1. Version validation
    if (typeof env.version !== 'number' || env.version <= 0) {
      errors.push({ field: 'version', message: 'Version must be a positive integer' });
    }

    // 2. Dates
    if (!env.createdAt || typeof env.createdAt !== 'string') {
      errors.push({ field: 'createdAt', message: 'createdAt timestamp is required' });
    }
    if (!env.updatedAt || typeof env.updatedAt !== 'string') {
      errors.push({ field: 'updatedAt', message: 'updatedAt timestamp is required' });
    }

    // 3. Workspace structure
    if (!env.workspace || typeof env.workspace !== 'object') {
      errors.push({ field: 'workspace', message: 'Workspace body is missing' });
      return { valid: false, errors };
    }

    const ws = env.workspace;

    if (!ws.id || typeof ws.id !== 'string') {
      errors.push({ field: 'workspace.id', message: 'Workspace ID is required' });
    }
    if (!ws.name || typeof ws.name !== 'string') {
      errors.push({ field: 'workspace.name', message: 'Workspace name is required' });
    }

    // Chart state
    if (!ws.chart || typeof ws.chart !== 'object') {
      errors.push({ field: 'workspace.chart', message: 'Chart state configuration is required' });
    } else {
      if (!ws.chart.symbol || typeof ws.chart.symbol !== 'string') {
        errors.push({ field: 'workspace.chart.symbol', message: 'Chart symbol is required' });
      }
      if (!ws.chart.timeframe || typeof ws.chart.timeframe !== 'string') {
        errors.push({ field: 'workspace.chart.timeframe', message: 'Chart timeframe is required' });
      }
    }

    // App state
    if (!ws.app || typeof ws.app !== 'object') {
      errors.push({ field: 'workspace.app', message: 'App state configuration is required' });
    }

    // Indicators array & duplicate check
    if (!Array.isArray(ws.indicators)) {
      errors.push({ field: 'workspace.indicators', message: 'Indicators must be an array' });
    } else {
      const indicatorIds = new Set<string>();
      ws.indicators.forEach((ind, idx) => {
        if (!ind.id) {
          errors.push({ field: `workspace.indicators[${idx}].id`, message: 'Indicator ID is required' });
        } else if (indicatorIds.has(ind.id)) {
          errors.push({ field: `workspace.indicators[${idx}].id`, message: `Duplicate indicator ID: ${ind.id}` });
        } else {
          indicatorIds.add(ind.id);
        }

        if (!ind.type) {
          errors.push({ field: `workspace.indicators[${idx}].type`, message: 'Indicator type is required' });
        } else if (!this.knownIndicatorTypes.has(ind.type.toLowerCase())) {
          errors.push({
            field: `workspace.indicators[${idx}].type`,
            message: `Unknown indicator type "${ind.type}"`,
          });
        }
      });
    }

    // Drawings array & duplicate check
    if (!Array.isArray(ws.drawings)) {
      errors.push({ field: 'workspace.drawings', message: 'Drawings must be an array' });
    } else {
      const drawingIds = new Set<string>();
      ws.drawings.forEach((d, idx) => {
        if (!d.id) {
          errors.push({ field: `workspace.drawings[${idx}].id`, message: 'Drawing ID is required' });
        } else if (drawingIds.has(d.id)) {
          errors.push({ field: `workspace.drawings[${idx}].id`, message: `Duplicate drawing ID: ${d.id}` });
        } else {
          drawingIds.add(d.id);
        }

        if (!d.type) {
          errors.push({ field: `workspace.drawings[${idx}].type`, message: 'Drawing type is required' });
        } else {
          const normType = d.type.toLowerCase().replace(/_/g, '-');
          if (!this.knownDrawingTypes.has(normType)) {
            errors.push({
              field: `workspace.drawings[${idx}].type`,
              message: `Unknown drawing type "${d.type}"`,
            });
          }
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
