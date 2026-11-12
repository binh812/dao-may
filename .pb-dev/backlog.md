# Backlog file (pb-dev)

Nguồn chính là GitHub Issues (`gh issue list --label pb-dev:san-sang`). File này giữ những việc
chưa lên GitHub hoặc chỉ làm trên máy (dữ liệu cơ quan). Mỗi dòng phải có tiêu chí nghiệm thu.

Mẫu: `- [ ] <tiêu đề> — Khi <tình huống> thì app phải <kết quả>. Kiểm chứng: <lệnh/ảnh>. Phạm vi: <file/module>.`

## Chưa xếp đợt


## Khởi tạo 12/11/2026
- Cổng nhanh `verify-quick.ps1`: 4,6 giây (kiểm 19 module + mở trang ở mức Vừa). Cổng đầy đủ `ci.ps1`: 31 giây (3 mức đồ họa + 6 kiểu thời tiết), xanh.
- Thử cổng: thêm một dòng gây ReferenceError vào `src/fx/weather.js` → `pbdev stop-gate` trả mã 2, log nêu đúng lỗi; hoàn tác → mã 0.
- Chưa có test đơn vị nào (hàm độ cao, bậc thang, suối đang phụ thuộc `ImprovedNoise` nạp từ CDN nên chưa chạy được trong Node).
- CI GitHub chưa chạy lượt nào (repo chưa có remote).

## Chưa xếp đợt (ghi từ phiên 12/11/2026)
- [ ] Đo FPS trên điện thoại thật — Khi mở trang ở mức Vừa trên điện thoại của anh Ben thì app phải giữ ≥ 30 fps ở cả 7 kiểu thời tiết. Kiểm chứng: số FPS ở bảng góc trái, anh Ben đọc. Phạm vi: `core/quality.js`, `render/post.js`.
- [ ] Đóng gói three.js vào repo — Khi máy không có mạng thì trang vẫn phải mở được. Kiểm chứng: `scripts/smoke.mjs` chạy khi ngắt mạng. Phạm vi: `index.html` (import map).
- [ ] Phản chiếu trên mặt nước — Khi nhìn ao ở góc thấp thì phải thấy bóng vách đá và cây. Kiểm chứng: ảnh chụp `cam=-3,1.5,9`. Phạm vi: `world/water.js`.
- [ ] Nét cọ trên đá và vách — Khi nhìn gần vách đá thì bề mặt phải có vệt màu vẽ tay, không còn mặt đa giác trơn. Kiểm chứng: ảnh chụp cận. Phạm vi: `world/flora.js`, `world/materials.js`.
