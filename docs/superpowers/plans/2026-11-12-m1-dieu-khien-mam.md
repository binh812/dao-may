# M1 — Điều khiển Mầm (chạy, nhảy, lượn) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Người chơi điều khiển Mầm chạy, nhảy, lượn trên đảo mẫu bằng cần ảo, máy quay bám sau lưng, có va chạm; chưa có bài tập.

**Architecture:** Luật di chuyển là module thuần (`src/game/player-core.js`, `src/game/input-core.js`), không import three.js, nhận địa hình qua hàm `heightAt` tiêm vào, test bằng `node --test`. Lớp three.js (`src/game/play.js`, `src/game/touch-controls.js`) chỉ đọc trạng thái và vẽ. Chế độ ngắm cảnh cũ giữ lại qua `?mode=view`.

**Tech Stack:** three.js 0.180 (ES module, không build), Node 24 `node:test`, Edge headless để kiểm khởi động.

**Spec:** `docs/GDD.md` mục 4.2 (điều khiển), 4.3 (khám phá), 9 (mốc M1), 10 (rủi ro "phần chơi không đủ vui khi đứng riêng").

## Global Constraints

- Không thêm phụ thuộc, không thêm bước build. Mỗi module ≤ 400 dòng (`scripts/check-modules.mjs`).
- Module trong `src/game/*-core.js` không được import `three` hay DOM.
- Thứ tự import trong `src/main.js` là thứ tự dựng cảnh; module mới của game import SAU mọi module dựng cảnh và không gọi `rnd()`.
- Không đòi phản xạ gắt, không có trạng thái thua (GDD 4.2); rơi khỏi đảo thì về chỗ đứng an toàn gần nhất, không mất gì.
- Dùng được một tay trên màn dọc lẫn ngang; cũng điều khiển được bằng bàn phím (WASD/mũi tên + Space) để thử trên PC.
- `scripts/*.ps1`, `scripts/*.mjs`, `.pb-dev.json` là file được bảo vệ: không sửa trong kế hoạch này.

## Review Focus

1. Khung hình giật (dt lớn sau khi tab bị ẩn) → Mầm không được xuyên tường hay xuyên đất. Test: `big dt does not tunnel` (Task 1).
2. Rơi khỏi mép đảo → về chỗ an toàn, đứng được ngay, không rơi lặp. Test: `falling off respawns on safe ground` (Task 1).
3. Hai ngón cùng lúc (cần ảo + nút nhảy), ngón nhấc ra ngoài vùng → cần ảo về 0, nút nhả. Test tay trên máy thật + `pointercancel` trong Task 2.
4. Đứng trong vùng va chạm lúc sinh ra hoặc lúc về chỗ an toàn → bị đẩy ra, không kẹt. Test: `spawn inside collider is pushed out` (Task 1).
5. Nhả tay khi đang lượn, hoặc giữ nút nhảy từ trước khi chạm đất → không nhảy liên tục. Test: `holding jump does not auto-repeat` (Task 1).

---

### Task 1: Lõi di chuyển

**Files:**
- Create: `src/game/player-core.js`
- Test: `tests/player-core.test.mjs`

**Interfaces:**
- Produces:
  - `TUNING` (object hằng số): `runSpeed 5.2`, `glideSpeed 6.4`, `accel 28`, `airAccel 10`, `gravity 24`, `jumpV 8.6`, `glideFall 1.6`, `stepUp 0.5`, `coyote 0.12`, `radius 0.45`, `respawnY -14`, `maxStep 1/60`.
  - `createPlayer(x, z, world) -> state` với `state = { x, y, z, vx, vy, vz, yaw, grounded, gliding, coyote, jumpLatch, safeX, safeZ, events: { jumped, landed, respawned } }`.
  - `stepPlayer(state, input, dt, world) -> state` (sửa tại chỗ, trả lại chính nó). `input = { moveX, moveZ, jump }` (`moveX/moveZ` hướng mong muốn trong không gian thế giới, độ lớn 0..1; `jump` là nút đang giữ). `world = { heightAt(x, z) -> number | -Infinity, colliders: [{ x, z, r }], safeRadius }`.
  - `events` được đặt lại ở đầu mỗi lần gọi `stepPlayer`.

