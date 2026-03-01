import type { Command } from 'commander';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { GlobalOptions } from '../../types';
import { createSpinner, resolveSpaceId } from '../../utils';

export function registerDocumentsCommands(program: Command): void {
  const documents = program.command('documents').description('Document commands');

  documents
    .command('list')
    .description('List documents for a space')
    .requiredOption('-s, --space <id>', 'Space ID')
    .option('--limit <n>', 'Limit', '20')
    .option('--page <n>', 'Page', '1')
    .action(async (options: { space: string; limit: string; page: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading documents...');
      const client = getClient(globalOptions);
      const items = await client.documents.list(spaceId, {
        limit: Number(options.limit),
        page: Number(options.page),
      });
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, items);
        return;
      }

      output(formatter, formatter.formatHeader('Documents'));
      newline();
      output(
        formatter,
        formatter.formatTable(items, [
          { key: 'id', header: 'ID', width: 30 },
          { key: 'invoiceId', header: 'Invoice #', width: 20 },
          { key: 'description', header: 'Description', width: 30 },
          { key: 'totalAmount', header: 'Total', width: 12 },
          { key: 'currency', header: 'Currency', width: 12, format: (v) => {
            if (!v) return '-';
            if (typeof v === 'string') return v;
            return String((v as { code?: string }).code || '-');
          } },
        ])
      );
    });

  documents
    .command('show')
    .description('Show a document by ID')
    .requiredOption('-s, --space <id>', 'Space ID')
    .argument('<id>', 'Document ID')
    .action(async (id: string, options: { space: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading document...');
      const client = getClient(globalOptions);
      const doc = await client.documents.getById(spaceId, id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, doc);
        return;
      }

      output(formatter, formatter.formatHeader('Document'));
      newline();
      output(
        formatter,
        formatter.formatKeyValue({
          ID: doc.id || '-',
          InvoiceId: doc.invoiceId || '-',
          Description: doc.description || '-',
          InvoiceDate: doc.invoiceDate || '-',
          DueDate: doc.dueDate || '-',
          TotalAmount: doc.totalAmount ?? '-',
          Currency: doc.currency?.code || '-',
          Supplier: doc.supplier?.name || '-',
          Receiver: doc.receiver?.name || '-',
          Status: doc.documentStatus || '-',
        })
      );
    });
}
