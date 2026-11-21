import { createInterface } from 'node:readline/promises';
import type { BankTransaction } from '@invoiceleaf/typescript-sdk';
import type { Command } from 'commander';
import { createFormatter, newline, output, type OutputFormatter } from '../../output';
import { getClient } from '../../sdk';
import { ExitCode, type GlobalOptions } from '../../types';
import { CLIError, createSpinner, resolveSpaceId } from '../../utils';

const TRANSACTION_STATUSES = ['PENDING', 'POSTED', 'MATCHED', 'IGNORED'];

function formatTimestamp(value: unknown): string {
  return value ? new Date(value as number).toISOString() : '-';
}

function parseStatus(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const status = value.toUpperCase();
  if (!TRANSACTION_STATUSES.includes(status)) {
    throw new CLIError(
      `Invalid status "${value}". Use one of: ${TRANSACTION_STATUSES.join(', ')}.`,
      ExitCode.USAGE_ERROR
    );
  }
  return status;
}

function parseBoolean(value: string): boolean {
  const normalized = value.toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }
  throw new CLIError(`Invalid value "${value}". Use true or false.`, ExitCode.USAGE_ERROR);
}

async function confirm(question: string): Promise<boolean> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  try {
    const answer = await rl.question(`${question} [y/N] `);
    return ['y', 'yes'].includes(answer.trim().toLowerCase());
  } finally {
    rl.close();
  }
}

function printTransaction(formatter: OutputFormatter, transaction: BankTransaction): void {
  output(formatter, formatter.formatHeader('Bank Transaction'));
  newline();
  output(
    formatter,
    formatter.formatKeyValue({
      ID: transaction.id || '-',
      Date: transaction.transactionDate || '-',
      Amount: transaction.amount ?? '-',
      Currency: transaction.currencyCode || '-',
      Name: transaction.name || '-',
      Merchant: transaction.merchantName || '-',
      Description: transaction.originalDescription || '-',
      Status: transaction.status || '-',
      Pending: transaction.pending ?? '-',
      Account:
        transaction.account?.displayName ||
        transaction.account?.name ||
        transaction.plaidAccountId ||
        '-',
      LinkedDocument: transaction.linkedDocumentId || '-',
      LinkedCompany: transaction.linkedCompany?.name || transaction.linkedCompanyId || '-',
      LinkedPayment: transaction.linkedPaymentId || '-',
      MatchType: transaction.matchType || '-',
      MatchConfidence: transaction.matchConfidence ?? '-',
      Notes: transaction.notes || '-',
    })
  );
}

