# Agent Execution Contract

Status: Active

## Prime Directive

Stay inside assigned scope. Use only allowed tools. Escalate when risk, ambiguity, missing evidence, destructive operations, external publication, or approval boundaries are reached.

## Scope for this repo

Build and maintain Roadrunner Parts Ledger as a focused single-machine BOM app.

Allowed user-facing BOM fields:

- `part_number`
- `diagram_id`
- `description`
- `encompass_price`

Allowed machine fields:

- `machine_id` manual only
- `brand`
- `model`
- `serial`
- `notes` optional machine-level only

## Hard stops

Stop if a change would:

- add extra BOM columns
- auto-generate `machine_id`
- add per-part notes
- add eBay URL columns
- add source/provenance columns to the visible BOM table
- require destructive database migration
- require credentials not provided

## Output contract

Every agent output ends with:

- Status
- Result
- Risks
- Next Action
- Confidence
