# Fundamental KPI RAW 15/10/2026 — PILOT QA

Snapshot: `DanhSachChiTietDonHang - 2026-10-15T200803.768.xlsx` (cumulative replacement).
Master: `PRODUCT_MASTER_MOQ_CHOT_NAM_TRUNG_BO_10_2026.xlsx`, MCP REV3 candidate 1,695 outlets.
Rules: Công văn 21/2026, sections 2.2–2.8 and 8.1–8.2; supervisor confirmed positive amount, promotional exclusions, LPPC target 4.7.

## Team Actual (PILOT)

ASO ALL 1083; PC 4 Line 1194; LPPC 5364/1038=5.1676300578; LPPC Meat 1476/412=3.5825242718; PC ON 137; ASO Focus 1 410; ASO Focus 2 293.

11 employee records × 7 KPI are in `data/fundamental-kpi.json`; additive Team totals reconciled to 11 employees. LPPC team values computed by numerator/denominator, not mean of employee ratios.

## QA exceptions — remain unresolved

1. 6 distinct positive-sales SKU missing in Product Master, 8 lines total: `02OM00794` (3), `02OM00968` (1), `03GV00048` (1), `02TB00049` (1), `02OM00871` (1), `08CF00614Z` (1). These were excluded from eligible MOQ lines pending official SKU mapping. Do not assume MOQ or focus/Meat status.
2. 2 outlets outside the current 1,695-MCP candidate list, 53 line items; no L1 assignment verified. Their sales are not automatically counted as MCP coverage/PC.
3. Status policy used: Đã đóng, Đang giao, Đã gửi đơn as provisional Real-time eligibility. This must be confirmed specifically for Fundamental KPI if it differs from Sales Real-time.
4. MOQ quantity: 'Thùng' converted using order line chẵn/lẻ conversion coefficient; other units compare directly against Tổng lẻ. Special groups require both per-SKU MOQ and group minimum within order.
5. LPPC numerator uses the largest qualifying line count per outlet/day for a counted PC. If official order-level LPPC treats multiple qualifying orders in one outlet/day differently, reconcile before release.
6. 27 working days, Timegone 13/27 (48.1481%) provisional.

**Status:** `PILOT / PARTIAL_RECONCILED_SKU_MAPPING_PENDING`. This is a management preview, not company official incentive payout.
