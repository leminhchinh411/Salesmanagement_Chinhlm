# Dashboard handoff adapter and acceptance test

The Dashboard currently reads `data/sales-actual.json` and 11 target files. It does not automatically read `handoff/candidates/`.

## Safe acceptance flow
1. Daily Tracking produces a reconciled 11x7 snapshot, audit and source manifest.
2. Validate the candidate with `handoff/tools/validate.js`.
3. Review cutoff, 2 RAW partitions, employee IDs, division order, totals and working-day progress.
4. Explicitly approve promotion. Until then, keep the current public `data/sales-actual.json` unchanged.
5. After approval, adapt the validated snapshot to `data/sales-actual.json`, update `data/tracking-status.json` and `data/manifest.json` consistently, then smoke-test web and mobile.
6. Store an audit record of the promoted candidate and its Git commit.

IMPORTANT: `stage.js` is an experimental local candidate generator. It currently writes an empty source_partitions array. The candidate will correctly fail validation until provenance is completed. Never treat an empty audit or provisional status as QA PASSED.

Known current public baseline: cutoff 2026-10-15, PILOT, reconciliation pending. No validated 2026-10-16 candidate is accessible here.
