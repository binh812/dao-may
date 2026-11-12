# Đảo Mây — bản thiết kế game (GDD) v0.1

Ngày 12/11/2026. Trạng thái: **bản nháp chờ anh Ben duyệt**. Mọi lựa chọn dưới đây là đề xuất của Claude, chưa có mục nào
là quyết định của anh Ben, trừ ba điều anh đã nói: game mobile, đồ họa dễ thương, dựng trên three.js với phong cách tranh
vẽ đã chốt ở cảnh mẫu. Tên "Đảo Mây" và mọi tên riêng là tên tạm.

## 1. Tầm nhìn

**Một câu:** Bé Mầm đi qua những hòn đảo bay đã ngủ quên và đánh thức chúng bằng cách gọi nắng, mưa, gió, tuyết, đêm.

**Thể loại:** phiêu lưu giải đố nhẹ nhàng (cozy puzzle-adventure), góc nhìn sa bàn 3D, chơi một tay trên điện thoại.

**Vì sao là game này:** thứ mạnh nhất đang có trong tay là hệ thời tiết bảy kiểu chạy thật trên một hòn đảo đẹp. Thay vì
để thời tiết làm phông nền, game biến nó thành **công cụ của người chơi**: mỗi kiểu thời tiết làm thế giới thay đổi theo
một quy luật dễ hiểu, và câu đố là tìm đúng thứ tự gọi thời tiết.

**Cảm giác muốn đạt:** tò mò ("nếu mình gọi tuyết ở đây thì sao?"), nhẹ nhõm, và phần thưởng nhìn thấy được: cả hòn đảo
nở hoa sau khi giải xong.

**Người chơi:** trẻ 7–12 tuổi và người lớn thích game nhẹ nhàng. Vì có trẻ em, game theo bộ quy tắc `kids-games` của
anh: không quảng cáo, không mua bằng tiền thật, không đếm ngược ép quay lại, không bao giờ để kẹt.

**Phiên chơi:** 3–8 phút cho một câu đố; một đảo gồm 4–6 câu đố, khoảng 25–40 phút.

## 2. Ba trụ cột thiết kế

Mọi tính năng phải phục vụ ít nhất một trụ cột, nếu không thì bỏ.

1. **Thời tiết là bàn tay của người chơi.** Mọi tương tác chính đi qua bảy kiểu thời tiết. Không có nút "dùng vật phẩm".
2. **Thế giới trả lời ngay và dễ đọc.** Gọi mưa thì trong 2 giây phải thấy suối dâng. Luật của mỗi thời tiết giống nhau ở
   mọi nơi; game không bao giờ phá luật để tạo câu đố.
3. **Đẹp là phần thưởng.** Không điểm số, không sao. Phần thưởng là đảo hồi sinh, sinh vật quay về, và góc nhìn mới.

## 3. Thế giới và cốt truyện

### 3.1 Bối cảnh
Quần đảo Mây là những hòn đảo trôi giữa trời. Ngày trước, bảy Linh Thời Tiết thay nhau đi qua các đảo, nên nơi nào cũng có
đủ nắng mưa. Rồi một ngày đến **Cơn Lặng**: trời đứng yên, không gió, không mưa, không đêm. Các đảo bạc màu dần, cây
ngừng lớn, suối cạn, sinh vật ngủ vùi. Các Linh không biến mất; mỗi Linh đang mắc kẹt trên một hòn đảo vì chính
thời tiết của mình bị khóa lại.

Cơn Lặng không phải kẻ ác. Ở chương cuối người chơi biết nó là Linh thứ tám, Linh của sự Yên Tĩnh, bị bỏ quên vì không
ai gọi tới. Kết thúc là mời nó nhập hội, không phải đánh bại nó. Từ đó game có kiểu thời tiết thứ tám: Lặng.

### 3.2 Nhân vật
| Nhân vật | Vai trò | Tính cách, hình dáng |
|---|---|---|
| **Mầm** | Người chơi điều khiển | Sinh vật tròn lông nhung, mầm lá trên đầu (đã có trong cảnh mẫu). Không nói, biểu cảm bằng mầm lá và mắt |
| **Bà Cối** | Người dẫn đường | Cối xay gió biết nói ở đảo nhà. Giao việc, kể chuyện, giữ sổ tay |
| **Nắng** | Linh chương 1 | Chim nhỏ màu vàng, hấp tấp, hay đi trước |
| **Gió** | Linh chương 2 | Dải lụa dài hay trêu, không bao giờ đứng yên |
| **Mưa** | Linh chương 3 | Ếch con đội lá, hay khóc nhưng tốt bụng |
| **Sương** | Linh chương 4 | Cừu bông mờ ảo, nhút nhát, nói thầm |
| **Tuyết** | Linh chương 5 | Cáo trắng, điềm đạm, thích xếp mọi thứ ngay ngắn |
| **Đêm** | Linh chương 6 | Cú mèo đội mũ sao, hay kể chuyện |
| **Bão** | Linh chương 7 | Bê con sấm sét, ồn ào, sợ bị ghét |
| **Lặng** | Chương kết | Một đốm sáng nhỏ, không hình dạng rõ |