export function registerBankCommands(program: Command): void {
  const bank = program
    .command('bank')
    .description('Bank connection, account and transaction commands');

  const connections = bank.command('connections').description('Bank connection commands');

  connections
    .command('list')
    .description('List the bank connections of a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .action(async (options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading bank connections...');
      const client = getClient(globalOptions);
      const response = await client.bank.listConnections(spaceId);
      spinner.stop();

      const items = response.items || [];

      if (globalOptions.json) {
        output(formatter, response);
        return;
      }

      output(formatter, formatter.formatHeader('Bank Connections'));
      newline();
      output(
        formatter,
        formatter.formatTable(items, [
          { key: 'id', header: 'ID', width: 30 },
          { key: 'institutionName', header: 'Institution', width: 26 },
          { key: 'status', header: 'Status', width: 16 },
          { key: 'accountCount', header: 'Accounts', width: 10 },
          { key: 'lastSyncAt', header: 'Last Sync', width: 26, format: formatTimestamp },
        ])
      );
    });

  connections
    .command('get')
    .alias('show')
    .description('Show a bank connection by ID')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Bank connection ID')
    .action(async (id: string, options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading bank connection...');
      const client = getClient(globalOptions);
      const connection = await client.bank.getConnection(spaceId, id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, connection);
        return;
      }

      output(formatter, formatter.formatHeader('Bank Connection'));
      newline();
      output(
        formatter,
        formatter.formatKeyValue({
          ID: connection.id || '-',
          Institution: connection.institutionName || '-',
          Status: connection.status || '-',
          Accounts: connection.accountCount ?? '-',
          InitialSyncComplete: connection.initialSyncComplete ?? '-',
          HistoricalSyncComplete: connection.historicalSyncComplete ?? '-',
          LastSync: formatTimestamp(connection.lastSyncAt),
          ConsentExpires: formatTimestamp(connection.consentExpiresAt),
          ErrorCode: connection.errorCode || '-',
          ErrorMessage: connection.errorMessage || '-',
        })
      );
    });

  connections
    .command('sync')
    .description('Sync the transactions of a bank connection now')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Bank connection ID')
    .action(async (id: string, options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Syncing bank connection...');
      const client = getClient(globalOptions);
      const result = await client.bank.syncConnection(spaceId, id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, result);
        if (result.success === false) {
          process.exitCode = ExitCode.API_ERROR;
        }
        return;
      }

      if (result.success === false) {
        throw new CLIError(`Sync failed: ${result.error || 'unknown error'}`, ExitCode.API_ERROR);
      }

      output(
        formatter,
        formatter.formatSuccess(
          `Synced ${id}: ${result.addedCount ?? 0} added, ${result.modifiedCount ?? 0} modified, ${result.removedCount ?? 0} removed`
        )
      );
      if (result.hasMore) {
        output(formatter, formatter.formatHint('More transactions are available. Run sync again.'));
      }
    });

  connections
    .command('disconnect')
    .description('Disconnect a bank from a space (imported transactions are kept)')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('-y, --yes', 'Skip the confirmation prompt')
    .argument('<id>', 'Bank connection ID')
    .action(
      async (id: string, options: { space?: string; yes?: boolean }, command: Command) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        if (!options.yes) {
          if (!process.stdin.isTTY || globalOptions.json) {
            throw new CLIError(
              'Disconnecting a bank cannot be undone from the CLI. Pass --yes to confirm.',
              ExitCode.USAGE_ERROR
            );
          }

          const confirmed = await confirm(
            `Disconnect bank connection ${id}? Reconnecting needs the web app.`
          );
          if (!confirmed) {
            output(formatter, formatter.formatInfo('Cancelled.'));
            return;
          }
        }

        spinner.start('Disconnecting bank...');
        const client = getClient(globalOptions);
        await client.bank.disconnectConnection(spaceId, id);
        spinner.stop();

        output(formatter, formatter.formatSuccess(`Disconnected ${id}`));
      }
    );

  const accounts = bank.command('accounts').description('Bank account commands');

  accounts
    .command('list')
    .description('List the bank accounts of a space with their balances')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--connection <id>', 'Filter by bank connection ID')
    .action(async (options: { space?: string; connection?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading bank accounts...');
      const client = getClient(globalOptions);
      const response = await client.bank.listAccounts(spaceId, {
        itemId: options.connection,
      });
      spinner.stop();

      const items = response.items || [];

      if (globalOptions.json) {
        output(formatter, response);
        return;
      }

      output(formatter, formatter.formatHeader('Bank Accounts'));
      newline();
      output(
        formatter,
        formatter.formatTable(items, [
          { key: 'id', header: 'ID', width: 30 },
          { key: 'institutionName', header: 'Institution', width: 20 },
          { key: 'name', header: 'Name', width: 22 },
          { key: 'mask', header: 'Mask', width: 8 },
          { key: 'balanceCurrent', header: 'Balance', width: 14 },
          { key: 'currencyCode', header: 'Currency', width: 10 },
          { key: 'syncEnabled', header: 'Sync', width: 7 },
        ])
      );
    });

  accounts
    .command('get')
    .alias('show')
    .description('Show a bank account by ID')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Bank account ID')
    .action(async (id: string, options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading bank account...');
      const client = getClient(globalOptions);
      const account = await client.bank.getAccount(spaceId, id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, account);
        return;
      }

      output(formatter, formatter.formatHeader('Bank Account'));
      newline();
      output(
        formatter,
        formatter.formatKeyValue({
          ID: account.id || '-',
          Connection: account.plaidItemId || '-',
          Institution: account.institutionName || '-',
          Name: account.name || '-',
          OfficialName: account.officialName || '-',
          Mask: account.mask || '-',
          Type: account.type || '-',
          Subtype: account.subtype || '-',
          Currency: account.currencyCode || '-',
          BalanceCurrent: account.balanceCurrent ?? '-',
          BalanceAvailable: account.balanceAvailable ?? '-',
          BalanceLimit: account.balanceLimit ?? '-',
          BalanceUpdated: formatTimestamp(account.balanceLastUpdatedAt),
          SyncEnabled: account.syncEnabled ?? '-',
          LinkedPaymentMethod: account.linkedPaymentMethodId || '-',
        })
      );
    });

  accounts
    .command('update')
    .description('Update the settings of a bank account')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--sync-enabled <true|false>', 'Turn transaction sync on or off')
    .option('--payment-method <id>', 'Payment method to link to the account')
    .argument('<id>', 'Bank account ID')
    .action(
      async (
        id: string,
        options: { space?: string; syncEnabled?: string; paymentMethod?: string },
        command: Command
      ) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        if (options.syncEnabled === undefined && options.paymentMethod === undefined) {
          throw new CLIError(
            'Nothing to update. Pass --sync-enabled and/or --payment-method.',
            ExitCode.USAGE_ERROR
          );
        }
        const syncEnabled =
          options.syncEnabled === undefined ? undefined : parseBoolean(options.syncEnabled);

        spinner.start('Updating bank account...');
        const client = getClient(globalOptions);
        const account = await client.bank.updateAccount(spaceId, id, {
          syncEnabled,
          linkedPaymentMethodId: options.paymentMethod,
        });
        spinner.stop();

        if (globalOptions.json) {
          output(formatter, account);
          return;
        }

        output(formatter, formatter.formatSuccess(`Updated bank account ${id}`));
      }
    );

  const transactions = bank.command('transactions').description('Bank transaction commands');

  transactions
    .command('list')
    .description('List bank transactions for a space')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--account <id>', 'Filter by bank account ID')
    .option('--search <query>', 'Search name, merchant and description')
    .option('--status <status>', 'Filter by status (PENDING, POSTED, MATCHED, IGNORED)')
    .option('--from <date>', 'Start of transaction date range (YYYY-MM-DD)')
    .option('--to <date>', 'End of transaction date range (YYYY-MM-DD)')
    .option('--sort <field>', 'Sort field')
    .option('--order <order>', 'Sort order (asc or desc)')
    .option('--limit <n>', 'Limit', '20')
    .option('--page <n>', 'Page', '1')
    .action(
      async (
        options: {
          space?: string;
          account?: string;
          search?: string;
          status?: string;
          from?: string;
          to?: string;
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

        if (options.order !== undefined && options.order !== 'asc' && options.order !== 'desc') {
          throw new CLIError(
            `Invalid order "${options.order}". Use asc or desc.`,
            ExitCode.USAGE_ERROR
          );
        }
        const status = parseStatus(options.status);

        spinner.start('Loading bank transactions...');
        const client = getClient(globalOptions);
        const response = await client.bank.listTransactions(spaceId, {
          accountId: options.account,
          searchTerm: options.search,
          status,
          startDate: options.from,
          endDate: options.to,
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

        output(formatter, formatter.formatHeader('Bank Transactions'));
        newline();
        output(
          formatter,
          formatter.formatTable(items, [
            { key: 'id', header: 'ID', width: 30 },
            { key: 'transactionDate', header: 'Date', width: 12 },
            { key: 'amount', header: 'Amount', width: 12 },
            { key: 'currencyCode', header: 'Currency', width: 10 },
            { key: 'status', header: 'Status', width: 10 },
            {
              key: 'name',
              header: 'Name',
              width: 30,
              format: (value, row) => row.merchantName || (value as string) || '-',
            },
          ])
        );
        if (response.totalCount !== undefined) {
          newline();
          output(
            formatter,
            formatter.formatHint(
              `${response.totalCount} total, ${response.matchedCount ?? 0} matched, ${response.unmatchedCount ?? 0} unmatched, ${response.ignoredCount ?? 0} ignored. Positive amounts are money out, negative amounts are money in.`
            )
          );
        }
      }
    );

  transactions
    .command('get')
    .alias('show')
    .description('Show a bank transaction by ID')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Bank transaction ID')
    .action(async (id: string, options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Loading bank transaction...');
      const client = getClient(globalOptions);
      const transaction = await client.bank.getTransaction(spaceId, id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, transaction);
        return;
      }

      printTransaction(formatter, transaction);
    });

  transactions
    .command('link-document')
    .description('Link a bank transaction to a document (invoice or bill)')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Bank transaction ID')
    .argument('<documentId>', 'Document ID')
    .action(
      async (id: string, documentId: string, options: { space?: string }, command: Command) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        spinner.start('Linking bank transaction...');
        const client = getClient(globalOptions);
        const transaction = await client.bank.linkTransactionToDocument(spaceId, id, documentId);
        spinner.stop();

        if (globalOptions.json) {
          output(formatter, transaction);
          return;
        }

        output(formatter, formatter.formatSuccess(`Linked ${id} to document ${documentId}`));
      }
    );

  transactions
    .command('link-company')
    .description('Link a bank transaction to a company (status stays unchanged)')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Bank transaction ID')
    .argument('<companyId>', 'Company ID')
    .action(
      async (id: string, companyId: string, options: { space?: string }, command: Command) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        spinner.start('Linking bank transaction...');
        const client = getClient(globalOptions);
        const transaction = await client.bank.linkTransactionToCompany(spaceId, id, companyId);
        spinner.stop();

        if (globalOptions.json) {
          output(formatter, transaction);
          return;
        }

        output(formatter, formatter.formatSuccess(`Linked ${id} to company ${companyId}`));
      }
    );

  transactions
    .command('unlink')
    .description('Remove the document and company links of a bank transaction')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Bank transaction ID')
    .action(async (id: string, options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Unlinking bank transaction...');
      const client = getClient(globalOptions);
      const transaction = await client.bank.unlinkTransaction(spaceId, id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, transaction);
        return;
      }

      output(
        formatter,
        formatter.formatSuccess(`Unlinked ${id} (status ${transaction.status || '-'})`)
      );
    });

  transactions
    .command('ignore')
    .description('Mark a bank transaction as ignored')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .argument('<id>', 'Bank transaction ID')
    .action(async (id: string, options: { space?: string }, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      const spaceId = resolveSpaceId(options.space);

      spinner.start('Ignoring bank transaction...');
      const client = getClient(globalOptions);
      const transaction = await client.bank.ignoreTransaction(spaceId, id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, transaction);
        return;
      }

      output(formatter, formatter.formatSuccess(`Ignored ${id}`));
    });

  transactions
    .command('create-payment')
    .description('Create a payment from a bank transaction and mark it as matched')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--company <id>', 'Company ID of the payment')
    .option('--payment-method <id>', 'Payment method ID')
    .option('--document <id>', 'Document ID to allocate the payment to')
    .option('--notes <text>', 'Notes for the payment')
    .argument('<id>', 'Bank transaction ID')
    .action(
      async (
        id: string,
        options: {
          space?: string;
          company?: string;
          paymentMethod?: string;
          document?: string;
          notes?: string;
        },
        command: Command
      ) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        spinner.start('Creating payment...');
        const client = getClient(globalOptions);
        const payment = await client.bank.createPaymentFromTransaction(spaceId, id, {
          companyId: options.company,
          paymentMethodId: options.paymentMethod,
          documentId: options.document,
          notes: options.notes,
        });
        spinner.stop();

        if (globalOptions.json) {
          output(formatter, payment);
          return;
        }

        output(
          formatter,
          formatter.formatSuccess(
            `Created payment ${payment.id} (${payment.amount ?? '-'} ${payment.currency || ''})`.trim()
          )
        );
      }
    );

  transactions
    .command('update')
    .description('Update the notes or status of a bank transaction')
    .option('-s, --space <id>', 'Space ID (fallback: config defaultSpaceId)')
    .option('--notes <text>', 'Notes for the transaction')
    .option('--status <status>', 'New status (PENDING, POSTED, MATCHED, IGNORED)')
    .argument('<id>', 'Bank transaction ID')
    .action(
      async (
        id: string,
        options: { space?: string; notes?: string; status?: string },
        command: Command
      ) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const spaceId = resolveSpaceId(options.space);

        if (options.notes === undefined && options.status === undefined) {
          throw new CLIError(
            'Nothing to update. Pass --notes and/or --status.',
            ExitCode.USAGE_ERROR
          );
        }
        const status = parseStatus(options.status);

        spinner.start('Updating bank transaction...');
        const client = getClient(globalOptions);
        const transaction = await client.bank.updateTransaction(spaceId, id, {
          notes: options.notes,
          status,
        });
        spinner.stop();

        if (globalOptions.json) {
          output(formatter, transaction);
          return;
        }

        output(formatter, formatter.formatSuccess(`Updated bank transaction ${id}`));
      }
    );
}
