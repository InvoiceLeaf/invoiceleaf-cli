import type { Command } from 'commander';
import {
  clearStoredAccessToken,
  getEnvAccessToken,
  getStoredAccessToken,
  setStoredAccessToken,
} from '../../config';
import { createFormatter, newline, output } from '../../output';
import { clearClient } from '../../sdk';
import type { GlobalOptions } from '../../types';

export function registerTokenCommand(parent: Command): void {
  parent
    .command('token')
    .description('Configure bearer token authentication')
    .option('--set <token>', 'Set access token')
    .option('--clear', 'Clear stored access token')
    .option('--show', 'Show masked token status')
    .action(async (options: { set?: string; clear?: boolean; show?: boolean }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);

      if (options.clear) {
        clearStoredAccessToken();
        clearClient();
        output(formatter, formatter.formatSuccess('Stored access token cleared.'));
        return;
      }

      if (options.set) {
        setStoredAccessToken(options.set);
        clearClient();
        output(formatter, formatter.formatSuccess('Access token stored.'));
        return;
      }

      const envToken = getEnvAccessToken();
      const storedToken = getStoredAccessToken();

      if (globalOptions.json) {
        output(formatter, {
          hasEnvToken: Boolean(envToken),
          hasStoredToken: Boolean(storedToken),
          envToken: envToken ? `${envToken.slice(0, 12)}...` : null,
          storedToken: storedToken ? `${storedToken.slice(0, 12)}...` : null,
        });
        return;
      }

      output(formatter, formatter.formatHeader('Access Token Status'));
      newline();

      if (envToken) {
        output(formatter, formatter.formatKeyValue({
          'Environment': `${envToken.slice(0, 12)}... (INVOICELEAF_ACCESS_TOKEN)`,
        }));
      }

      if (storedToken) {
        output(formatter, formatter.formatKeyValue({
          'Stored': `${storedToken.slice(0, 12)}...`,
        }));
      }

      if (!envToken && !storedToken) {
        output(formatter, formatter.formatInfo('No access token configured.'));
        newline();
        output(formatter, formatter.formatHint('Set one with: invoiceleaf auth token --set <token>'));
      }
    });
}
