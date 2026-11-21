import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { Command } from 'commander';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { GlobalOptions } from '../../types';
import { createSpinner, resolveSpaceId } from '../../utils';

const EXPORT_STATES = ['processing', 'success', 'error'];

function formatState(state: unknown): string {
  return EXPORT_STATES[state as number] || '-';
}

export function registerExportsCommands(program: Command): void {
  const exports = program.command('exports').description('Export commands');

  exports
    .command('list')
    .description('List exports for a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--limit <n>', 'Limit', '20')
    .option('--page <n>', 'Page', '1')
    .action(async (options: { space?: string; limit: string; page: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading exports...');
      const client = getClient(globalOptions);
      const items = await client.exports.list(spaceId, {
        limit: Number(options.limit),
        page: Number(options.page),
      });
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, items);
        return;
      }

      output(formatter, formatter.formatHeader('Exports'));
      newline();
      output(
        formatter,
        formatter.formatTable(items, [
          { key: 'id', header: 'ID', width: 30 },
          { key: 'filename', header: 'File', width: 30 },
          { key: 'format', header: 'Format', width: 8 },
          { key: 'startDate', header: 'From', width: 12 },
          { key: 'endDate', header: 'To', width: 12 },
          { key: 'documentCount', header: 'Documents', width: 11 },
          { key: 'state', header: 'State', width: 12, format: formatState },
        ])
      );
    });

  exports
    .command('create')
    .description('Create an export (processed asynchronously)')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--format <format>', 'Output format (xls, csv, zip, pdf)', 'xls')
    .option('--from <date>', 'Start of date range (YYYY-MM-DD)')
    .option('--to <date>', 'End of date range (YYYY-MM-DD)')
    .option('--filename <name>', 'File name of the export')
    .option('--currency <code>', 'Currency code')
    .option('--category <id...>', 'Limit to category IDs')
    .option('--tag <id...>', 'Limit to tag IDs')
    .action(
      async (
        options: {
          space?: string;
          format: string;
          from?: string;
          to?: string;
          filename?: string;
          currency?: string;
          category?: string[];
          tag?: string[];
        },
        command: Command
      ) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        spinner.start('Creating export...');
        const client = getClient(globalOptions);
        const created = await client.exports.create(spaceId, {
          report: 0,
          format: options.format,
          startDate: options.from,
          endDate: options.to,
          filename: options.filename,
          currency: options.currency,
          categoryIds: options.category,
          tagIds: options.tag,
        });
        spinner.stop();

        if (globalOptions.json) {
          output(formatter, created);
          return;
        }

        output(
          formatter,
          formatter.formatSuccess(`Created export ${created.id} (${formatState(created.state)})`)
        );
      }
    );

  exports
    .command('download')
    .description('Download the file of a finished export')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('-o, --output <path>', 'Output path (default: the export file name)')
    .argument('<id>', 'Export ID')
    .action(async (id: string, options: { space?: string; output?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Downloading export...');
      const client = getClient(globalOptions);
      let path = options.output;
      if (!path) {
        const item = await client.exports.getById(spaceId, id);
        path = basename(item.filename || id);
      }
      const file = await client.exports.downloadFile(spaceId, id);
      writeFileSync(path, Buffer.from(await file.arrayBuffer()));
      spinner.stop();

      output(formatter, formatter.formatSuccess(`Saved ${path}`));
    });
}
