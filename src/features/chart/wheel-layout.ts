/**
 * 차트 휠의 화면 좌표. 서버가 준 `Chart` 의 값을 어디에 그릴지만 정한다.
 * 별자리·하우스·각도를 여기서 계산하지 않는다(docs/decisions/006-server-side-chart.md). 각도는 서버가 준 `longitude` 를 쓴다.
 * 구조는 시안 docs/design/screens-1.0.0.html 의 wheel() 을 옮겼다.
 */
import type { Chart } from '@/lib/api';

/** 황도대 순서. 휠에서 별자리 칸이 놓이는 차례다. */
export const SIGN_ORDER = [
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
] as const;

const HARD = ['SQUARE', 'OPPOSITION'];
const SOFT = ['TRINE', 'SEXTILE'];

/** 이 각도(도) 안으로 붙은 천체는 이름을 한 단씩 안쪽으로 민다 */
const CROWD_DEGREES = 7;

export const WHEEL_SIZE = 300;

type Pt = { x: number; y: number };
type Line = { x1: number; y1: number; x2: number; y2: number };

export type WheelLayout = {
  size: number;
  center: number;
  rOuter: number;
  rSign: number;
  rInner: number;
  dotRadius: number;
  labelFontSize: number;
  signFontSize: number;
  houseFontSize: number;
  signs: { sign: string; line: Line; label: Pt }[];
  ticks: Line[];
  houseLines: (Line & { main: boolean })[];
  houseNumbers: (Pt & { n: number })[];
  aspectLines: (Line & { dashed: boolean })[];
  bodies: { body: string; dot: Pt; label: Pt; lift: number }[];
};

export function wheelLayout(chart: Chart, size: number = WHEEL_SIZE): WheelLayout {
  const center = size / 2;
  const rOuter = center - 1;
  const rSign = rOuter * 0.84;
  const rInner = rOuter * 0.5;
  // 시각을 알 때만 상승점을 왼쪽 끝에 둔다. 모르면 양자리 0도가 왼쪽이다.
  const showHouses = chart.timeKnown && chart.houses !== undefined && chart.angles !== undefined;
  const asc = showHouses && chart.angles ? chart.angles.asc.longitude : 0;

  const at = (deg: number, r: number): Pt => {
    const t = ((180 + (deg - asc)) * Math.PI) / 180;
    return { x: center + r * Math.cos(t), y: center - r * Math.sin(t) };
  };
  const line = (deg: number, from: number, to: number): Line => {
    const a = at(deg, from);
    const b = at(deg, to);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  };

  const signs = SIGN_ORDER.map((sign, i) => ({
    sign,
    line: line(i * 30, rSign, rOuter),
    label: at(i * 30 + 15, (rOuter + rSign) / 2),
  }));

  const ticks: Line[] = [];
  for (let d = 0; d < 360; d += 5) {
    if (d % 30 === 0) continue;
    ticks.push(line(d, rSign, rSign - size * (d % 10 === 0 ? 0.018 : 0.01)));
  }

  const houseLines: WheelLayout['houseLines'] = [];
  const houseNumbers: WheelLayout['houseNumbers'] = [];
  if (showHouses && chart.houses) {
    const cusps = chart.houses.map((h) => h.longitude);
    cusps.forEach((cusp, i) => {
      const next = cusps[(i + 1) % cusps.length];
      const main = i % 3 === 0;
      houseLines.push({ ...line(cusp, main ? 0 : rInner, rSign), main });
      const middle = cusp + ((next - cusp + 360) % 360) / 2;
      houseNumbers.push({ ...at(middle, rInner + size * 0.03), n: i + 1 });
    });
  }

  const longitudes = new Map<string, number>();
  for (const p of chart.positions) longitudes.set(p.body, p.longitude);
  for (const p of chart.points) longitudes.set(p.point, p.longitude);

  const aspectLines: WheelLayout['aspectLines'] = [];
  for (const aspect of chart.aspects) {
    const dashed = HARD.includes(aspect.type);
    if (!dashed && !SOFT.includes(aspect.type)) continue; // 합과 모르는 종류는 선을 긋지 않는다
    const a = longitudes.get(aspect.a);
    const b = longitudes.get(aspect.b);
    if (a === undefined || b === undefined) continue;
    const from = at(a, rInner);
    const to = at(b, rInner);
    aspectLines.push({ x1: from.x, y1: from.y, x2: to.x, y2: to.y, dashed });
  }

  const rDot = rSign - size * 0.045;
  const sorted = chart.positions
    .map((p) => ({ body: p.body, lon: p.longitude }))
    .sort((p, q) => p.lon - q.lon);
  // 가장 넓게 빈 곳 다음에서 세기 시작해야 0도를 사이에 둔 이웃도 이어서 밀린다.
  let start = 0;
  let widest = -1;
  sorted.forEach((p, i) => {
    const prev = sorted[(i - 1 + sorted.length) % sorted.length];
    const gap = (p.lon - prev.lon + 360) % 360 || (sorted.length === 1 ? 360 : 0);
    if (gap > widest) {
      widest = gap;
      start = i;
    }
  });
  const bodies: WheelLayout['bodies'] = [];
  let lift = 0;
  for (let k = 0; k < sorted.length; k++) {
    const p = sorted[(start + k) % sorted.length];
    const prev = k === 0 ? null : sorted[(start + k - 1) % sorted.length];
    lift = prev && (p.lon - prev.lon + 360) % 360 < CROWD_DEGREES ? lift + 1 : 0;
    bodies.push({
      body: p.body,
      dot: at(p.lon, rDot),
      label: at(p.lon, rDot - size * 0.048 - lift * size * 0.042),
      lift,
    });
  }

  return {
    size,
    center,
    rOuter,
    rSign,
    rInner,
    dotRadius: size * 0.013,
    labelFontSize: size * 0.034,
    signFontSize: size * 0.034,
    houseFontSize: size * 0.028,
    signs,
    ticks,
    houseLines,
    houseNumbers,
    aspectLines,
    bodies,
  };
}
