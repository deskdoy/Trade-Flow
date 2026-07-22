export type ThemeMode = 'dark' | 'light';

export interface ViewportRange {
  from: number;
  to: number;
}

export interface AppWorkspaceState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  activeTab?: string;
  layout?: Record<string, unknown>;
}

export interface ChartWorkspaceState {
  symbol: string;
  timeframe: string;
  visibleLogicalRange?: ViewportRange;
  visibleTimeRange?: ViewportRange;
  visibleRange?: ViewportRange; // For V1 backward compatibility
  zoomLevel?: number; // For V1 backward compatibility
}

export interface IndicatorWorkspaceState {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  color?: string;
  period?: number;
  params?: Record<string, unknown>;
}

export interface DrawingWorkspaceState {
  id: string;
  type: string;
  visible: boolean;
  points: Array<{ time: string; price: number }>;
  properties: Record<string, unknown>;
}

export interface MarketDataWorkspaceState {
  activeProvider: string;
  selectedMarket: string;
}

export interface WorkspaceData {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  app: AppWorkspaceState;
  chart: ChartWorkspaceState;
  indicators: IndicatorWorkspaceState[];
  drawings: DrawingWorkspaceState[];
  marketData: MarketDataWorkspaceState;
}

export interface WorkspaceMetadata {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  platformVersion: string;
  workspaceVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceEnvelope {
  version: number;
  createdAt: string;
  updatedAt: string;
  metadata?: WorkspaceMetadata;
  workspace: WorkspaceData;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}
