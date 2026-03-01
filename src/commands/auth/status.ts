import type { Command } from 'commander';
import {
  getEnvAccessToken,
  getEnvApiKey,
  getStoredAccessToken,
  getStoredApiKey,
} from '../../config';
import { createFormatter, newline, output } from '../../output';
import { hasCredentials } from '../../sdk';
import type { GlobalOptions } from '../../types';

export function registerStatusCommand(parent: Command): void {
  parent
    .command('status')
    .description('Show authentication status')
    .action(async (_options: object, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);

      const envApiKey = getEnvApiKey();
      const storedApiKey = getStoredApiKey();
      const envToken = getEnvAccessToken();
      const storedToken = getStoredAccessToken();
      const authenticated = hasCredentials(globalOptions);

      const method = envApiKey
        ? 'apiKeyEnv'
        : storedApiKey
          ? 'apiKeyStored'
          : envToken
            ? 'tokenEnv'
            : storedToken
              ? 'tokenStored'
              : null;

      if (globalOptions.json) {
        output(formatter, {
          authenticated,
          method,
        });
        return;
      }

      output(formatter, formatter.formatHeader('Authentication Status'));
      newline();
      output(
        formatter,
        formatter.formatKeyValue({
          Authenticated: authenticated ? 'Yes' : 'No',
          Method: method || '-',
        })
      );

      if (!authenticated) {
        newline();
        output(
          formatter,
          formatter.formatHint('Use: invoiceleaf auth apikey --set <key> or invoiceleaf auth token --set <token>')
        );
      }
    });
}
