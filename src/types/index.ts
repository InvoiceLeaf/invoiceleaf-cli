export interface GlobalOptions {
  json?: boolean;
  color?: boolean;
  apiKey?: string;
  token?: string;
  apiUrl?: string;
  quiet?: boolean;
  verbose?: boolean;
}

export type OutputMode = 'human' | 'pipe' | 'json';

export const ExitCode = {
  SUCCESS: 0,
  GENERAL_ERROR: 1,
  USAGE_ERROR: 2,
  AUTH_ERROR: 3,
  API_ERROR: 4,
  NETWORK_ERROR: 5,
} as const;

export type ExitCodeValue = (typeof ExitCode)[keyof typeof ExitCode];

export interface ColumnDef<T = unknown> {
  key: keyof T | string;
  header: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
  format?: (value: unknown, row: T) => string;
}

export interface CLIConfig {
  apiUrl: string;
  colors: boolean;
  paginationLimit: number;
  defaultSpaceId?: string;
}

export interface SessionConfig {
  apiKey?: string;
  accessToken?: string;
}
