# Đảo Mây — bản thiết kế game (GDD) v0.2

Ngày 12/11/2026. Trạng thái: **bản nháp chờ anh Ben duyệt**. Tên "Đảo Mây" và mọi tên riêng là tên tạm.

**Điều anh Ben đã quyết** (không phải đề xuất của Claude):
- Game mobile, đồ họa dễ thương, three.js, phong cách tranh vẽ như cảnh mẫu.
- Không làm game chỉ giải đố. Phải là game có các phần chơi thật, và bài học, bài tập được lồng vào trong đó
  (góp ý ngày 12/11/2026 sau khi đọc v0.1).

Mọi thứ còn lại là đề xuất của Claude. Thay đổi so với v0.1: bỏ hướng "phiêu lưu giải đố", chuyển sang **phiêu lưu hành động
có học tập**; thêm mục 5 (hệ học tập); thời tiết từ "lời giải câu đố" thành "chiêu thức và luật của thế giới".

## 1. Tầm nhìn

**Một câu:** Bé Mầm chạy, lượn, đối đầu và gây dựng trên những hòn đảo bay, dùng sức mạnh thời tiết để đánh thức thế
giới; mỗi lần ra chiêu, mở khóa hay mua bán là một bài tập được giải.

**Thể loại:** phiêu lưu hành động nhẹ (action-adventure) 3D góc nhìn sau lưng, có xây dựng đảo nhà, lồng học tập.

**Người chơi:** học sinh tiểu học (đề xuất lớp 1–5), chơi một mình trên điện thoại. Theo bộ quy tắc `kids-games`: không
quảng cáo, không mua bằng tiền thật, không dark pattern, sai không mất gì, không bao giờ kẹt.

**Phiên chơi:** một chuyến phiêu lưu 8–12 phút, trong đó có khoảng 15–25 bài tập (mục tiêu thiết kế, chưa đo).

**Cảm giác muốn đạt:** "mình giỏi lên thì nhân vật mạnh lên". Bé muốn giải bài vì bài tập là cách ra đòn, không phải
vì bị bắt.

## 2. Bốn trụ cột thiết kế

1. **Chơi thật trước.** Bỏ hết bài tập đi thì chạy nhảy, lượn gió, đối đầu, thu thập vẫn phải vui. Nếu một phần chơi
   chỉ vui khi có phần thưởng thì thiết kế lại phần đó.
2. **Bài tập là động tác của game.** Không có màn hình kiểm tra tách rời. Mỗi bài tập gắn với một hành động có nghĩa
   trong thế giới (nạp chiêu, mở khóa, đong hàng, bắc cầu) và có kết quả nhìn thấy ngay.
3. **Sai không phạt, đúng thì mạnh.** Sai chỉ làm chiêu yếu hơn và mở gợi ý; đúng nhanh và liên tiếp thì chiêu đẹp và
   mạnh hơn. Không trừ máu, không mất đồ, không tụt cấp vì sai.
4. **Thế giới lớn lên theo điều bé học được.** Tiến bộ thật (thành thạo một kỹ năng) làm đảo nhà mọc thêm thứ nhìn
   thấy được, không chỉ là một con số.

## 3. Thế giới và cốt truyện

### 3.1 Bối cảnh
Quần đảo Mây là những hòn đảo trôi giữa trời. Bảy Linh Thời Tiết từng thay nhau đi qua các đảo. Rồi **Cơn Lặng** đến:
trời đứng yên, đảo bạc màu, suối cạn, và từ những chỗ bạc màu sinh ra **Bóng Lặng**, những khối xám lờ đờ làm mọi thứ
quanh nó ngủ theo. Mỗi Linh đang bị một Bóng Lặng lớn giữ chân trên một hòn đảo.

Bóng Lặng không ác; chúng là những mảnh thế giới bị quên. Mầm không tiêu diệt mà **đánh thức** chúng: trúng đủ chiêu,
Bóng Lặng tan thành hoa, bướm, đom đóm. Chương cuối, Cơn Lặng hóa ra là Linh thứ tám, Linh của sự Yên Tĩnh, và được mời
nhập hội.

