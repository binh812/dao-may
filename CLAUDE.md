# games-3d-lab — hướng dẫn cho Claude

Phòng thử đồ họa và nền của game 3D three.js phong cách tranh vẽ anime, nhắm điện thoại (web). Toàn bộ hình ảnh dựng bằng
code, không asset ngoài. Trả lời anh Ben bằng tiếng Việt có dấu. Kỹ thuật và bẫy đã gặp: skill `threejs-stylized-scene`.

## Lệnh
- Kiểm nhanh (cổng Stop tự chạy, ~5 giây): `scripts/verify-quick.ps1`
- Kiểm đầy đủ (trước khi merge; 3 mức đồ họa + 6 kiểu thời tiết): `scripts/ci.ps1`
- Test lõi game (không cần trình duyệt): `node --test "tests/*.test.mjs"`
- Chạy: `node scripts/serve.mjs` rồi mở địa chỉ nó in ra (máy này và điện thoại cùng Wi-Fi). Không cần Internet: three.js 0.180
  nằm trong `vendor/three` (chép bằng `node scripts/vendor-three.mjs <gói three đã giải nén>`).
- Chơi không mạng: `sw.js` lưu sẵn mọi file trong `asset-manifest.json`. Thêm/xóa file trong `src/`, `vendor/`, `icons/` thì chạy
  `node scripts/make-asset-manifest.mjs` (test `tests/offline.test.mjs` đỏ nếu quên). Kiểm thật: `node scripts/offline-check.mjs`
  (mở một lần, tắt máy chủ, mở lại). Service worker chỉ hoạt động trên HTTPS hoặc localhost, không hoạt động qua `http://192.168...`.
- Tham số URL: `world=island|valley` (chọn thế giới; mặc định `island`), `grade=1|2|3` (tạo hồ sơ tạm, bỏ qua màn chọn lớp), `ask=1` (mở sẵn một thẻ bài tập để chụp ảnh), `mode=view` (ngắm cảnh, Mầm tự nhảy; mặc định là chế độ chơi), `q=low|medium|high`, `w=sun|wind|mist|rain|storm|snow|night`, `at=x,z` (chỉ thung lũng: sinh ra ở chỗ khác để chụp ảnh, vd. `at=285,-200` là mép làng), `yaw=rad` (chỉ thung lũng: hướng máy quay lúc đầu), `shop=1` (mở sẵn bảng đổi đồ), `wear=id,id` (mặc thử trang phục, không lưu), `wave=N`, `cam=x,y,z`, `ui=0`, `spin=0`, `dyn=0`, `flash=0.6`.
- Kiểm hình ảnh: chụp bằng Edge headless theo skill `threejs-stylized-scene` (bước 4), tự đọc ảnh trước khi báo xong.

## Cấu trúc (`src/`, ES module thuần, không build)
- `core/` — `quality.js` (mức đồ họa), `util.js` (seed, nhiễu, `Builder` gộp lưới), `stage.js` (renderer, camera, đèn, uniform dùng chung `U`).
- `world/` — `layout.js` (hàm độ cao, bậc thang, suối: nguồn sự thật về địa hình), `materials.js` (toon ramp, tuyết phủ), và các
  phần dựng cảnh: `island`, `village`, `flora`, `windmill`, `scenery`, `meadow` (cỏ, hoa), `water` (ao, suối, thác), `sky`.
- `game/` — phần chơi. `*-core.js` là luật thuần (không import three.js hay DOM, có test trong `tests/`): `player-core.js`
  (chạy, nhảy, lượn, va chạm), `input-core.js` (cần ảo). `touch-controls.js` đọc cảm ứng và bàn phím, `play.js` nối tất cả với
  nhân vật và máy quay. `world/colliders.js` cấp vật cản và mặt đất cho game.
- `learn/` — hệ học tập, toàn bộ là luật thuần có test: `questions.js` (chương trình lớp 1–3, sinh bài kèm gợi ý và lời giải),
  `adaptive.js` (hồ sơ, xếp lớp, chọn bài theo sức, bài đã sai), `parent-gate.js` (cổng phụ huynh).
- `game/collect-core.js` luật nhặt Hạt Nắng (thuần, có test; thế giới nào đặt `realm.collectibles` thì có), `game/seed-views.js` phần nhìn.
- `game/shop-core.js` luật đổi Hạt Nắng lấy trang phục (thuần, có test): số dư = hạt đã nhặt − giá các món đã đổi; `ui/shop.js` bảng đổi đồ;
  `actors/outfit.js` các món gắn sẵn trên Mầm (id khớp `CATALOG`). Quầy hàng chỉ có ở thế giới đặt `realm.shop`; tủ đồ dùng chung mọi thế giới.
