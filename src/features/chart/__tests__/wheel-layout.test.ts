import { spreadLabels, wheelLayout, wheelPolar } from '@/features/chart/wheel-layout';
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
  const chart = fixtures.chart;
  const fromCenter = (p: { x: number; y: number }) => dist(p, { x: layout.center, y: layout.center });

  it('별자리 12칸, 하우스 선 12개와 번호 12개 · 칸 12개, 축 2개(첫인상 · 꿈), 천체 점 10개를 놓는다', () => {
    expect(layout.signs).toHaveLength(12);
    expect(layout.houseLines).toHaveLength(12);
    expect(layout.houseNumbers.map((h) => h.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(layout.houseSectors.map((h) => h.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(layout.axes.map((a) => a.key)).toEqual(['ASC', 'MC']);
    expect(layout.bodies).toHaveLength(10);
  });

  it('시안(320) 의 고리: 바깥 152 · 별자리 안쪽 124 · 가운데 60, 점은 108, 이름은 모두 90 원 위에 놓는다', () => {
    expect(layout.size).toBe(320);
    expect([layout.rOuter, layout.rSign, layout.rInner]).toEqual([152, 124, 60]);
    for (const b of layout.bodies) expect(fromCenter(b.dot)).toBeCloseTo(108, 5);
    for (const b of layout.bodies) expect(fromCenter(b.label)).toBeCloseTo(90, 5);
  });

  it('상승점(첫인상의 축)이 휠의 왼쪽 끝에 오고, 축은 가운데 원에서 바깥 원까지 긋는다', () => {
    const asc = layout.axes[0];
    expect(asc.line.y1).toBeCloseTo(layout.center, 5);
    expect(asc.line.y2).toBeCloseTo(layout.center, 5);
    expect(asc.line.x2).toBeCloseTo(layout.center - layout.rOuter, 5);
    expect(asc.line.x1).toBeCloseTo(layout.center - layout.rInner, 5);
    // 축 이름은 가운데 원 안, 축 위에 놓인다
    expect(asc.label.y).toBeCloseTo(layout.center, 5);
    expect(asc.label.x).toBeLessThan(layout.center);
    expect(fromCenter(asc.label)).toBeLessThan(layout.rInner);
  });

  it('꿈의 축은 서버가 준 중천의 황경 쪽을 가리킨다', () => {
    const { at } = wheelPolar(layout.center, chart.angles!.asc.longitude);
    const mc = layout.axes[1];
    const outer = at(chart.angles!.mc.longitude, layout.rOuter);
    expect(mc.line.x2).toBeCloseTo(outer.x, 5);
    expect(mc.line.y2).toBeCloseTo(outer.y, 5);
    const towards = at(chart.angles!.mc.longitude, fromCenter(mc.label));
    expect(mc.label.x).toBeCloseTo(towards.x, 5);
    expect(mc.label.y).toBeCloseTo(towards.y, 5);
  });

  it('하우스 선은 서버가 준 경계에서 가운데 원부터 별자리 고리까지 긋는다', () => {
    const { at } = wheelPolar(layout.center, chart.angles!.asc.longitude);
    chart.houses!.forEach((h, i) => {
      const line = layout.houseLines[i];
      const inner = at(h.longitude, layout.rInner);
      const outer = at(h.longitude, layout.rSign);
      expect([line.x1, line.y1, line.x2, line.y2].map((v) => v.toFixed(3))).toEqual(
        [inner.x, inner.y, outer.x, outer.y].map((v) => v.toFixed(3)),
      );
    });
  });

  it('하우스 칸은 그 하우스의 경계에서 다음 경계까지, 가운데 원과 별자리 고리 사이를 칠하는 모양이다', () => {
    const { at } = wheelPolar(layout.center, chart.angles!.asc.longitude);
    const fmt = (p: { x: number; y: number }) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    const cusp = (n: number) => chart.houses![n - 1].longitude;
    const fifth = layout.houseSectors[4].path;
    expect(fifth.startsWith(`M${fmt(at(cusp(5), layout.rSign))} A`)).toBe(true);
    expect(fifth).toContain(fmt(at(cusp(6), layout.rSign)));
    expect(fifth).toContain(`L${fmt(at(cusp(6), layout.rInner))}`);
    expect(fifth).toContain(fmt(at(cusp(5), layout.rInner)));
    // 열두째 칸은 첫째 경계에서 닫힌다
    expect(layout.houseSectors[11].path).toContain(fmt(at(cusp(1), layout.rSign)));
  });

  it('각도 선과 눈금은 그리지 않는다(시안 13)', () => {
    expect(layout).not.toHaveProperty('aspectLines');
    expect(layout).not.toHaveProperty('ticks');
  });

  it('가까운 천체(태양·금성·화성)의 이름은 같은 원 위에서 양옆으로 벌리고, 무리의 가운데는 제자리에 둔다', () => {
    const lon = (name: string) => layout.bodies.find((b) => b.body === name)!.labelLon;
    const real = (name: string) => chart.positions.find((p) => p.body === name)!.longitude;
    const trio = ['SUN', 'VENUS', 'MARS'];
    // 황경 순서는 그대로, 사이는 벌어진다
    expect(lon('SUN')).toBeLessThan(lon('VENUS'));
    expect(lon('VENUS')).toBeLessThan(lon('MARS'));
    expect(lon('VENUS') - lon('SUN')).toBeGreaterThan(real('VENUS') - real('SUN'));
    const mean = (f: (n: string) => number) => trio.reduce((a, n) => a + f(n), 0) / trio.length;
    expect(mean(lon)).toBeCloseTo(mean(real), 1);
    // 떨어진 천체(수성)의 이름은 제 점 바로 안쪽이다
    expect(lon('MERCURY')).toBeCloseTo(real('MERCURY'), 5);
  });

  it('이름은 하우스 번호 · 가운데 원 · 별 점과 겹치지 않는다', () => {
    for (const b of layout.bodies) {
      for (const h of layout.houseNumbers) expect(dist(b.label, h)).toBeGreaterThan((layout.labelFontSize + layout.houseFontSize) / 2 + 4);
      for (const o of layout.bodies) expect(dist(b.label, o.dot)).toBeGreaterThan(layout.labelFontSize / 2 + layout.dotRadius);
    }
  });

  it('어느 두 이름도 글자 크기보다 가깝게 놓이지 않는다', () => {
    const labels = layout.bodies.map((b) => b.label);
    for (let i = 0; i < labels.length; i++)
      for (let j = i + 1; j < labels.length; j++)
        expect(dist(labels[i], labels[j])).toBeGreaterThanOrEqual(layout.labelFontSize);
  });
});

describe('spreadLabels: 몰린 이름 벌리기(내 하늘 지도 · 궁합 휠이 같이 쓴다)', () => {
  it('같은 거리를 받으면 붙은 무리를 그 거리씩 띄우고 무리의 가운데는 제자리에 둔다', () => {
    const out = spreadLabels(
      [
        { body: 'A', lon: 100 },
        { body: 'B', lon: 101 },
        { body: 'C', lon: 102 },
        { body: 'D', lon: 200 },
      ],
      5,
    );
    const at = (b: string) => out.find((p) => p.body === b)!.labelLon;
    expect([at('A'), at('B'), at('C')]).toEqual([96, 101, 106]);
    expect(at('D')).toBe(200);
    expect(out.find((p) => p.body === 'A')!.lon).toBe(100);
  });

  it('거리를 함수로 받으면 이웃한 둘마다 다르게 띄운다(긴 이름 옆은 더 넓게)', () => {
    const list = [
      { body: 'A', lon: 10, w: 1 },
      { body: 'B', lon: 10, w: 3 },
    ];
    const out = spreadLabels(list, (a, b) => a.w + b.w);
    const [a, b] = ['A', 'B'].map((n) => out.find((p) => p.body === n)!.labelLon);
    expect(b - a).toBeCloseTo(4, 5);
    expect((a + b) / 2).toBeCloseTo(10, 5);
  });
});

describe('wheelLayout: 이름 벌리기', () => {
  it('같은 자리의 두 천체도 이름이 겹치지 않는다', () => {
    const layout = wheelLayout(chartOf([body('SUN', 'LEO', 10), body('MOON', 'LEO', 10)]));
    const [a, b] = layout.bodies;
    expect(dist(a.label, b.label)).toBeGreaterThanOrEqual(layout.labelFontSize);
    expect(dist(a.dot, b.dot)).toBeCloseTo(0, 5);
  });

  it('0도를 사이에 둔 가까운 천체(물고기 끝과 양 처음)도 벌린다', () => {
    const layout = wheelLayout(chartOf([body('SUN', 'ARIES', 1), body('MOON', 'PISCES', 28)]));
    const [sun, moon] = layout.bodies;
    expect(dist(sun.label, moon.label)).toBeGreaterThanOrEqual(layout.labelFontSize);
    // 물고기 쪽(달)은 0도 아래로, 양 쪽(해)은 위로 벌어진다
    expect(((sun.labelLon - moon.labelLon + 360) % 360)).toBeGreaterThan(3);
    expect(((sun.labelLon - moon.labelLon + 360) % 360)).toBeLessThan(180);
  });

  it('두 글자 이름(해왕)은 그만큼 더 벌린다', () => {
    const layout = wheelLayout(chartOf([body('NEPTUNE', 'LEO', 10), body('MOON', 'LEO', 11)]));
    const [a, b] = layout.bodies;
    expect(dist(a.label, b.label)).toBeGreaterThanOrEqual(layout.labelFontSize * 1.5);
  });

  it('떨어져 있으면 벌리지 않는다', () => {
    const layout = wheelLayout(chartOf([body('SUN', 'ARIES', 1), body('MOON', 'LIBRA', 1)]));
    expect(layout.bodies.map((b) => b.labelLon)).toEqual([1, 181]);
  });
});

describe('wheelLayout: 시각 모름 차트', () => {
  const layout = wheelLayout(fixtures.chartTimeUnknown);

  it('하우스 선 · 번호 · 칸과 첫인상 · 꿈의 축이 0개다', () => {
    expect(layout.houseLines).toHaveLength(0);
    expect(layout.houseNumbers).toHaveLength(0);
    expect(layout.houseSectors).toHaveLength(0);
    expect(layout.axes).toHaveLength(0);
  });

  it('별자리 고리와 천체 점 10개는 그대로 그린다', () => {
    expect(layout.signs).toHaveLength(12);
    expect(layout.bodies).toHaveLength(10);
  });

  it('timeKnown 이 false 면 houses 가 실려 와도 하우스 선을 그리지 않는다', () => {
    const leaked = { ...fixtures.chart, timeKnown: false };
    expect(wheelLayout(leaked).houseLines).toHaveLength(0);
    expect(wheelLayout(leaked).houseSectors).toHaveLength(0);
    expect(wheelLayout(leaked).axes).toHaveLength(0);
  });

});
