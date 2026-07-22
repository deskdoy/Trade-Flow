export { WorkspaceEngine } from './core/WorkspaceEngine.ts';
export { WorkspaceManager } from './manager/WorkspaceManager.ts';
export { WorkspaceRegistry } from './registry/WorkspaceRegistry.ts';
export { WorkspaceSerializer } from './serialization/WorkspaceSerializer.ts';
export { WorkspaceValidator } from './validation/WorkspaceValidator.ts';
export { WorkspaceMigration } from './migration/WorkspaceMigration.ts';
export { LocalStorageProvider } from './storage/LocalStorageProvider.ts';
export { WorkspaceEventEmitter } from './events/WorkspaceEvents.ts';

export type { WorkspaceStorageProvider } from './storage/WorkspaceStorage.ts';
export type { SnapshotProvider } from './snapshot/SnapshotProvider.ts';

export type {
  WorkspaceEventType,
  WorkspaceEventPayloadMap,
  WorkspaceEventListener,
} from './events/WorkspaceEvents.ts';

export type {
  ThemeMode,
  ViewportRange,
  AppWorkspaceState,
  ChartWorkspaceState,
  IndicatorWorkspaceState,
  DrawingWorkspaceState,
  MarketDataWorkspaceState,
  WorkspaceData,
  WorkspaceEnvelope,
  ValidationError,
  ValidationResult,
  WorkspaceMetadata,
} from './types/index.ts';
