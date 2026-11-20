/**
 * 서버가 준 `Chart` 를 표의 줄로 옮긴다(이름표와 "24°41′" 꼴 표기만). 계산하지 않는다.
 * 시각 "모름" 차트에서는 하우스·상승점·중천·행운점을 내보내지 않는다(golden-rules "프로젝트 규칙").
 */
import type { DataTableRow } from '@/components/data-table';
import { strings } from '@/content/strings';
import { SIGN_ORDER } from '@/features/chart/wheel-layout';
import type { Chart, Point, Position, SignPosition } from '@/lib/api';

const label = (map: Record<string, string>, key: string) => map[key] ?? key;

export const bodyName = (body: string) => label(strings.bodies, body);
export const signName = (sign: string) => label(strings.signs, sign);

/** 예: 24°41′, 26°02′ */
export const formatDegree = (p: Pick<SignPosition, 'degree' | 'minute'>) => `${p.degree}°${String(p.minute).padStart(2, '0')}′`;

/** 하우스·상승점을 보여 줘도 되는 차트인가 */
export const showsHouses = (chart: Chart) =>
  chart.timeKnown && chart.houses !== undefined && chart.angles !== undefined;

/** 시각을 알아야만 정해지는 지점 */
const TIME_DEPENDENT_POINTS = ['FORTUNE', 'VERTEX'];

function positionRow(p: Position | Point, withHouse: boolean): DataTableRow {
  const name = 'body' in p ? p.body : p.point;
  return {
    key: name,
    body: bodyName(name),
    meaning: strings.bodyMeanings[name] ?? '',
    retrograde: 'retrograde' in p && p.retrograde,
    sign: signName(p.sign),
    degree: formatDegree(p),
    house: withHouse && p.house !== undefined ? String(p.house) : strings.common.none,
  };
}

