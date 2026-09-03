import { readFileSync, existsSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import type { Command } from 'commander';
import type {
  Integration,
  IntegrationCreateDto,
  IntegrationUpdateDto,
} from '@invoiceleaf/typescript-sdk';
import { createFormatter, newline, output } from '../../output';
import { getClient } from '../../sdk';
import { ExitCode, type GlobalOptions } from '../../types';
import { CLIError, createSpinner } from '../../utils';

/**
 * Shape of an integration's `manifest.json`, limited to the fields the
 * registry cares about.
 */
interface LocalManifest {
  id?: string;
  name?: string;
  version?: string;
  description?: string;
  rateLimit?: number;
  timeoutSeconds?: number;
  memoryMb?: number;
}

interface LocalPackage {
  name?: string;
  version?: string;
  description?: string;
}

interface LocalIntegration {
  dir: string;
  slug: string;
  manifest: LocalManifest;
  pkg: LocalPackage;
}

/**
 * Reads a package directory containing `manifest.json` and `package.json`.
 *
 * The registry keys on `slug`, which is the manifest `id`; the npm package
 * name and version become `packageSource` / `packageVersion`, which is what
 * the plugin runtime resolves the tarball from.
 */
function readLocalIntegration(dir: string): LocalIntegration {
  const root = resolve(dir);
  const manifestPath = join(root, 'manifest.json');
  const pkgPath = join(root, 'package.json');

  if (!existsSync(manifestPath)) {
    throw new CLIError(`No manifest.json in ${root}`, ExitCode.USAGE_ERROR);
  }
  if (!existsSync(pkgPath)) {
    throw new CLIError(`No package.json in ${root}`, ExitCode.USAGE_ERROR);
  }

  const manifestJson = readFileSync(manifestPath, 'utf8');

  let manifest: LocalManifest;
  let pkg: LocalPackage;
  try {
    manifest = JSON.parse(manifestJson) as LocalManifest;
  } catch (error) {
    throw new CLIError(
      `Invalid JSON in ${manifestPath}: ${(error as Error).message}`,
      ExitCode.USAGE_ERROR
    );
  }
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as LocalPackage;
  } catch (error) {
    throw new CLIError(
      `Invalid JSON in ${pkgPath}: ${(error as Error).message}`,
      ExitCode.USAGE_ERROR
    );
  }

  const slug = manifest.id?.trim() || basename(root);
  if (!slug) {
    throw new CLIError(`Could not determine a slug for ${root}`, ExitCode.USAGE_ERROR);
  }

  // The manifest and package versions are independent fields with nothing
  // enforcing parity, but the registry resolves packages by npm version, so a
  // mismatch means the platform serves a package whose manifest claims a
  // different version.
  if (manifest.version && pkg.version && manifest.version !== pkg.version) {
    throw new CLIError(
      `${slug}: manifest.json version (${manifest.version}) does not match ` +
        `package.json version (${pkg.version}). Fix the mismatch before syncing.`,
      ExitCode.USAGE_ERROR
    );
  }

  return { dir: root, slug, manifest, pkg };
}

/**
 * Builds the registry payload.
 *
 * Deliberately omits `manifestJson`, `iconUrl`, `dataAccess`,
 * `externalAuthConfig` and `version`: the server derives all of those from the
 * published npm package (`IntegrationManager.fetchAndApplyManifest`), so the
 * npm tarball stays the single source of truth. Sending the local copy would
 * let a locally-edited manifest.json diverge the registry from the package the
 * plugin runtime actually loads.
 *
 * `packageSource` and `packageVersion` are the fields that matter: they are
 * what the server resolves the manifest from.
 */
function toCreateDto(local: LocalIntegration): IntegrationCreateDto {
  const { manifest, pkg, slug } = local;
  return {
    slug,
    name: manifest.name || pkg.name || slug,
    description: manifest.description ?? pkg.description,
    packageSource: pkg.name,
    packageVersion: pkg.version,
    rateLimit: manifest.rateLimit,
    timeoutSeconds: manifest.timeoutSeconds,
    memoryMb: manifest.memoryMb,
  };
}

function toUpdateDto(local: LocalIntegration): IntegrationUpdateDto {
  const { slug: _slug, ...rest } = toCreateDto(local);
  return rest;
}

async function findBySlug(
  client: ReturnType<typeof getClient>,
  slug: string
): Promise<Integration | null> {
  try {
    return await client.integrations.getBySlug(slug);
  } catch {
    // The endpoint 404s for an unknown slug, which is the normal
    // "not registered yet" path for a first sync.
    return null;
  }
}

function integrationColumns() {
  return [
    { key: 'slug', header: 'Slug', width: 28 },
    { key: 'name', header: 'Name', width: 26 },
    { key: 'packageVersion', header: 'Version', width: 10 },
    { key: 'status', header: 'Status', width: 16 },
  ];
}

