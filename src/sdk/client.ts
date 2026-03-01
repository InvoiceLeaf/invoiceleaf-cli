import { InvoiceLeafClient } from '@invoiceleaf/typescript-sdk';
import {
  getConfig,
  getEnvAccessToken,
  getEnvApiKey,
  getStoredAccessToken,
  getStoredApiKey,
} from '../config';
import type { GlobalOptions } from '../types';
import { CLIError } from '../utils';
import { ExitCode } from '../types';

let clientInstance: InvoiceLeafClient | null = null;

export function clearClient(): void {
  clientInstance = null;
}

export function getClient(options?: GlobalOptions): InvoiceLeafClient {
  const baseUrl = options?.apiUrl || getConfig('apiUrl');

  const apiKey = options?.apiKey || getEnvApiKey() || getStoredApiKey();
  const accessToken =
    options?.token || getEnvAccessToken() || getStoredAccessToken();

  if (!apiKey && !accessToken) {
    throw new CLIError(
      'Not authenticated. Set credentials with "invoiceleaf auth apikey --set ..." or "invoiceleaf auth token --set ...".',
      ExitCode.AUTH_ERROR
    );
  }

  if (!clientInstance) {
    clientInstance = new InvoiceLeafClient({
      apiKey,
      accessToken,
      baseUrl,
    });
  }

  return clientInstance;
}

export function hasCredentials(options?: GlobalOptions): boolean {
  return Boolean(
    options?.apiKey ||
      options?.token ||
      getEnvApiKey() ||
      getStoredApiKey() ||
      getEnvAccessToken() ||
      getStoredAccessToken()
  );
}