- `game/battle-core.js` luật đối đầu (thuần, có test); `game/session.js` nối trận đấu, học tập, giao diện, âm thanh;
  `game/enemy-views.js`, `game/heart-tree.js`, `game/sfx.js` là phần nhìn và nghe. `ui/hud.js`, `ui/question-card.js`, `ui/notebook.js`.
- `actors/` nhân vật (`mam.js`, dùng chung) và sinh vật của đảo; `fx/` hạt (mưa, tuyết, lá) và `weather.js` (preset + nội suy);
  `render/post.js` hậu kỳ, AO, ánh sáng thể tích, lớp lọc nét cọ (Kuwahara, chỉ bật khi thế giới đặt `paint`); `ui/panel.js`.
- **Nhiều thế giới:** `main.js` chọn thế giới theo `?world=`, nạp `worlds/<tên>.js`, đăng ký qua `world/realm.js`, rồi mới nạp
  `app.js` (đổi kích thước + vòng lặp dùng chung). Phần game (`play`, `session`, `app`, `panel`, `weather`, `post`) chỉ đọc
  `realm` (mặt đất, vật cản, chỗ sinh, bầu trời...), không import module của riêng thế giới nào. Thêm thế giới = thêm một file
  trong `worlds/` + một dòng trong `main.js`.
  - `worlds/island.js` — đảo bay; các module dựng cảnh nằm ở `world/`.
  - `worlds/valley.js` — thung lũng rộng 2,4 km kiểu tranh vẽ; module ở `valley/`: `terrain.js` (hàm độ cao, lưới 10 m, bản đồ
    độ cao cho shader, lớp vẽ mặt đất: ô ruộng, bờ rào, đường mòn; `PATH_GLSL` và `pathDistance` cùng một công thức), `grass.js`
    (cỏ và hoa chỉ sống trong ô 72 m quanh người chơi, quấn theo vị trí), `scenery.js` (rừng thông instanced, cối xay, núi tuyết xa),
    `trees.js` (cây tán lá instanced dọc bờ rào), `village.js` (làng, nhà trại), `stall.js` (quầy hàng cô Thỏ Bông ở cổng làng, vị trí `SHOP` trong `terrain.js`), `life.js` (bướm, đàn chim, cừu), `water.js` (hồ: mặt nước vẽ, lá súng, vịt; Mầm lội nước nông vì `groundAt` kê lên sát mặt hồ),
    `seeds.js` (chỗ đặt Hạt Nắng, id cố định vì tiến độ lưu theo id), `sky.js` (mây tích
    nướng một lần lúc mở game: đi tia qua lớp mây 3D, ghi độ sáng/độ dày vào ảnh toàn cảnh, lúc vẽ cắt ngưỡng thành mảng màu).
- **Thứ tự `import` trong `worlds/island.js` là thứ tự dựng cảnh**: các module của đảo dùng chung một bộ sinh số ngẫu nhiên có
  seed, đổi thứ tự là đổi cả cảnh. Module dùng chung không được gọi `rnd()` của `core/util.js` (hạt mưa có bộ sinh riêng).
- `archive/` — các bản một-file cũ để đối chiếu, không sửa.

## Cách làm việc
1. **Lập kế hoạch tách khỏi thực thi.** Việc lớn hơn một file: đọc code liên quan, viết kế hoạch ngắn, rồi mới sửa.
2. **Sửa nhỏ nhất đủ đạt tiêu chí nghiệm thu.** Không refactor kèm, không thêm tính năng ngoài việc được giao.
3. **Tối đa 3 lần sửa cùng một lỗi.** Lần thứ 3 vẫn đỏ: dừng, ghi rõ đã thử gì, hỏi anh Ben.
4. **Tách lỗi môi trường khỏi lỗi code.** Edge treo vì profile cũ, hết RAM → xử lý môi trường, không sửa code để né.
5. **Bằng chứng trước khi báo xong:** lệnh đã chạy + kết quả; chạm hình ảnh thì có ảnh đã tự xem. FPS trên điện thoại chỉ anh Ben đo được, không suy từ PC.
6. Làm trên nhánh riêng; commit `feat:`/`fix:`/`chore:`…; không commit thẳng lên `main`.

## File được bảo vệ
Danh sách trong `.pb-dev.json` → `protected`. Chỉ đổi khi anh Ben duyệt.

