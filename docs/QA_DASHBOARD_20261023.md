# QA Dashboard 23/10/2026

Snapshot 22/10/2026: RAW 01-15 preserved; 16-22 replaced. MCP REV5 Candidate 1702 unique outlets, 11 employees.

## Verified directly from RAW
- RAW rows: 12854; positive AK lines: 12093; excluded zero/nonpositive: 761.
- Distinct orders: 2440; purchased MCP: 1274; not purchased: 428; rate: 74.85% (without MOQ).
- Before-discount AG: 3568106794.562 VND; after-discount AJ/AK: 3409606418.562 VND; discount: 158500376 VND.
- 177 distinct selling SKUs; no cross-outlet order ID and no cross-employee purchased store.
- 11 employee and 7 division purchase metrics match the published 1702-outlet snapshot.

## Fixed defects
1. CRITICAL: Seven Sub Division sales amounts were stored in wrong order relative to the original UI. Corrected mapping to Coffee, Convenience Foods, Home Care, Nutrition, Processed Meats, Refreshment Drinks, Seasoning.
2. Removed hard-coded Oct18 totals and 1695 MCP figures from app.js overview.
3. Fixed outdated validation 1695/1150 to accept Oct22 snapshot 1702/1274.
4. Added separate unscheduled-new-MCP section for 7 newly added outlets in original Action Center; did not invent visit days.

## Pending / not official
- REV5 remains Candidate.
- Coverage here is distinct positive-sale outlets, not official MOQ-based coverage.
- PC_BT, PC_ON, LPPC, ASO Focus, MOQ, CAT/BRAND and growth programs remain PILOT/HOLD; old customer program data may be as of Oct16.
- Target unit is file x1000 VND (user confirmed). 161 outlets have target_raw=0; need distinguish missing target from explicitly zero targets.
- Seven new MCP outlets lack confirmed routes and L1/L2/L3.
- Browser-level interaction and GitHub Pages deployment not independently tested.

Conclusion: RAW financial reconciliation, purchase-ASO, MCP and division mapping PASS. MOQ/program/target completeness HOLD. Original dashboard layout preserved.
