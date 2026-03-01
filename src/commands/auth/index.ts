import type { Command } from 'commander';
import { registerApiKeyCommand } from './apikey';
import { registerTokenCommand } from './token';
import { registerStatusCommand } from './status';
import { registerLogoutCommand } from './logout';

export function registerAuthCommands(program: Command): void {
  const auth = program.command('auth').description('Authentication commands');

  registerApiKeyCommand(auth);
  registerTokenCommand(auth);
  registerStatusCommand(auth);
  registerLogoutCommand(auth);
}
