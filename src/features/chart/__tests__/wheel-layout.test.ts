import { wheelLayout } from '@/features/chart/wheel-layout';
import type { Chart, Position } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

const SIGNS = [
  'ARIES',
  'TAURUS',
  'GEMINI',
  'CANCER',
  'LEO',
  'VIRGO',
  'LIBRA',
  'SCORPIO',
  'SAGITTARIUS',
  'CAPRICORN',
  'AQUARIUS',
  'PISCES',
];

const body = (name: string, sign: string, degree: number, minute = 0): Position => ({
  body: name,
  sign,
  degree,
  minute,
  longitude: SIGNS.indexOf(sign) * 30 + degree + minute / 60,
  retrograde: false,
});
const chartOf = (positions: Position[]): Chart => ({
  timeKnown: false,
  houseSystem: 'PLACIDUS',
  positions,
  points: [],
  aspects: [],
});

describe('wheelLayout: 시각을 아는 차트', () => {
  const layout = wheelLayout(fixtures.chart);

  it('별자리 12칸, 하우스 선 12개와 번호 12개, 천체 점 10개를 놓는다', () => {
    expect(layout.signs).toHaveLength(12);
    expect(layout.houseLines).toHaveLength(12);
    expect(layout.houseLines.filter((l) => l.main)).toHaveLength(4);
    expect(layout.houseNumbers.map((h) => h.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(layout.bodies).toHaveLength(10);
  });

  it('상승점이 휠의 왼쪽 끝에 온다', () => {
    const first = layout.houseLines[0];
    expect(first.y2).toBeCloseTo(layout.center, 1);
    expect(first.x2).toBeLessThan(layout.center);
  });

  it('각도 선은 서버가 준 각도만 그리고, 긴장(사분·충)은 점선 조화(삼분·육분)는 실선이다', () => {
    const drawn = fixtures.chart.aspects.filter((a) => a.type !== 'CONJUNCTION');
    expect(layout.aspectLines).toHaveLength(drawn.length);
    expect(layout.aspectLines.map((l) => l.dashed)).toEqual(
      drawn.map((a) => a.type === 'SQUARE' || a.type === 'OPPOSITION'),
    );
    expect(layout.aspectLines.some((l) => l.dashed)).toBe(true);
    expect(layout.aspectLines.some((l) => !l.dashed)).toBe(true);
  });

  it('가까운 천체(태양·금성·화성)의 이름은 한 단씩 안쪽으로 밀린다', () => {
    const lift = (name: string) => layout.bodies.find((b) => b.body === name)!.lift;
    expect([lift('SUN'), lift('VENUS'), lift('MARS')]).toEqual([0, 1, 2]);
    expect(lift('MERCURY')).toBe(0);
  });

  it('어느 두 이름도 글자 크기보다 가깝게 놓이지 않는다', () => {
    const labels = layout.bodies.map((b) => b.label);
    for (let i = 0; i < labels.length; i++)
      for (let j = i + 1; j < labels.length; j++)
        expect(dist(labels[i], labels[j])).toBeGreaterThanOrEqual(layout.labelFontSize);
  });
});

describe('wheelLayout: 이름 밀기', () => {
  it('같은 자리의 두 천체도 이름이 겹치지 않는다', () => {
    const layout = wheelLayout(chartOf([body('SUN', 'LEO', 10), body('MOON', 'LEO', 10)]));
    const [a, b] = layout.bodies;
    expect(dist(a.label, b.label)).toBeGreaterThanOrEqual(layout.labelFontSize);
    expect(dist(a.dot, b.dot)).toBeCloseTo(0, 5);
  });

  it('0도를 사이에 둔 가까운 천체(물고기 끝과 양 처음)도 밀린다', () => {
    const layout = wheelLayout(chartOf([body('SUN', 'ARIES', 1), body('MOON', 'PISCES', 28)]));
    expect(layout.bodies.map((b) => b.lift).sort()).toEqual([0, 1]);
  });

  it('떨어져 있으면 밀지 않는다', () => {
    const layout = wheelLayout(chartOf([body('SUN', 'ARIES', 1), body('MOON', 'LIBRA', 1)]));
    expect(layout.bodies.map((b) => b.lift)).toEqual([0, 0]);
  });
});

describe('wheelLayout: 시각 모름 차트', () => {
  const layout = wheelLayout(fixtures.chartTimeUnknown);

  it('하우스 선과 번호가 0개다', () => {
    expect(layout.houseLines).toHaveLength(0);
    expect(layout.houseNumbers).toHaveLength(0);
  });

  it('별자리 고리와 천체 점 10개는 그대로 그린다', () => {
    expect(layout.signs).toHaveLength(12);
    expect(layout.bodies).toHaveLength(10);
  });

  it('timeKnown 이 false 면 houses 가 실려 와도 하우스 선을 그리지 않는다', () => {
    const leaked = { ...fixtures.chart, timeKnown: false };
    expect(wheelLayout(leaked).houseLines).toHaveLength(0);
  });
});
