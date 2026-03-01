import type { Command } from 'commander';
import {
  clearStoredApiKey,
  getEnvApiKey,
  getStoredApiKey,
  setStoredApiKey,
} from '../../config';
import { createFormatter, newline, output } from '../../output';
import { clearClient } from '../../sdk';
import type { GlobalOptions } from '../../types';

export function registerApiKeyCommand(parent: Command): void {
  parent
    .command('apikey')
    .description('Configure API key authentication')
    .option('--set <key>', 'Set API key')
    .option('--clear', 'Clear stored API key')
    .option('--show', 'Show masked API key status')
    .action(async (options: { set?: string; clear?: boolean; show?: boolean }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);

      if (options.clear) {
        clearStoredApiKey();
        clearClient();
        output(formatter, formatter.formatSuccess('Stored API key cleared.'));
        return;
      }

      if (options.set) {
        setStoredApiKey(options.set);
        clearClient();
        output(formatter, formatter.formatSuccess('API key stored.'));
        return;
      }

      const envApiKey = getEnvApiKey();
      const storedApiKey = getStoredApiKey();

      if (globalOptions.json) {
        output(formatter, {
          hasEnvApiKey: Boolean(envApiKey),
          hasStoredApiKey: Boolean(storedApiKey),
          envApiKey: envApiKey ? `${envApiKey.slice(0, 10)}...` : null,
          storedApiKey: storedApiKey ? `${storedApiKey.slice(0, 10)}...` : null,
        });
        return;
      }

      output(formatter, formatter.formatHeader('API Key Status'));
      newline();

      if (envApiKey) {
        output(formatter, formatter.formatKeyValue({
          'Environment': `${envApiKey.slice(0, 10)}... (INVOICELEAF_API_KEY)`,
        }));
      }

      if (storedApiKey) {
        output(formatter, formatter.formatKeyValue({
          'Stored': `${storedApiKey.slice(0, 10)}...`,
        }));
      }

      if (!envApiKey && !storedApiKey) {
        output(formatter, formatter.formatInfo('No API key configured.'));
        newline();
        output(formatter, formatter.formatHint('Set one with: invoiceleaf auth apikey --set <key>'));
      }
    });
}