### 3.2 Nhân vật
| Nhân vật | Vai trò | Ghi chú |
|---|---|---|
| **Mầm** | Người chơi điều khiển | Tròn, lông nhung, mầm lá trên đầu dùng để lượn. Không nói |
| **Bà Cối** | Dẫn đường, giữ sổ học | Cối xay gió biết nói ở đảo nhà |
| **Nắng, Gió, Mưa, Sương, Tuyết, Đêm, Bão** | Bảy Linh, mỗi Linh cho một bộ chiêu | Chim vàng, dải lụa, ếch đội lá, cừu bông, cáo trắng, cú mèo, bê con sấm |
| **Bóng Lặng** | Đối thủ thường | Nhiều dạng: lăn, nhảy, bay, núp |
| **Lặng** | Chương kết | Đốm sáng nhỏ |
| **Dân đảo** | Giao việc, mở tiệm | Thỏ thợ mộc, rùa lái đò, sóc chủ tiệm hạt... |

### 3.3 Chương
| Chương | Đảo | Linh và chiêu mở | Phần chơi mới | Trùm |
|---|---|---|---|---|
| 0 | Đảo Nhà | (học điều khiển) | Chạy, nhảy, lượn, chiêu Lá cơ bản | Bóng Lặng tập sự |
| 1 | Đảo Ruộng Hoa | Nắng: Tia Nắng, Vòng Hoa | Trồng và thu hoạch | Bù Nhìn Ngủ Gật |
| 2 | Đảo Cối Xay | Gió: Lốc Con, Lượn Xa | Đua lượn gió qua vòng | Chong Chóng Khổng Lồ |
| 3 | Đảo Thác | Mưa: Mưa Rào, Bong Bóng | Chèo bè xuôi suối | Cá Trê Bùn |
| 4 | Đảo Rừng Mờ | Sương: Màn Sương, Phân Thân | Lẻn qua, tìm lối ẩn | Cây Cổ Thụ Mộng Du |
| 5 | Đảo Băng | Tuyết: Cầu Băng, Bóng Tuyết | Trượt dốc tuyết | Người Tuyết Lười |
| 6 | Đảo Đom Đóm | Đêm: Mưa Sao, Ánh Trăng | Bắt đom đóm, soi ký hiệu | Cú Đá Ngủ Ngày |
| 7 | Đảo Sấm | Bão: Sét Đánh, Cuồng Phong | Chạy tránh sét, nạp tháp | Mây Đen Cáu Kỉnh |
| 8 | Đảo Lặng | Lặng: Dừng Thời Gian | Kết hợp tất cả | Cơn Lặng (không đánh, mời về) |

## 4. Gameplay

### 4.1 Một chuyến phiêu lưu (8–12 phút)
```
Bà Cối giao việc ở Đảo Nhà
  → lượn sang đảo → khám phá (chạy, nhảy, lượn, thu thập, gặp dân đảo)
  → 3–5 lần đối đầu Bóng Lặng + 1–2 thử thách dọc đường (đua lượn, chèo bè, mở cổng, bắc cầu)
  → trùm của đảo (khi đủ điều kiện)
  → mang quà về Đảo Nhà: trồng, xây, mở tiệm, xem đảo lớn lên
```

### 4.2 Điều khiển
- Cần ảo bên trái để chạy; bên phải có ba nút: **Nhảy/Lượn** (giữ để lượn bằng mầm lá), **Chiêu** (mở bàn chiêu),
  **Chạm** (nói chuyện, hái, đẩy).
- Máy quay tự bám sau lưng; kéo ở vùng trống để xoay.
- Hành động không đòi phản xạ gắt: né bằng cách chạy ra khỏi vùng báo trước trên mặt đất, không có né theo khung hình.

