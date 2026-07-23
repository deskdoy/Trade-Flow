export interface ExecutionScheduler {
  readonly name: string;
  execute<T>(
    tasks: Array<() => T>,
    onTaskComplete?: (result: T, index: number) => void
  ): T[];
}

export class SequentialExecutionScheduler implements ExecutionScheduler {
  public readonly name = 'SequentialExecutionScheduler';

  public execute<T>(
    tasks: Array<() => T>,
    onTaskComplete?: (result: T, index: number) => void
  ): T[] {
    const results: T[] = [];
    for (let i = 0; i < tasks.length; i++) {
      const res = tasks[i]();
      results.push(res);
      if (onTaskComplete) {
        onTaskComplete(res, i);
      }
    }
    return results;
  }
}