export function registerIntegrationsCommands(program: Command): void {
  const integrations = program
    .command('integrations')
    .description('Integration marketplace commands');

  integrations
    .command('list')
    .description('List integrations (published plus your own)')
    .option('--status <status>', 'Filter by status (own integrations only)')
    .option('--search <query>', 'Search query')
    .option('--category <category>', 'Filter by category')
    .option('--page <n>', 'Page number (0-based)', '0')
    .option('--limit <n>', 'Items per page', '50')
    .action(
      async (
        options: {
          status?: string;
          search?: string;
          category?: string;
          page: string;
          limit: string;
        },
        command: Command
      ) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        spinner.start('Loading integrations...');
        const client = getClient(globalOptions);
        const result = await client.integrations.list({
          status: options.status,
          search: options.search,
          category: options.category,
          page: Number(options.page),
          limit: Number(options.limit),
        });
        spinner.stop();

        if (globalOptions.json) {
          output(formatter, result);
          return;
        }

        const items = result.items ?? [];
        output(formatter, formatter.formatHeader('Integrations'));
        newline();
        output(formatter, formatter.formatTable(items, integrationColumns()));
      }
    );

  integrations
    .command('get <idOrSlug>')
    .description('Show a single integration')
    .option('--manifest', 'Print the stored manifest JSON instead')
    .action(
      async (idOrSlug: string, options: { manifest?: boolean }, command: Command) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        spinner.start('Loading integration...');
        const client = getClient(globalOptions);

        // Accept either form: try the id route, fall back to the slug route.
        let integration: Integration;
        try {
          integration = await client.integrations.getById(idOrSlug);
        } catch {
          integration = await client.integrations.getBySlug(idOrSlug);
        }

        if (options.manifest) {
          const manifest = await client.integrations.getManifest(integration.id);
          spinner.stop();
          output(formatter, manifest);
          return;
        }
        spinner.stop();

        if (globalOptions.json) {
          output(formatter, integration);
          return;
        }

        output(formatter, formatter.formatKeyValue(integration as unknown as Record<string, unknown>));
      }
    );

  integrations
    .command('sync <dir...>')
    .description(
      'Create or update registry entries from local package directories ' +
        '(reads manifest.json and package.json)'
    )
    .option('--dry-run', 'Report what would change without writing')
    .option(
      '--refresh',
      'After syncing, re-fetch the manifest from the published npm package'
    )
    .action(
      async (dirs: string[], options: { dryRun?: boolean; refresh?: boolean }, command: Command) => {
        const globalOptions = command.optsWithGlobals<GlobalOptions>();
        const formatter = createFormatter(globalOptions);
        const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

        const locals = dirs.map(readLocalIntegration);
        const client = getClient(globalOptions);
        const results: Array<{
          slug: string;
          action: string;
          id?: string;
          version?: string;
        }> = [];

        for (const local of locals) {
          spinner.start(`Syncing ${local.slug}...`);
          const existing = await findBySlug(client, local.slug);

          if (options.dryRun) {
            results.push({
              slug: local.slug,
              action: existing ? 'would update' : 'would create',
              id: existing?.id,
              version: local.pkg.version,
            });
            spinner.stop();
            continue;
          }

          // Both paths make the server fetch manifest.json from the npm
          // tarball, so the version has to be published before it can be
          // registered. Publish first, then sync.
          let saved: Integration;
          try {
            saved = existing
              ? await client.integrations.update(existing.id, toUpdateDto(local))
              : await client.integrations.create(toCreateDto(local));
          } catch (error) {
            spinner.stop();
            throw new CLIError(
              `${local.slug}: ${existing ? 'update' : 'create'} failed ` +
                `(is ${local.pkg.name}@${local.pkg.version} published to npm, and do you own ` +
                `this integration?): ${(error as Error).message}`,
              ExitCode.API_ERROR
            );
          }

          if (options.refresh) {
            try {
              saved = await client.integrations.refreshManifest(saved.id);
            } catch (error) {
              spinner.stop();
              throw new CLIError(
                `${local.slug}: registry entry saved but manifest refresh failed ` +
                  `(is ${local.pkg.name}@${local.pkg.version} published to npm?): ` +
                  `${(error as Error).message}`,
                ExitCode.API_ERROR
              );
            }
          }

          results.push({
            slug: local.slug,
            action: existing ? 'updated' : 'created',
            id: saved.id,
            version: saved.packageVersion,
          });
          spinner.stop();
        }

        if (globalOptions.json) {
          output(formatter, results);
          return;
        }

        output(formatter, formatter.formatHeader('Sync'));
        newline();
        output(
          formatter,
          formatter.formatTable(results, [
            { key: 'slug', header: 'Slug', width: 28 },
            { key: 'action', header: 'Action', width: 14 },
            { key: 'version', header: 'Version', width: 10 },
            { key: 'id', header: 'ID', width: 36 },
          ])
        );
      }
    );

  integrations
    .command('refresh <id>')
    .description('Re-fetch the manifest from the published npm package')
    .action(async (id: string, _options: unknown, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      spinner.start('Refreshing manifest...');
      const client = getClient(globalOptions);
      const integration = await client.integrations.refreshManifest(id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, integration);
        return;
      }

      output(
        formatter,
        formatter.formatSuccess(
          `Refreshed ${integration.slug} to ${integration.packageVersion ?? 'unknown version'}`
        )
      );
    });

  integrations
    .command('delete <id>')
    .description('Delete an integration you own')
    .action(async (id: string, _options: unknown, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      spinner.start('Deleting integration...');
      const client = getClient(globalOptions);
      await client.integrations.delete(id);
      spinner.stop();

      output(formatter, formatter.formatSuccess(`Deleted ${id}`));
    });

  integrations
    .command('submit-review <id>')
    .description('Submit an integration for public marketplace review')
    .action(async (id: string, _options: unknown, command: Command) => {
      const globalOptions = command.optsWithGlobals<GlobalOptions>();
      const formatter = createFormatter(globalOptions);
      const spinner = createSpinner(!globalOptions.quiet && !globalOptions.json);

      spinner.start('Submitting for review...');
      const client = getClient(globalOptions);
      const integration = await client.integrations.submitForReview(id);
      spinner.stop();

      if (globalOptions.json) {
        output(formatter, integration);
        return;
      }

      output(
        formatter,
        formatter.formatSuccess(`Submitted ${integration.slug} (${integration.status})`)
      );
    });
}