- [ ] **Step 1: Viết test thất bại** — `tests/player-core.test.mjs` với thế giới phẳng `heightAt = () => 0` trừ khi ghi khác:
  - `runs at run speed`: giữ `moveX = 1` trong 1 s → `4 < x < 5.3`, `y === 0`, `grounded`.
  - `jump apex`: nhấn nhảy → độ cao lớn nhất trong `(1.3, 1.8)`.
  - `holding jump does not auto-repeat`: giữ `jump` 3 s liên tục → `events.jumped` chỉ đúng một lần.
  - `glide caps fall speed`: đặt `y = 10`, không chạm đất, giữ nhảy (đã nhả một lần) 1 s → `vy === -1.6`, `gliding`; không giữ → `vy < -10`.
  - `wall blocks`: `heightAt = x > 2 ? 3 : 0`, chạy +x 2 s → `x <= 2 - radius + 0.05`.
  - `small step is climbed`: `heightAt = x > 2 ? 0.4 : 0` → kết thúc `x > 2.5`, `y === 0.4`.
  - `ledge 0.8 needs a jump`: `heightAt = x > 2 ? 0.8 : 0`: chỉ chạy → `x <= 2`; chạy + nhảy từ `x = 0.6` → `x > 2`, `y === 0.8`.
  - `collider pushes out`: collider `{x:3,z:0,r:1}`, chạy +x 2 s → `hypot(x-3, z) >= 1.45 - 0.01`.
  - `spawn inside collider is pushed out`: `createPlayer(3, 0, world)` rồi một bước → ra ngoài.
  - `falling off respawns on safe ground`: `heightAt = x < 5 ? 0 : -Infinity`, chạy +x 6 s → có `events.respawned` ở một bước nào đó; sau đó thả tay 1 s → `grounded`, `x < 5`.
  - `big dt does not tunnel`: tường như trên, một bước `dt = 0.5` ở vận tốc tối đa → `x <= 2`.
  - `coyote jump`: đi khỏi mép (`heightAt = x < 1 ? 1 : 0`, bắt đầu `y = 1`), nhấn nhảy 0.08 s sau khi rời mép → `events.jumped`.
- [ ] **Step 2: Chạy `node --test tests/` → FAIL (module chưa có).**
- [ ] **Step 3: Viết `src/game/player-core.js`.** Chia `dt` thành các bước con ≤ `maxStep`. Mỗi bước con: tăng tốc ngang về vận tốc mong muốn; nhảy khi `jump` vừa chuyển từ nhả sang nhấn và (`grounded` hoặc `coyote > 0`); trọng lực; lượn = đang rơi + đang giữ nhảy + đã nhả nút sau lần nhảy; di chuyển ngang rồi chặn theo từng trục nếu `heightAt` đích cao hơn chân quá `stepUp` (trên không: cao hơn chân); đẩy ra khỏi collider; rơi/bám đất (xuống dốc ≤ `stepUp` thì bám); ghi chỗ an toàn khi đang đứng và `hypot(x, z) < safeRadius`; `y < respawnY` thì về chỗ an toàn.
- [ ] **Step 4: Chạy `node --test tests/` → PASS.** Đột biến một lần: đổi `maxStep` thành `1` → `big dt does not tunnel` phải đỏ; khôi phục.
- [ ] **Step 5: Commit** `feat: add pure player movement core with tests`.

### Task 2: Đầu vào

**Files:**
- Create: `src/game/input-core.js`, `src/game/touch-controls.js`
- Test: `tests/input-core.test.mjs`

**Interfaces:**
- Produces:
  - `stickFromDrag(dx, dy, maxRadius = 56, deadZone = 0.15) -> { x, y }` (y dương là đẩy lên; độ lớn 0..1, vùng chết được co giãn lại).
  - `cameraRelative(stick, camYaw) -> { x, z }` với quy ước máy quay đứng tại `target + (sin yaw, ·, cos yaw) * dist`.
  - `createTouchControls(host: HTMLElement) -> { read() -> { stickX, stickY, jump, lookDX, lookDY }, dispose() }`; `lookDX/lookDY` là lượng kéo xoay máy quay tích lũy từ lần `read()` trước.