### 4.3 Các phần chơi thật
| Phần chơi | Bé làm gì | Vui ở đâu (kể cả khi không có bài tập) |
|---|---|---|
| **Khám phá** | Chạy, nhảy, lượn giữa các mỏm đá và đảo con, tìm rương, lối tắt, sinh vật ẩn | Cảm giác lượn; thế giới đẹp; bí mật |
| **Đối đầu** | Vừa di chuyển tránh vùng báo trước vừa ra chiêu đánh thức Bóng Lặng | Chọn chiêu khắc dạng địch, đứng đúng chỗ |
| **Thử thách** | Đua lượn qua vòng, chèo bè xuôi suối, trượt dốc tuyết, bắt đom đóm | Tốc độ, nhịp điệu, điểm kỷ lục của chính mình |
| **Gây dựng** | Trồng cây, dựng nhà, mở tiệm cho dân đảo, bày biện Đảo Nhà | Thấy đảo của mình lớn lên |
| **Sưu tầm** | Sổ sinh vật, bộ trang phục cho Mầm, bạn đồng hành nhỏ | Có thứ để khoe |
| **Đố nhẹ bằng thời tiết** | Dùng chiêu để đổi cảnh: mưa cho đầy hồ, tuyết cho đóng băng | Gia vị giữa các đoạn hành động, không phải món chính |

### 4.4 Đối đầu chi tiết
- Mầm có thanh **Năng lượng** và thanh **Tim** (3–5 tim). Bóng Lặng có thanh **Ngủ**; đầy "thức" thì tan thành hoa.
- **Chiêu Lá** (đòn thường): bấm là ra, yếu, không cần bài tập, để trận đấu luôn trôi.
- **Chiêu Thời Tiết:** bấm Chiêu → thời gian chậm lại → hiện một bài tập → trả lời → chiêu bung ra.
  - Đúng: chiêu đủ lực. Đúng liên tiếp: bậc combo tăng, chiêu to và đẹp hơn (tối đa bậc 3).
  - Sai: chiêu vẫn ra nhưng yếu, combo về 0, Linh nhắc một câu gợi ý. Không mất tim.
- Bóng Lặng đánh chậm, có vùng báo trước 1,5 giây; một đòn không quá 40% tim. Hết tim: Mầm ngủ gật, tỉnh lại ngay tại
  chỗ với đủ tim và Bóng Lặng giữ nguyên thanh thức. Thua liên tiếp thì địch chậm dần (luật thương hại).
- **Khắc chế:** mỗi dạng Bóng Lặng yếu trước một thời tiết (Bóng Bùn sợ Nắng, Bóng Lửa sợ Mưa) để bé chọn chiêu.

## 5. Hệ học tập

### 5.1 Bài tập nằm ở đâu trong game
| Hành động trong game | Dạng bài hợp | Ví dụ lớp 2 |
|---|---|---|
| Nạp chiêu khi đối đầu | Tính nhanh, một bước | 37 + 8 = ? |
| Mở Cổng Đố, rương khóa | Bài có suy luận, không vội | Tìm số còn thiếu trong dãy 2, 5, 8, ? |
| Mua bán ở tiệm dân đảo | Tiền, cộng trừ có nhớ, thối tiền | Mua 3 hạt giá 4 xu, đưa 20 xu, thối bao nhiêu? |
| Trồng trọt, nấu nướng | Đo lường, thời gian, phân số | Tưới mỗi luống 1/4 thùng, 3 luống hết mấy phần? |
| Bắc cầu, dựng nhà | Hình học, đếm khối, chu vi | Cầu dài 12 ô, mỗi ván 3 ô, cần mấy ván? |
| Đua lượn, chèo bè | Chọn cổng mang đáp án đúng | Lượn qua vòng có kết quả của 6 × 4 |
| Giao hàng cho dân đảo | Toán có lời văn | Bà Rùa cần 15 quả, đã có 9, hái thêm mấy? |

Nguyên tắc:
- Bài tập luôn xuất phát từ tình huống trong game, lời văn dùng đồ vật và nhân vật của đảo.
- Lúc hành động chỉ dùng bài một bước, trả lời bằng chọn hoặc bàn phím số to. Bài nhiều bước để ở chỗ không vội.
- Mọi bài có **gợi ý** (không lộ đáp án) và **lời giải từng bước**; sai lần ba thì hiện lời giải. Đáp án được test tính
  lại độc lập.

