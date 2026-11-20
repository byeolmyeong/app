/**
 * "이렇게 풀이한 이유" 한 문장(결정 054 의 2). 서버가 준 근거 구조(`Reason`)를 정해진 틀과 용어 사전(`strings.glossary`)으로만 만든다 —
 * 문장을 서버나 AI 에서 받지 않는다. 점성 계산은 하지 않고 받은 식별자를 말로 옮길 뿐이다.
 * 나 탭 · 내 별명 · 시기 · 오늘의 하늘이 함께 쓴다(eslint.config.js 의 SHARED_FEATURE_FILES).
 */
import { strings } from '@/content/strings';
import { REASON_WHENS, type BasisItem, type KnownBasisItem, type Reason, type ReasonWhen } from '@/lib/api';

const R = strings.reason;
const G = strings.glossary;

/** 문장과 굵게 그릴 자리([시작, 끝) 글자 위치) — 별명 · 꾸밈말 · 각도의 말(시안의 굵은 글자) */
export type ReasonSentence = { text: string; bold: [number, number][] };

export type ReasonOptions = {
  /** 차트가 시각을 아는가. 모르면 하우스 · 상승점 · 중천 부분을 빼고 그린다(받았더라도 — 이중 안전, 결정 054 의 6) */
  timeKnown: boolean;
  /** DAY 근거가 오늘의 것인가("오늘" · "그날") */
  today?: boolean;
};

type Piece = { t: string; b?: boolean };
type Josa = readonly [string, string];

const ANGLES = ['ASC', 'MC'] as const;
type Angle = (typeof ANGLES)[number];
const isAngle = (key: string): key is Angle => (ANGLES as readonly string[]).includes(key);

/** 지나가는 별이 내 별과 이루는 각도 중 각도 이름을 함께 적고 굵게 하는 것(시안 14-3 "부딪히는 각도(사분)", 14-4 는 "잘 어울리는 자리" 만) */
const NAMED_TRANSITS = ['SQUARE', 'OPPOSITION'];
const KNOWN_KINDS = ['PLACEMENT', 'CLUSTER', 'ASPECT', 'RULER', 'TRANSIT'];
/** 이 앱이 아는 근거 종류인가(모르는 kind 는 그 줄을 숨긴다) */
export const isKnown = (item: BasisItem): item is KnownBasisItem => KNOWN_KINDS.includes(item.kind);

/**
 * 사전에서 그 키의 값을 찾는다 — 객체의 제 키만(서버가 준 낱말이 `toString` 같은 이름이어도 사전 밖의 값이다, 리뷰 #49).
 * 이유 줄 · 쓰인 별(features/me)이 함께 쓴다.
 */
export function lookup<T>(dict: object, key: string | number): T | undefined {
  return Object.prototype.hasOwnProperty.call(dict, key) ? (dict as Record<string | number, T>)[key] : undefined;
}

const HANGUL_FIRST = 0xac00;
const HANGUL_LAST = 0xd7a3;
const JONG_COUNT = 28;

/** 괄호 앞 말의 마지막 글자 받침으로 조사를 고른다 */
export function josa(word: string, pair: Josa): string {
  const code = word.charCodeAt(word.length - 1);
  const hasFinal = code >= HANGUL_FIRST && code <= HANGUL_LAST && (code - HANGUL_FIRST) % JONG_COUNT !== 0;
  return hasFinal ? pair[0] : pair[1];
}

/** 이름표: 별명(굵게) + "(이름)" + 별명의 받침으로 고른 조사 */
const named = (nick: string, name: string, pair?: Josa): Piece[] => [
  { t: nick, b: true },
  { t: `(${name})${pair ? josa(nick, pair) : ''}` },
];

type Term = { reason: string; transit: string; name: string };

/** 천체 · 상승점 · 중천의 이유 줄 이름. 사전에 없으면 undefined */
function bodyTerm(key: string): Term | undefined {
  if (isAngle(key)) {
    const a = G.angles[key];
    return { reason: a.nickname, transit: a.nickname, name: a.name };
  }
  const b = lookup<{ name: string; reasonName: string; transitName: string }>(G.bodies, key);
  return b ? { reason: b.reasonName, transit: b.transitName, name: b.name } : undefined;
}

