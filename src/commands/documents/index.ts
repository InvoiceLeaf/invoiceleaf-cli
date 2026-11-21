import { File } from 'node:buffer';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { Command } from 'commander';
import type { Document } from '@invoiceleaf/typescript-sdk';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { ColumnDef, GlobalOptions } from '../../types';
import { createSpinner, resolveSpaceId } from '../../utils';

const documentColumns: ColumnDef<Document>[] = [
  { key: 'id', header: 'ID', width: 30 },
  { key: 'invoiceId', header: 'Invoice #', width: 20 },
  { key: 'description', header: 'Description', width: 30 },
  { key: 'totalAmount', header: 'Total', width: 12 },
  { key: 'currency', header: 'Currency', width: 12, format: (v) => {
    if (!v) return '-';
    if (typeof v === 'string') return v;
    return String((v as { code?: string }).code || '-');
  } },
];

function readLocalFile(path: string): globalThis.File {
  return new File([readFileSync(path)], basename(path)) as unknown as globalThis.File;
}

export function registerDocumentsCommands(program: Command): void {
  const documents = program.command('documents').description('Document commands');

  documents
    .command('list')
    .description('List documents for a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--limit <n>', 'Limit', '20')
    .option('--page <n>', 'Page', '1')
    .action(async (options: { space?: string; limit: string; page: string }, command: Command) => {
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
      output(formatter, formatter.formatTable(items, documentColumns));
    });

  documents
    .command('search')
    .description('Search documents in a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--search <query>', 'Search query')
    .option('--from <date>', 'Start of date range (YYYY-MM-DD, requires --to)')
    .option('--to <date>', 'End of date range (YYYY-MM-DD, requires --from)')
    .option('--category <id...>', 'Filter by category IDs')
    .option('--tag <id...>', 'Filter by tag IDs')
    .option('--currency <code>', 'Filter by currency code')
    .option('--payment-status <status...>', 'Filter by payment status (UNPAID, PARTIAL, PAID)')
    .option(
      '--document-status <status...>',
      'Filter by document status (DRAFT, ISSUED, SENT, CANCELLED, DISPUTED)'
    )
    .option('--accounting-type <type...>', 'Filter by accounting type (PAYABLE, RECEIVABLE, UNKNOWN)')
    .option('--sort <field>', 'Field to sort by')
    .option('--order <order>', 'Sort order (asc, desc)')
    .option('--limit <n>', 'Limit', '20')
    .option('--page <n>', 'Page', '1')
    .action(
      async (
        options: {
          space?: string;
          search?: string;
          from?: string;
          to?: string;
          category?: string[];
          tag?: string[];
          currency?: string;
          paymentStatus?: string[];
          documentStatus?: string[];
          accountingType?: string[];
          sort?: string;
          order?: string;
          limit: string;
          page: string;
        },
        command: Command
      ) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        spinner.start('Searching documents...');
        const client = getClient(globalOptions);
        const response = await client.documents.search(spaceId, {
          search: options.search,
          startDate: options.from,
          endDate: options.to,
          categoryIds: options.category,
          tagIds: options.tag,
          currency: options.currency,
          paymentStatuses: options.paymentStatus,
          documentStatuses: options.documentStatus,
          accountingTypes: options.accountingType,
          sort: options.sort,
          order: options.order,
          limit: Number(options.limit),
          page: Number(options.page),
        });
        spinner.stop();

        const items = response.items || [];

        if (globalOptions.json) {
          output(formatter, response);
          return;
        }

        output(formatter, formatter.formatHeader('Documents'));
        newline();
        output(formatter, formatter.formatTable(items, documentColumns));
      }
    );

  documents
    .command('show')
    .description('Show a document by ID')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Document ID')
    .action(async (id: string, options: { space?: string }, command: Command) => {
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

  documents
    .command('upload')
    .description('Upload document files (PDF, PNG, JPG) for processing')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--category <id>', 'Category ID to assign')
    .option('--tag <id...>', 'Tag IDs to assign')
    .argument('<file...>', 'Files to upload')
    .action(
      async (
        files: string[],
        options: { space?: string; category?: string; tag?: string[] },
        command: Command
      ) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);
        const params = { categoryId: options.category, tagIds: options.tag };
        const localFiles = files.map(readLocalFile);

        spinner.start('Uploading...');
        const client = getClient(globalOptions);
        const uploads =
          localFiles.length === 1
            ? [await client.documents.upload(spaceId, localFiles[0], params)]
            : (await client.documents.uploadBulk(spaceId, localFiles, params)).uploads || [];
        spinner.stop();

        if (globalOptions.json) {
          output(formatter, uploads);
          return;
        }

        output(formatter, formatter.formatHeader('Uploads'));
        newline();
        output(
          formatter,
          formatter.formatTable(uploads, [
            { key: 'id', header: 'ID', width: 30 },
            { key: 'fileName', header: 'File', width: 30 },
            { key: 'status', header: 'Status', width: 14 },
            { key: 'message', header: 'Message', width: 30 },
          ])
        );
      }
    );

  documents
    .command('download')
    .description('Download the original file of a document')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('-o, --output <path>', 'Output path (default: the document file name)')
    .argument('<id>', 'Document ID')
    .action(async (id: string, options: { space?: string; output?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Downloading document...');
      const client = getClient(globalOptions);
      let path = options.output;
      if (!path) {
        const doc = await client.documents.getById(spaceId, id);
        path = basename(doc.fileName || id);
      }
      const file = await client.documents.getFile(spaceId, id);
      writeFileSync(path, Buffer.from(await file.arrayBuffer()));
      spinner.stop();

      output(formatter, formatter.formatSuccess(`Saved ${path}`));
    });

  documents
    .command('delete')
    .description('Delete a document')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Document ID')
    .action(async (id: string, options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Deleting document...');
      const client = getClient(globalOptions);
      await client.documents.delete(spaceId, id);
      spinner.stop();

      output(formatter, formatter.formatSuccess(`Deleted ${id}`));
    });
}
