import { reasonBrief } from '@/features/reason/reason-sentence';
import type { BasisItem, Reason } from '@/lib/api';

const day = (...items: BasisItem[]): Reason => ({ when: 'DAY', items });
const known = { timeKnown: true };

describe('짧은 이유(홈 오늘의 하늘 카드, 보드 11): 별 이름만으로 한 줄', () => {
  it('합은 "내 ○○ 자리를 지나요" — 시안 그대로', () => {
    expect(reasonBrief(day({ kind: 'TRANSIT', mover: 'MOON', target: 'VENUS', type: 'CONJUNCTION' }), known)).toBe('오늘은 달이 내 금성 자리를 지나요');
  });

  it('다른 각도는 각도의 지나감 말, 하우스는 그 자리의 별명', () => {
    expect(reasonBrief(day({ kind: 'TRANSIT', mover: 'MERCURY', target: 'SUN', type: 'TRINE' }), known)).toBe('오늘은 수성이 내 해와 잘 어울리는 자리를 지나요');
    expect(reasonBrief(day({ kind: 'TRANSIT', mover: 'SATURN', target: 'SUN', type: 'SQUARE' }), known)).toBe('오늘은 토성이 내 해와 부딪히는 각도를 지나요');
    expect(reasonBrief(day({ kind: 'TRANSIT', mover: 'JUPITER', house: 5 }), known)).toBe('오늘은 목성이 내 즐거움의 자리를 지나요');
  });

  it('시각을 모르면 하우스 · 상승점 · 중천의 근거는 그리지 않는다(이중 안전)', () => {
    expect(reasonBrief(day({ kind: 'TRANSIT', mover: 'JUPITER', house: 5 }), { timeKnown: false })).toBeNull();
    expect(reasonBrief(day({ kind: 'TRANSIT', mover: 'MOON', target: 'ASC', type: 'CONJUNCTION' }), { timeKnown: false })).toBeNull();
    expect(reasonBrief(day({ kind: 'TRANSIT', mover: 'MOON', target: 'VENUS', type: 'CONJUNCTION' }), { timeKnown: false })).toBe('오늘은 달이 내 금성 자리를 지나요');
  });

  it('그날(DAY)의 지나가는 별이 아니거나 사전에 없는 값이면 null — 카드에서 그 줄만 숨긴다', () => {
    expect(reasonBrief({ when: 'NOW', items: [{ kind: 'TRANSIT', mover: 'MOON', target: 'VENUS', type: 'CONJUNCTION' }] }, known)).toBeNull();
    expect(reasonBrief(day({ kind: 'PLACEMENT', body: 'SUN', sign: 'AQUARIUS' }), known)).toBeNull();
    expect(reasonBrief(day({ kind: 'TRANSIT', mover: 'toString', target: 'VENUS', type: 'CONJUNCTION' }), known)).toBeNull();
    expect(reasonBrief(day({ kind: 'TRANSIT', mover: 'MOON', target: 'VENUS', type: 'QUINCUNX' }), known)).toBeNull();
    expect(reasonBrief(day({ kind: 'MIDPOINT' }), known)).toBeNull();
  });
});
