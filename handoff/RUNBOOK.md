# Pilot execution checklist

1. Daily Tracking exports a precomputed snapshot and audit for the same cutoff.
2. Stage locally: `node handoff/tools/stage.js snapshot.json audit.json run-20261016-01`.
3. The stage script is experimental: it does NOT yet attach RAW partition hashes. Its manifest therefore fails the source-provenance gate. Do not promote.
4. Complete provenance (01–15 and 16–cutoff source filenames and SHA-256), versions of Master and Rules, and QA evidence.
5. Run `node handoff/tools/validate.js handoff/candidates/2026-10-16/run-20261016-01`.
6. Fix all errors and obtain explicit release approval before any production change.

Current result: No verified 2026-10-16 handoff has been found. The public Dashboard remains on its previous snapshot. This pilot branch must not be merged or deployed until QA passes.