### 5.2 Chọn bài cho đúng sức
- Dùng lại thiết kế đã chạy ở MathQuest và Tiệm Bánh: chương trình theo kỹ năng (`g1_...`, `g2_...`), xếp lớp ban đầu,
  máy chọn bài theo mức thành thạo, ôn lại theo khoảng cách. Phần này phải viết lại bằng JavaScript, không chép C#.
- Mỗi chuyến đi trộn khoảng 70% bài đang học, 20% ôn, 10% nâng cao (tỉ lệ đề xuất, cần chỉnh qua chơi thử).
- Mỗi đảo gắn với một nhóm kỹ năng (ví dụ Đảo Ruộng Hoa: cộng trừ; Đảo Cối Xay: nhân chia; Đảo Thác: đo lường và thời
  gian), nhưng lớp nào cũng chơi được mọi đảo vì bài lấy theo lớp của bé.

### 5.3 Bài học (không chỉ bài tập)
- Khi gặp kỹ năng mới, Linh đi cùng dạy bằng một **cảnh làm mẫu 30–60 giây** ngay trong thế giới (xếp hoa thành hàng
  để thấy phép nhân), rồi mới ra bài.
- **Sổ học của Bà Cối:** xem lại bài học, những bài đã sai kèm lời giải, và luyện lại bài sai để nhận hạt giống.

### 5.4 Học giỏi lên thì được gì
- Thành thạo một kỹ năng → **Cây Tâm** ở Đảo Nhà mọc thêm một cành có quả phát sáng; đủ cành thì mở một khu mới.
- Combo đúng trong trận → chiêu lên bậc, hiệu ứng đẹp hơn. Đây là phần thưởng tức thì cho việc làm đúng.
- Thưởng không cày được: hạt giống từ bài tập chỉ tính lần giải đầu trong ngày cho mỗi dạng; đoán bừa (trả lời dưới
  1,5 giây và sai) không được tính.

### 5.5 Phụ huynh
Cổng phụ huynh (phép nhân bảng 6–9) vào màn xem: kỹ năng đã thành thạo, kỹ năng đang yếu, thời gian chơi, đổi lớp, đặt
giới hạn thời gian mỗi ngày.

## 6. Tiến trình

- **Cấp của Mầm** tăng theo chuyến đi hoàn thành: thêm tim, thêm năng lượng. Không tụt.
- **Chiêu** mở theo Linh đã cứu; mỗi chiêu có ba bậc, lên bậc bằng quả từ Cây Tâm (tức bằng việc học).
- **Đảo Nhà:** nhà của Mầm, vườn, xưởng, tiệm của dân đảo về ở. Vật liệu đến từ thu thập và thử thách.
- **Xu lá** là tiền trong game, chỉ kiếm bằng chơi, dùng mua hạt giống, đồ trang trí, trang phục. Không bao giờ âm.
- Việc mỗi ngày của Bà Cối: ba việc nhỏ, bỏ lỡ không mất gì, không đếm ngược.
- Lưu trên máy, tối đa 4 hồ sơ.

## 7. Hình ảnh và âm thanh

Giữ phong cách cảnh mẫu. Bảy kiểu thời tiết đã dựng được dùng ở hai chỗ: thời tiết nền của từng đảo (đổi theo chương và
giờ trong ngày) và hiệu ứng chiêu (chiêu Mưa Rào kéo một đám mưa nhỏ tới chỗ địch). Âm thanh tổng hợp bằng code. Lời
thoại ngắn, có đọc to cho lớp 1–2 (dùng giọng đọc của máy).

## 8. Kỹ thuật

- Nền: repo `games-3d-lab`, quy trình pb-dev, skill `threejs-stylized-scene`.
- **Ngân sách (mục tiêu, chưa đo):** ≥ 30 fps ở mức Vừa trên điện thoại tầm trung.
- **Việc mới so với cảnh mẫu:**
  1. Điều khiển nhân vật góc nhìn sau lưng: chạy, nhảy, lượn, va chạm với địa hình và vật thể.
  2. Lõi luật chơi thuần (không phụ thuộc three.js), có test: trận đấu, chiêu, tiến trình, kinh tế.
  3. Lõi học tập thuần, có test: chương trình, sinh bài, chấm, chọn bài theo sức, lời giải.
  4. Địch, vùng báo trước, hiệu ứng chiêu.
  5. Đảo mô tả bằng dữ liệu thay cho code cứng; đảo lớn hơn cảnh mẫu và phải chia vùng để giữ hiệu năng.
  6. Giao diện: bàn chiêu, thẻ bài tập, sổ học, tiệm, màn phụ huynh, lưu/nạp.
  7. Đóng gói three.js để chơi không mạng; cài như ứng dụng.

