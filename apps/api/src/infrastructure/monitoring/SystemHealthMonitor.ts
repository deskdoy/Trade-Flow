import os from "os";
import { IHealthMonitor, SystemHealthInfo } from "../../domain/health/IHealthMonitor.ts";
import { CONSTANTS, environment } from "../../config/index.ts";

export class SystemHealthMonitor implements IHealthMonitor {
  public async getSystemHealth(): Promise<SystemHealthInfo> {
    return {
      status: CONSTANTS.HEALTH_STATUS.UP,
      timestamp: new Date().toISOString(),
      uptimeSeconds: process.uptime(),
      system: {
        platform: os.platform(),
        memoryFree: os.freemem(),
        memoryTotal: os.totalmem(),
        cpuCount: os.cpus().length,
      },
      database: {
        connected: false,
        provider: CONSTANTS.DATABASE_PROVIDER,
        configured: !!environment.databaseUrl,
      },
      version: CONSTANTS.APP_VERSION,
    };
  }
}
