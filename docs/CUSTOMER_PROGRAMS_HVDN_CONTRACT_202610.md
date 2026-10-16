# Hội Viên Doanh Nhân — Customer Programs dashboard contract (October 2026)

**Status:** UI BUILT / DATA NOT PUBLISHED. GitHub Pages is public; customer names and identifiers are withheld until explicitly approved for public distribution. Existing HVDN Daily Refresh Engine V2 was computed from 13/10 RAW, not the approved 15/10 snapshot; do not reuse its actuals as if current.

**Sources:** Công văn 452/2026; SALES_MANAGEMENT_HVDN_DAILY_REFRESH_ENGINE_V2_DUAL_MCP_2026-10-15.xlsx; SALES_MANAGEMENT_HVDN_452_MAPPING_79_TASKS_2026-10-14.xlsx. Read full official letter before final calculations.

**Schema:** `data/hvdn-public.json` with `schema_version:1`, `approved_for_public:true`, `status:PILOT|PUBLISHED`, `period:"10/2026"`, `cutoff_date`, `employees:[{id,customers:[{id,name,program:"CAT"|"BRAND",tier,target,actual,qualified,tasks:[{name,type:"FOCUS"|"NEW"|"OLD",actual}]}]}]`. 11 employee IDs must match Sales Dashboard. CAT and BRAND mutually exclusive per outlet; deduplicate by outlet across all employee records. No file published without approval.

**Summary:** participants all assigned enrolled outlets; with_sales actual>0; buckets are <50, 50–<80, 80–<100, >=100 of customer revenue target, exclusive and exhaustive; qualified count requires official program conditions, not revenue target alone.

**Details:** all assigned FOCUS must reach >=200k per item; CAT1/CAT3 and BRAND1/BRAND3 with assigned NEW require at least one NEW >=200k; CAT2/BRAND2 no NEW requirement; OLD not mandatory. When NEW required, note 'Tối thiểu 1'; otherwise 'Mua đủ'. Revenue target achievement is separate from qualified program status. Actual uses valid after-discount revenue (Not Cancel/Pending) and product eligibility per official program letter; Paid & Invoiced only for reconciliation.

**Release QA:** 11 employee coverage; unique customer code; no outlet simultaneously CAT and BRAND; correct enrollment and task assignment; approved program letter scope; order status and post-discount amount; positive valid sales; snapshot replace; Team equals employee sum; source/cutoff/version; QA anomalies. No mock customer names or fake zeros on public site.


## Data refresh — 15/10/2026 (PILOT)

Supervisor approved public visibility of customer names and outlet codes on 16/10/2026. `data/hvdn-public.json.gz.b64` is a gzip+base64 encoded JSON snapshot from `HVDN_V15.xlsx`, whose 00_CONTROL identifies `DanhSachChiTietDonHang - 2026-10-15T200803.768.xlsx`. Compression is for transfer only; the data is publicly accessible, not encrypted.

11 NVBH; 280 unique enrolled outlets (178 CAT / 102 BRAND); 3,566 assigned tasks. 271 outlets have positive after-discount Real-time revenue. Revenue target buckets: <50%=210, 50–<80%=57, 80–<100%=4, >=100%=9; provisional qualified=0. Sum of outlet Real-time after-discount revenue: 1,323,596,188.67 VND.

Source hierarchy: enrollment and employee mapping from Master REV3 CANDIDATE; outlet/task revenue from HVDN_V15 (latest RAW 15/10); 79 task SKU mappings remain PROVISIONAL. A zero provisional qualified count must not be represented as company-confirmed reward outcome. Status `PILOT / PROVISIONAL_MAPPING`. For HVDN, new outlets without program enrollment must not be auto-enrolled; this differs from Fundamental MCP eligibility policy.

QA performed: 11 employee assignments, 280 enrollment rows, task count 3,566, unique program membership, four mutually exclusive target buckets, after-discount actual. Independent full reconciliation to company HVDN official closeout is outstanding.
