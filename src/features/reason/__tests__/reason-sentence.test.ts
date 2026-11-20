import { reasonSentence, type ReasonSentence } from '@/features/reason/reason-sentence';
import type { BasisItem, Reason } from '@/lib/api';

const birth = (...items: BasisItem[]): Reason => ({ when: 'BIRTH', items });
const known = { timeKnown: true };
/** 굵은 글자 자리를 글자로 */
const boldOf = (s: ReasonSentence | null) => (s ? s.bold.map(([a, b]) => s.text.slice(a, b)) : null);

describe('이유 문장(결정 054 의 2): 시안의 문장과 글자까지 같다', () => {
  it('놓인 자리(별): 꾸밈말 · 별자리 · 하우스', () => {
    const s = reasonSentence(birth({ kind: 'PLACEMENT', body: 'SUN', sign: 'AQUARIUS', house: 5 }), known);
    expect(s?.text).toBe('태어날 때 나의 중심(해)이 자유로운 물병자리, 즐거움의 자리(5하우스)에 있었어요');
    expect(boldOf(s)).toEqual(['나의 중심', '자유로운', '즐거움의 자리']);
    expect(reasonSentence(birth({ kind: 'PLACEMENT', body: 'MOON', sign: 'CAPRICORN', house: 4 }), known)?.text).toBe(
      '태어날 때 마음(달)이 차근차근 쌓는 염소자리, 집과 가족의 자리(4하우스)에 있었어요',
    );
    expect(reasonSentence(birth({ kind: 'PLACEMENT', body: 'VENUS', sign: 'AQUARIUS' }), known)?.text).toBe(
      '태어날 때 좋아하는 것(금성)이 자유로운 물병자리에 있었어요',
    );
  });

  it('하우스에 모임', () => {
    const s = reasonSentence(birth({ kind: 'CLUSTER', house: 5, bodies: ['SUN', 'MERCURY', 'VENUS'] }), known);
    expect(s?.text).toBe('태어날 때 별 셋(행성 3개)이 즐거움의 자리(5하우스)에 모여 있었어요');
    expect(boldOf(s)).toEqual(['별 셋', '즐거움의 자리']);
  });

  it('두 별의 각도', () => {
    const s = reasonSentence(birth({ kind: 'ASPECT', a: 'SATURN', b: 'SUN', type: 'SQUARE' }), known);
    expect(s?.text).toBe('태어날 때 책임을 맡은 별(토성)이 나의 중심(해)과 부딪히는 각도(사분)에 있었어요');
    expect(boldOf(s)).toEqual(['책임을 맡은 별', '나의 중심', '부딪히는 각도']);
  });

  it('다스리는 별', () => {
    const s = reasonSentence(birth({ kind: 'RULER', body: 'MOON', ruler: 'SATURN' }), known);
    expect(s?.text).toBe('태어날 때 마음(달)이 책임을 맡은 별(토성)이 다스리는 자리에 있었어요');
    expect(boldOf(s)).toEqual(['마음', '책임을 맡은 별']);
  });

  it('지나가는 별: 지금 · 그날 · 오늘(합은 "내 ○○ 자리를 지나요")', () => {
    const now = reasonSentence({ when: 'NOW', items: [{ kind: 'TRANSIT', mover: 'SATURN', target: 'SUN', type: 'SQUARE' }] }, known);
    expect(now?.text).toBe('지금 책임을 맡은 별(토성)이 내 나의 중심(해)과 부딪히는 각도(사분)를 지나요');
    expect(boldOf(now)).toEqual(['책임을 맡은 별', '나의 중심', '부딪히는 각도']);
    const day: Reason = { when: 'DAY', items: [{ kind: 'TRANSIT', mover: 'MERCURY', target: 'SUN', type: 'TRINE' }] };
    const that = reasonSentence(day, known);
    expect(that?.text).toBe('그날 말을 맡은 별(수성)이 내 나의 중심(해)과 잘 어울리는 자리를 지나요');
    expect(boldOf(that)).toEqual(['말을 맡은 별', '나의 중심']);
    const today = reasonSentence(
      { when: 'DAY', items: [{ kind: 'TRANSIT', mover: 'MOON', target: 'VENUS', type: 'CONJUNCTION' }] },
      { timeKnown: true, today: true },
    );
    expect(today?.text).toBe('오늘 마음을 비추는 별(달)이 내 좋아하는 것(금성) 자리를 지나요');
    expect(boldOf(today)).toEqual(['마음을 비추는 별', '좋아하는 것']);
    expect(
      reasonSentence({ when: 'NOW', items: [{ kind: 'TRANSIT', mover: 'JUPITER', house: 10 }] }, known)?.text,
    ).toBe('지금 기회를 맡은 별(목성)이 내 일과 사회의 자리(10하우스)를 지나요');
  });

  it('상승점 · 중천: 하나면 "…에 …가 있었어요", 둘이면 "…에 …가, …에 …가 있었어요"', () => {
    expect(reasonSentence(birth({ kind: 'PLACEMENT', body: 'ASC', sign: 'LIBRA' }), known)?.text).toBe(
      '태어날 때 첫인상의 자리(상승점)에 균형을 아는 천칭자리가 있었어요',
    );
    const both = reasonSentence(
      birth({ kind: 'PLACEMENT', body: 'ASC', sign: 'LIBRA' }, { kind: 'PLACEMENT', body: 'MC', sign: 'CANCER' }),
      known,
    );
    expect(both?.text).toBe('태어날 때 첫인상의 자리(상승점)에 균형을 아는 천칭자리가, 꿈의 자리(중천)에 품어 주는 게자리가 있었어요');
    expect(boldOf(both)).toEqual(['첫인상의 자리', '균형을 아는', '꿈의 자리', '품어 주는']);
  });

  it('근거가 둘이면 앞 문장을 "…고," 로 잇는다', () => {
    const s = reasonSentence(
      birth({ kind: 'PLACEMENT', body: 'VENUS', sign: 'GEMINI', house: 6 }, { kind: 'ASPECT', a: 'MARS', b: 'VENUS', type: 'CONJUNCTION' }),
      known,
    );
    expect(s?.text).toBe(
      '태어날 때 좋아하는 것(금성)이 호기심 많은 쌍둥이자리, 일상의 자리(6하우스)에 있었고, 밀어붙이는 힘(화성)이 좋아하는 것(금성)과 겹치는 자리(합)에 있었어요',
    );
  });

  it('조사는 괄호 앞 말의 받침으로 고른다', () => {
    // 받침 없는 말 → 가 · 와
    expect(reasonSentence(birth({ kind: 'ASPECT', a: 'URANUS', b: 'ASC', type: 'TRINE' }), known)?.text).toBe(
      '태어날 때 변화를 맡은 별(천왕성)이 첫인상의 자리(상승점)와 잘 어울리는 자리(삼분)에 있었어요',
    );
    expect(reasonSentence(birth({ kind: 'RULER', body: 'ASC', ruler: 'MARS' }), known)?.text).toBe(
      '태어날 때 첫인상의 자리(상승점)가 밀어붙이는 힘(화성)이 다스리는 자리에 있었어요',
    );
  });
});

