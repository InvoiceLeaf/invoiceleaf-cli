# InvoiceLeaf CLI

CLI for interacting with the InvoiceLeaf API through `@invoiceleaf/typescript-sdk`.

## Install (local package)

```bash
cd packages/invoiceleaf-cli
npm install
npm run build
```

## Usage

```bash
invoiceleaf --help
invoiceleaf auth status
invoiceleaf auth apikey --set il_your_key
invoiceleaf spaces list
invoiceleaf documents list --space <spaceId>
```

## Auth

You can authenticate using any of:
- `--api-key` / `INVOICELEAF_API_KEY` / `invoiceleaf auth apikey --set ...`
- `--token` / `INVOICELEAF_ACCESS_TOKEN` / `invoiceleaf auth token --set ...`
