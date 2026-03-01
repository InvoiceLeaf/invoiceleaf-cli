import type { Command } from 'commander';
import { clearSession } from '../../config';
import { createFormatter, output } from '../../output';
import { clearClient } from '../../sdk';
import type { GlobalOptions } from '../../types';

export function registerLogoutCommand(parent: Command): void {
  parent
    .command('logout')
    .description('Clear stored credentials')
    .action(async (_options: object, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);

      clearSession();
      clearClient();

      output(formatter, formatter.formatSuccess('Stored credentials cleared.'));
    });
}
