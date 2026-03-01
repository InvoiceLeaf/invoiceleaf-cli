import type { Command } from 'commander';
import {
  defaultConfig,
  getAllConfig,
  getConfigDir,
  setConfig,
} from '../../config';
import { createFormatter, newline, output } from '../../output';
import type { CLIConfig, GlobalOptions } from '../../types';

export function registerConfigCommands(program: Command): void {
  const config = program.command('config').description('CLI configuration commands');

  config
    .command('show')
    .description('Show current configuration')
    .action(async (_options: object, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const current = getAllConfig();

      if (globalOptions.json) {
        output(formatter, { configDir: getConfigDir(), config: current });
        return;
      }

      output(formatter, formatter.formatHeader('CLI Configuration'));
      newline();
      output(formatter, formatter.formatKeyValue({ 'Config Directory': getConfigDir() }));
      newline();

      const configData: Record<string, string> = {};
      for (const [key, value] of Object.entries(current)) {
        configData[key] = String(value);
      }
      output(formatter, formatter.formatKeyValue(configData));
    });

  config
    .command('set')
    .description('Set configuration value')
    .argument('<key>', 'Config key')
    .argument('<value>', 'Config value')
    .action(async (key: string, value: string, _options: object, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);

      const validKeys = Object.keys(defaultConfig).concat(['defaultSpaceId']) as (keyof CLIConfig)[];
      if (!validKeys.includes(key as keyof CLIConfig)) {
        output(formatter, formatter.formatError(`Invalid key: ${key}`));
        output(formatter, formatter.formatHint(`Valid keys: ${validKeys.join(', ')}`));
        process.exit(2);
      }

      const typedKey = key as keyof CLIConfig;
      const defaultValue = defaultConfig[typedKey as keyof typeof defaultConfig];
      let parsedValue: unknown = value;

      if (typeof defaultValue === 'boolean') {
        parsedValue = value === 'true' || value === '1';
      } else if (typeof defaultValue === 'number') {
        parsedValue = Number(value);
        if (Number.isNaN(parsedValue)) {
          output(formatter, formatter.formatError(`Invalid number value: ${value}`));
          process.exit(2);
        }
      }

      setConfig(typedKey, parsedValue as CLIConfig[typeof typedKey]);
      output(formatter, formatter.formatSuccess(`Updated ${key}=${parsedValue}`));
    });
}