describe('이유 문장: 시각 모름 · 모르는 값(결정 054 의 6 · 7)', () => {
  const unknown = { timeKnown: false };
  it('시각을 모르면 하우스 부분을 빼고, 하우스 · 상승점 · 중천만으로 된 근거는 숨긴다', () => {
    expect(reasonSentence(birth({ kind: 'PLACEMENT', body: 'SUN', sign: 'AQUARIUS', house: 5 }), unknown)?.text).toBe(
      '태어날 때 나의 중심(해)이 자유로운 물병자리에 있었어요',
    );
    expect(reasonSentence(birth({ kind: 'CLUSTER', house: 5, bodies: ['SUN', 'MERCURY', 'VENUS'] }), unknown)).toBeNull();
    expect(reasonSentence(birth({ kind: 'PLACEMENT', body: 'ASC', sign: 'LIBRA' }), unknown)).toBeNull();
    expect(reasonSentence(birth({ kind: 'ASPECT', a: 'SUN', b: 'MC', type: 'SQUARE' }), unknown)).toBeNull();
    expect(reasonSentence({ when: 'NOW', items: [{ kind: 'TRANSIT', mover: 'JUPITER', house: 10 }] }, unknown)).toBeNull();
    // 둘 중 하나만 남으면 그것만
    expect(
      reasonSentence(
        birth({ kind: 'PLACEMENT', body: 'ASC', sign: 'LIBRA' }, { kind: 'PLACEMENT', body: 'MOON', sign: 'CAPRICORN', house: 4 }),
        unknown,
      )?.text,
    ).toBe('태어날 때 마음(달)이 차근차근 쌓는 염소자리에 있었어요');
  });

  it('사전을 객체의 제 키로만 찾는다 — toString · constructor 같은 이름도 사전에 없는 값(리뷰 #49)', () => {
    expect(reasonSentence(birth({ kind: 'PLACEMENT', body: 'toString', sign: 'AQUARIUS' }), known)).toBeNull();
    expect(reasonSentence(birth({ kind: 'PLACEMENT', body: 'SUN', sign: 'constructor' }), known)).toBeNull();
    expect(reasonSentence(birth({ kind: 'ASPECT', a: 'SATURN', b: 'SUN', type: 'hasOwnProperty' }), known)).toBeNull();
    expect(reasonSentence(birth({ kind: 'RULER', body: 'MOON', ruler: 'valueOf' }), known)).toBeNull();
  });

  it('모르는 kind · 사전에 없는 값이면 그 이유 줄을 숨긴다(null)', () => {
    expect(reasonSentence(birth({ kind: 'MIDPOINT' }), known)).toBeNull();
    expect(reasonSentence(birth({ kind: 'PLACEMENT', body: 'CHIRON', sign: 'AQUARIUS' }), known)).toBeNull();
    expect(reasonSentence(birth({ kind: 'PLACEMENT', body: 'SUN', sign: 'OPHIUCHUS' }), known)).toBeNull();
    expect(reasonSentence(birth({ kind: 'ASPECT', a: 'SATURN', b: 'SUN', type: 'QUINCUNX' }), known)).toBeNull();
    expect(reasonSentence(birth({ kind: 'CLUSTER', house: 5, bodies: Array(11).fill('SUN') }), known)).toBeNull();
    expect(
      reasonSentence({ when: 'DAY', items: [{ kind: 'TRANSIT', mover: 'MOON', target: 'VERTEX', type: 'SQUARE' }] }, known),
    ).toBeNull();
    expect(
      reasonSentence(birth({ kind: 'PLACEMENT', body: 'SUN', sign: 'AQUARIUS' }, { kind: 'MIDPOINT' }), known),
    ).toBeNull();
  });
});
