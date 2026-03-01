import Conf from 'conf';
import { homedir } from 'os';
import { join } from 'path';
import type { CLIConfig, SessionConfig } from '../types';
import { configSchema, defaultConfig } from './schema';

const CONFIG_DIR =
  process.env.INVOICELEAF_CONFIG_DIR || join(homedir(), '.invoiceleaf-cli');

const configStore = new Conf<CLIConfig>({
  projectName: 'invoiceleaf-cli',
  cwd: CONFIG_DIR,
  configName: 'config',
  defaults: defaultConfig,
  schema: configSchema as Record<keyof CLIConfig, Record<string, unknown>>,
});

const sessionStore = new Conf<SessionConfig>({
  projectName: 'invoiceleaf-cli',
  cwd: CONFIG_DIR,
  configName: 'session',
  defaults: {},
});

export function getConfigDir(): string {
  return CONFIG_DIR;
}

export function getConfig<K extends keyof CLIConfig>(key: K): CLIConfig[K] {
  const envKey = `INVOICELEAF_${String(key).toUpperCase()}`;
  const envValue = process.env[envKey];

  if (envValue !== undefined) {
    const schema = configSchema[key];
    if (schema.type === 'boolean') {
      return (envValue === 'true' || envValue === '1') as CLIConfig[K];
    }
    if (schema.type === 'number') {
      return Number(envValue) as CLIConfig[K];
    }
    return envValue as CLIConfig[K];
  }

  return configStore.get(key);
}

export function getAllConfig(): CLIConfig {
  const config = { ...configStore.store };

  for (const key of Object.keys(defaultConfig) as (keyof CLIConfig)[]) {
    const envKey = `INVOICELEAF_${String(key).toUpperCase()}`;
    const envValue = process.env[envKey];
    if (envValue === undefined) {
      continue;
    }

    const schema = configSchema[key];
    if (schema.type === 'boolean') {
      (config as Record<string, unknown>)[key] =
        envValue === 'true' || envValue === '1';
    } else if (schema.type === 'number') {
      (config as Record<string, unknown>)[key] = Number(envValue);
    } else {
      (config as Record<string, unknown>)[key] = envValue;
    }
  }

  return config;
}

export function setConfig<K extends keyof CLIConfig>(
  key: K,
  value: CLIConfig[K]
): void {
  configStore.set(key, value);
}

export function resetConfig(): void {
  configStore.clear();
}

export function getStoredApiKey(): string | undefined {
  return sessionStore.get('apiKey');
}

export function setStoredApiKey(apiKey: string): void {
  sessionStore.set('apiKey', apiKey);
}

export function clearStoredApiKey(): void {
  sessionStore.delete('apiKey');
}

export function getStoredAccessToken(): string | undefined {
  return sessionStore.get('accessToken');
}

export function setStoredAccessToken(token: string): void {
  sessionStore.set('accessToken', token);
}

export function clearStoredAccessToken(): void {
  sessionStore.delete('accessToken');
}

export function clearSession(): void {
  sessionStore.clear();
}

export function getEnvApiKey(): string | undefined {
  return process.env.INVOICELEAF_API_KEY;
}

export function getEnvAccessToken(): string | undefined {
  return process.env.INVOICELEAF_ACCESS_TOKEN;
}

export { defaultConfig } from './schema';