### 3.3 Kịch bản theo chương
Mỗi chương là một đảo, một Linh, một kiểu thời tiết mới, và một nỗi buồn nhỏ được gỡ.

| Chương | Đảo | Thời tiết mở | Chuyện của đảo | Câu đố đại diện |
|---|---|---|---|---|
| 0 | Đảo Nhà | (học đi lại) | Mầm tỉnh dậy dưới gốc cây, Bà Cối không quay được | Đi, nhìn, chạm; tìm thấy Nắng trong lồng đèn |
| 1 | Đảo Ruộng Hoa | Nắng | Ruộng bậc thang không nở | Rọi nắng cho hoa hướng dương quay mặt, mở lối |
| 2 | Đảo Cối Xay | Gió | Cầu treo đứt, hạt giống không bay được | Gió quay cối kéo cầu; gió thổi hạt sang bờ kia rồi nắng cho mọc thành dây leo |
| 3 | Đảo Thác | Mưa | Suối cạn, cá mắc kẹt trong vũng | Mưa làm đầy suối để bè nổi; nắng làm cạn để lộ lối đi đáy hồ |
| 4 | Đảo Rừng Mờ | Sương | Rừng có lối đi chỉ hiện trong sương | Sương làm hiện cầu ánh sáng; nắng xua sương để thấy đường thật |
| 5 | Đảo Băng | Tuyết | Hồ quá rộng, không qua được | Mưa làm đầy rồi tuyết đóng băng thành cầu; nắng làm tan đúng chỗ để thả bè |
| 6 | Đảo Đom Đóm | Đêm | Hoa trăng chỉ nở ban đêm, đom đóm lạc đàn | Đêm cho hoa trăng nở thành bậc thang; ngày cho hoa ngủ để hạ cầu |
| 7 | Đảo Sấm | Bão | Tháp đá cần sét để thức | Gió xoay cột thu lôi, bão đánh sét đúng trụ, mưa dẫn điện qua kênh |
| 8 | Đảo Lặng | Lặng | Mọi thời tiết đều bị nuốt | Dùng cả bảy theo thứ tự; cuối cùng không gọi gì cả và đứng yên |

Lời thoại ngắn (tối đa hai câu một lượt), không đe dọa, không chê bai. Chuyện kể bằng cảnh là chính.

## 4. Gameplay

### 4.1 Vòng chơi
```
Vòng 30 giây:  nhìn cảnh → gọi một thời tiết → thế giới đổi → đi tới chỗ mới
Vòng 5 phút:   giải một câu đố → mở một phần đảo, một sinh vật quay về
Vòng 30 phút:  đánh thức Cây Tâm của đảo → đảo nở hoa → mở đảo kế, kết bạn một Linh
Vòng dài:      Đảo Nhà đẹp dần lên bằng những thứ mang về từ các đảo
```

### 4.2 Điều khiển (một ngón, màn dọc lẫn ngang)
- **Đi:** chạm vào chỗ muốn tới; Mầm tự tìm đường. Giữ và kéo để đi tự do bằng cần ảo.
- **Nhìn:** kéo ở vùng trống để xoay sa bàn; chụm hai ngón để phóng to.
- **Gọi thời tiết:** vòng tròn bảy cánh ở góc dưới, mỗi cánh là một Linh đã kết bạn. Chạm một cánh là đổi.
- **Chạm vật:** chạm vào vật có viền sáng để Mầm tương tác (đẩy, leo, hái).
- Không có nút nhảy, không cần phản xạ nhanh, không có giới hạn thời gian.

### 4.3 Luật của bảy thời tiết
Đây là lõi của game. Mỗi thời tiết có đúng ba hệ quả, áp dụng ở mọi đảo.