## 9. Phạm vi và lộ trình

**Bản chơi thử đầu tiên:** Đảo Nhà (thu nhỏ) + Đảo Ruộng Hoa, một Linh (Nắng), toán lớp 1–3. Gồm: chạy, nhảy, lượn; ba
dạng Bóng Lặng; hai chiêu Nắng; một thử thách đua lượn; một tiệm mua bán; trồng một loại cây; trùm Bù Nhìn Ngủ Gật.

| Mốc | Nội dung | Xong khi |
|---|---|---|
| M1 | Mầm chạy, nhảy, lượn trên đảo mẫu bằng cần ảo | Điều khiển mượt trên điện thoại thật, FPS đo được |
| M2 | Lõi học tập (cộng trừ lớp 1–3) + thẻ bài tập + một trận đối đầu có nạp chiêu | Một bé chơi một trận và muốn chơi trận nữa |
| M3 | Bản chơi thử như trên | Một bé chơi trọn chuyến 10 phút không cần người lớn chỉ |
| M4 | Thêm Gió và Mưa, đua lượn, chèo bè, nhân chia và đo lường | Ba đảo chơi được, có trùm |
| M5 | Các chương còn lại, sổ học, màn phụ huynh, âm thanh | Chơi trọn cốt truyện |
| M6 | Đóng gói, tối ưu máy yếu | Cài lên điện thoại, chơi không mạng |

Không làm ở phiên bản đầu: nhiều người chơi, tài khoản trực tuyến, bảng xếp hạng.

## 10. Rủi ro

| Rủi ro | Dấu hiệu | Cách giảm |
|---|---|---|
| Bài tập làm đứt nhịp hành động | Bé bấm Chiêu Lá suốt để né bài | Bài lúc đối đầu chỉ một bước; chiêu thời tiết phải mạnh hơn hẳn; đo tỉ lệ dùng chiêu ở M2 |
| Phần chơi không đủ vui khi đứng riêng | Tắt bài tập đi thì chán | Thử M1 không có bài tập nào trước khi làm M2 |
| Điện thoại không kham nổi đồ họa + nhân vật + địch | FPS dưới 30 ở mức Vừa | Đo ở M1; cắt lớp tia nắng, giảm cỏ, chia vùng đảo |
| Khối lượng quá lớn (9 đảo, 7 bộ chiêu, lõi học) | Một đảo mất hơn hai tuần | Đảo bằng dữ liệu; chốt chất lượng ở bản chơi thử rồi mới nhân rộng |
| Nhân vật và địch dựng bằng code không đủ duyên | Trông như khối cầu ghép | Thử một Linh và ba Bóng Lặng ở M3; không đạt thì bàn với anh Ben về model làm tay hoặc AI |
| Nội dung toán sai | Đáp án hoặc lời giải sai | Test tính lại độc lập cho mọi bộ sinh bài; soát độc lập trước khi phát hành |

## 11. Những điểm cần anh Ben quyết

1. **Môn và lớp:** đề xuất toán tiểu học lớp 1–5 trước. Anh có muốn môn khác (tiếng Việt, tiếng Anh, khoa học) hoặc lớp
   lớn hơn không.
2. **Mức hành động:** đối đầu thời gian thực nhẹ nhàng như trên, hay theo lượt như MathQuest.
3. **Tỉ lệ học/chơi:** khoảng 15–25 bài tập mỗi chuyến 10 phút là đề xuất; anh muốn dày hay thưa hơn.
4. **Tên game và tên nhân vật.**
5. **Phạm vi bản chơi thử:** Đảo Nhà + Đảo Ruộng Hoa với Linh Nắng, hay bắt đầu bằng đảo khác.