- [ ] **Step 1: Test thất bại** — `dead zone returns zero` (`stickFromDrag(5, 0)` → `{0, 0}`); `clamps to unit length` (`stickFromDrag(500, 0)` → `x === 1`); `up is positive y` (`stickFromDrag(0, -56).y === 1`); `yaw 0 pushes away from camera` (`cameraRelative({x:0,y:1}, 0)` ≈ `{x:0, z:-1}`); `yaw 90° rotates` (`cameraRelative({x:0,y:1}, Math.PI/2)` ≈ `{x:-1, z:0}`); `right is right` (`cameraRelative({x:1,y:0}, 0)` ≈ `{x:1, z:0}`).
- [ ] **Step 2: `node --test tests/` → FAIL.**
- [ ] **Step 3: Viết hai module.** `touch-controls.js`: một lớp phủ trong suốt; pointer bắt đầu ở nửa trái thành cần ảo nổi (gốc tại điểm chạm), pointer khác ở nửa phải xoay máy quay; nút Nhảy là phần tử riêng góc dưới phải (≥ 72 px); theo dõi theo `pointerId`; `pointerup`/`pointercancel`/`lostpointercapture` đều nhả; bàn phím WASD/mũi tên + Space cộng vào cùng kết quả.
- [ ] **Step 4: `node --test tests/` → PASS.**
- [ ] **Step 5: Commit** `feat: add virtual stick, jump button and keyboard input`.

### Task 3: Gắn vào cảnh

**Files:**
- Create: `src/world/colliders.js`, `src/game/play.js`
- Modify: `src/main.js` (vòng lặp: gọi `play.update(dt)` khi không ở `?mode=view`), `src/world/flora.js` (export `TREES`)

**Interfaces:**
- Consumes: Task 1 và 2; `height`, `R`, `WATER_Y`, `CRAGS`, `HOUSE`, `MILL` từ `world/layout.js`; `chr`, `squash`, `sprout`, `eyes` từ `actors/actors.js`; `camera`, `controls`, `U` từ `core/stage.js`.
- Produces: `colliders: [{x, z, r}]`; `createPlay() -> { update(dt), focusDistance() }`.

- [ ] **Step 1:** `colliders.js`: vách đá `r * 0.9`, nhà `2.3`, cối xay `1.25`, thân cây `0.4`. `heightAt` của game: ngoài `R - 0.1` trả `-Infinity`; trong đảo trả `max(height, WATER_Y - 0.25)` (lội được ao và suối).
- [ ] **Step 2:** `play.js`: sinh Mầm tại `(-3.2, 2.4)`; máy quay cách 8.5 m (màn dọc 10.5 m), ngẩng 0.42 rad, tự xoay về sau lưng khi đang chạy và không kéo tay trong 1.5 s, không chui dưới đất; cập nhật `U.player`; hoạt họa: nảy khi chạy, giãn khi bật, bẹp khi chạm đất, mầm lá xòe to khi lượn; dòng nhắc điều khiển tự tắt sau 6 s.
- [ ] **Step 3:** `main.js`: `?mode=view` giữ nguyên hành vi cũ (xoay ngắm, Mầm tự nhảy theo vòng); mặc định là chế độ chơi.
- [ ] **Step 4: Kiểm chứng.** `node --test tests/` PASS; `scripts/ci.ps1` xanh; chụp Edge headless màn ngang 1440×810 và màn dọc 412×892 ở chế độ chơi, tự đọc ảnh: thấy Mầm từ sau lưng, cần ảo và nút nhảy không che Mầm, không tràn khung.
- [ ] **Step 5: Commit** `feat: playable Mam with follow camera on the sample island`.

### Task 4: Ghi nhận

**Files:**
- Modify: `CLAUDE.md` (lệnh `node --test tests/`, thư mục `src/game/`, tham số `mode=view`), `.pb-dev/backlog.md` (việc đo FPS và thử tay trên điện thoại), `.github/workflows/ci.yml` (thêm `node --test tests/`)

- [ ] **Step 1:** Sửa ba file trên.
- [ ] **Step 2:** Báo anh Ben: cổng Stop trên máy chưa chạy `node --test` vì `scripts/verify-quick.ps1` là file được bảo vệ; đề nghị anh duyệt thêm một dòng.
- [ ] **Step 3: Commit** `docs: record M1 commands and follow-ups`.
