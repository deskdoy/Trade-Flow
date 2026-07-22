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

  private isValidIsoDate(dateStr: unknown): boolean {
    if (typeof dateStr !== 'string' || !dateStr) return false;
    const timestamp = Date.parse(dateStr);
    return !isNaN(timestamp);
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
    if (!this.isValidIsoDate(env.createdAt)) {
      errors.push({ field: 'createdAt', message: 'createdAt must be a valid ISO timestamp string' });
    }
    if (!this.isValidIsoDate(env.updatedAt)) {
      errors.push({ field: 'updatedAt', message: 'updatedAt must be a valid ISO timestamp string' });
    }

    // 3. Workspace structure
    if (!env.workspace || typeof env.workspace !== 'object') {
      errors.push({ field: 'workspace', message: 'Workspace body is missing' });
      return { valid: false, errors };
    }

    const ws = env.workspace;

    if (!ws.id || typeof ws.id !== 'string') {
      errors.push({ field: 'workspace.id', message: 'Workspace ID is required and must be a non-empty string' });
    }
    if (!ws.name || typeof ws.name !== 'string') {
      errors.push({ field: 'workspace.name', message: 'Workspace name is required and must be a non-empty string' });
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

      // Range validation if provided
      const validateRange = (rangeName: string, rangeObj: unknown) => {
        if (rangeObj && typeof rangeObj === 'object') {
          const r = rangeObj as { from?: unknown; to?: unknown };
          if (typeof r.from !== 'number' || !isFinite(r.from)) {
            errors.push({ field: `workspace.chart.${rangeName}.from`, message: 'Range "from" must be a finite number' });
          }
          if (typeof r.to !== 'number' || !isFinite(r.to)) {
            errors.push({ field: `workspace.chart.${rangeName}.to`, message: 'Range "to" must be a finite number' });
          }
          if (typeof r.from === 'number' && typeof r.to === 'number' && r.from > r.to) {
            errors.push({ field: `workspace.chart.${rangeName}`, message: 'Range "from" cannot exceed "to"' });
          }
        }
      };

      if (ws.chart.visibleLogicalRange) validateRange('visibleLogicalRange', ws.chart.visibleLogicalRange);
      if (ws.chart.visibleTimeRange) validateRange('visibleTimeRange', ws.chart.visibleTimeRange);
      if (ws.chart.visibleRange) validateRange('visibleRange', ws.chart.visibleRange);
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

        if (ind.period !== undefined && (typeof ind.period !== 'number' || ind.period <= 0 || !isFinite(ind.period))) {
          errors.push({ field: `workspace.indicators[${idx}].period`, message: 'Indicator period must be a positive finite number' });
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

        // Validate points
        if (!Array.isArray(d.points)) {
          errors.push({ field: `workspace.drawings[${idx}].points`, message: 'Drawing points must be an array' });
        } else {
          d.points.forEach((pt, pIdx) => {
            if (typeof pt.price !== 'number' || !isFinite(pt.price)) {
              errors.push({ field: `workspace.drawings[${idx}].points[${pIdx}].price`, message: 'Point price must be a finite number' });
            }
            if (!pt.time || typeof pt.time !== 'string') {
              errors.push({ field: `workspace.drawings[${idx}].points[${pIdx}].time`, message: 'Point time must be a non-empty string' });
            }
          });
        }

        // Validate transient fields are NOT present
        const dObj = d as unknown as Record<string, unknown>;
        if (dObj.selected !== undefined || dObj.hovered !== undefined || dObj.dragging !== undefined || dObj.cursor !== undefined) {
          errors.push({
            field: `workspace.drawings[${idx}]`,
            message: 'Drawing contains transient UI state (selected, hovered, dragging, cursor) which must not be persisted',
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
