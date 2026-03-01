import type { Command } from 'commander';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { GlobalOptions } from '../../types';
import { createSpinner } from '../../utils';

export function registerOrganizationsCommands(program: Command): void {
  const organizations = program
    .command('organizations')
    .description('Organization commands');

  organizations
    .command('list')
    .description('List organizations')
    .option('--limit <n>', 'Limit', '20')
    .option('--page <n>', 'Page', '1')
    .action(async (options: { limit: string; page: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      spinner.start('Loading organizations...');
      const client = getClient(globalOptions);
      const response = await client.organizations.list({
        limit: Number(options.limit),
        page: Number(options.page),
      });
      spinner.stop();

      const items = response.items || [];

      if (globalOptions.json) {
        output(formatter, response);
        return;
      }

      output(formatter, formatter.formatHeader('Organizations'));
      newline();
      output(
        formatter,
        formatter.formatTable(items, [
          { key: 'id', header: 'ID', width: 30 },
          { key: 'name', header: 'Name', width: 30 },
          { key: 'permission', header: 'Permission', width: 12 },
        ])
      );
    });
}
