import { overlayLayout } from '@/features/chart/overlay-layout';
import type { SynastryOverlay } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const overlay = fixtures.synastry.overlay as SynastryOverlay;
const { mineAsc, ...noAsc } = overlay;
const radius = (p: { x: number; y: number }, center: number) => Math.hypot(p.x - center, p.y - center);

describe('overlayLayout: 겹친 휠의 화면 좌표', () => {
  const w = overlayLayout(overlay);

  it('별자리 12칸과 내 점 10개 · 상대 점 10개를 놓는다', () => {
    expect(w.signs).toHaveLength(12);
    expect(w.mine.map((b) => b.body).sort()).toEqual(overlay.mine.map((b) => b.body).sort());
    expect(w.theirs.map((b) => b.body).sort()).toEqual(overlay.theirs.map((b) => b.body).sort());
  });

  it('내 점은 별자리 고리 안쪽에, 상대 점은 고리 바깥에 놓아 두 사람이 섞이지 않는다', () => {
    for (const b of w.mine) expect(radius(b.dot, w.center)).toBeLessThan(w.rSign);
    for (const b of w.theirs) expect(radius(b.dot, w.center)).toBeGreaterThan(w.rOuter);
  });

  it('점과 이름이 모두 그림 안에 들어온다', () => {
    for (const b of [...w.mine, ...w.theirs])
      for (const p of [b.dot, b.label]) expect(radius(p, w.center)).toBeLessThan(w.center - w.labelFontSize / 2);
  });

  it('점의 자리는 서버가 준 황경에서만 나온다: 내 상승점이 왼쪽 끝이고 거기서 황경만큼 돈다', () => {
    expect(mineAsc).toEqual(expect.any(Number));
    expect(w.ascLine).not.toBeNull();
    expect(w.ascLine!.x2).toBeCloseTo(w.center - w.rSign);
    expect(w.ascLine!.y2).toBeCloseTo(w.center);
    for (const [list, placed] of [
      [overlay.mine, w.mine],
      [overlay.theirs, w.theirs],
    ] as const)
      for (const source of list) {
        const dot = placed.find((b) => b.body === source.body)!.dot;
        const t = ((180 + source.longitude - mineAsc!) * Math.PI) / 180;
        const r = radius(dot, w.center);
        expect(dot.x).toBeCloseTo(w.center + r * Math.cos(t));
        expect(dot.y).toBeCloseTo(w.center - r * Math.sin(t));
      }
  });

  it('내 시각을 몰라 상승점이 없으면 상승점 선이 없고 양자리 0도가 왼쪽이다', () => {
    const n = overlayLayout({ ...noAsc, mine: [{ body: 'SUN', longitude: 0 }] });
    expect(n.ascLine).toBeNull();
    expect(n.mine[0].dot.y).toBeCloseTo(n.center);
    expect(n.mine[0].dot.x).toBeLessThan(n.center);
  });

  it('선은 서버가 준 lines 만 긋는다: 조화는 실선, 긴장은 점선, 합과 모르는 종류는 긋지 않는다', () => {
    const drawable = overlay.lines.filter((l) => l.type !== 'CONJUNCTION');
    expect(drawable.length).toBeLessThan(overlay.lines.length);
    expect(w.lines).toHaveLength(drawable.length);
    expect(w.lines.map((l) => l.dashed)).toEqual(drawable.map((l) => ['SQUARE', 'OPPOSITION'].includes(l.type)));
    expect(overlayLayout({ ...overlay, lines: [{ mine: 'SUN', theirs: 'MOON', type: 'QUINCUNX' }] }).lines).toEqual([]);
    expect(overlayLayout({ ...overlay, lines: [] }).lines).toEqual([]);
  });

  it('내 상승점(ASC)에 닿는 선은 왼쪽 끝에서 시작하고, 상승점이 없으면 긋지 않는다', () => {
    const ascOnly = { ...overlay, lines: [{ mine: 'ASC', theirs: 'SATURN', type: 'SQUARE' }] };
    const [line] = overlayLayout(ascOnly).lines;
    expect(line.x1).toBeCloseTo(w.center - w.rInner);
    expect(line.y1).toBeCloseTo(w.center);
    expect(overlayLayout({ ...ascOnly, mineAsc: undefined }).lines).toEqual([]);
  });

  it('목록에 없는 천체를 가리키는 선은 긋지 않는다', () => {
    const lines = [
      { mine: 'CHIRON', theirs: 'SUN', type: 'TRINE' },
      { mine: 'SUN', theirs: 'CHIRON', type: 'TRINE' },
    ];
    expect(overlayLayout({ ...overlay, lines }).lines).toEqual([]);
  });

  it('가까이 몰린 점의 이름은 옆으로 벌려 적어 서로 겹치지 않는다(점은 제자리)', () => {
    // 실제로 겹쳤던 모양: 네 개가 5도 안에 몰려 있다
    const cluster = (base: number) => [
      { body: 'SUN', longitude: base },
      { body: 'MERCURY', longitude: base + 1.5 },
      { body: 'VENUS', longitude: base + 3 },
      { body: 'JUPITER', longitude: base + 5 },
      { body: 'MOON', longitude: base + 120 },
    ];
    const plain = { mine: cluster(350), theirs: cluster(88), lines: [] };
    const crowded = overlayLayout(plain);
    const apart = (list: { label: { x: number; y: number } }[]) => {
      let min = Infinity;
      list.forEach((a, i) =>
        list.slice(i + 1).forEach((b) => {
          min = Math.min(min, Math.hypot(a.label.x - b.label.x, a.label.y - b.label.y));
        }),
      );
      return min;
    };
    // 두 글자 이름("해왕")이 나란히 놓여도 닿지 않을 만큼
    expect(apart(crowded.mine)).toBeGreaterThanOrEqual(crowded.labelFontSize * 1.9);
    expect(apart(crowded.theirs)).toBeGreaterThanOrEqual(crowded.labelFontSize * 1.9);
    // 이름만 벌린다: 점은 혼자 있을 때와 같은 자리다
    const alone = overlayLayout({ mine: [plain.mine[1]], theirs: [plain.theirs[1]], lines: [] });
    expect(crowded.mine.find((m) => m.body === 'MERCURY')!.dot).toEqual(alone.mine[0].dot);
    expect(crowded.theirs.find((m) => m.body === 'MERCURY')!.dot).toEqual(alone.theirs[0].dot);
    // 떨어져 있는 점의 이름은 점과 같은 방향에 그대로 있다
    const moon = crowded.theirs.find((m) => m.body === 'MOON')!;
    const angle = (p: { x: number; y: number }) => Math.atan2(p.y - crowded.center, p.x - crowded.center);
    expect(angle(moon.label)).toBeCloseTo(angle(moon.dot), 5);
  });

  it('이름이 점에서 벌어졌으면 점과 이름을 잇는 가는 선을 준다', () => {
    const crowded = overlayLayout({
      mine: [],
      theirs: [
        { body: 'SUN', longitude: 88 },
        { body: 'VENUS', longitude: 89 },
        { body: 'MOON', longitude: 200 },
      ],
      lines: [],
    });
    expect(crowded.theirs.filter((m) => m.leader).map((m) => m.body).sort()).toEqual(['SUN', 'VENUS']);
  });
});
