import type { Command } from 'commander';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { GlobalOptions } from '../../types';
import { createSpinner } from '../../utils';

export function registerSpacesCommands(program: Command): void {
  const spaces = program.command('spaces').description('Space commands');

  spaces
    .command('list')
    .description('List spaces')
    .option('--limit <n>', 'Limit', '20')
    .option('--page <n>', 'Page', '1')
    .action(async (options: { limit: string; page: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      spinner.start('Loading spaces...');
      const client = getClient(globalOptions);
      const response = await client.spaces.list({
        limit: Number(options.limit),
        page: Number(options.page),
      });
      spinner.stop();

      const items = response.items || [];

      if (globalOptions.json) {
        output(formatter, response);
        return;
      }

      output(formatter, formatter.formatHeader('Spaces'));
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

  spaces
    .command('show')
    .description('Show space details')
    .argument('<id>', 'Space ID')
    .action(async (id: string, _options: object, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      spinner.start('Loading space...');
      const client = getClient(globalOptions);
      const space = await client.spaces.getById(id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, space);
        return;
      }

      output(formatter, formatter.formatHeader('Space'));
      newline();
      output(
        formatter,
        formatter.formatKeyValue({
          ID: space.id || '-',
          Name: space.name || '-',
          BaseCurrency: space.baseCurrency || '-',
          DefaultCurrency: space.defaultCurrency?.code || '-',
          Permission: space.permission || '-',
        })
      );
    });
}
