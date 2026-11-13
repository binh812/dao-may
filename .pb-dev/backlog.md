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

## Chơi không mạng (13/11/2026)
- Xong: three.js 0.180 nằm trong `vendor/three` (16 file, 2,1 MB), không còn địa chỉ ngoài nào; `sw.js` + `asset-manifest.json` + `manifest.webmanifest` + icon.
- Kiểm chứng: `node scripts/offline-check.mjs` đạt (113 yêu cầu khi có máy chủ; tắt máy chủ rồi mở lại vẫn chạy). Tắt service worker thì bài kiểm này đỏ.
- Hai mục "Đóng gói three.js" ở trên coi như xong.
- [ ] Cài lên điện thoại để chơi khi không có Wi-Fi — Khi mở game từ biểu tượng trên màn hình chính lúc bật chế độ máy bay thì game phải chạy. Cần một địa chỉ HTTPS (GitHub Pages hoặc Pangolin); anh Ben quyết nơi đặt. Kiểm chứng: anh Ben thử trên điện thoại.
- [ ] Mở cổng tường lửa Windows cho cổng 8123 nếu điện thoại không vào được địa chỉ mạng nội bộ — anh Ben tự làm.

## Thế giới thứ hai: Thung lũng (13/11/2026)
- Xong: tách thế giới khỏi phần game dùng chung (`world/realm.js`); thêm `?world=valley` (thung lũng 2,4 km kiểu tranh vẽ), nút "Sang Thung lũng / Sang Đảo Mây" trong trận và hàng chọn thế giới ở bảng điều khiển.
- Kiểm chứng: 60 test xanh; cổng đầy đủ xanh; kiểm khởi động thung lũng ở 3 mức, mưa, đêm, chế độ ngắm, thẻ bài tập; ảnh chụp ngang và dọc đã tự xem.
- [ ] Đo FPS thung lũng trên điện thoại — Khi chơi ở mức Vừa thì phải ≥ 30 fps. Lớp nét cọ (36 mẫu mỗi điểm ảnh ở mức Vừa) và 10 nghìn cây thông là hai thứ nặng nhất; tắt thử bằng nút "Nét cọ". Kiểm chứng: anh Ben đọc số FPS.
- [ ] Thung lũng chưa có nội dung riêng: Bóng Lặng chỉ xuất hiện quanh chỗ sinh; làng, cối xay, rừng chưa có gì để làm. Chưa có sông, hồ, đường mòn, người dân.
- [ ] Núi xa còn là nón đều; mây chưa trôi; Cây Tâm còn là khối cầu trơn (cả hai thế giới).
- [ ] Chạy 1 km mất hơn 3 phút — cần chạy nhanh hoặc lượn xa cho thế giới rộng.

## Số đo trên điện thoại của anh Ben (13/11/2026)
- 60 fps ở cả Đảo Mây và Thung lũng (anh Ben báo; chưa rõ mức đồ họa đang chạy, mặc định trên điện thoại là Vừa). Việc "Đo FPS" ở các mục trên coi như xong cho máy này.

## Hành trình trong thung lũng (13/11/2026)
- Xong: giữ cần hết cỡ 1,2 giây thì Mầm tăng tốc dần tới 1,9 lần (chỉ ở thế giới rộng); mỗi chuyến Bóng Lặng ngủ ở một nơi xa dần (đồi cỏ, bìa đồng, đường xuống thung, mép làng, cối xay, bìa rừng); mũi tên chỉ hướng kèm khoảng cách khi Bóng Lặng ở xa hơn 22 m. Tham số thử: `wave=N`.
- [ ] Chưa ai chơi thử phần này: tốc độ chạy nhanh có vừa không, đi 345 m tới làng có chán không.

## Thung lũng bản vẽ lại (13/11/2026)
- Anh Ben thử máy thật: tốc độ chạy ổn, mức Cao vẫn 60 fps; Đảo Mây sinh động hơn nhưng chật, Thung lũng chưa đạt mức bản mẫu Painted Valley. Hướng đi: lấy Thung lũng làm thế giới chính và làm nó phong phú lên.
- Xong: mây tích có khối nướng sẵn (trắng nắng, xám lam hai tông, mép sắc), mây trôi theo gió; núi tuyết lởm chởm thay nón; mặt đất vẽ ô ruộng, bờ rào, luống cày, đường mòn nối các trại; làng 36 nhà có cửa sổ, ống khói, nhà thờ; cây tán lá instanced dọc bờ rào; hoa dại (trước đó chưa từng hiện vì lỗi shader); bướm, hai đàn chim, bầy cừu; Cây Tâm thành cây hoa hồng; máy quay thấp hơn để thấy nhiều trời.
- Kiểm chứng: ảnh chụp đã tự xem (chỗ sinh, mép làng, giữa đường, khung dọc mức Vừa, đêm mức Thấp, mưa, bão); 63 test xanh; cổng đầy đủ xanh; chơi không mạng đạt.
- [ ] Đo lại FPS trên điện thoại sau bản này (thêm ~1.000 cây tán lá, bướm, lớp vẽ mặt đất; mây thì không tốn thêm lúc chơi nhưng lúc mở game phải nướng một lần).
- [ ] Mép mây ở mức Thấp/Vừa còn gợn bậc thang (do số bước đi tia ít).
- [ ] Chưa có nước (sông, hồ), cầu, hàng rào gỗ, người dân; nhà chưa đổ bóng; cừu đứng yên.
- [ ] Đảo Mây: nếu giữ thì cần mở rộng không gian (anh Ben thấy chật).
