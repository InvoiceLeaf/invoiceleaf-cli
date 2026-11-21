import type { Command } from 'commander';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { GlobalOptions } from '../../types';
import { createSpinner, resolveSpaceId } from '../../utils';

export function registerStatisticsCommands(program: Command): void {
  const statistics = program.command('statistics').description('Statistics commands');

  statistics
    .command('show')
    .description('Show document totals for a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--from <date>', 'Start of date range (YYYY-MM-DD, requires --to)')
    .option('--to <date>', 'End of date range (YYYY-MM-DD, requires --from)')
    .option('--base-currency <code>', 'Convert all amounts to this currency')
    .action(
      async (
        options: { space?: string; from?: string; to?: string; baseCurrency?: string },
        command: Command
      ) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        spinner.start('Loading statistics...');
        const client = getClient(globalOptions);
        const stats = await client.statistics.get({
          spaceId,
          startDate: options.from,
          endDate: options.to,
          baseCurrency: options.baseCurrency,
        });
        spinner.stop();

        if (globalOptions.json) {
          output(formatter, stats);
          return;
        }

        output(formatter, formatter.formatHeader('Statistics'));
        newline();
        output(
          formatter,
          formatter.formatTable(stats.summaryByCurrency || [], [
            { key: 'currency', header: 'Currency', width: 10 },
            { key: 'documentCount', header: 'Documents', width: 11 },
            { key: 'netAmount', header: 'Net', width: 14 },
            { key: 'taxAmount', header: 'Tax', width: 14 },
            { key: 'totalAmount', header: 'Total', width: 14 },
            { key: 'debitAmount', header: 'Debit', width: 14 },
            { key: 'creditAmount', header: 'Credit', width: 14 },
          ])
        );
      }
    );
}