/** 행성 10개 + 추가 지점 + (시각을 알 때) 상승점·중천 */
export function planetRows(chart: Chart): DataTableRow[] {
  const known = showsHouses(chart);
  const points = known ? chart.points : chart.points.filter((p) => !TIME_DEPENDENT_POINTS.includes(p.point));
  const rows = [...chart.positions, ...points].map((p) => positionRow(p, known));
  if (known && chart.angles) {
    const angle = (key: 'ASC' | 'MC', p: SignPosition): DataTableRow => ({
      key,
      body: bodyName(key),
      meaning: strings.bodyMeanings[key] ?? '',
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
  return chart.houses.map((h) => ({
    key: String(h.house),
    house: String(h.house),
    meaning: strings.houseMeanings[String(h.house)] ?? '',
    sign: signName(h.sign),
    degree: formatDegree(h),
  }));
}

export function aspectRows(chart: Chart): DataTableRow[] {
  return chart.aspects.map((a, i) => ({
    key: `${a.a}-${a.b}-${i}`,
    pair: `${bodyName(a.a)}·${bodyName(a.b)}`,
    aspect: label(strings.aspects, a.type),
    meaning: strings.aspectMeanings[a.type] ?? '',
    orb: `${a.orb.toFixed(2)}°`,
    motion: a.applying ? strings.detail.applying : strings.detail.separating,
  }));
}

type GlossaryBody = { name: string; nickname: string; topic: string; meaning: string };
type GlossaryHouse = { nickname: string; topic: string; meaning: string };

/** 용어 사전의 천체 · 하우스. 사전에 없는 식별자(추가 지점)는 undefined */
export const glossaryBody = (key: string) => (strings.glossary.bodies as Record<string, GlossaryBody | undefined>)[key];
export const glossaryHouse = (n: number) => (strings.glossary.houses as Record<number, GlossaryHouse | undefined>)[n];

/** 물병 → 물병자리 */
export const signFullName = (sign: string) => signName(sign) + strings.chart.signSuffix;

/** "별마다 있던 자리" 의 한 줄. place 는 "5하우스 · 즐거움" · "1하우스가 시작되는 곳", 시각 "모름" 이면 null */
export type SkyRow = { key: string; title: string; subtitle: string; sign: string; place: string | null; angle: boolean };

/**
 * 내 하늘 지도의 목록(시안 13): 별 10(서버가 준 순서) + 시각을 알 때만 첫인상의 자리(상승점) · 꿈의 자리(중천).
 * 별자리 · 하우스는 서버 값 그대로 적는다.
 */
export function skyRows(chart: Chart): SkyRow[] {
  const S = strings.skyMap;
  const known = showsHouses(chart);
  const rows: SkyRow[] = [];
  for (const p of chart.positions) {
    const g = glossaryBody(p.body);
    if (!g) continue;
    const house = known && p.house !== undefined ? glossaryHouse(p.house) : undefined;
    rows.push({
      key: p.body,
      title: g.name,
      subtitle: g.topic,
      sign: signFullName(p.sign),
      place: house ? `${p.house}${S.houseSuffix}${S.separator}${house.topic}` : null,
      angle: false,
    });
  }
  if (known && chart.angles) {
    const angle = (key: 'ASC' | 'MC', p: SignPosition, house: number): SkyRow => ({
      key,
      title: strings.glossary.angles[key].nickname,
      subtitle: strings.glossary.angles[key].name,
      sign: signFullName(p.sign),
      place: `${house}${S.houseStartSuffix}`,
      angle: true,
    });
    rows.push(angle('ASC', chart.angles.asc, 1), angle('MC', chart.angles.mc, 10));
  }
  return rows;
}

/** 시트의 한 항목: 이름 · 한 줄 뜻 · 물음표의 말풍선 */
export type SkyTerm = { name: string; meaning: string; tip: string };
/** 다른 별과의 관계 한 줄: 상대의 이름 · 짧은 주제, 각도의 말 · 각도 이름 */
export type SkyRelation = { key: string; name: string; topic: string; phrase: string; aspect: string };
export type SkyDetail = {
  key: string;
  title: string;
  /** "나의 중심 · 내가 힘을 내는 방식" */
  subtitle: string;
  sign: SkyTerm;
  /** 시각 "모름" 이면 null */
  house: SkyTerm | null;
  relations: SkyRelation[];
};

type GlossaryAspect = { phrase: string; meaning: string };
const ANGLES = ['ASC', 'MC'] as const;
const isAngle = (key: string): key is (typeof ANGLES)[number] => (ANGLES as readonly string[]).includes(key);

/** 관계 한 줄에 적는 상대의 이름 · 주제. 사전에 없거나(추가 지점) 시각 "모름" 의 상승점 · 중천이면 undefined */
function relationName(key: string, known: boolean): { name: string; topic: string } | undefined {
  if (isAngle(key)) return known ? { name: strings.glossary.angles[key].nickname, topic: strings.glossary.angles[key].name } : undefined;
  const g = glossaryBody(key);
  return g ? { name: g.name, topic: g.topic } : undefined;
}

/**
 * 별(천체 · ASC · MC)을 눌렀을 때 시트에 적는 것(시안 13-1): 이름 · "짧은 주제 · 한 줄 뜻" · 별자리 · 하우스(시각을 알 때만)
 * · 그 별이 낀 각도(서버가 준 순서, 상대가 사전의 별일 때만)를 각도의 말로. 위치와 각도는 서버 값 그대로다.
 * 사전에 없는 식별자이거나 시각 "모름" 의 상승점 · 중천이면 null.
 */
export function skyDetail(chart: Chart, key: string): SkyDetail | null {
  const S = strings.skyMap;
  const known = showsHouses(chart);
  let head: { title: string; subtitle: string; sign: string; house: number | undefined };
  if (isAngle(key)) {
    if (!known || !chart.angles) return null;
    const g = strings.glossary.angles[key];
    const p = key === 'ASC' ? chart.angles.asc : chart.angles.mc;
    head = { title: g.nickname, subtitle: `${g.name}${S.separator}${g.meaning}`, sign: p.sign, house: key === 'ASC' ? 1 : 10 };
  } else {
    const g = glossaryBody(key);
    const p = chart.positions.find((x) => x.body === key);
    if (!g || !p) return null;
    head = { title: g.name, subtitle: `${g.topic}${S.separator}${g.meaning}`, sign: p.sign, house: known ? p.house : undefined };
  }
  const signGlossary = (strings.glossary.signs as Record<string, { meaning: string } | undefined>)[head.sign];
  const signOrdinal = S.ordinals[SIGN_ORDER.indexOf(head.sign as (typeof SIGN_ORDER)[number])];
  const houseGlossary = head.house !== undefined ? glossaryHouse(head.house) : undefined;
  const relations: SkyRelation[] = [];
  for (const a of chart.aspects) {
    if (a.a !== key && a.b !== key) continue;
    const other = a.a === key ? a.b : a.a;
    const who = relationName(other, known);
    const aspect = (strings.glossary.aspects as Record<string, GlossaryAspect | undefined>)[a.type];
    if (!who || !aspect) continue;
    relations.push({ key: other, ...who, phrase: aspect.phrase, aspect: label(strings.aspects, a.type) });
  }
  return {
    key,
    title: head.title,
    subtitle: head.subtitle,
    sign: {
      name: signFullName(head.sign),
      meaning: signGlossary?.meaning ?? '',
      tip: signOrdinal ? `${S.signTipPrefix}${signOrdinal}${S.signTipSuffix}` : '',
    },
    house:
      head.house !== undefined && houseGlossary
        ? {
            name: `${head.house}${S.houseSuffix}`,
            meaning: houseGlossary.meaning,
            tip: `${S.houseTipPrefix}${S.ordinals[head.house - 1]}${S.houseTipSuffix}`,
          }
        : null,
    relations,
  };
}

/** 핵심 3요소: 태양·달의 별자리와 (시각을 알 때만) 상승궁 */
export function keyThree(chart: Chart): { label: string; value: string; caption: string }[] {
  const signOf = (body: string) => chart.positions.find((p) => p.body === body)?.sign;
  const sun = signOf('SUN');
  const moon = signOf('MOON');
  const items: { label: string; value: string; caption: string }[] = [];
  if (sun) items.push({ label: strings.chart.keySun, value: signName(sun), caption: strings.chart.keySunCaption });
  if (moon) items.push({ label: strings.chart.keyMoon, value: signName(moon), caption: strings.chart.keyMoonCaption });
  if (showsHouses(chart) && chart.angles)
    items.push({
      label: strings.chart.keyAsc,
      value: signName(chart.angles.asc.sign),
      caption: strings.chart.keyAscCaption,
    });
  return items;
}
