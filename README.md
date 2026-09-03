# InvoiceLeaf CLI

![License](https://img.shields.io/github/license/InvoiceLeaf/invoiceleaf-cli)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![CLI](https://img.shields.io/badge/interface-command--line-444444)
![Last Commit](https://img.shields.io/github/last-commit/InvoiceLeaf/invoiceleaf-cli)

Official command-line interface for InvoiceLeaf.

## Features

- Authenticate with API key or bearer token
- List and inspect spaces, organizations, documents, categories, and tags
- Human-friendly table output and JSON output mode
- Local configuration and session management

## Installation

From npm:

```bash
npm install -g @invoiceleaf/cli
```

From source:

```bash
git clone https://github.com/InvoiceLeaf/invoiceleaf-cli.git
cd invoiceleaf-cli
npm install
npm run build
npm link
```

## Quick Start

```bash
invoiceleaf --help
invoiceleaf auth apikey --set il_your_key
invoiceleaf auth status
invoiceleaf spaces list
invoiceleaf profile show
```

## Authentication

You can authenticate using any of:

- `--api-key` flag
- `INVOICELEAF_API_KEY` environment variable
- `invoiceleaf auth apikey --set <key>` (stored session)
- `--token` flag
- `INVOICELEAF_ACCESS_TOKEN` environment variable
- `invoiceleaf auth token --set <token>` (stored session)

## Commands

- `invoiceleaf auth ...`: manage credentials and check auth status
- `invoiceleaf config ...`: show/set CLI config
- `invoiceleaf profile show`: show current user profile
- `invoiceleaf spaces ...`: list/show spaces
- `invoiceleaf documents ...`: list/show documents
- `invoiceleaf organizations ...`: list organizations
- `invoiceleaf categories list`: list categories for a space
- `invoiceleaf tags list`: list tags for a space
- `invoiceleaf integrations ...`: manage integration marketplace entries

## Integrations

Register and maintain the plugin packages the platform serves. These are the
author-facing endpoints: any authenticated user can create integrations, and
update, delete or submit their own. Admin-only review actions (approve, reject,
disable) are not exposed here. Every command works with an API key, so it is
usable from scripts and CI:

```bash
invoiceleaf integrations list
invoiceleaf integrations get integration-stripe
invoiceleaf integrations get integration-stripe --manifest
```

`sync` reads a package directory's `manifest.json` and `package.json` and
creates the registry entry, or updates it when the manifest `id` already exists.
It is the way to point the platform at a newly published npm version:

```bash
# Preview across every package
invoiceleaf integrations sync integrations/*/ --dry-run

# Register or update one package
invoiceleaf integrations sync integrations/integration-stripe

# Sync, then re-fetch the manifest from the published npm package
invoiceleaf integrations sync integrations/integration-stripe --refresh
```

**Publish to npm before syncing.** The server fetches `manifest.json` from the
npm tarball on create, and again on update whenever the package version changes.
Registering a version that is not on npm fails with a manifest-fetch error. See
`.github/workflows/publish-integrations.yml` for publishing.

The npm package is the source of truth for the manifest, so `sync` sends only
`slug`, `name`, `description`, `packageSource`, `packageVersion` and the
resource limits. It deliberately does not send the local `manifest.json`,
`iconUrl`, `dataAccess` or `externalAuthConfig`: the server derives those from
the published package, and sending local copies would let an edited working tree
diverge the registry from the package the plugin runtime actually loads.

`sync` refuses to run when a package's `manifest.json` version and
`package.json` version disagree. Nothing else enforces that parity, and the
registry resolves packages by npm version, so a mismatch would leave the
platform serving a package whose manifest claims a different version.

**Ownership.** Integrations belong to the user who created them, so sync must
run with an API key for the account that authored them. Updating an integration
owned by someone else returns a permission error, and creating one whose slug is
taken returns a conflict. Newly created integrations are private and start in
`DRAFT`; use `submit-review` to put one in front of an admin for public
marketplace listing.

```bash
invoiceleaf integrations refresh <id>          # re-fetch manifest from npm
invoiceleaf integrations submit-review <id>    # submit for marketplace review
invoiceleaf integrations delete <id>
```

## Output Modes

- Default TTY output: formatted tables and key-value blocks
- `--json`: machine-readable JSON output
- Pipe mode (non-TTY): plain output suitable for scripts

Example:

```bash
invoiceleaf auth status --json
invoiceleaf documents list --space <spaceId> --json
```

## Configuration

Show current config:

```bash
invoiceleaf config show
```

Set values:

```bash
invoiceleaf config set apiUrl https://api.invoiceleaf.com/v1/
invoiceleaf config set defaultSpaceId <spaceId>
```

Use `INVOICELEAF_CONFIG_DIR` to override the local config directory.
