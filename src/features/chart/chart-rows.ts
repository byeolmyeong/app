/**
 * 서버가 준 `Chart` 를 표의 줄로 옮긴다(이름표와 "24°41′" 꼴 표기만). 계산하지 않는다.
 * 시각 "모름" 차트에서는 하우스·상승점·중천·행운점을 내보내지 않는다(golden-rules "프로젝트 규칙").
 */
import type { DataTableRow } from '@/components/data-table';
import { strings } from '@/content/strings';
import type { Chart, Position, SignPosition } from '@/lib/api';

const label = (map: Record<string, string>, key: string) => map[key] ?? key;

export const bodyName = (body: string) => label(strings.bodies, body);
export const signName = (sign: string) => label(strings.signs, sign);

/** 예: 24°41′, 26°02′ */
export const formatDegree = (p: SignPosition) => `${p.degree}°${String(p.minute).padStart(2, '0')}′`;

/** 하우스·상승점을 보여 줘도 되는 차트인가 */
export const showsHouses = (chart: Chart) =>
  chart.timeKnown && chart.houses !== undefined && chart.angles !== undefined;

/** 시각을 알아야만 정해지는 지점 */
const TIME_DEPENDENT_POINTS = ['FORTUNE', 'ASC', 'MC'];

function positionRow(p: Position, withHouse: boolean): DataTableRow {
  return {
    key: p.body,
    body: bodyName(p.body),
    retrograde: p.retrograde,
    sign: signName(p.sign),
    degree: formatDegree(p),
    house: withHouse && p.house !== undefined ? String(p.house) : strings.common.none,
  };
}

/** 행성 10개 + 추가 지점 + (시각을 알 때) 상승점·중천 */
export function planetRows(chart: Chart): DataTableRow[] {
  const known = showsHouses(chart);
  const points = known ? chart.points : chart.points.filter((p) => !TIME_DEPENDENT_POINTS.includes(p.body));
  const rows = [...chart.positions, ...points].map((p) => positionRow(p, known));
  if (known && chart.angles) {
    const angle = (key: 'ASC' | 'MC', p: SignPosition): DataTableRow => ({
      key,
      body: bodyName(key),
      retrograde: false,
      sign: signName(p.sign),
      degree: formatDegree(p),
      house: strings.common.none,
    });
    rows.push(angle('ASC', chart.angles.asc), angle('MC', chart.angles.mc));
  }
  return rows;
}

/** 하우스 경계 12줄. 시각 "모름" 이면 빈 배열 */
export function houseRows(chart: Chart): DataTableRow[] {
  if (!showsHouses(chart) || !chart.houses) return [];
  return chart.houses.map((h, i) => ({
    key: String(i + 1),
    house: String(i + 1),
    sign: signName(h.sign),
    degree: formatDegree(h),
  }));
}

export function aspectRows(chart: Chart): DataTableRow[] {
  return chart.aspects.map((a, i) => ({
    key: `${a.a}-${a.b}-${i}`,
    pair: `${bodyName(a.a)} · ${bodyName(a.b)}`,
    aspect: label(strings.aspects, a.type),
    orb: `${a.orb.toFixed(2)}°`,
    motion: a.applying ? strings.detail.applying : strings.detail.separating,
  }));
}

/** 핵심 3요소: 태양·달의 별자리와 (시각을 알 때만) 상승궁 */
export function keyThree(chart: Chart): { label: string; value: string }[] {
  const signOf = (body: string) => chart.positions.find((p) => p.body === body)?.sign;
  const sun = signOf('SUN');
  const moon = signOf('MOON');
  const items: { label: string; value: string }[] = [];
  if (sun) items.push({ label: strings.chart.keySun, value: signName(sun) });
  if (moon) items.push({ label: strings.chart.keyMoon, value: signName(moon) });
  if (showsHouses(chart) && chart.angles) items.push({ label: strings.chart.keyAsc, value: signName(chart.angles.asc.sign) });
  return items;
}
