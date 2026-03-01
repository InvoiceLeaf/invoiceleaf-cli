import { Command } from 'commander';
import { registerCommands } from './commands';
import { handleError } from './utils';

export function createProgram(): Command {
  const program = new Command();

  program
    .name('invoiceleaf')
    .description('InvoiceLeaf CLI')
    .version('0.1.0', '-v, --version', 'Display version number')
    .option('--json', 'Output JSON')
    .option('--no-color', 'Disable colors')
    .option('--api-key <key>', 'API key for authentication')
    .option('--token <token>', 'Bearer token for authentication')
    .option('--api-url <url>', 'Override API base URL')
    .option('-q, --quiet', 'Suppress non-essential output')
    .option('--verbose', 'Verbose output')
    .helpOption('-h, --help', 'Display help information')
    .addHelpText(
      'after',
      `
Examples:
  $ invoiceleaf auth apikey --set il_your_key
  $ invoiceleaf auth token --set eyJhbGci...
  $ invoiceleaf spaces list
  $ invoiceleaf documents list --space <spaceId>
  $ invoiceleaf profile show
`
    );

  registerCommands(program);

  program.on('command:*', () => {
    console.error(`Error: Unknown command '${program.args.join(' ')}'`);
    console.error('Run "invoiceleaf --help" for usage information.');
    process.exit(2);
  });

  return program;
}

export async function run(argv: string[] = process.argv): Promise<void> {
  const program = createProgram();

  try {
    await program.parseAsync(argv);
  } catch (error) {
    handleError(error);
  }
}
