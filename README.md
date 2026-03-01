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
