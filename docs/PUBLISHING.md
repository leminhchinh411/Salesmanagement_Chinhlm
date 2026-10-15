# Quy trình phát hành dữ liệu — V1

## Trạng thái
- `UNPUBLISHED`: chưa có dữ liệu được phát hành.
- `PILOT`: dữ liệu thử nghiệm được cho phép công khai, có giới hạn rõ ràng.
- `PUBLISHED`: batch đã được Supervisor phê duyệt phát hành; **không có nghĩa KPI chính thức**.

## QA bắt buộc trước khi phát hành dữ liệu KPI
1. Xác minh ngày chốt, kỳ, nguồn RAW, phiên bản Master và Rules.
2. Đối chiếu đủ 11 NVBH, MCP và SKU theo phạm vi được xác nhận.
3. Kiểm tra trùng đơn, trạng thái, MOQ, hệ số quy đổi, số tiền > 0 và đối soát tổng.
4. Đảm bảo snapshot lũy kế mới thay thế trạng thái hiện hành, không cộng nối.
5. Đánh dấu riêng KPI READY / PILOT / BLOCKED; không công bố kết quả BLOCKED như chính thức.
6. Loại bỏ dữ liệu RAW, định danh khách hàng, thông tin cá nhân và coaching riêng tư khỏi toàn bộ file công khai.
7. Supervisor phê duyệt bản phát hành và lưu bằng chứng QA ngoài website.
8. Commit JSON đã phê duyệt; chờ GitHub Actions deploy thành công; mở website kiểm tra metadata và các tab.
9. Nếu lỗi, revert commit đã phát hành, deploy lại và kiểm tra URL.

## Mẫu metadata
```json
{
  "schema_version": 1,
  "publication": {
    "status": "PUBLISHED",
    "cutoff_date": "YYYY-MM-DD",
    "source": "Tên nguồn đã được phép công khai",
    "version": "YYYYMMDD-v1",
    "published_at": "YYYY-MM-DDTHH:mm:ss+07:00",
    "qa_status": "PASSED"
  }
}
```

Không tự điền PUBLISHED nếu chưa kiểm tra và phê duyệt. V1 chỉ có manifest metadata, chưa có API upload hay Calculation Engine.
