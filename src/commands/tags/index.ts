import type { Command } from 'commander';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { GlobalOptions } from '../../types';
import { createSpinner, resolveSpaceId } from '../../utils';

export function registerTagsCommands(program: Command): void {
  const tags = program.command('tags').description('Tag commands');

  tags
    .command('list')
    .description('List tags for a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .action(async (options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading tags...');
      const client = getClient(globalOptions);
      const items = await client.tags.list(spaceId);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, items);
        return;
      }

      output(formatter, formatter.formatHeader('Tags'));
      newline();
      output(
        formatter,
        formatter.formatTable(items, [
          { key: 'id', header: 'ID', width: 30 },
          { key: 'name', header: 'Name', width: 30 },
        ])
      );
    });
}
