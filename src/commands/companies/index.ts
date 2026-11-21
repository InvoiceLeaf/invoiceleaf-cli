import type { Command } from 'commander';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { GlobalOptions } from '../../types';
import { createSpinner, resolveSpaceId } from '../../utils';

export function registerCompaniesCommands(program: Command): void {
  const companies = program.command('companies').description('Company commands');

  companies
    .command('list')
    .description('List companies (suppliers and receivers) for a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--search <query>', 'Search query')
    .option('--limit <n>', 'Limit', '20')
    .option('--page <n>', 'Page', '1')
    .action(
      async (
        options: { space?: string; search?: string; limit: string; page: string },
        command: Command
      ) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        spinner.start('Loading companies...');
        const client = getClient(globalOptions);
        const response = await client.companies.search(spaceId, {
          search: options.search,
          limit: Number(options.limit),
          page: Number(options.page),
        });
        spinner.stop();

        const items = response.items || [];

        if (globalOptions.json) {
          output(formatter, response);
          return;
        }

        output(formatter, formatter.formatHeader('Companies'));
        newline();
        output(
          formatter,
          formatter.formatTable(items, [
            { key: 'id', header: 'ID', width: 30 },
            { key: 'name', header: 'Name', width: 30 },
            { key: 'city', header: 'City', width: 20 },
            { key: 'countryIso', header: 'Country', width: 10 },
            { key: 'vatId', header: 'VAT ID', width: 18 },
          ])
        );
      }
    );

  companies
    .command('show')
    .description('Show a company by ID')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Company ID')
    .action(async (id: string, options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading company...');
      const client = getClient(globalOptions);
      const company = await client.companies.getById(spaceId, id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, company);
        return;
      }

      output(formatter, formatter.formatHeader('Company'));
      newline();
      output(
        formatter,
        formatter.formatKeyValue({
          ID: company.id || '-',
          Name: company.name || '-',
          Street: company.street || '-',
          Zip: company.zip || '-',
          City: company.city || '-',
          Country: company.countryIso || company.country || '-',
          Email: company.email || '-',
          Phone: company.phone || '-',
          TaxNumber: company.taxNumber || '-',
          VatId: company.vatId || '-',
          Iban: company.iban || '-',
        })
      );
    });
}