| Thời tiết | Hệ quả 1 | Hệ quả 2 | Hệ quả 3 |
|---|---|---|---|
| **Nắng** | Cây nắng lớn lên, hoa nở | Vũng nước cạn dần, băng tan | Xua sương, tắt đom đóm |
| **Gió** | Cối xay và chong chóng quay | Hạt giống, lá, bè buồm bị thổi theo hướng gió | Cỏ rạp lộ vật giấu bên dưới |
| **Mưa** | Suối, ao, thùng chứa dâng lên | Đất khô thành bùn, hạt nảy mầm | Dập lửa, làm ướt (nước dẫn điện) |
| **Sương** | Cầu và lối ánh sáng hiện ra | Sinh vật nhút nhát dám ra ngoài | Che tầm nhìn của vật canh gác |
| **Tuyết** | Nước đóng băng, đi qua được | Tuyết dày lên thành bậc, dốc trượt | Cây ngủ, hoa khép |
| **Đêm** | Hoa trăng nở, đom đóm bay | Đá phát sáng hiện ký hiệu | Sinh vật ngày đi ngủ, sinh vật đêm thức |
| **Bão** | Sét đánh vào vật cao nhất | Gió rất mạnh, đẩy được vật nặng | Mưa lớn, nước dâng nhanh gấp đôi |

Nguyên tắc dựng câu đố:
- Câu đố hay đến từ **ghép hai luật** (mưa rồi tuyết = cầu băng), không từ luật mới.
- Trạng thái thế giới **giữ lại** khi đổi thời tiết: nước đã dâng thì vẫn đầy cho tới khi nắng làm cạn.
- Mọi câu đố giải được từ bất kỳ trạng thái nào; không có nước đi làm hỏng màn. Luôn có nút "Về lúc đầu" cho từng câu đố.

### 4.4 Độ khó và chống kẹt
- Mỗi chương dạy luật mới bằng một câu đố chỉ có một bước, rồi mới ghép với luật cũ.
- **Gợi ý ba nấc** qua Linh đi cùng: (1) nhìn về phía chỗ cần chú ý, (2) nói một câu gợi, (3) làm mẫu bước kế tiếp.
  Gợi ý luôn miễn phí và không làm mất gì.
- Đứng yên 60 giây mà chưa tiến: Linh tự đưa nấc 1.

### 4.5 Ngoài câu đố
- **Sổ tay của Bà Cối:** ghi sinh vật đã gặp, hoa đã thấy, mỗi mục kèm thời tiết nó thích. Vừa là sưu tầm vừa là gợi ý.
- **Đảo Nhà:** mỗi đảo cho một món mang về (hạt giống, đèn lồng, tổ chim). Người chơi tự đặt chúng và tự chọn thời tiết
  cho đảo nhà. Không có mục tiêu, chỉ để ngắm.
- **Chụp ảnh:** nút chụp sa bàn với thời tiết đang chọn, lưu vào máy.
- **Sinh vật ẩn:** mỗi đảo có 3 sinh vật chỉ ra ở một tổ hợp thời tiết (ví dụ ốc sên sau mưa vào ban đêm).

## 5. Tiến trình và phần thưởng

- Mở khóa theo tuyến thẳng: xong đảo N thì mở đảo N+1 và thời tiết mới. Thời tiết mới dùng được ở **mọi** đảo cũ, nên đảo
  cũ có thêm sinh vật ẩn và góc mới để quay lại.
- Không có tiền trong game, không có năng lượng, không có nhiệm vụ hằng ngày bắt buộc.
- Lý do quay lại: đảo nhà, sinh vật ẩn, và mỗi ngày Bà Cối kể một mẩu chuyện ngắn (bỏ lỡ không mất, đọc lại được).
- Lưu tự động trên máy sau mỗi câu đố. Nhiều hồ sơ cho anh chị em chung máy (tối đa 4).

## 6. Hình ảnh và âm thanh

**Hình ảnh:** giữ nguyên phong cách cảnh mẫu (bậc sáng tối, bóng ngả xanh, tán cây cụm lá, đá gãy cạnh). Mỗi đảo một bảng
màu chủ đạo và một hình khối nhận diện: ruộng bậc thang, cối xay, thác, rừng thông, hồ băng, hoa trăng, tháp đá.

**Đọc được trên màn nhỏ:** vật tương tác có viền sáng nhẹ; thứ thay đổi theo thời tiết có chuyển động báo trước (nước
gợn trước khi dâng).

**Âm thanh:** tổng hợp bằng code như Saltline (không file âm thanh). Mỗi thời tiết một lớp nền (mưa, gió, dế đêm) trộn
dần theo cùng hệ số với hình ảnh; mỗi Linh một nhạc cụ, kết bạn thêm Linh thì bản nhạc đảo nhà thêm một bè.

**Chữ:** tiếng Việt trước, tách chuỗi để thêm tiếng Anh sau.

## 7. Kỹ thuật

- Nền: repo `games-3d-lab` (three.js, ES module, không build), quy trình pb-dev, skill `threejs-stylized-scene`.
- **Ngân sách hiệu năng (mục tiêu, chưa đo):** ≥ 30 fps ở mức Vừa trên điện thoại tầm trung; một đảo ≤ 300 nghìn tam giác,
  ≤ 120 lệnh vẽ. Số thật phải chờ anh Ben đo trên máy; nếu không đạt thì cắt lớp tia nắng và giảm cỏ trước.
