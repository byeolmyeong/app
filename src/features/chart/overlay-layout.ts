/**
 * 겹친 휠(궁합)의 화면 좌표. 서버가 준 `overlay` 의 황경과 선을 어디에 그릴지만 정한다.
 * 위치·각도를 여기서 계산하지 않는다(docs/decisions/006-server-side-chart.md). 선은 서버가 점수에 쓴 것만 긋는다.
 * 내 점은 별자리 고리 안쪽에, 상대 점은 고리 바깥에 놓아 두 사람을 자리로 가른다.
 */
import { aspectDashed, ringMarks, wheelPolar, WHEEL_SIZE } from '@/features/chart/wheel-layout';
import type { SynastryOverlay } from '@/lib/api';

type Pt = { x: number; y: number };
type Line = { x1: number; y1: number; x2: number; y2: number };
/** `leader` 는 이름이 점에서 벌어졌을 때 둘을 잇는 가는 선이다 */
type Placed = { body: string; dot: Pt; label: Pt; leader?: Line };

/** `overlay.lines` 에서 내 상승점을 가리키는 이름 */
const ASC = 'ASC';

export type OverlayLayout = {
  size: number;
  center: number;
  rOuter: number;
  rSign: number;
  rInner: number;
  dotRadius: number;
  labelFontSize: number;
  signFontSize: number;
  signs: ReturnType<typeof ringMarks>['signs'];
  ticks: Line[];
  /** 내 상승점의 자리(왼쪽 끝). 내 시각을 몰라 서버가 주지 않았으면 null */
  ascLine: Line | null;
  lines: (Line & { dashed: boolean })[];
  mine: Placed[];
  theirs: Placed[];
};

/** 이름 사이에 두는 거리(글자 크기의 배수). 두 글자 이름("해왕")이 나란히 놓여도 닿지 않는다 */
const LABEL_APART = 2;
/** 이름이 이만큼(도) 넘게 벌어졌으면 점과 잇는 선을 긋는다 */
const LEADER_FROM_DEGREES = 1.5;

/**
 * 가까이 몰린 점의 이름을 고리를 따라 옆으로 벌린다. 점의 자리(황경)는 건드리지 않고 이름을 적을 방향만 정한다.
 * 황경 순으로 세운 뒤, 붙은 것끼리 한 묶음으로 [gap] 도씩 띄우고 묶음을 원래 자리의 가운데에 맞춘다.
 */
export function spreadLabels(list: { body: string; lon: number }[], gap: number) {
  const sorted = [...list].sort((p, q) => p.lon - q.lon);
  if (sorted.length === 0) return [];
  // 가장 넓게 빈 곳 다음에서 시작해 한 줄로 편다(0도를 사이에 둔 이웃도 이어진다).
  let start = 0;
  let widest = -1;
  sorted.forEach((p, i) => {
    const prev = sorted[(i - 1 + sorted.length) % sorted.length];
    const space = (p.lon - prev.lon + 360) % 360 || (sorted.length === 1 ? 360 : 0);
    if (space > widest) {
      widest = space;
      start = i;
    }
  });
  const line = sorted.map((_, k) => sorted[(start + k) % sorted.length]);
  const flat = line.map((p) => (p.lon - line[0].lon + 360) % 360);
  // 묶음: first 번째부터 count 개가 at, at+gap, at+2*gap … 에 놓인다. at 은 원래 자리와의 차이가 가장 작은 값(평균)이다.
  const blocks: { first: number; count: number; sum: number; at: number }[] = [];
  flat.forEach((x, i) => {
    let block = { first: i, count: 1, sum: x, at: x };
    while (blocks.length > 0) {
      const prev = blocks[blocks.length - 1];
      if (prev.at + prev.count * gap <= block.at) break;
      blocks.pop();
      const sum = prev.sum + block.sum - block.count * prev.count * gap;
      const count = prev.count + block.count;
      block = { first: prev.first, count, sum, at: sum / count };
    }
    blocks.push(block);
  });
  return blocks.flatMap((b) =>
    Array.from({ length: b.count }, (_, k) => {
      const p = line[b.first + k];
      return { body: p.body, lon: p.lon, labelLon: p.lon + (b.at + k * gap - flat[b.first + k]) };
    }),
  );
}

export function overlayLayout(overlay: SynastryOverlay, size: number = WHEEL_SIZE): OverlayLayout {
  const center = size / 2;
  // 고리 바깥에 상대의 점과 이름이 들어갈 자리를 남긴다.
  const rOuter = center * 0.72;
  const rSign = rOuter * 0.84;
  const rInner = rOuter * 0.42;
  // 내 상승점을 받았을 때만 왼쪽 끝에 둔다. 없으면 양자리 0도가 왼쪽이다(차트 휠과 같다).
  const asc = overlay.mineAsc ?? 0;
  const polar = wheelPolar(center, asc);
  const { at, line } = polar;
  const { signs, ticks } = ringMarks(polar, rSign, rOuter, size);

  const labelFontSize = size * 0.03;
  /** 반지름 r 인 고리에서 이름끼리 [LABEL_APART] 만큼 떨어지려면 벌려야 하는 각도 */
  const gapAt = (r: number) => (2 * Math.asin((labelFontSize * LABEL_APART) / (2 * r)) * 180) / Math.PI;
  const place = (list: SynastryOverlay['mine'], rDot: number, rLabel: number): Placed[] =>
    spreadLabels(
      list.map((p) => ({ body: p.body, lon: p.longitude })),
      gapAt(rLabel),
    ).map((p) => {
      const dot = at(p.lon, rDot);
      const label = at(p.labelLon, rLabel);
      if (Math.abs(p.labelLon - p.lon) <= LEADER_FROM_DEGREES) return { body: p.body, dot, label };
      // 선은 점에서 이름 바로 앞까지만 긋는다.
      const near = at(p.labelLon, rLabel + Math.sign(rDot - rLabel) * labelFontSize * 0.75);
      return { body: p.body, dot, label, leader: { x1: dot.x, y1: dot.y, x2: near.x, y2: near.y } };
    });
  const rMine = rSign - size * 0.04;
  const mine = place(overlay.mine, rMine, rMine - size * 0.05);
  const rTheirs = rOuter + size * 0.03;
  const theirs = place(overlay.theirs, rTheirs, rTheirs + size * 0.05);

  const mineLon = new Map(overlay.mine.map((p) => [p.body, p.longitude]));
  if (overlay.mineAsc !== undefined) mineLon.set(ASC, overlay.mineAsc);
  const theirsLon = new Map(overlay.theirs.map((p) => [p.body, p.longitude]));
  const lines: OverlayLayout['lines'] = [];
  for (const l of overlay.lines) {
    const dashed = aspectDashed(l.type);
    const a = mineLon.get(l.mine);
    const b = theirsLon.get(l.theirs);
    if (dashed === null || a === undefined || b === undefined) continue;
    const from = at(a, rInner);
    const to = at(b, rInner);
    lines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, dashed });
  }

  return {
    size,
    center,
    rOuter,
    rSign,
    rInner,
    dotRadius: size * 0.013,
    labelFontSize,
    signFontSize: size * 0.03,
    signs,
    ticks,
    ascLine: overlay.mineAsc === undefined ? null : line(overlay.mineAsc, rInner, rSign),
    lines,
    mine,
    theirs,
  };
}
