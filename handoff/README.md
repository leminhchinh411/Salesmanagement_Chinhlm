# DAILY TRACKING → DASHBOARD | DATA HANDOFF V1

Status: PILOT / HOLD. This branch is not a production release.

## Ownership
- Daily Tracking is the only producer of computed KPI results.
- Dashboard is a read-only consumer. It must not recalculate KPI from RAW.
- RAW is cumulative in two independent monthly partitions (01–15 and 16–cutoff). Replace each partition snapshot, never append snapshots.
- A change in tracking focus changes actions/visibility, not KPI definitions or results.

## Contract
Producer stages one immutable candidate under `handoff/candidates/<YYYY-MM-DD>/<run-id>/`:
- `snapshot.json`: precomputed results for 11 NVBH × 7 Sub Division
- `audit.json`: reconciliation evidence, exception counts, gate results
- `manifest.json`: cutoff, sources, rules/master versions, hashes, QA, release authorization
- `tracking-focus.json` (optional): current operational priorities, effective dates
- `actions.json` (optional): coaching and store-level actions; do not expose sensitive store data publicly

No handoff is automatically approved for public use. Staging must not overwrite `data/sales-actual.json` or `data/manifest.json`.

## Snapshot compatibility
Use `data/sales-actual.json` structure as the initial KPI adapter: schema_version=1; period=10/2026; cutoff_date; source; version; status=PILOT; qa_status; timegone_pct; 11 employees with IDs matching target files; each has 7 numeric actuals in exact order:
Coffee, Convenience Foods, Home Care, Nutrition, Processed Meats, Refreshment Drinks, Seasoning.
`timegone_pct` must be backed by official working-day calendar or marked provisional. Target stays in existing 11 target files; do not recalculate or replace it.

## Required gates
1. 11 distinct known employee IDs, 7 divisions each, 77 nonnegative finite values.
2. Exact period, valid cutoff and snapshot provenance; no older snapshot promoted over newer cutoff.
3. Employee/division totals equal declared team total within documented rounding tolerance; never silently absorb variance.
4. RAW partition boundaries, order ID collisions, status, SKU, MOQ and mapping exceptions audited by producer.
5. `audit.json` explicitly records pass/fail/hold and unresolved issues.
6. Public publication requires separate explicit authorization AND QA PASS. PILOT may be viewed in an internal preview but never silently promoted to public production.

## QA states
CALCULATED, TESTED, RECONCILED, CONFIRMED are separate evidence flags.
HOLD if missing handoff, missing audit, mismatch, unverified status, stale cutoff or unresolved blocking issues.

## Promotion
Review candidate -> validate contract -> record approval -> promote atomically to consumer snapshot/manifest -> smoke-test 11×7 and mobile view -> record release audit. On any failure, keep prior production snapshot unchanged.

## Current baseline
As of contract creation, production snapshot cutoff is 2026-10-15, PILOT, QA RAW_RECALCULATED_RECONCILIATION_PENDING. Do not relabel as 2026-10-16 without a valid Daily Tracking handoff.