- **Việc kỹ thuật mới cần làm cho game** (cảnh mẫu chưa có):
  1. Trạng thái thế giới tách khỏi hình ảnh: mức nước, băng, cây đã lớn là dữ liệu thuần, có test đơn vị, hình ảnh chỉ đọc.
  2. Nhân vật do người chơi điều khiển: tìm đường trên lưới đi được, va chạm đơn giản.
  3. Đảo mô tả bằng dữ liệu (file mô tả địa hình, vật thể, câu đố) thay cho code cứng như hiện nay.
  4. Lưu/nạp, màn chọn đảo, hội thoại, sổ tay.
  5. three.js đóng gói kèm để chơi không cần mạng; cài như ứng dụng (PWA).
- Mỗi luật thời tiết ở mục 4.3 là một hàm thuần có test; câu đố có test "giải được" tự động bằng cách chạy lời giải mẫu.

## 8. Phạm vi và lộ trình

**Bản chơi thử đầu tiên (vertical slice):** Đảo Nhà + chương 1 (Nắng) + chương 3 (Mưa), tức hai thời tiết và 6–8 câu đố,
đủ để biết ghép hai luật có vui không. Chọn Nắng và Mưa vì hai luật này đối nhau (đầy/cạn) và hình ảnh đã có sẵn.

| Mốc | Nội dung | Xong khi |
|---|---|---|
| M1 | Lõi trạng thái thế giới + Mầm đi lại bằng chạm | Chạm đâu Mầm tới đó trên đảo mẫu; mức nước đổi theo mưa/nắng có test |
| M2 | Một câu đố hoàn chỉnh (làm đầy suối để bè nổi) | Chơi được từ đầu đến cuối trên điện thoại, có gợi ý ba nấc |
| M3 | Bản chơi thử: 2 thời tiết, 6–8 câu đố, Đảo Nhà, lưu game | Một người chưa biết game chơi hết mà không cần chỉ |
| M4 | Thêm Gió, Tuyết, Đêm (chương 2, 5, 6) | Mỗi chương có câu đố ghép với luật cũ |
| M5 | Sương, Bão, chương kết; sổ tay, chụp ảnh, âm thanh | Chơi trọn cốt truyện |
| M6 | Đóng gói PWA, tối ưu máy yếu, tiếng Anh | Cài được lên điện thoại, chơi không mạng |

Không làm ở phiên bản đầu: nhiều người chơi, bảng xếp hạng, tài khoản trực tuyến, trình dựng đảo cho người chơi.

## 9. Rủi ro

| Rủi ro | Dấu hiệu | Cách giảm |
|---|---|---|
| Câu đố thời tiết không vui, chỉ là thử lần lượt bảy nút | Người chơi thử bấm hết mà không nghĩ | Làm M2 sớm nhất có thể và cho người thật chơi; giới hạn số thời tiết dùng được ở mỗi câu đố |
| Điện thoại không kham nổi đồ họa hiện tại | FPS dưới 30 ở mức Vừa | Đo ngay (việc đang nợ); có sẵn mức Thấp và độ phân giải động |
| Dựng 9 đảo bằng code quá tốn công | Một đảo mất hơn một tuần | Chuyển sang đảo mô tả bằng dữ liệu ở M1–M3 |
| Hình khối dựng bằng code không đủ duyên cho 8 Linh | Nhân vật nhìn như khối cầu ghép | Thử dựng một Linh ở M3; nếu không đạt thì bàn với anh Ben về model làm tay hoặc AI |
| Điều khiển chạm-để-đi vướng khi xoay sa bàn | Chạm nhầm giữa đi và xoay | Thử trên máy thật ở M1, có phương án cần ảo |

## 10. Những điểm cần anh Ben quyết

1. **Hướng game:** phiêu lưu giải đố bằng thời tiết như trên, hay anh muốn thể loại khác.
2. **Có lồng nội dung học không:** hai game trước của anh đều dạy toán. Bản này đang là game thuần giải trí; nếu muốn, có
   thể gắn kiến thức tự nhiên (vòng tuần hoàn nước, mùa, ngày đêm) vào sổ tay mà không đổi gameplay.
3. **Đối tượng:** 7–12 tuổi và gia đình như đề xuất, hay nhắm người lớn (câu đố khó hơn, ít gợi ý hơn).
4. **Tên game và tên nhân vật.**
5. **Phạm vi bản chơi thử:** Nắng + Mưa như đề xuất, hay cặp khác.
