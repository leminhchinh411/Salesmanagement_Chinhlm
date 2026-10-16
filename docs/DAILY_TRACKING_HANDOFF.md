# Hợp đồng dữ liệu Daily Tracking → Dashboard (10/2026)
Đường dẫn phát hành: data/sales-actual.json. Không phát hành khi chưa kiểm thử và đối soát.

Schema JSON:
{
 "schema_version": 1,
 "status": "PUBLISHED",
 "qa_status": "PASSED",
 "approved_for_public": true,
 "period": "10/2026",
 "cutoff_date": "YYYY-MM-DD",
 "source": "Tên snapshot danh sách đơn hàng đã đối soát",
 "version": "Mã phiên bản snapshot",
 "timegone_pct": null,
 "employees": [
  {"id": "SM-FM-10KF4093.01", "divisions": [
   {"id": "Coffee", "actual": null}
  ]}
 ]
}
Lưu ý: null ở ví dụ là placeholder; file phát hành phải chứa số thực >=0 cho tất cả 77 cặp NVBH×Sub Division và timegone_pct số 0..100. 11 mã NVBH phải trùng data/targets; 7 ngành hàng theo SALES_DIVS trong sales-overview-bridge.js. Không lấy SO của file Target làm Actual.

QA bắt buộc: đúng kỳ, ngày chốt, snapshot lũy kế thay thế; quy tắc trạng thái Not Cancel/Pending; loại trừ trùng đơn; dòng bán >0; map mã NVBH, Sub Division, SKU; đối soát Team = tổng 11 NVBH = tổng 7 Sub Division; đối chiếu phiên bản Rules và Timegone 27 ngày làm việc tháng 10/2026. Nếu chưa đạt, giữ status khác PUBLISHED hoặc qa_status khác PASSED và không tạo file công khai.

Không đưa raw đơn hàng, dữ liệu cửa hàng, chi tiết khách hàng, chương trình thưởng hoặc thông tin nội bộ không được phê duyệt vào repo công khai.
