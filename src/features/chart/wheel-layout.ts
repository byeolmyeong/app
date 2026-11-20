/**
 * 차트 휠의 화면 좌표. 서버가 준 `Chart` 의 값을 어디에 그릴지만 정한다.
 * 별자리·하우스·각도를 여기서 계산하지 않는다(docs/decisions/006-server-side-chart.md). 각도는 서버가 준 `longitude` 를 쓴다.
 * 내 하늘 지도의 휠(`wheelLayout`)은 시안 13(320 기준)의 고리 · 점 · 글자 자리를 옮겼다. 겹친 휠(궁합)은 아래의 공용 함수만 쓴다.
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

/** 겹친 휠(궁합)의 그림 크기 */
export const WHEEL_SIZE = 300;
/** 내 하늘 지도 휠의 그림 크기(시안 13). 아래 [SKY] 의 값은 이 크기에서의 값이다 */
export const SKY_WHEEL_SIZE = 320;

/** 시안 13 의 휠(지름 320): 고리의 반지름 · 점과 이름의 자리 · 글자 크기 */
const SKY = {
  rOuter: 152,
  rSign: 124,
  rInner: 60,
  /** 별 점이 놓이는 원 · 이름이 놓이는 원 · 붙은 별의 이름을 한 단 안으로 미는 거리 */
  rDot: 108,
  rLabel: 90,
  liftStep: 12,
  /** 하우스 번호가 놓이는 원 */
  rHouseNumber: 70,
  /** 축 이름이 놓이는 원: 첫인상(세 글자, 가로) · 꿈(한 글자) */
  rAscLabel: 38,
  rMcLabel: 44,
  dot: 3.5,
  selectedDot: 5,
  halo: 10,
  label: 10,
  selectedLabel: 11,
  sign: 9,
  house: 8,
  axis: 9,
} as const;

type Pt = { x: number; y: number };
type Line = { x1: number; y1: number; x2: number; y2: number };

export type WheelLayout = {
  size: number;
  center: number;
  rOuter: number;
  rSign: number;
  rInner: number;
  dotRadius: number;
  selectedDotRadius: number;
  haloRadius: number;
  labelFontSize: number;
  selectedLabelFontSize: number;
  signFontSize: number;
  houseFontSize: number;
  axisFontSize: number;
  /** 별자리 칸의 경계선(별자리 고리 안) · 이름 자리 */
  signs: { sign: string; line: Line; label: Pt }[];
  /** 서버가 준 하우스 경계 12개: 가운데 원에서 별자리 고리까지. 시각 "모름" 이면 없다 */
  houseLines: Line[];
  houseNumbers: (Pt & { n: number })[];
  /** 하우스 칸(경계에서 다음 경계까지, 가운데 원과 별자리 고리 사이)의 SVG 경로. 고른 별의 칸을 칠한다 */
  houseSectors: { n: number; path: string }[];
  /** 첫인상(상승점) · 꿈(중천)의 축: 가운데 원에서 바깥 원까지, 이름은 가운데 원 안. 시각 "모름" 이면 없다 */
  axes: { key: 'ASC' | 'MC'; line: Line; label: Pt }[];
  bodies: { body: string; dot: Pt; label: Pt; lift: number }[];
};

/** 각도 선의 모양: 긴장(사분·충)은 점선(true), 조화(삼분·육분)는 실선(false). 합과 모르는 종류는 선을 긋지 않는다(null) */
export function aspectDashed(type: string): boolean | null {
  if (HARD.includes(type)) return true;
  return SOFT.includes(type) ? false : null;
}

/** 황경을 화면 좌표로 옮긴다. asc 는 왼쪽 끝에 오는 황경이다 */
export function wheelPolar(center: number, asc: number) {
  const at = (deg: number, r: number): Pt => {
    const t = ((180 + (deg - asc)) * Math.PI) / 180;
    return { x: center + r * Math.cos(t), y: center - r * Math.sin(t) };
  };
  const line = (deg: number, from: number, to: number): Line => {
    const a = at(deg, from);
    const b = at(deg, to);
    return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
  };
  return { at, line };
}

/** 별자리 고리의 12칸(경계선 · 이름 자리)과 5도 눈금 */
export function ringMarks({ at, line }: ReturnType<typeof wheelPolar>, rSign: number, rOuter: number, size: number) {
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
  return { signs, ticks };
}

