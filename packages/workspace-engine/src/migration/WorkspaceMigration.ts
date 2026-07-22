import { WorkspaceEnvelope, WorkspaceMetadata } from '../types/index.ts';

export type MigrationFunction = (rawEnvelope: Record<string, any>) => Record<string, any>;

export class WorkspaceMigration {
  public static readonly CURRENT_VERSION = 2;
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

  private sanitizeDrawings(drawings: any[]): any[] {
    if (!Array.isArray(drawings)) return [];
    return drawings.map((d) => {
      if (!d || typeof d !== 'object') return d;
      const { selected, hovered, dragging, cursor, activePoint, ...rest } = d;
      return rest;
    });
  }

  private registerDefaultMigrations(): void {
    // Migration V0 -> V1 (Unversioned raw workspace payload to V1 envelope)
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

    // Migration V1 -> V2 (Viewport range representation, metadata block, transient state cleanup)
    this.registerMigration(2, (raw) => {
      const now = new Date().toISOString();
      const createdAt = raw.createdAt || now;
      const updatedAt = raw.updatedAt || now;

      const ws = raw.workspace || {};
      const chart = ws.chart || { symbol: 'BTCUSDT', timeframe: '1h' };

      // Migrate zoomLevel or visibleRange -> visibleLogicalRange if not present
      if (!chart.visibleLogicalRange) {
        if (chart.visibleRange) {
          chart.visibleLogicalRange = { ...chart.visibleRange };
        } else if (typeof chart.zoomLevel === 'number') {
          chart.visibleLogicalRange = { from: 0, to: Math.max(10, chart.zoomLevel * 10) };
        }
      }
      delete chart.zoomLevel;

      // Clean transient state from drawings
      const cleanDrawings = this.sanitizeDrawings(ws.drawings || []);

      const wsId = ws.id || `ws_${Date.now()}`;
      const wsName = ws.name || 'Migrated Workspace';

      const metadataBlock: WorkspaceMetadata = {
        id: wsId,
        name: wsName,
        description: ws.description || raw.metadata?.description || '',
        tags: ws.tags || raw.metadata?.tags || [],
        platformVersion: raw.metadata?.platformVersion || '1.0.0',
        workspaceVersion: 2,
        createdAt,
        updatedAt,
      };

      return {
        version: 2,
        createdAt,
        updatedAt,
        metadata: metadataBlock,
        workspace: {
          ...ws,
          id: wsId,
          name: wsName,
          chart,
          drawings: cleanDrawings,
        },
      };
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
