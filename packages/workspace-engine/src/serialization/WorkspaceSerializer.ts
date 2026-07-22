import { WorkspaceMigration } from '../migration/WorkspaceMigration.ts';
import { WorkspaceData, WorkspaceEnvelope, WorkspaceMetadata } from '../types/index.ts';
import { WorkspaceValidator } from '../validation/WorkspaceValidator.ts';

export class WorkspaceSerializer {
  private validator: WorkspaceValidator;
  private migration: WorkspaceMigration;

  constructor(validator?: WorkspaceValidator, migration?: WorkspaceMigration) {
    this.validator = validator ?? new WorkspaceValidator();
    this.migration = migration ?? new WorkspaceMigration();
  }

  private sanitizeWorkspace(workspace: WorkspaceData): WorkspaceData {
    const ws = JSON.parse(JSON.stringify(workspace)) as WorkspaceData;

    // Remove transient state from drawings
    if (Array.isArray(ws.drawings)) {
      ws.drawings = ws.drawings.map((d: any) => {
        if (!d || typeof d !== 'object') return d;
        const { selected, hovered, dragging, cursor, activePoint, ...rest } = d;
        return rest;
      });
    }

    // Replace zoomLevel with visibleLogicalRange if needed
    if (ws.chart) {
      if (!ws.chart.visibleLogicalRange && ws.chart.visibleRange) {
        ws.chart.visibleLogicalRange = { ...ws.chart.visibleRange };
      }
      delete ws.chart.zoomLevel;
    }

    return ws;
  }

  /**
   * Serializes a WorkspaceData instance into a versioned JSON string envelope
   */
  public serialize(workspace: WorkspaceData, existingCreatedAt?: string): string {
    const cleanWorkspace = this.sanitizeWorkspace(workspace);
    const now = new Date().toISOString();
    const createdAt = existingCreatedAt || now;

    const metadataBlock: WorkspaceMetadata = {
      id: cleanWorkspace.id,
      name: cleanWorkspace.name,
      description: cleanWorkspace.description || '',
      tags: cleanWorkspace.tags || [],
      platformVersion: '1.0.0',
      workspaceVersion: WorkspaceMigration.CURRENT_VERSION,
      createdAt,
      updatedAt: now,
    };

    const envelope: WorkspaceEnvelope = {
      version: WorkspaceMigration.CURRENT_VERSION,
      createdAt,
      updatedAt: now,
      metadata: metadataBlock,
      workspace: cleanWorkspace,
    };

    return JSON.stringify(envelope, null, 2);
  }

  /**
   * Deserializes a JSON string into a validated, migrated WorkspaceEnvelope
   */
  public deserialize(jsonStr: string): WorkspaceEnvelope {
    if (!jsonStr || typeof jsonStr !== 'string') {
      throw new Error('[WorkspaceSerializer] Empty or non-string JSON provided.');
    }

    let raw: Record<string, any>;
    try {
      raw = JSON.parse(jsonStr);
    } catch (err) {
      throw new Error(`[WorkspaceSerializer] Corrupted JSON string: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Run migration if version is older
    const migrated = this.migration.migrate(raw);

    // Run validation
    const valResult = this.validator.validate(migrated);
    if (!valResult.valid) {
      const errorMsgs = valResult.errors.map((e) => `${e.field}: ${e.message}`).join('; ');
      throw new Error(`[WorkspaceSerializer] Validation failed for workspace payload: ${errorMsgs}`);
    }

    return migrated;
  }
}
