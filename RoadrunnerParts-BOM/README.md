# Roadrunner Parts Ledger

A focused single-machine appliance BOM ledger.

## Contract

Machine fields:

- `machine_id` — manual entry only
- `brand`
- `model`
- `serial`
- `notes` — optional machine-level notes only

BOM row fields:

- `part_number`
- `diagram_id`
- `description`
- `encompass_price`

No per-part notes, source columns, status columns, availability columns, suggested resale columns, or eBay URL columns belong in the BOM spreadsheet.

## Actions

- `Lookup BOM`: server-side lookup, Encompass first, fallback pricing allowed when Encompass has no price.
- `Import CSV` / `Import XLSX`: only four BOM columns are retained; unsupported columns are ignored.
- `Export CSV` / `Export XLSX`: exports only four BOM columns, with optional machine metadata header/sheet.
- `eBay Active` / `eBay Sold`: buttons only; URLs are not stored on BOM rows.
- `Pull`: stages rows for a pull-list export using the same four BOM columns.

## Development

```bash
npm install
npm run dev
npm run typecheck
npm run build
npm test
```

Server persistence requires `DATABASE_URL`. Without it, the UI still runs as a client-local ledger using localStorage.
