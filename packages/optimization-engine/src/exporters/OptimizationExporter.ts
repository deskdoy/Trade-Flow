import { OptimizationReport } from '../reports/OptimizationReport.ts';

export interface OptimizationExporter {
  readonly name: string;
  export(report: OptimizationReport): string;
}

export class JSONExporter implements OptimizationExporter {
  public readonly name = 'JSONExporter';

  public export(report: OptimizationReport): string {
    return JSON.stringify(report.toJSON(), null, 2);
  }
}

export class CSVExporter implements OptimizationExporter {
  public readonly name = 'CSVExporter';

  public export(report: OptimizationReport): string {
    const results = report.getResults();
    if (results.length === 0) {
      return 'Rank,ID,ParameterHash,NetProfit,MaxDrawdown,ProfitFactor,WinRate,SharpeRatio,ExecutionMs\n';
    }

    const rows: string[] = [];
    rows.push(
      'Rank,ID,ParameterHash,NetProfit,MaxDrawdown,ProfitFactor,WinRate,SharpeRatio,ExecutionMs'
    );

    for (const item of results) {
      const rank = item.rank;
      const id = item.id;
      const paramHash = item.parameterHash ?? '';
      const netProfit = item.metrics.netProfit ?? 0;
      const maxDrawdown = item.metrics.maxDrawdownPercent ?? item.metrics.maxDrawdown ?? 0;
      const profitFactor = item.metrics.profitFactor ?? 0;
      const winRate = item.metrics.winRate ?? 0;
      const sharpeRatio = item.metrics.sharpeRatio ?? 0;
      const executionMs = item.executionDurationMs;

      rows.push(
        `${rank},"${id}","${paramHash}",${netProfit},${maxDrawdown},${profitFactor},${winRate},${sharpeRatio},${executionMs}`
      );
    }

    return rows.join('\n');
  }
}
