import { IHealthMonitor, SystemHealthInfo } from "../../domain/health/IHealthMonitor.ts";

export class GetHealthUseCase {
  constructor(private healthMonitor: IHealthMonitor) {}

  public async execute(): Promise<SystemHealthInfo> {
    return this.healthMonitor.getSystemHealth();
  }
}
