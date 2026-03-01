import type { Command } from 'commander';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { GlobalOptions } from '../../types';
import { createSpinner, resolveSpaceId } from '../../utils';

export function registerCategoriesCommands(program: Command): void {
  const categories = program.command('categories').description('Category commands');

  categories
    .command('list')
    .description('List categories for a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .action(async (options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading categories...');
      const client = getClient(globalOptions);
      const items = await client.categories.list(spaceId);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, items);
        return;
      }

      output(formatter, formatter.formatHeader('Categories'));
      newline();
      output(
        formatter,
        formatter.formatTable(items, [
          { key: 'id', header: 'ID', width: 30 },
          { key: 'name', header: 'Name', width: 30 },
          { key: 'color', header: 'Color', width: 12 },
        ])
      );
    });
}
