import { starLabels } from '@/features/me/me-stars';
import { fixtures } from '@/lib/fixtures';

const text = (labels: ReturnType<typeof starLabels>) => labels.map((l) => `${l.strong} · ${l.rest}`);

describe('이 풀이에 쓰인 별(결정 054 의 5): 서버의 stars 를 용어 사전으로', () => {
  it('놓인 자리 "나의 중심 · 쌍둥이자리" · 상승점은 "첫인상 · 염소자리" · 하우스 모임은 "일상의 자리 · 별 셋"', () => {
    expect(text(starLabels(fixtures.meReport.areas[0].stars, true))).toEqual([
      '나의 중심 · 쌍둥이자리',
      '첫인상 · 염소자리',
      '일상의 자리 · 별 셋',
    ]);
  });

  it('각도 · 다스리는 별의 별 하나는 "책임을 맡은 별 · 토성", 하우스만 오면 "집과 가족의 자리 · 4하우스", 달은 "마음"', () => {
    expect(text(starLabels([{ body: 'SATURN' }, { house: 4 }, { body: 'MOON', sign: 'CAPRICORN' }, { body: 'MC' }], true))).toEqual([
      '책임을 맡은 별 · 토성',
      '집과 가족의 자리 · 4하우스',
      '마음 · 염소자리',
      '꿈의 자리 · 중천',
    ]);
  });

  it('시각을 모르면 하우스 · 상승점 · 중천이 든 별은 빼고, 사전에 없는 값도 뺀다', () => {
    expect(text(starLabels(fixtures.meReport.areas[0].stars, false))).toEqual(['나의 중심 · 쌍둥이자리']);
    expect(starLabels([{ body: 'CHIRON', sign: 'ARIES' }, { house: 6, count: 12 }, {}], true)).toEqual([]);
    // 사전을 제 키로만 찾는다(리뷰 #49)
    expect(starLabels([{ body: 'toString' }, { body: 'SUN', sign: 'constructor' }], true)).toEqual([]);
  });
});
