/**
 * 이유 펼침의 재료(보드 12-1 · 11-5, 결정 054 의 4): 용어 줄 1~3(별명 · 이름 · 한 줄 뜻 · 물음표의 말)과 작은 지도에서 빛낼 별 · 칸.
 * 근거 구조의 식별자를 용어 사전(`strings.glossary`)의 말로 옮기기만 한다. 사전에 없는 값은 건너뛴다.
 */
import { strings } from '@/content/strings';
import { isKnown, needsTime } from '@/features/reason/reason-sentence';
import type { KnownBasisItem, Reason } from '@/lib/api';

const G = strings.glossary;
const S = strings.skyMap;
const R = strings.reason;

export type ReasonTerm = { key: string; nickname: string; name: string; meaning: string; tip: { title: string; text: string } };

const ANGLES = ['ASC', 'MC'] as const;
const isAngle = (key: string): key is (typeof ANGLES)[number] => (ANGLES as readonly string[]).includes(key);
/** 사전에 있는 별자리 차례(양자리부터) — 물음표의 "열두 별자리 중 ○째" */
const SIGN_KEYS = Object.keys(strings.signs);

type GlossaryBody = { name: string; reasonName: string; transitName: string; meaning: string; tip: string };

function bodyTerm(key: string, transit = false): ReasonTerm | undefined {
  if (isAngle(key)) {
    const a = G.angles[key];
    return { key, nickname: a.nickname, name: a.name, meaning: a.meaning, tip: { title: a.name, text: a.tip } };
  }
  const b = (G.bodies as Record<string, GlossaryBody | undefined>)[key];
  if (!b) return undefined;
  const full = (strings.bodies as Record<string, string | undefined>)[key];
  // 별명이 일상의 이름과 다르면 함께 적는다: "해 (태양)"
  const title = full && full !== b.name ? `${b.name} (${full})` : b.name;
  return { key, nickname: transit ? b.transitName : b.reasonName, name: b.name, meaning: b.meaning, tip: { title, text: b.tip } };
}

function signTerm(sign: string): ReasonTerm | undefined {
  const g = (G.signs as Record<string, { nickname: string; meaning: string } | undefined>)[sign];
  const short = (strings.signs as Record<string, string | undefined>)[sign];
  const order = SIGN_KEYS.indexOf(sign);
  if (!g || !short || order < 0) return undefined;
  const name = short + strings.chart.signSuffix;
  return { key: `sign-${sign}`, nickname: g.nickname, name, meaning: g.meaning, tip: { title: name, text: `${S.signTipPrefix}${S.ordinals[order]}${S.signTipSuffix}` } };
}

function houseTerm(n: number): ReasonTerm | undefined {
  const g = (G.houses as Record<number, { nickname: string; meaning: string } | undefined>)[n];
  if (!g) return undefined;
  const name = `${n}${S.houseSuffix}`;
  return { key: `house-${n}`, nickname: g.nickname, name, meaning: g.meaning, tip: { title: name, text: `${S.houseTipPrefix}${S.ordinals[n - 1]}${S.houseTipSuffix}` } };
}

function aspectTerm(type: string): ReasonTerm | undefined {
  const g = (G.aspects as Record<string, { phrase: string; meaning: string } | undefined>)[type];
  const name = (strings.aspects as Record<string, string | undefined>)[type];
  return g && name ? { key: `aspect-${type}`, nickname: g.phrase, name, meaning: g.meaning, tip: { title: name, text: S.relationsTip } } : undefined;
}

function clusterTerm(bodies: string[]): ReasonTerm | undefined {
  const count = G.counts[bodies.length];
  if (!count) return undefined;
  const nickname = `${R.starsPrefix}${count}`;
  const names = bodies.map((b) => (G.bodies as Record<string, { name: string } | undefined>)[b]?.name).filter(Boolean);
  return {
    key: `cluster-${bodies.join('-')}`,
    nickname,
    name: `${R.planetsPrefix}${bodies.length}${R.planetsSuffix}`,
    meaning: names.join(R.separator),
    tip: { title: nickname, text: R.clusterTip },
  };
}

/** 한 근거의 용어(시각을 모르면 하우스 · 상승점 · 중천을 뺀다) */
function termsOf(item: KnownBasisItem, timeKnown: boolean): (ReasonTerm | undefined)[] {
  const body = (key: string, transit = false) => (!timeKnown && isAngle(key) ? undefined : bodyTerm(key, transit));
  const house = (n: number | undefined) => (timeKnown && n !== undefined ? houseTerm(n) : undefined);
  switch (item.kind) {
    case 'PLACEMENT':
      return [body(item.body), signTerm(item.sign), house(item.house)];
    case 'CLUSTER':
      return timeKnown ? [clusterTerm(item.bodies), house(item.house)] : [];
    case 'ASPECT':
      return [body(item.a), body(item.b), aspectTerm(item.type)];
    case 'RULER':
      return [body(item.body), body(item.ruler)];
    case 'TRANSIT':
      return item.target !== undefined && item.type !== undefined
        ? [body(item.mover, true), body(item.target), aspectTerm(item.type)]
        : [body(item.mover, true), house(item.house)];
  }
}

/** 문장에 쓰인 근거만(아는 종류, 시각을 모르면 하우스 · 상승점 · 중천만으로 된 근거는 뺀다 — 문장과 같은 기준) */
const usable = (reason: Reason, timeKnown: boolean) => reason.items.filter(isKnown).filter((item) => timeKnown || !needsTime(item));

/** 용어 줄: 근거의 차례대로, 같은 것은 한 번, 셋까지 */
export function reasonTerms(reason: Reason, timeKnown: boolean): ReasonTerm[] {
  const seen = new Set<string>();
  const terms: ReasonTerm[] = [];
  for (const t of usable(reason, timeKnown).flatMap((item) => termsOf(item, timeKnown))) {
    if (!t || seen.has(t.key)) continue;
    seen.add(t.key);
    terms.push(t);
  }
  return terms.slice(0, 3);
}

/**
 * 작은 지도에서 빛낼 별(천체 · ASC · MC)과 칸. 태어날 때의 근거만(지나가는 별은 태어난 하늘이 아니다 — 결정 054 의 4).
 * 첫 별은 "하늘 지도에서 보기" 로 고른 채 여는 별이다.
 */
export function reasonFocus(reason: Reason, timeKnown: boolean): { bodies: string[]; houses: number[] } {
  const bodies: string[] = [];
  const houses: number[] = [];
  const addBody = (key: string) => {
    if (bodies.includes(key) || (!timeKnown && isAngle(key))) return;
    if (isAngle(key) || key in G.bodies) bodies.push(key);
  };
  const addHouse = (n: number | undefined) => {
    if (timeKnown && n !== undefined && !houses.includes(n)) houses.push(n);
  };
  if (reason.when !== 'BIRTH') return { bodies, houses };
  for (const item of usable(reason, timeKnown)) {
    if (item.kind === 'PLACEMENT') {
      addBody(item.body);
      addHouse(item.house);
    } else if (item.kind === 'CLUSTER' && timeKnown) {
      item.bodies.forEach(addBody);
      addHouse(item.house);
    } else if (item.kind === 'ASPECT') {
      addBody(item.a);
      addBody(item.b);
    } else if (item.kind === 'RULER') {
      addBody(item.body);
      addBody(item.ruler);
    }
  }
  return { bodies, houses };
}
