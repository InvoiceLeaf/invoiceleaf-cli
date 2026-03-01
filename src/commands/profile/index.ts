import type { Command } from 'commander';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import type { GlobalOptions } from '../../types';
import { createSpinner } from '../../utils';

export function registerProfileCommands(program: Command): void {
  const profile = program.command('profile').description('Profile commands');

  profile
    .command('show')
    .description('Show current profile')
    .action(async (_options: object, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      spinner.start('Loading profile...');
      const client = getClient(globalOptions);
      const me = await client.profiles.getCurrentUser();
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, me);
        return;
      }

      output(formatter, formatter.formatHeader('Profile'));
      newline();

      output(
        formatter,
        formatter.formatKeyValue({
          Email: me.email || '-',
          Firstname: me.firstname || '-',
          Lastname: me.lastname || '-',
          Language: me.language || '-',
          Timezone: me.timezone || '-',
          UserId: me.userId || '-',
          DefaultSpaceId: me.defaultSpaceId || '-',
        })
      );
    });
}