## Luật và cái gì cưỡng chế
| Luật | Cưỡng chế bằng | Từ lỗi nào (key, ngày) |
|---|---|---|
| Không commit thẳng lên `main`, không `--no-verify`, không force-push | hook `pbdev guard` | (mặc định pb-dev) |
| Không báo xong khi kiểm tra đỏ | cổng Stop (`verify.quick`) | (mặc định pb-dev) |
| Mỗi module ≤ 400 dòng; import tương đối phải tồn tại và tên phải được export | `scripts/check-modules.mjs` | main.js một file 1.160 dòng, 12/11/2026 |
| Luật di chuyển của Mầm (12 tình huống) | `tests/player-core.test.mjs` — hiện chỉ chạy trên CI GitHub và khi gọi tay, chưa nằm trong cổng Stop | M1, 12/11/2026 |
| Bài tập phải đúng: đáp án tính lại độc lập, 4 lựa chọn khác nhau, gợi ý không lộ đáp án, lời giải kết bằng "Đáp số" | `tests/learn.test.mjs` (400 bài mỗi kỹ năng) | M2, 12/11/2026 |
| Sai không mất tim; một đòn ≤ 40% tim; ngã thì tỉnh lại và địch chậm dần | `tests/battle-core.test.mjs` | quy tắc kids-games |
| Hạt Nắng: chạm mới nhặt, không nhặt hai lần, nhớ qua các lần chơi | `tests/collect-core.test.mjs` | 13/11/2026 |
| Đổi đồ: đủ hạt mới đổi, không trừ hai lần, món đã đổi không mất, số dư không âm; tổng giá cả quầy ≤ số hạt của thế giới | `tests/shop-core.test.mjs` (luật đổi); riêng "tổng giá ≤ số hạt" chưa có cổng tự động: `session.js` chỉ ghi `console.error` lúc mở, đổi giá hay chỗ đặt hạt thì đếm lại tay | 13/11/2026 |
| Trang phải mở được không lỗi runtime | `scripts/smoke.mjs` | shader treo lúc biên dịch, 12/11/2026 |
| Shader không biên dịch được phải làm cổng đỏ | `renderer.debug.onShaderError` trong `core/stage.js` đưa lỗi lên hộp lỗi của trang, `smoke.mjs` đọc hộp đó | hoa thung lũng vắng mặt vì biến tên `patch`, 13/11/2026 |

## Quy tắc nội dung (game cho trẻ em)
- Không quảng cáo, không mua bằng tiền thật, không thu thập dữ liệu, không hỏi tên thật; tiến độ chỉ lưu `localStorage`.
- Không đổi `id` món trong `CATALOG` và `id` Hạt Nắng đã phát hành (tủ đồ và tiến độ lưu theo id). Đồ chỉ đổi bằng Hạt Nắng nhặt trong game; không hẹn giờ, không giục mua.
- Không đổi `id` kỹ năng đã phát hành (hồ sơ lưu tham chiếu theo id); kỹ năng mới thêm vào đúng vị trí thứ tự học.
- Lời thoại và thông báo không chê bai, không đe dọa. Sai chỉ làm chiêu yếu đi.

## Bẫy riêng của repo
- Lấy mẫu texture trong `if` bên trong vòng lặp shader làm trang treo hơn 1 phút ở lần mở đầu trên Windows; dùng `textureLod` và bỏ rẽ nhánh (12/11/2026).
- Vật liệu toon tạo qua `toon()` trong `materials.js`; phần vá riêng đặt ở `material.userData.patch`, đừng gán `onBeforeCompile` (mất lớp tuyết) (12/11/2026).
- `patch`, `sample`, `filter`, `input`, `output`... là từ bị cấm trong GLSL ES 3: đừng đặt tên biến như vậy (13/11/2026).
- Màu viết tay trong shader là sRGB (như nhìn trên màn hình) thì phải `pow(màu, vec3(2.2))` trước khi dùng; quên thì nhạt bệch (13/11/2026).
- Kịch bản vá viết bằng heredoc làm mất dấu gạch chéo ngược: chuỗi xuống dòng viết trong nháy đơn thành xuống dòng thật và hỏng cú pháp. Dòng có gạch chéo ngược thì sửa bằng công cụ Edit (13/11/2026).
- Biến toàn cục có thể đổi giá trị phải là thuộc tính của object (`weatherState.name`), vì binding import chỉ đọc (12/11/2026).

## Nhắc lại luật chính
- Cổng đỏ thì sửa thật, không lách.
- 3 lần không xong → hỏi. Lỗi môi trường ≠ lỗi code.
- Không báo "xong" khi chưa có bằng chứng.
