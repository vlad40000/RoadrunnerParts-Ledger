# Greenfield Scope

This package intentionally removes the previous RoadrunnerParts dashboard/cockpit architecture. The uploaded ZIP was treated as a salvage/reference package only.

## Removed by design

- AI cockpit homepage
- telemetry dashboards
- source diagnostics UI
- eBay listing editor pipeline
- market intelligence grids
- per-part notes
- source/provenance columns
- availability/status/suggested resale fields
- old prompt workspace artifacts
- old regression/provider scripts
- inherited app dashboard

## Added by design

- clean Next.js App Router homepage
- manual machine intake
- four-field BOM grid
- CSV/XLSX import/export
- Encompass-first lookup route
- DLPartsCo fallback price adapter
- eBay Active/Sold action URL builders
- pull list
- optional Neon/Drizzle schema
- Antigravity `.agents` rules/state scaffold
