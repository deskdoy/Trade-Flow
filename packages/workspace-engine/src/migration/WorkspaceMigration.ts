import { WorkspaceEnvelope } from '../types/index.ts';

export type MigrationFunction = (rawEnvelope: Record<string, any>) => Record<string, any>;

export class WorkspaceMigration {
  public static readonly CURRENT_VERSION = 1;
  private migrations: Map<number, MigrationFunction> = new Map();

  constructor() {
    this.registerDefaultMigrations();
  }

  /**
   * Register migration function from targetVersion - 1 to targetVersion
   */
  public registerMigration(targetVersion: number, migrator: MigrationFunction): void {
    this.migrations.set(targetVersion, migrator);
  }

  private registerDefaultMigrations(): void {
    // Example future migration from version 0 (unversioned legacy) to version 1
    this.registerMigration(1, (raw) => {
      if (!raw.version) {
        return {
          version: 1,
          createdAt: raw.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          workspace: {
            id: raw.id || raw.workspace?.id || `ws_${Date.now()}`,
            name: raw.name || raw.workspace?.name || 'Default Workspace',
            app: raw.app || raw.workspace?.app || { theme: 'dark', sidebarOpen: true },
            chart: raw.chart || raw.workspace?.chart || { symbol: 'BTCUSDT', timeframe: '1h' },
            indicators: raw.indicators || raw.workspace?.indicators || [],
            drawings: raw.drawings || raw.workspace?.drawings || [],
            marketData: raw.marketData || raw.workspace?.marketData || { activeProvider: 'binance', selectedMarket: 'crypto' },
          },
        };
      }
      return raw;
    });
  }

  /**
   * Upgrades a raw unparsed or parsed workspace object to the target targetVersion
   */
  public migrate(rawObj: Record<string, any>, targetVersion: number = WorkspaceMigration.CURRENT_VERSION): WorkspaceEnvelope {
    let current = { ...rawObj };
    let currentVersion = typeof current.version === 'number' ? current.version : 0;

    while (currentVersion < targetVersion) {
      const nextVersion = currentVersion + 1;
      const migrator = this.migrations.get(nextVersion);
      if (migrator) {
        current = migrator(current);
        currentVersion = current.version;
      } else {
        // Default fallback if no explicit migration registered
        current.version = nextVersion;
        currentVersion = nextVersion;
      }
    }

    return current as WorkspaceEnvelope;
  }
}
