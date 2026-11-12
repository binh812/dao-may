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

## Sau M1 (12/11/2026)
- [ ] Thử tay trên điện thoại thật — Khi kéo cần ảo và bấm Nhảy bằng hai ngón cùng lúc thì Mầm phải chạy và nhảy đồng thời, nhấc ngón ra ngoài vùng thì dừng. Kiểm chứng: anh Ben chơi 2 phút, ghi lại chỗ vướng. Phạm vi: `game/touch-controls.js`.
- [ ] Đưa `node --test` vào cổng Stop — Khi một test lõi đỏ thì `verify-quick.ps1` phải đỏ. Cần anh Ben duyệt vì file được bảo vệ. Phạm vi: `scripts/verify-quick.ps1`, `scripts/ci.ps1`.
- [ ] Vật che nhân vật — Khi bụi cây hoặc tán cây nằm giữa máy quay và Mầm thì phải mờ đi để vẫn thấy Mầm. Kiểm chứng: ảnh chụp khung dọc ở chỗ sinh ra. Phạm vi: `game/play.js`, `world/materials.js`.
- [ ] Cỏ cao che nửa người Mầm — Khi Mầm đứng trong cỏ thì phải thấy được ít nhất 2/3 thân. Kiểm chứng: ảnh chụp. Phạm vi: `world/meadow.js`.
- [ ] Nút Nhảy ở khung dọc 412 px bị cắt mép phải trong ảnh chụp headless — chưa rõ do cửa sổ headless rộng hơn 412 px hay do bố cục. Kiểm chứng: xem trên điện thoại thật. Phạm vi: `game/touch-controls.js`.

## Sau M2 (12/11/2026)
- [ ] Chơi thử với một bé thật — Khi một bé lớp 1–3 chơi một chuyến thì bé phải tự hiểu cách ra chiêu và muốn chơi chuyến nữa. Kiểm chứng: anh Ben quan sát, ghi tỉ lệ bé dùng Lá so với Tia Nắng. Phạm vi: `game/session.js`, `game/battle-core.js`.
- [ ] Đóng gói three.js vào repo để chơi không mạng và cài như ứng dụng (PWA) — cần anh Ben đồng ý cho tải thư viện về. Phạm vi: `index.html`, thư mục `vendor/`.
- [ ] Bài học làm mẫu 30–60 giây khi gặp kỹ năng mới (GDD 5.3) — chưa làm.
- [ ] Đọc to đề bài cho lớp 1–2 bằng giọng đọc của máy (GDD 7) — chưa làm.
- [ ] Các phần chơi khác trong GDD chưa có: đua lượn, chèo bè, mua bán, trồng trọt, trùm, các Linh và chiêu khác ngoài Tia Nắng, nhiều hồ sơ, giới hạn thời gian chơi.
