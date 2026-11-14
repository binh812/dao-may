// Chuyen ke cua dan lang (luat thuan, co test): mot cau chuyen ngan chia thanh nhieu mau, moi nguoi giu vai mau va ke theo thu tu cua
// rieng minh. Moi chuyen di, moi nguoi chi ke MOT mau moi: be quay lai o chuyen sau se co mau tiep theo. Mau da nghe duoc nho qua cac
// lan choi. Nghe chuyen khong co thuong va khong bat buoc: chi de the gioi co chuyen.
// Khong doi `id` cua mau da phat hanh (tien do luu theo id).

/** `teller` khop voi `id` cua dan lang trong `realm.villagers`. */
export const STORY = [
  { id: 'sao-1', teller: 'nhim', text: 'Ngày xưa, thung lũng này lúc nào cũng rộn tiếng sáo. Rồi một hôm, tiếng sáo bỗng im bặt...' },
  { id: 'sao-2', teller: 'hoang-tu', text: 'Cây sáo trúc của làng bị gió cuốn đi mất. Vắng tiếng nhạc, mấy đám mây buồn ngủ rơi xuống, hóa thành Bóng Lặng.' },
  { id: 'sao-3', teller: 'cong-chua', text: 'Bóng Lặng không xấu đâu. Chúng chỉ ngủ quên thôi. Có lá và nắng gọi dậy là chúng lại vui ngay.' },
  { id: 'sao-4', teller: 'nhim', text: 'Ông cối xay bảo gió mang cây sáo đi xa lắm rồi. Nhưng nắng của Mầm thì gọi được tiếng nhạc về.' },
  { id: 'sao-5', teller: 'hoang-tu', text: 'Mỗi khi một Bóng Lặng thức dậy, gió lại hát thêm một nốt. Mình nghe thấy rồi đó!' },
  { id: 'sao-6', teller: 'cong-chua', text: 'Khi cả thung lũng tỉnh giấc, tiếng sáo sẽ trở về. Cảm ơn Mầm đã mang nắng tới đây!' },
];
const KNOWN = new Set(STORY.map((beat) => beat.id));

/** Tao trang thai tu du lieu da luu (mang id cac mau da nghe); du lieu hong hoac id la thi bo qua. */
export function createStory(saved) {
  const heard = new Set(Array.isArray(saved) ? saved.filter((id) => KNOWN.has(id)) : []);
  return { heard, toldOn: new Map() };   // toldOn: nguoi ke -> chuyen di gan nhat da ke mot mau moi
}

/** Mau ma `teller` se ke o chuyen di `journey`: mau chua nghe dau tien cua nguoi do, hoac null (het chuyen, hoac chuyen nay da ke roi). */
export function nextBeat(story, teller, journey) {
  if (story.toldOn.get(teller) === journey) return null;
  return STORY.find((beat) => beat.teller === teller && !story.heard.has(beat.id)) ?? null;
}

/** Ghi nhan mau vua ke. Tra ve { finished }: true khi day la mau cuoi cung con lai cua ca cau chuyen. */
export function tell(story, beat, journey) {
  if (!KNOWN.has(beat?.id)) throw new RangeError(`Mau chuyen khong co: ${beat?.id}`);
  const fresh = !story.heard.has(beat.id);
  story.heard.add(beat.id); story.toldOn.set(beat.teller, journey);
  return { finished: fresh && story.heard.size === STORY.length };
}

/** Du lieu de luu: mang id theo thu tu cua cau chuyen. */
export function serializeStory(story) { return STORY.filter((beat) => story.heard.has(beat.id)).map((beat) => beat.id); }
