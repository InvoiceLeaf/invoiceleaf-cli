import type { Command } from 'commander';
import { registerAuthCommands } from './auth';
import { registerConfigCommands } from './config';
import { registerProfileCommands } from './profile';
import { registerSpacesCommands } from './spaces';
import { registerDocumentsCommands } from './documents';
import { registerOrganizationsCommands } from './organizations';
import { registerCategoriesCommands } from './categories';
import { registerTagsCommands } from './tags';
import { registerIntegrationsCommands } from './integrations';
import { registerCompaniesCommands } from './companies';
import { registerPaymentsCommands } from './payments';
import { registerBankCommands } from './bank';
import { registerExportsCommands } from './exports';
import { registerStatisticsCommands } from './statistics';
import { registerTaxCommands } from './tax';

export function registerCommands(program: Command): void {
  registerAuthCommands(program);
  registerConfigCommands(program);
  registerProfileCommands(program);
  registerSpacesCommands(program);
  registerDocumentsCommands(program);
  registerOrganizationsCommands(program);
  registerCategoriesCommands(program);
  registerTagsCommands(program);
  registerIntegrationsCommands(program);
  registerCompaniesCommands(program);
  registerPaymentsCommands(program);
  registerBankCommands(program);
  registerExportsCommands(program);
  registerStatisticsCommands(program);
  registerTaxCommands(program);
}
