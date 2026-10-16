# Fundamental KPI — Rule Registry (10/2026, working extract)

**Primary authority:** Công văn số 21 ngày 01/10/2026, trang 4–10, mục 2.2–2.8 và 8.1–8.2. **Target source:** KPI_MASTER_THANG_10_2026_DA_KIEM_TRA.xlsx; REV3 remains CANDIDATE/HOLD. **Snapshot:** DanhSachChiTietDonHang - 2026-10-15T200803.768.xlsx (cumulative replacement). **Confirmed by Supervisor:** LPPC target 4.7, promotion SKUs 97HP00098/97KM03960/97KM04092 excluded, only positive-sales lines.

| KPI | Rule | Target | Important QA |
|---|---|---|---|
| ASO ALL | Unique L1 OFF/ON MCP outlets with valid Masan SKU MOQ | Employee KPI Master; 80% MCP reference | MCP assignment, status, unique outlets |
| PC 4 Line (PC_BT) | Successful order with >=4 distinct qualifying SKU lines; max 1 per outlet/day, L1 OFF | Employee KPI Master | 8.1/8.2, status, dedup |
| LPPC | Total qualifying lines of >=4-line PC orders / qualifying PC count, excluding Processed Meats & Beer | 4.7, supervisor confirmed | Do not average individual LPPC ratios for Team |
| LPPC Meat | Total qualifying Meat lines on >=1-line Meat PC orders / Meat PC count; max 1 PC/outlet/day | 3.8 | Verify SKU Meat membership |
| PC ON | Successful L1 ON order with >=1 valid SKU line; max 1 PC/outlet/day | Employee KPI Master | Channel classification |
| ASO FOCUS 1 | Unique valid outlets for Trà Búp Non Tea 365, MOQ 8.2 | 72/outlet per employee | Focus SKU list |
| ASO FOCUS 2 | Unique valid outlets for Homey Jeju 2.9kg, SKU MOQ | 26/outlet per employee | Exact SKU |

**MOQ 8.1:** Each SKU must independently satisfy its minimum per order, including Z SKUs. **MOQ 8.2:** Special groups (Omachi Hộp/Ly, Omachi Tô, Cao Bồi Xốt Lắc, Cao Bồi, Trà Búp Non Tea 365, Compact) must satisfy BOTH group minimum per order AND per-SKU minimum. Group aggregation never substitutes for per-SKU MOQ.

**Source status / blockers:** Product Master SKU/MOQ conversions and some Meat memberships are not yet fully verified against this RAW. 'Đã đóng' vs successful order semantics and treatment of 'Đang giao'/'Đã gửi đơn' for each KPI must follow approved Real-time rule; no automatic extrapolation from revenue rule. Do not publish fabricated actuals. Per-KPI null actuals permitted in PILOT only when explicitly marked as not validated; no false zero.

**Team:** additive KPIs may sum employee targets/actuals after verifying unique assignment; LPPC and LPPC Meat use engine-calculated aggregate numerator/denominator, not sum or simple average. Color comparisons use Timegone but do not display it.
