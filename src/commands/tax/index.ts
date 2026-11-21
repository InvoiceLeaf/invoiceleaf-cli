import type { Command } from 'commander';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { GlobalOptions } from '../../types';
import { createSpinner, resolveSpaceId } from '../../utils';

function formatTimestamp(value: unknown): string {
  return value ? new Date(value as number).toISOString() : '-';
}

export function registerTaxCommands(program: Command): void {
  const tax = program.command('tax').description('Tax agent commands');

  const obligations = tax.command('obligations').description('Tax obligation commands');

  obligations
    .command('list')
    .description('List tax obligations for a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .action(async (options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading tax obligations...');
      const client = getClient(globalOptions);
      const response = await client.tax.listObligations(spaceId);
      spinner.stop();

      const items = response.items || [];

      if (globalOptions.json) {
        output(formatter, response);
        return;
      }

      output(formatter, formatter.formatHeader('Tax Obligations'));
      newline();
      output(
        formatter,
        formatter.formatTable(items, [
          { key: 'id', header: 'ID', width: 30 },
          { key: 'jurisdiction', header: 'Country', width: 9 },
          { key: 'formType', header: 'Form', width: 10 },
          { key: 'frequency', header: 'Frequency', width: 11 },
          { key: 'autonomy', header: 'Autonomy', width: 11 },
          { key: 'status', header: 'Status', width: 10 },
          { key: 'nextRunAt', header: 'Next Run', width: 26, format: formatTimestamp },
        ])
      );
    });

  const runs = tax.command('runs').description('Tax filing run commands');

  runs
    .command('list')
    .description('List tax filing runs for a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--state <state>', 'Filter by state (for example AWAITING_APPROVAL, FILED)')
    .option('--obligation <id>', 'Filter by tax obligation ID')
    .option('--limit <n>', 'Limit', '20')
    .option('--offset <n>', 'Offset', '0')
    .action(
      async (
        options: {
          space?: string;
          state?: string;
          obligation?: string;
          limit: string;
          offset: string;
        },
        command: Command
      ) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        spinner.start('Loading tax filing runs...');
        const client = getClient(globalOptions);
        const response = await client.tax.listRuns(spaceId, {
          state: options.state,
          obligationId: options.obligation,
          limit: Number(options.limit),
          offset: Number(options.offset),
        });
        spinner.stop();

        const items = response.items || [];

        if (globalOptions.json) {
          output(formatter, response);
          return;
        }

        output(formatter, formatter.formatHeader('Tax Filing Runs'));
        newline();
        output(
          formatter,
          formatter.formatTable(items, [
            { key: 'id', header: 'ID', width: 30 },
            { key: 'formType', header: 'Form', width: 10 },
            { key: 'period', header: 'Period', width: 10 },
            { key: 'state', header: 'State', width: 20 },
            { key: 'blockerCount', header: 'Blockers', width: 10 },
            { key: 'dueAt', header: 'Due', width: 26, format: formatTimestamp },
          ])
        );
      }
    );

  runs
    .command('show')
    .description('Show a tax filing run by ID')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Tax filing run ID')
    .action(async (id: string, options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading tax filing run...');
      const client = getClient(globalOptions);
      const run = await client.tax.getRun(spaceId, id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, run);
        return;
      }

      output(formatter, formatter.formatHeader('Tax Filing Run'));
      newline();
      output(
        formatter,
        formatter.formatKeyValue({
          ID: run.id || '-',
          ObligationId: run.obligationId || '-',
          Jurisdiction: run.jurisdiction || '-',
          FormType: run.formType || '-',
          Period: run.period || '-',
          State: run.state || '-',
          DueAt: formatTimestamp(run.dueAt),
          BlockerCount: run.blockerCount ?? '-',
          FiguresHash: run.figuresHash || '-',
          ApprovedAt: formatTimestamp(run.approvedAt),
          TransferTicket: run.transferTicket || '-',
          LastError: run.lastError || '-',
        })
      );
    });
}
