// Chuyen ke cua dan lang: moi nguoi ke theo thu tu cua minh, moi chuyen di mot mau moi, mau da nghe khong mat, du lieu luu hong khong lam vo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STORY, createStory, nextBeat, serializeStory, tell } from '../src/game/story-core.js';

const TELLERS = [...new Set(STORY.map((beat) => beat.teller))];

test('every beat has a unique id, a teller, and a short text that neither nags nor asks "have you ... yet"', () => {
  assert.equal(new Set(STORY.map((beat) => beat.id)).size, STORY.length);
  for (const beat of STORY) {
    assert.ok(beat.teller.length > 1, beat.id);
    assert.ok(beat.text.length >= 30 && beat.text.length <= 130, `${beat.id}: ${beat.text.length} ky tu`);   // vua mot o thong bao tren dien thoai
    assert.doesNotMatch(beat.text, /chưa\?|phải |nhanh lên|mau lên/i, beat.id);
  }
});

test('a teller tells their own beats in story order, one new beat per journey', () => {
  const story = createStory();
  const mine = STORY.filter((beat) => beat.teller === 'nhim');
  assert.ok(mine.length >= 2);
  const first = nextBeat(story, 'nhim', 1);
  assert.equal(first.id, mine[0].id);
  tell(story, first, 1);
  assert.equal(nextBeat(story, 'nhim', 1), null, 'cung chuyen di thi khong ke them mau moi');
  assert.equal(nextBeat(story, 'nhim', 2).id, mine[1].id, 'chuyen sau ke mau ke tiep');
});

test('one teller having told does not silence the others in the same journey', () => {
  const story = createStory();
  tell(story, nextBeat(story, 'nhim', 1), 1);
  const other = TELLERS.find((id) => id !== 'nhim');
  assert.equal(nextBeat(story, other, 1).teller, other);
});

test('heard beats survive a save and reload, and are never told again', () => {
  const story = createStory();
  const beat = nextBeat(story, 'nhim', 1);
  tell(story, beat, 1);
  const again = createStory(JSON.parse(JSON.stringify(serializeStory(story))));
  assert.ok(again.heard.has(beat.id));
  assert.notEqual(nextBeat(again, 'nhim', 1).id, beat.id, 'lan choi sau ke mau moi, khong lap lai');
});

test('telling every beat finishes the story exactly once and leaves nothing more to tell', () => {
  const story = createStory();
  let finishes = 0, journey = 0;
  while (serializeStory(story).length < STORY.length) {
    journey += 1;
    assert.ok(journey <= STORY.length, 'cau chuyen phai ket thuc');
    for (const teller of TELLERS) { const beat = nextBeat(story, teller, journey); if (beat && tell(story, beat, journey).finished) finishes += 1; }
  }
  assert.equal(finishes, 1);
  assert.deepEqual(serializeStory(story), STORY.map((beat) => beat.id));
  for (const teller of TELLERS) assert.equal(nextBeat(story, teller, journey + 1), null);
});

test('a broken or foreign save is ignored instead of breaking the story', () => {
  for (const saved of [null, undefined, 'x', 42, {}, ['khong-co', 7, null]]) assert.equal(createStory(saved).heard.size, 0);
  assert.deepEqual(serializeStory(createStory([STORY[2].id, 'la'])), [STORY[2].id]);
});

test('telling an unknown beat is refused loudly', () => {
  assert.throws(() => tell(createStory(), { id: 'bia', teller: 'nhim' }, 1), RangeError);
  assert.throws(() => tell(createStory(), null, 1), RangeError);
});

test('an unknown teller simply has nothing to tell', () => {
  assert.equal(nextBeat(createStory(), 'ai-do', 1), null);
});
