# Sales Management — Web Foundation V1

Ứng dụng web tĩnh, mobile-first, công khai chỉ đọc. **Chưa có dữ liệu KPI thực tế**.

## Chạy thử trên máy

Tại thư mục dự án:

```bash
python -m http.server 8000
```

Mở http://localhost:8000 (không mở file `index.html` trực tiếp vì trình duyệt có thể chặn `fetch`). Không cần npm.

## Đưa lên GitHub Pages miễn phí

1. Tạo repository GitHub (chỉ sử dụng dữ liệu đã được phép công khai).
2. Upload toàn bộ nội dung thư mục này lên nhánh `main`, gồm thư mục `.github`.
3. Vào **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Workflow `Deploy static dashboard` sẽ tự triển khai khi push vào `main`.
5. Mở URL dạng `https://<github-user>.github.io/<repo>/` (địa chỉ thực tế do GitHub cấp). Bookmark URL này.

URL giữ nguyên khi cập nhật code hoặc JSON trong cùng repository. Giới hạn và điều khoản gói miễn phí phụ thuộc nhà cung cấp; xác minh phù hợp chính sách doanh nghiệp trước khi dùng.

## Cập nhật dữ liệu

Chỉ thay `data/manifest.json` sau khi QA và Supervisor phê duyệt. Mỗi lần cập nhật, lưu bản JSON cũ theo phiên bản trong kho lưu trữ riêng có kiểm soát hoặc Git history. Nếu cần rollback, revert commit và triển khai lại. Không cộng snapshot lũy kế. Tránh đưa dữ liệu RAW vào repository, kể cả lịch sử commit.

Xem `docs/PUBLISHING.md` để biết kiểm tra bắt buộc.

## Bảo mật

Website là công khai: ai có URL cũng có thể xem nội dung, thậm chí nếu repo là private thì bản website được phát hành vẫn có thể truy cập công khai. Không upload RAW, Excel nội bộ, PII, dữ liệu khách hàng nhạy cảm hoặc coaching riêng tư. `.gitignore` không thay thế kiểm tra nội dung trước khi commit.

## Cấu trúc

- `index.html`: khung trang
- `styles.css`: giao diện responsive
- `app.js`: điều hướng và hiển thị dữ liệu
- `data/manifest.json`: metadata công khai của phiên bản hiện hành
- `.github/workflows/deploy.yml`: CI/CD GitHub Pages
- `docs/PUBLISHING.md`: quy trình phát hành