/** "자유로운" · "물병자리" */
function signTerm(sign: string): { adjective: string; full: string } | undefined {
  const g = lookup<{ adjective: string }>(G.signs, sign);
  const short = lookup<string>(strings.signs, sign);
  return g && short ? { adjective: g.adjective, full: short + strings.chart.signSuffix } : undefined;
}

/** "즐거움의 자리" · "5하우스" */
function houseTerm(n: number): { nick: string; name: string } | undefined {
  const g = lookup<{ nickname: string }>(G.houses, n);
  return g ? { nick: g.nickname, name: `${n}${R.houseSuffix}` } : undefined;
}

type GlossaryAspect = { reasonPhrase: string; transitPhrase: string };
const aspectTerm = (type: string) => {
  const g = lookup<GlossaryAspect>(G.aspects, type);
  const name = lookup<string>(strings.aspects, type);
  return g && name ? { ...g, name } : undefined;
};

/** 한 근거의 문장 몸통(끝맺음 앞까지)과 끝맺음 종류. 사전에 없는 값이면 null */
type Clause = { pieces: Piece[]; verb: { end: string; and: string }; angleAt?: boolean };

function clauseOf(item: KnownBasisItem, timeKnown: boolean): Clause | null {
  switch (item.kind) {
    case 'PLACEMENT': {
      const sign = signTerm(item.sign);
      const body = bodyTerm(item.body);
      if (!sign || !body) return null;
      if (isAngle(item.body))
        return {
          pieces: [...named(body.reason, body.name), { t: `${R.at} ` }, { t: sign.adjective, b: true }, { t: ` ${sign.full}${josa(sign.full, R.josa.subject)}` }],
          verb: R.was,
          angleAt: true,
        };
      const house = timeKnown && item.house !== undefined ? houseTerm(item.house) : undefined;
      if (timeKnown && item.house !== undefined && !house) return null;
      return {
        pieces: [
          ...named(body.reason, body.name, R.josa.subject),
          { t: ' ' },
          { t: sign.adjective, b: true },
          { t: ` ${sign.full}` },
          ...(house ? [{ t: R.join }, ...named(house.nick, house.name)] : []),
          { t: R.at },
        ],
        verb: R.was,
      };
    }
    case 'CLUSTER': {
      const count = lookup<string>(G.counts, item.bodies.length);
      const house = houseTerm(item.house);
      if (!count || !house) return null;
      const stars = `${R.starsPrefix}${count}`;
      return {
        pieces: [
          ...named(stars, `${R.planetsPrefix}${item.bodies.length}${R.planetsSuffix}`, R.josa.subject),
          { t: ' ' },
          ...named(house.nick, house.name),
          { t: R.at },
        ],
        verb: R.gathered,
      };
    }
    case 'ASPECT': {
      const a = bodyTerm(item.a);
      const b = bodyTerm(item.b);
      const aspect = aspectTerm(item.type);
      if (!a || !b || !aspect) return null;
      return {
        pieces: [
          ...named(a.reason, a.name, R.josa.subject),
          { t: ' ' },
          ...named(b.reason, b.name, R.josa.with),
          { t: ' ' },
          ...named(aspect.reasonPhrase, aspect.name),
          { t: R.at },
        ],
        verb: R.was,
      };
    }
    case 'RULER': {
      const body = bodyTerm(item.body);
      const ruler = bodyTerm(item.ruler);
      if (!body || !ruler || isAngle(item.ruler)) return null;
      return {
        pieces: [
          ...named(body.reason, body.name, R.josa.subject),
          { t: ' ' },
          ...named(ruler.reason, ruler.name, R.josa.subject),
          { t: ` ${R.ruled}${R.at}` },
        ],
        verb: R.was,
      };
    }
    case 'TRANSIT': {
      const mover = bodyTerm(item.mover);
      if (!mover || isAngle(item.mover)) return null;
      const head = [...named(mover.transit, mover.name, R.josa.subject), { t: ` ${R.mine}` }];
      if (item.target !== undefined && item.type !== undefined) {
        const target = bodyTerm(item.target);
        const aspect = aspectTerm(item.type);
        if (!target || !aspect) return null;
        // 합은 "내 ○○ 자리를 지나요" — 상승점 · 중천은 이름이 이미 "…의 자리" 라 "자리" 를 겹쳐 쓰지 않는다
        if (item.type === 'CONJUNCTION')
          return isAngle(item.target)
            ? { pieces: [...head, ...named(target.reason, target.name, R.josa.object)], verb: R.passes }
            : { pieces: [...head, ...named(target.reason, target.name), { t: ` ${R.place}${josa(R.place, R.josa.object)}` }], verb: R.passes };
        const phrase: Piece[] = NAMED_TRANSITS.includes(item.type)
          ? named(aspect.transitPhrase, aspect.name, R.josa.object)
          : [{ t: aspect.transitPhrase + josa(aspect.transitPhrase, R.josa.object) }];
        return { pieces: [...head, ...named(target.reason, target.name, R.josa.with), { t: ' ' }, ...phrase], verb: R.passes };
      }
      const house = item.house !== undefined ? houseTerm(item.house) : undefined;
      if (!house) return null;
      return { pieces: [...head, ...named(house.nick, house.name, R.josa.object)], verb: R.passes };
    }
  }
}

