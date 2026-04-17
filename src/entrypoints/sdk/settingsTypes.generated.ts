
export interface Settings {
  model?: string;
  theme?: 'light' | 'dark' | 'system';
  apiBaseUrl?: string;
  mcpServers?: Record<string, any>;
  autoMemory?: boolean;
  // Fallback for any other settings used in the codebase
  [key: string]: any;
}
