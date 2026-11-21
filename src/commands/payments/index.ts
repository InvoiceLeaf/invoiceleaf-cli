import type { Command } from 'commander';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { GlobalOptions } from '../../types';
import { createSpinner, resolveSpaceId } from '../../utils';

export function registerPaymentsCommands(program: Command): void {
  const payments = program.command('payments').description('Accounting payment commands');

  payments
    .command('list')
    .description('List payments for a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--search <query>', 'Search query')
    .option('--company <id>', 'Filter by company ID')
    .option('--from <date>', 'Start of payment date range (YYYY-MM-DD)')
    .option('--to <date>', 'End of payment date range (YYYY-MM-DD)')
    .option('--status <status...>', 'Filter by status (UNMATCHED, MATCHED, POSTED)')
    .option('--currency <code>', 'Filter by currency code')
    .option('--limit <n>', 'Limit', '20')
    .option('--page <n>', 'Page', '1')
    .action(
      async (
        options: {
          space?: string;
          search?: string;
          company?: string;
          from?: string;
          to?: string;
          status?: string[];
          currency?: string;
          limit: string;
          page: string;
        },
        command: Command
      ) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        spinner.start('Loading payments...');
        const client = getClient(globalOptions);
        const response = await client.accounting.searchPayments(spaceId, {
          search: options.search,
          companyId: options.company,
          startDate: options.from,
          endDate: options.to,
          statuses: options.status,
          currency: options.currency,
          limit: Number(options.limit),
          page: Number(options.page),
        });
        spinner.stop();

        const items = response.items || [];

        if (globalOptions.json) {
          output(formatter, response);
          return;
        }

        output(formatter, formatter.formatHeader('Payments'));
        newline();
        output(
          formatter,
          formatter.formatTable(items, [
            { key: 'id', header: 'ID', width: 30 },
            { key: 'paymentDate', header: 'Date', width: 12 },
            { key: 'amount', header: 'Amount', width: 12 },
            { key: 'currency', header: 'Currency', width: 10 },
            { key: 'status', header: 'Status', width: 12 },
            { key: 'reference', header: 'Reference', width: 24 },
          ])
        );
      }
    );

  payments
    .command('show')
    .description('Show a payment by ID')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Payment ID')
    .action(async (id: string, options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading payment...');
      const client = getClient(globalOptions);
      const payment = await client.accounting.getPayment(spaceId, id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, payment);
        return;
      }

      output(formatter, formatter.formatHeader('Payment'));
      newline();
      output(
        formatter,
        formatter.formatKeyValue({
          ID: payment.id || '-',
          PaymentDate: payment.paymentDate || '-',
          Amount: payment.amount ?? '-',
          Currency: payment.currency || '-',
          Status: payment.status || '-',
          Company: payment.company?.name || payment.companyId || '-',
          PaymentMethod: payment.paymentMethod?.name || '-',
          Reference: payment.reference || '-',
          AllocatedAmount: payment.allocatedAmount ?? '-',
          UnallocatedAmount: payment.unallocatedAmount ?? '-',
          Notes: payment.notes || '-',
        })
      );
    });
}
