export interface WorkspaceStorageProvider {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
  exists(key: string): boolean;
  clear(): void;
  export?(key: string): string | null;
  import?(key: string, data: string): void;
}