/** 시각을 모를 때 그릴 수 없는 근거(하우스 · 상승점 · 중천만으로 된 것) — 문장 · 용어 줄 · 작은 지도가 같은 기준으로 거른다 */
export function needsTime(item: KnownBasisItem): boolean {
  switch (item.kind) {
    case 'PLACEMENT':
    case 'RULER':
      return isAngle(item.body);
    case 'CLUSTER':
      return true;
    case 'ASPECT':
      return isAngle(item.a) || isAngle(item.b);
    case 'TRANSIT':
      return item.house !== undefined || (item.target !== undefined && isAngle(item.target));
  }
}

/**
 * 근거 구조 → 한 문장. 머리(태어날 때 · 지금 · 오늘 · 그날) + 근거마다의 틀, 근거가 둘이면 앞 문장을 "…고," 로 잇는다
 * (상승점 · 중천이 둘이면 "…에 …가, …에 …가 있었어요"). 모르는 kind 나 사전에 없는 값이 하나라도 있으면, 또는 시각을 몰라
 * 남는 근거가 없으면 null — 그 이유 줄을 숨긴다(결정 054 의 7).
 */
export function reasonSentence(reason: Reason, { timeKnown, today = false }: ReasonOptions): ReasonSentence | null {
  if (!reason.items.every(isKnown) || !(REASON_WHENS as readonly string[]).includes(reason.when)) return null;
  const items = reason.items.filter((item) => timeKnown || !needsTime(item));
  const clauses = items.map((item) => clauseOf(item, timeKnown));
  if (clauses.length === 0 || clauses.some((c) => c === null)) return null;
  const list = clauses as Clause[];
  const when = reason.when as ReasonWhen;
  const head = when === 'DAY' ? (today ? R.when.TODAY : R.when.DAY) : R.when[when];
  const pieces: Piece[] = [{ t: `${head} ` }];
  if (list.length === 2 && list.every((c) => c.angleAt)) {
    pieces.push(...list[0].pieces, { t: R.join }, ...list[1].pieces, { t: ` ${list[1].verb.end}` });
  } else {
    list.forEach((c, i) => {
      const last = i === list.length - 1;
      pieces.push(...c.pieces, { t: ` ${last ? c.verb.end : c.verb.and + R.join}` });
    });
  }
  let text = '';
  const bold: [number, number][] = [];
  for (const p of pieces) {
    if (p.b) bold.push([text.length, text.length + p.t.length]);
    text += p.t;
  }
  return { text, bold };
}