/** 황경 순으로 세우고, 앞의 것과 [CROWD_DEGREES] 안으로 붙었으면 lift 를 한 단씩 올린다(이름이 겹치지 않게) */
export function liftCrowded(list: { body: string; lon: number }[]): { body: string; lon: number; lift: number }[] {
  const sorted = [...list].sort((p, q) => p.lon - q.lon);
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
  const lifted: { body: string; lon: number; lift: number }[] = [];
  let lift = 0;
  for (let k = 0; k < sorted.length; k++) {
    const p = sorted[(start + k) % sorted.length];
    const prev = k === 0 ? null : sorted[(start + k - 1) % sorted.length];
    lift = prev && (p.lon - prev.lon + 360) % 360 < CROWD_DEGREES ? lift + 1 : 0;
    lifted.push({ ...p, lift });
  }
  return lifted;
}

/** 두 반지름 사이에서 황경 from 부터 to 까지(황경이 느는 쪽, 화면에서는 시계 반대 방향)의 칸 모양 */
function sectorPath({ at }: ReturnType<typeof wheelPolar>, from: number, to: number, rIn: number, rOut: number) {
  const span = (to - from + 360) % 360;
  const large = span > 180 ? 1 : 0;
  const p = (pt: Pt) => `${pt.x.toFixed(2)},${pt.y.toFixed(2)}`;
  return (
    `M${p(at(from, rOut))} A${rOut} ${rOut} 0 ${large} 0 ${p(at(to, rOut))} ` +
    `L${p(at(to, rIn))} A${rIn} ${rIn} 0 ${large} 1 ${p(at(from, rIn))} Z`
  );
}

/** 내 하늘 지도의 휠(시안 13). 각도 선과 눈금은 없다. 시각 "모름" 이면 하우스와 축이 없고 양자리 0도가 왼쪽이다 */
export function wheelLayout(chart: Chart, size: number = SKY_WHEEL_SIZE): WheelLayout {
  const u = size / SKY_WHEEL_SIZE;
  const center = size / 2;
  const rOuter = SKY.rOuter * u;
  const rSign = SKY.rSign * u;
  const rInner = SKY.rInner * u;
  // 시각을 알 때만 상승점을 왼쪽 끝에 둔다. 모르면 양자리 0도가 왼쪽이다.
  const showHouses = chart.timeKnown && chart.houses !== undefined && chart.angles !== undefined;
  const asc = showHouses && chart.angles ? chart.angles.asc.longitude : 0;

  const polar = wheelPolar(center, asc);
  const { at, line } = polar;
  const { signs } = ringMarks(polar, rSign, rOuter, size);

  const houseLines: WheelLayout['houseLines'] = [];
  const houseNumbers: WheelLayout['houseNumbers'] = [];
  const houseSectors: WheelLayout['houseSectors'] = [];
  const axes: WheelLayout['axes'] = [];
  if (showHouses && chart.houses && chart.angles) {
    const cusps = chart.houses.map((h) => h.longitude);
    cusps.forEach((cusp, i) => {
      const next = cusps[(i + 1) % cusps.length];
      houseLines.push(line(cusp, rInner, rSign));
      const middle = cusp + ((next - cusp + 360) % 360) / 2;
      houseNumbers.push({ ...at(middle, SKY.rHouseNumber * u), n: i + 1 });
      houseSectors.push({ n: i + 1, path: sectorPath(polar, cusp, next, rInner, rSign) });
    });
    axes.push(
      { key: 'ASC', line: line(chart.angles.asc.longitude, rInner, rOuter), label: at(chart.angles.asc.longitude, SKY.rAscLabel * u) },
      { key: 'MC', line: line(chart.angles.mc.longitude, rInner, rOuter), label: at(chart.angles.mc.longitude, SKY.rMcLabel * u) },
    );
  }

  const bodies: WheelLayout['bodies'] = liftCrowded(
    chart.positions.map((p) => ({ body: p.body, lon: p.longitude })),
  ).map((p) => ({
    body: p.body,
    dot: at(p.lon, SKY.rDot * u),
    label: at(p.lon, (SKY.rLabel - p.lift * SKY.liftStep) * u),
    lift: p.lift,
  }));

  return {
    size,
    center,
    rOuter,
    rSign,
    rInner,
    dotRadius: SKY.dot * u,
    selectedDotRadius: SKY.selectedDot * u,
    haloRadius: SKY.halo * u,
    labelFontSize: SKY.label * u,
    selectedLabelFontSize: SKY.selectedLabel * u,
    signFontSize: SKY.sign * u,
    houseFontSize: SKY.house * u,
    axisFontSize: SKY.axis * u,
    signs,
    houseLines,
    houseNumbers,
    houseSectors,
    axes,
    bodies,
  };
}
