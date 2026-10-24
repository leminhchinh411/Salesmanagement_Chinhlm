# PRE-FLIGHT — chuẩn bị cập nhật RAW mới
Ngày rà soát: 2026-10-24. Snapshot đang công bố: 2026-10-22.

## Trạng thái nguồn
- 11 NVBH, 1702 MCP, REV5 Candidate được phép dùng làm Master vận hành, chưa Official.
- AG trước chiết khấu 3568106794.56; AK sau chiết khấu 3409606418.56.
- 1274 MCP có mua dương; ASO ALL đã xác minh MOQ tối thiểu 1219.
- PC đã xác minh 2248, REVIEW 141 cửa hàng-ngày. Giới hạn 1 PC/MCP/ngày.
- Fundamental LPPC, LPPC Meat, PC ON, ASO Focus chưa có actual đã kiểm thử trong JSON.
- CAT/BRAND và tăng trưởng vẫn phụ thuộc nguồn 2026-10-16; chưa thể tuyên bố đã tái tính đến 2026-10-22.
- Action Center có 7 MCP mới chưa có lịch tuyến. Target 0 hợp lệ.
- Manifest chốt 2026-10-22, trạng thái PILOT. Bảo toàn Dashboard nhiều tab hiện hành.

## Các lỗi/gate cần xử lý khi nhận RAW
1. Xác định dữ liệu mới là snapshot lũy kế hay chỉ kỳ phát sinh. Snapshot lũy kế thay thế cùng phạm vi cũ; KHÔNG cộng trùng.
2. Soát tên cột, ngày, trạng thái, mã đơn, mã NVBH, MCP, SKU, số lượng, đơn vị và hệ số quy đổi.
3. Soát tổng tiền >0 và trạng thái Not Cancel/Pending theo quy tắc real-time; doanh số Đã đóng tách riêng.
4. Khớp Product/MOQ Master SKU, MOQ SKU và MOQ nhóm; lập danh sách REVIEW có số tiền và KPI ảnh hưởng.
5. PC: ít nhất 1 SKU đạt MOQ, 1 PC/MCP/ngày; PC ON và LPPC không tự thay công thức.
6. ASO ALL: unique MCP có SKU đạt MOQ; ASO Focus theo SKU Master. Bao phủ KPI riêng.
7. Tái tính CAT/BRAND (không trùng nhau), Gia Vị/Ponnie/Cà Phê theo rule đã chốt và điều kiện giao nhiệm vụ.
8. Khớp 11 NVBH, 1702 MCP (hoặc Master mới đã xác nhận), 7 ngành; kiểm tra đơn trùng và chênh AG/AK.
9. Soát 7 MCP chưa lịch tuyến; không bịa lịch. Target 0 hợp lệ.
10. Chỉ ghi đè dữ liệu Dashboard khi tổng/chi tiết đối soát; đánh dấu 0 — HOLD cho KPI chưa xác minh.
11. Sau khi ghi GitHub: fetch lại file, soát cutoff/QA/version; không khẳng định GitHub Pages runtime đã QA nếu chưa kiểm tra trình duyệt.

## Điểm còn mở trước khi có RAW mới
- Bảng kiểm toán PC cũ 2440 đơn không chứa ngày đơn, nên không thể kiểm chứng độc lập phép loại 34 PC trùng cửa hàng/ngày chỉ từ JSON đó. Cần RAW có ngày giao dịch để tái kiểm.
- 141 cửa hàng-ngày REVIEW cần xử lý MOQ nhóm/đơn vị theo Master, không tự quy về đạt hoặc không đạt.
- Phạm vi chương trình và công văn vẫn cần đối chiếu theo các bảng giao nhiệm vụ đang có.
- Script sales-overview-bridge.js có điều kiện cố định ngày 2026-10-22 cho ASO mua hàng; cần thay khi công bố snapshot mới.
- Fundamental-kpi.js vẫn tải cảnh báo chẩn đoán 16/10; phải ghi nhãn lịch sử, không coi là kết quả mới.

Trạng thái: READY_TO_RECEIVE_RAW. Không đồng nghĩa toàn bộ KPI đã PASS.
