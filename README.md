# InvoiceLeaf CLI

![License](https://img.shields.io/github/license/InvoiceLeaf/invoiceleaf-cli)
![Node](https://img.shields.io/badge/node-%3E%3D18-339933?logo=node.js&logoColor=white)
![CLI](https://img.shields.io/badge/interface-command--line-444444)
![Last Commit](https://img.shields.io/github/last-commit/InvoiceLeaf/invoiceleaf-cli)

Official command-line interface for InvoiceLeaf.

## Features

- Authenticate with API key or bearer token
- Search, upload, download and delete documents
- List and inspect spaces, organizations, companies, payments, categories and tags
- List bank connections, accounts and transactions, and reconcile transactions with documents and payments
- Create and download exports, show statistics, inspect tax obligations and filing runs
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

Global options work on every command: `--json`, `--no-color`, `--api-key <key>`,
`--token <token>`, `--api-url <url>`, `-q, --quiet`, `--verbose`.

Space-scoped commands take `-s, --space <id>`. If it is omitted, the CLI uses
the `defaultSpaceId` config value. If neither is set, the command exits with
code 2.

### Auth, config and profile

```bash
invoiceleaf auth apikey --set <key>      # also: --show, --clear
invoiceleaf auth token --set <token>     # also: --show, --clear
invoiceleaf auth status
invoiceleaf auth logout
invoiceleaf config show
invoiceleaf config set <key> <value>     # apiUrl, colors, paginationLimit, defaultSpaceId
invoiceleaf profile show
```

### Spaces and organizations

```bash
invoiceleaf spaces list [--limit <n>] [--page <n>]
invoiceleaf spaces show <id>
invoiceleaf organizations list [--limit <n>] [--page <n>]
```

### Documents

```bash
invoiceleaf documents list [--limit <n>] [--page <n>]
invoiceleaf documents search [filters]
invoiceleaf documents show <id>
invoiceleaf documents upload <file...> [--category <id>] [--tag <id...>]
invoiceleaf documents download <id> [-o <path>]
invoiceleaf documents delete <id>
```

`documents search` filters:

- `--search <query>`
- `--from <date>` and `--to <date>` (YYYY-MM-DD, both are needed for the range to apply)
- `--category <id...>`, `--tag <id...>`
- `--currency <code>`
- `--payment-status <status...>`: UNPAID, PARTIAL, PAID
- `--document-status <status...>`: DRAFT, ISSUED, SENT, CANCELLED, DISPUTED
- `--accounting-type <type...>`: PAYABLE, RECEIVABLE, UNKNOWN
- `--sort <field>`, `--order <asc|desc>`, `--limit <n>`, `--page <n>`

`documents upload` sends one file to the upload endpoint and several files to
the bulk upload endpoint. The files are queued for processing. Put the files
before `--tag`, because `--tag` takes every value that follows it:

```bash
invoiceleaf documents upload invoice-1.pdf invoice-2.pdf --tag <tagId>
```

`documents download` saves the original file. Without `-o` it uses the file
name stored on the document and writes to the current directory.

### Companies and payments

```bash
invoiceleaf companies list [--search <query>] [--limit <n>] [--page <n>]
invoiceleaf companies show <id>
invoiceleaf payments list [filters]
invoiceleaf payments show <id>
```

`payments` are the accounting payments of a space. `payments list` filters:
`--search <query>`, `--company <id>`, `--from <date>`, `--to <date>`,
`--status <status...>` (UNMATCHED, MATCHED, POSTED), `--currency <code>`,
`--limit <n>`, `--page <n>`.

### Bank

```bash
invoiceleaf bank connections list
invoiceleaf bank connections get <id>
invoiceleaf bank connections sync <id>
invoiceleaf bank connections disconnect <id> [-y, --yes]
invoiceleaf bank accounts list [--connection <id>]
invoiceleaf bank accounts get <id>
invoiceleaf bank accounts update <id> [--sync-enabled <true|false>] [--payment-method <id>]
invoiceleaf bank transactions list [filters]
invoiceleaf bank transactions get <id>
invoiceleaf bank transactions link-document <id> <documentId>
invoiceleaf bank transactions link-company <id> <companyId>
invoiceleaf bank transactions unlink <id>
invoiceleaf bank transactions ignore <id>
invoiceleaf bank transactions create-payment <id> [--company <id>] [--payment-method <id>] \
  [--document <id>] [--notes <text>]
invoiceleaf bank transactions update <id> [--notes <text>] [--status <status>]
```

`get` is also available as `show`. `bank transactions list` filters:
`--account <id>`, `--search <query>`, `--status <status>` (PENDING, POSTED,
MATCHED, IGNORED), `--from <date>`, `--to <date>` (YYYY-MM-DD), `--sort <field>`,
`--order <asc|desc>`, `--limit <n>`, `--page <n>`.

Transaction amounts follow the bank feed sign convention: a positive amount is
money leaving the account, a negative amount is money coming in.

`connections disconnect` asks for confirmation. Pass `--yes` to skip the
prompt; without a terminal or with `--json` the flag is required. Imported
transactions are kept. Connecting a new bank needs a browser, so do that in the
web app.

`link-company` only categorizes the transaction and leaves its status as it
is. `unlink` fails while a payment is linked to the transaction: delete the
payment first. `create-payment` creates an accounting payment from the
transaction and marks it as matched; with `--document` the payment is
allocated to that document.

### Categories and tags

```bash
invoiceleaf categories list
invoiceleaf tags list
```

### Exports

```bash
invoiceleaf exports list [--limit <n>] [--page <n>]
invoiceleaf exports create [--format <xls|csv|zip|pdf>] [--from <date>] [--to <date>] \
  [--filename <name>] [--currency <code>] [--category <id...>] [--tag <id...>]
invoiceleaf exports download <id> [-o <path>]
```

Exports are generated in the background. `exports create` returns right away
with state `processing`. Check `exports list` until the state is `success`,
then run `exports download`.

### Statistics

```bash
invoiceleaf statistics show [--from <date>] [--to <date>] [--base-currency <code>]
```

Prints document totals per currency. With `--base-currency` all amounts are
converted to that currency. `--json` returns the full statistics response.

### Tax agent

```bash
invoiceleaf tax obligations list
invoiceleaf tax runs list [--state <state>] [--obligation <id>] [--limit <n>] [--offset <n>]
invoiceleaf tax runs show <id>
```

Run states: SCHEDULED, COLLECTING, BLOCKED, VALIDATED, PREPARED,
AWAITING_APPROVAL, FILING, FILED, REJECTED, ERROR, DEAD_LETTER, CANCELLED.
The CLI only reads obligations and runs. Approving or cancelling a run is not
available from the CLI.

### Integrations

`invoiceleaf integrations list|get|sync|refresh|delete|submit-review`. See the
next section.

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
