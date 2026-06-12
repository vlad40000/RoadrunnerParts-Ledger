# Agent Handoff

## Current Progress
- Rebuilt the uploaded ZIP into a focused Roadrunner Parts Ledger app.
- Removed inherited dashboard/cockpit architecture, legacy scripts, provider regression artifacts, market intelligence UI, eBay listing pipeline, and oversized BOM schemas.
- Added a clean Next.js App Router structure with the accepted machine and BOM contracts.
- Added CSV/XLSX import/export, pull list, eBay Active/Sold buttons, Encompass-first lookup, DLPartsCo fallback adapter, optional Neon/Drizzle schema, and Antigravity `.agents` scaffold.

## Architectural Decisions
- This is a clean scoped rebuild inside the uploaded ZIP package, not a continuation of the old app architecture.
- `machine_id` is manual only and required for saving.
- Machine metadata is separate from BOM rows.
- Machine notes are allowed only at the machine level.
- BOM rows have exactly: `part_number`, `diagram_id`, `description`, `encompass_price`.
- eBay Active/Sold are row actions only and are not exported as BOM fields.
- Encompass remains first pricing source; fallback prices may populate `encompass_price` when Encompass has no value.

## Files Touched / Artifacts Created
- `app/page.tsx`
- `app/layout.tsx`
- `app/globals.css`
- `app/api/**`
- `src/components/**`
- `src/lib/**`
- `src/sources/**`
- `src/server/db/**`
- `drizzle/0001_initial.sql`
- `.agents/**`
- `test/contract.test.ts`
- `README.md`
- `docs/greenfield-scope.md`

## Current Workflow State
- State: Delivered

## Risks / Open Questions
- Build verification was not completed because dependency installation timed out in this sandbox.
- Live Encompass/DLPartsCo markup may need small parser adjustments after real-world testing.
- Server persistence requires `DATABASE_URL`; without it, the UI uses localStorage.

## Immediate Next Steps
1. Run `npm install` locally.
2. Run `npm run typecheck`, `npm run build`, and `npm test`.
3. Smoke test CSV/XLSX import/export with a real four-column BOM file.
4. Test Encompass lookup against known models.

## Verification Status
- Static review: PASS WITH FLAGS
- Build/typecheck/test: Not run; dependency installation timed out in sandbox.

## Confidence
- Medium-high
