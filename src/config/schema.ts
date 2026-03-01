import type { CLIConfig } from '../types';

export const defaultConfig: CLIConfig = {
  apiUrl: 'https://api.invoiceleaf.com/v1/',
  colors: true,
  paginationLimit: 20,
};

export const configSchema = {
  apiUrl: {
    type: 'string' as const,
    default: defaultConfig.apiUrl,
  },
  colors: {
    type: 'boolean' as const,
    default: defaultConfig.colors,
  },
  paginationLimit: {
    type: 'number' as const,
    default: defaultConfig.paginationLimit,
    minimum: 1,
    maximum: 500,
  },
  defaultSpaceId: {
    type: 'string' as const,
  },
};
