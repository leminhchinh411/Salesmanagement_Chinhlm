# Sales Action Center — PILOT 18/10/2026

## Phạm vi
Thêm Tab điều hành theo thứ viếng thăm. Dùng MCP (14), đã được người dùng xác nhận trong chat ngày 18/10/2026; không thay Master REV3, Rules hoặc snapshot KPI. Ngày hiệu lực riêng của MCP chưa có trong nguồn. Quy ước tuần chẵn/lẻ chưa xác nhận nên chọn thủ công, không tự tính lịch tuần hôm nay.

Lịch được trích từ cờ Monday–Saturday và ODD_WEEK, theo Sup `24SF17012-Lê Minh Chính`. Chỉ giữ mã, tên, thứ, tuần và tần suất; không sao chép địa chỉ, GPS, điện thoại, mã số thuế hoặc RAW đơn hàng. SHA-256 nguồn nằm trong gói lịch.

## Kiểm tra đã thực hiện
- 11 NVBH ghép Position code và tên chính xác với targets hiện hành.
- 1.695 mã cửa hàng duy nhất, không trùng quyền phụ trách.
- Tổng lượt tuyến theo thứ: T2 292; T3 297; T4 322; T5 291; T6 273; T7 261. CH đi nhiều thứ xuất hiện ở từng tuyến nhưng chỉ một lần khi xem tất cả thứ.
- T2 tuần lẻ: 216; tuần chẵn: 225. Các số này gồm CH Both. Chưa tự chọn tuần theo ngày hiện tại.
- Chủ nhật không tự xếp lịch. Nút hôm nay tính múi giờ Việt Nam.
- Kiểm thử điều kiện NEW của CAT2/CAT3, OLD không bắt buộc, một NEW đạt trong nhiều lựa chọn, REVIEW và Actual thiếu.
- Chrome headless: lọc 6 thứ, tuần chẵn/lẻ, NVBH, mã CH, P1 và quay về Tab sau khi đổi trang: PASS.
- Hiển thị đủ 11 NVBH; lọc một NVBH còn đúng một thẻ.
- Desktop 1400×1000 và mobile 390×844: đã xem ảnh, không tràn ngang; thanh điều hướng mobile cuộn ngang để không chồng chữ.
- Smoke test Tổng quan doanh số, Fundamental KPI, Chương trình KH, Kỷ luật bán hàng: tải nội dung, không lỗi JavaScript.
- Các module KPI, dữ liệu Actual/Target và engine cũ giữ nguyên; chỉ thêm điều hướng và tài nguyên Tab mới.

## Kết quả và giới hạn
P1/P2/P3 là đề xuất quản trị triển khai trong bản PILOT, chưa phải công thức KPI hoặc xác suất đạt thưởng. Khoảng thiếu của các chương trình không cộng thành doanh số Team.

CAT/BRAND tái sử dụng hàm trạng thái nhiệm vụ hiện hành, xét NEW đúng tier và không bắt buộc OLD. Tăng trưởng sử dụng Actual cấp cửa hàng cùng ngày chốt; dữ liệu thiếu hoặc xung đột vào P3. Dữ liệu sai quyền phụ trách không dùng giao khoảng thiếu.

Danh sách Combo giải nén hiện có 1.407 bản ghi; snapshot Actual tham chiếu 1.687 người tham gia, nên cổng đối soát hiện hành không đạt. Không tự đổi roster, không suy diễn thiếu bản ghi thành zero. Tab mới chỉ đề nghị đối soát, chưa giao việc “chưa mua Combo”.

Chưa có Actual ASO/Focus/Bao phủ cấp cửa hàng đủ căn cứ để đưa mọi cửa hàng thiếu KPI vào danh sách. Không gọi danh sách hành động là đầy đủ toàn bộ KPI.

CALCULATED: chỉ tính khoảng thiếu từ kết quả hiện có. TESTED: logic và trình duyệt như trên. RECONCILED: lịch/MCP và mapping NVBH. CONFIRMED: nguồn tuyến; KPI/thưởng vẫn PILOT/HOLD.

## Phát hành
Người dùng đã xem bản local và cho phép công khai tên/mã khách hàng và lịch tuyến trong chat ngày 18/10/2026. Phạm vi công khai chỉ gồm gói tuyến và cờ mua hàng đã dẫn xuất; không đưa RAW, địa chỉ, GPS, điện thoại hoặc coaching riêng tư lên repo. Không nâng QA của gói KPI hiện hành thành PASS.

## Bản thẻ tinh gọn và trạng thái mua hàng
- Mỗi CH là một thẻ đóng mặc định: tên/mã, trạng thái mua, ưu tiên, tối đa 2 mục cần tập trung. Bấm mở để xem chi tiết.
- Có bộ lọc CHƯA MUA HÀNG và Đã mua hàng.
- Hai RAW được xác minh SHA-256 đúng với manifest QA-RECHECK-02. Đọc từ dòng 5, không bỏ hai dòng đầu dữ liệu.
- 9.373 dòng, 8.751 dòng Tổng tiền >0; 1.769 mã đơn duy nhất, không giao nhau giữa hai phân vùng. Kiểm tra ngày đơn trong đúng phân vùng và chỉ chấp nhận ba trạng thái đã quan sát/xác nhận: Đã đóng, Đang giao, Đã gửi đơn.
- Doanh số trước CK đối soát trong dung sai 0,01đ với 2.554.571.558,91682đ; không ghi lại hay sửa KPI doanh số.
- MCP: 1.118 CH có đơn dương, 577 CH CHƯA MUA HÀNG tính lũy kế 01–16/10. Khớp cổng coverage-positive-orders-pilot theo toàn đội và từng NVBH. Đây là trạng thái mua hàng không MOQ, chưa phải KPI Bao phủ chính thức.
- Nhãn chưa mua dùng sự vắng mặt trong tập RAW đầy đủ, không suy ra từ các chương trình. Store được kiểm tra qua toàn bộ 11 NVBH để tránh nhầm khi đơn ở vị trí khác. Gói phải đủ 1.695 mã duy nhất, đúng chủ tuyến và cùng SHA MCP/ngày chốt; thiếu, null hoặc cũ thì không gán nhãn chưa mua.
- Unit tests: PASS với 577 chưa mua, 1.118 đã mua; stale cutoff, missing record và null flag bị chặn.
- Chrome desktop/mobile: lọc tất cả thứ + chưa mua trả 577 thẻ và 577 nhãn; Thứ 2 có 292 CH, 91 chưa mua; đủ 11 NVBH, không tràn ngang, không lỗi JavaScript.
