/**
 * 겹친 휠(궁합)의 화면 좌표. 서버가 준 `overlay` 의 황경과 선을 어디에 그릴지만 정한다.
 * 위치·각도를 여기서 계산하지 않는다(docs/decisions/006-server-side-chart.md). 선은 서버가 점수에 쓴 것만 긋는다.
 * 내 점은 별자리 고리 안쪽에, 상대 점은 고리 바깥에 놓아 두 사람을 자리로 가른다.
 */
import { aspectDashed, liftCrowded, ringMarks, wheelPolar, WHEEL_SIZE } from '@/features/chart/wheel-layout';
import type { SynastryOverlay } from '@/lib/api';

type Pt = { x: number; y: number };
type Line = { x1: number; y1: number; x2: number; y2: number };
type Placed = { body: string; dot: Pt; label: Pt };

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

  const labelStep = size * 0.036;
  const rMine = rSign - size * 0.04;
  const mine = liftCrowded(overlay.mine.map((p) => ({ body: p.body, lon: p.longitude }))).map((p) => ({
    body: p.body,
    dot: at(p.lon, rMine),
    label: at(p.lon, rMine - size * 0.043 - p.lift * labelStep),
  }));
  const rTheirs = rOuter + size * 0.03;
  // 바깥은 자리가 두 단뿐이라 붙은 이름을 두 단에 번갈아 적는다.
  const theirs = liftCrowded(overlay.theirs.map((p) => ({ body: p.body, lon: p.longitude }))).map((p) => ({
    body: p.body,
    dot: at(p.lon, rTheirs),
    label: at(p.lon, rTheirs + size * 0.043 + (p.lift % 2) * labelStep),
  }));

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
    labelFontSize: size * 0.03,
    signFontSize: size * 0.03,
    signs,
    ticks,
    ascLine: overlay.mineAsc === undefined ? null : line(overlay.mineAsc, rInner, rSign),
    lines,
    mine,
    theirs,
  };
}
