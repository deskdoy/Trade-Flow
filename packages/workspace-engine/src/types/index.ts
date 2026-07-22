export type ThemeMode = 'dark' | 'light';

export interface AppWorkspaceState {
  theme: ThemeMode;
  sidebarOpen: boolean;
  activeTab?: string;
  layout?: Record<string, unknown>;
}

export interface ChartWorkspaceState {
  symbol: string;
  timeframe: string;
  zoomLevel?: number;
  visibleRange?: {
    from: number;
    to: number;
  };
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
  selected?: boolean;
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
  app: AppWorkspaceState;
  chart: ChartWorkspaceState;
  indicators: IndicatorWorkspaceState[];
  drawings: DrawingWorkspaceState[];
  marketData: MarketDataWorkspaceState;
}

export interface WorkspaceEnvelope {
  version: number;
  createdAt: string;
  updatedAt: string;
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

export interface WorkspaceMetadata {
  id: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}
