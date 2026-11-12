/**
 * 서버 호출. 타입은 서버 저장소 docs/architecture.md "API 계약" 을 옮긴 것이다.
 * 계약에 없는 필드는 여기서 만들지 않는다. 어긋나면 서버 저장소의 계약 표를 먼저 고친다.
 * 출생 정보와 세션 토큰은 로그에 남기지 않는다(이 파일은 아무것도 기록하지 않는다).
 */
import { appClient, type AppClient } from '@/lib/app-client';
import { fixtures } from '@/lib/fixtures';

// ── 계약의 타입 ────────────────────────────────────────────────────────────

/** `GET /places` 의 한 줄. name 은 "시·도 시·군·구" 꼴이고 세종만 한 낱말이다 */
export type Place = { id: number; name: string; lat: number; lon: number };

/**
 * `POST /charts`·`PUT /profile` 의 요청. date 는 YYYY-MM-DD, time 은 HH:mm 또는 null("모름").
 * placeId 는 time 이 있으면 필수이고, time 이 null 이면 null 이다(서버가 쓰지 않는다. 결정 020).
 */
export type BirthInput = { date: string; time: string | null; placeId: number | null };

/** 별자리 안 위치와 황경(0 이상 360 미만). 상승점·중천의 값 */
export type SignPosition = {
  sign: string;
  degree: number;
  minute: number;
  longitude: number;
};

/** 천체의 위치. house 는 시각을 알 때만 온다 */
export type Position = SignPosition & {
  body: string;
  house?: number;
  retrograde: boolean;
};

/** 추가 지점(NORTH_NODE·LILITH·FORTUNE·VERTEX)의 위치. FORTUNE·VERTEX 는 시각을 알 때만 온다 */
export type Point = SignPosition & { point: string; house?: number };

/** 하우스 경계. house 는 1~12 */
export type House = SignPosition & { house: number };

export type Aspect = {
  a: string;
  b: string;
  type: string;
  orb: number;
  applying: boolean;
};

export type Chart = {
  timeKnown: boolean;
  /** 하우스 방식 이름. 지금은 "PLACIDUS" */
  houseSystem: string;
  /** 시각을 모르고 그날 안에 달 별자리가 바뀔 때만 true 로 온다 */
  moonSignMayChange?: boolean;
  positions: Position[];
  points: Point[];
  /** 1~12 하우스 경계. 시각 "모름" 이면 없다 */
  houses?: House[];
  /** 상승점·중천. 시각 "모름" 이면 없다 */
  angles?: { asc: SignPosition; mc: SignPosition };
  aspects: Aspect[];
};

/** `POST /auth/dev` 의 응답. 개발용 세션 토큰 */
export type DevSession = { token: string };

export type Reading = {
  headline: string;
  sections: { title: string; body: string; basis: string[] }[];
  strengths: string[];
  cautions: string[];
  shareId: string;
};

/** 방향성 제시의 주제. 지금 서버가 받는 것은 이성(`LOVE`) 하나다 */
export type DirectionTopic = 'LOVE';

/** 방향성 제시: 한 줄 제목과 해 볼 만한 것 3개. 항목의 title 은 실천 한 줄, basis 는 `Reading` 과 같은 말(1개 이상) */
export type Direction = {
  topic: DirectionTopic;
  title: string;
  items: { title: string; body: string; basis: string[] }[];
};

/** 심층 리포트의 글 영역. 서버는 이 순서로 네 영역을 모두 준다. 다섯째 영역인 시기는 `Report.timing` 으로 따로 온다 */
export const REPORT_AREAS = ['PERSONALITY', 'RELATIONSHIP', 'WORK', 'EMOTION'] as const;
export type ReportArea = (typeof REPORT_AREAS)[number];

export type ReportSection = {
  area: ReportArea;
  title: string;
  paragraphs: { title: string; body: string; basis: string[] }[];
};

/** 시기의 날짜는 모두 한국 달력의 YYYY-MM-DD 글자다. 글자를 그대로 비교해 거르고 정렬한다(앱은 날짜를 계산하지 않는다) */
export const MILESTONE_KINDS = ['SATURN_SQUARE', 'SATURN_RETURN', 'URANUS_OPPOSITION', 'SECOND_SATURN_RETURN'] as const;
export type MilestoneKind = (typeof MILESTONE_KINDS)[number];
export type TimingSize = 'BIG' | 'SMALL';

/** 누구에게나 오는 변곡점(마디). date 는 처음 정확히 겹치는 날, year·age 는 그날의 해와 만 나이(서버가 계산한 값) */
export type TimingMilestone = {
  kind: MilestoneKind;
  date: string;
  year: number;
  age: number;
  from: string;
  to: string;
  size: TimingSize;
  title: string;
  body: string;
};

/** 나에게만 오는 구간. CHANGE 변화 · OPPORTUNITY 기회 · FATED 운명적 만남(시각을 알 때만). size 는 CHANGE 에만 있다 */
export type TimingInterval = {
  id: string;
  kind: 'CHANGE' | 'OPPORTUNITY' | 'FATED';
  from: string;
  to: string;
  area: 'PEOPLE' | 'WORK' | 'MONEY' | 'SELF';
  size?: TimingSize;
  title: string;
  body: string;
};

/** 지금 나의 구간. 서버가 `GET /reports/me` 때마다 그날(date)로 만든다. 없는 값은 키가 없다 */
export type TimingCurrent = {
  date: string;
  /** 오늘에 걸쳐 있는 구간. 없으면 빈 배열 */
  intervals: TimingInterval[];
  /** 오늘이 그 기간 안인 변곡점 */
  milestone?: TimingMilestone;
  nextInterval?: TimingInterval;
  nextMilestone?: TimingMilestone;
  /** 오늘에서 가장 가까운 변곡점(지났든 아니든). 화면에서 강조한다 */
  nearestMilestone: MilestoneKind;
};

/** 심층 리포트의 시기 영역. milestones 는 언제나 넷이 시간 순서로, intervals 는 시작 순서로 온다(서로 겹칠 수 있다) */
export type ReportTiming = {
  /** false 면 상승점 구간과 운명적 만남 구간이 빠져 있다 */
  timeKnown: boolean;
  milestones: TimingMilestone[];
  intervals: TimingInterval[];
  current: TimingCurrent;
};

export type Report = { sections: ReportSection[]; timing: ReportTiming };

/** `GET /reports/me`. 글은 DONE 일 때만 온다 */
export type ReportState = { status: 'NONE' | 'WRITING' | 'FAILED' } | { status: 'DONE'; report: Report };

/** `POST /reports` 의 응답(202). WRITING 쓰기 시작했거나 쓰는 중 · DONE 이미 써 둠 */
export type ReportRequest = { status: 'WRITING' | 'DONE' };

/** 궁합의 관계 유형(결정 020). 서버가 유형마다 다른 가중치로 점수를 계산한다 */
export const RELATIONS = ['LOVE', 'FRIEND', 'WORK', 'FAMILY'] as const;
export type Relation = (typeof RELATIONS)[number];

/**
 * 겹친 휠의 자료. `POST /synastry/direct` 의 응답에만 온다(서버가 상대의 위치를 저장하지 않는다. 서버 결정 008).
 * longitude 는 `Chart` 와 같은 황경. mineAsc 는 내 상승점의 황경이고 내 시각을 알 때만 온다.
 * lines 는 점수에 쓴 각도: mine 은 SUN·MOON·MERCURY·VENUS·MARS·ASC, theirs 는 상대의 body, type 은 `Chart` 의 각도 종류.
 */
export type SynastryOverlay = {
  mine: { body: string; longitude: number }[];
  mineAsc?: number;
  theirs: { body: string; longitude: number }[];
  lines: { mine: string; theirs: string; type: string }[];
};

export type SynastryReportStatus = 'NONE' | 'WRITING' | 'FAILED' | 'DONE';

/**
 * 직접 입력 궁합. score 는 서버가 계산한 나 기준 점수(40~100)다. 앱은 점수를 만들거나 판정하지 않는다.
 * scoreLabel 은 서버가 낮은 점수에 붙이는 말이고 있을 때만 그대로 보여 준다. 값이 없는 키는 오지 않는다.
 */
export type Synastry = {
  id: string;
  /** 상대를 부를 이름 */
  name: string;
  relation: Relation;
  score: number;
  scoreLabel?: string;
  headline: string;
  keywords: [string, string, string];
  reportStatus: SynastryReportStatus;
  /** UTC `YYYY-MM-DDTHH:mm:ssZ` */
  createdAt: string;
  overlay?: SynastryOverlay;
};

/** `POST /synastry/direct` 의 요청. date·time·placeId 는 상대의 출생 정보다 */
export type DirectSynastryInput = { name: string; relation: Relation } & BirthInput;

/** `GET /synastry/ranking` 의 한 줄. 순서는 서버가 정한다(점수가 높은 순) */
export type SynastryRankingEntry = {
  id: string;
  name: string;
  score: number;
  scoreLabel?: string;
  keywords: [string, string, string];
};

/** 궁합 리포트의 영역. 서버는 이 순서로 네 영역을 모두 준다 */
export const SYNASTRY_REPORT_AREAS = ['ATTRACTION', 'TALK', 'CONFLICT', 'LASTING'] as const;
export type SynastryReportArea = (typeof SYNASTRY_REPORT_AREAS)[number];

export type SynastryReport = {
  sections: {
    area: SynastryReportArea;
    title: string;
    paragraphs: { title: string; body: string; basis: string[] }[];
  }[];
};

/** `GET /synastry/{id}/report`. 글은 DONE 일 때만 온다 */
export type SynastryReportState =
  { status: 'NONE' | 'WRITING' | 'FAILED' } | { status: 'DONE'; report: SynastryReport };

/** `POST /synastry/{id}/report` 의 응답(202). FAILED 는 뒤에서 일할 자리가 없어 시작하지 못했다는 뜻 */
export type SynastryReportRequest = { status: 'WRITING' | 'DONE' | 'FAILED' };

/** 문의의 종류(결정 024). 계정 · 풀이/리포트 · 궁합 · 오류 신고 · 기타 */
export const INQUIRY_CATEGORIES = ['ACCOUNT', 'READING', 'SYNASTRY', 'BUG', 'OTHER'] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

/** `POST /inquiries` 의 요청. body 는 앞뒤 공백을 뗀 10~2000자(유니코드 코드 포인트로 센다), replyEmail 은 답장을 받지 않으면 null */
export type InquiryInput = { category: InquiryCategory; body: string; replyEmail: string | null };

/** `POST /inquiries` 의 응답(201). 접수된 문의의 식별자 */
export type InquiryCreated = { id: string };

/** `GET /faqs` 의 한 줄(결정 028). 관리자가 적은 질문과 답. answer 는 그냥 글자이고 줄바꿈이 들어 있을 수 있다 */
export type Faq = { id: string; question: string; answer: string };

/**
 * `GET /app-config` 의 한 플랫폼 몫(결정 027). minVersion 은 점으로 나눈 숫자("1.2.0")이고 null 이면 아무도 막지 않는다.
 * message 는 관리자가 적은 안내(그냥 글자). blockNow 는 서버가 426 으로 바로 거절할지의 스위치다(앱은 판정에 쓰지 않는다).
 */
export type PlatformConfig = {
  minVersion: string | null;
  storeUrl: string | null;
  message: string | null;
  blockNow: boolean;
};

export type AppConfig = { ios: PlatformConfig; android: PlatformConfig };

// ── 결과 ───────────────────────────────────────────────────────────────────

/**
 * LOGIN_REQUIRED 401 · LIMIT 429(횟수 한도) · NETWORK 응답을 받지 못함 ·
 * SERVER 그 밖의 실패 상태 · INVALID 성공 상태지만 모양이 계약과 다름
 */
export type ApiErrorKind = 'LOGIN_REQUIRED' | 'LIMIT' | 'NETWORK' | 'SERVER' | 'INVALID';

/** code 는 서버가 오류 본문 `{ error }` 에 적어 준 이름(예: `BIRTH_MISMATCH`)이다. 본문이 없으면 없다 */
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiErrorKind; status?: number; code?: string };

// ── 응답 검사 (외부 입력은 쓰기 전에 모양을 확인한다) ──────────────────────

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

const isSignPosition = (v: unknown): v is SignPosition =>
  isObject(v) &&
  typeof v.sign === 'string' &&
  typeof v.degree === 'number' &&
  typeof v.minute === 'number' &&
  typeof v.longitude === 'number';

const isOptionalNumber = (v: unknown) => ['number', 'undefined'].includes(typeof v);

const isPosition = (v: unknown): v is Position =>
  isSignPosition(v) &&
  typeof (v as Record<string, unknown>).body === 'string' &&
  typeof (v as Record<string, unknown>).retrograde === 'boolean' &&
  isOptionalNumber((v as Record<string, unknown>).house);

const isPoint = (v: unknown): v is Point =>
  isSignPosition(v) &&
  typeof (v as Record<string, unknown>).point === 'string' &&
  isOptionalNumber((v as Record<string, unknown>).house);

const isHouse = (v: unknown): v is House =>
  isSignPosition(v) && typeof (v as Record<string, unknown>).house === 'number';

const isAspect = (v: unknown): v is Aspect =>
  isObject(v) &&
  typeof v.a === 'string' &&
  typeof v.b === 'string' &&
  typeof v.type === 'string' &&
  typeof v.orb === 'number' &&
  typeof v.applying === 'boolean';

export function isChart(v: unknown): v is Chart {
  if (!isObject(v) || typeof v.timeKnown !== 'boolean' || typeof v.houseSystem !== 'string') return false;
  if (!['boolean', 'undefined'].includes(typeof v.moonSignMayChange)) return false;
  if (!Array.isArray(v.positions) || !v.positions.every(isPosition)) return false;
  if (!Array.isArray(v.points) || !v.points.every(isPoint)) return false;
  if (!Array.isArray(v.aspects) || !v.aspects.every(isAspect)) return false;
  if (v.houses !== undefined && !(Array.isArray(v.houses) && v.houses.length === 12 && v.houses.every(isHouse)))
    return false;
  if (v.angles !== undefined && !(isObject(v.angles) && isSignPosition(v.angles.asc) && isSignPosition(v.angles.mc)))
    return false;
  return true;
}

export function isPlaceList(v: unknown): v is Place[] {
  return (
    Array.isArray(v) &&
    v.every(
      (p) =>
        isObject(p) &&
        typeof p.id === 'number' &&
        typeof p.name === 'string' &&
        typeof p.lat === 'number' &&
        typeof p.lon === 'number',
    )
  );
}

const isStringList = (v: unknown): v is string[] => Array.isArray(v) && v.every((item) => typeof item === 'string');

export function isReading(v: unknown): v is Reading {
  return (
    isObject(v) &&
    typeof v.headline === 'string' &&
    Array.isArray(v.sections) &&
    v.sections.every(
      (s) => isObject(s) && typeof s.title === 'string' && typeof s.body === 'string' && isStringList(s.basis),
    ) &&
    isStringList(v.strengths) &&
    isStringList(v.cautions) &&
    typeof v.shareId === 'string'
  );
}

const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

const isSize = (v: unknown) => v === 'BIG' || v === 'SMALL';

const isMilestone = (v: unknown): v is TimingMilestone =>
  isObject(v) &&
  MILESTONE_KINDS.some((kind) => kind === v.kind) &&
  isDate(v.date) &&
  typeof v.year === 'number' &&
  typeof v.age === 'number' &&
  isDate(v.from) &&
  isDate(v.to) &&
  isSize(v.size) &&
  typeof v.title === 'string' &&
  typeof v.body === 'string';

/** 크기는 변화 구간에만 있고 다른 종류에는 키가 없다 */
const isInterval = (v: unknown): v is TimingInterval =>
  isObject(v) &&
  typeof v.id === 'string' &&
  (v.kind === 'CHANGE' ? isSize(v.size) : (v.kind === 'OPPORTUNITY' || v.kind === 'FATED') && v.size === undefined) &&
  isDate(v.from) &&
  isDate(v.to) &&
  ['PEOPLE', 'WORK', 'MONEY', 'SELF'].includes(v.area as string) &&
  typeof v.title === 'string' &&
  typeof v.body === 'string';

const isTimingCurrent = (v: unknown): v is TimingCurrent =>
  isObject(v) &&
  isDate(v.date) &&
  Array.isArray(v.intervals) &&
  v.intervals.every(isInterval) &&
  (v.milestone === undefined || isMilestone(v.milestone)) &&
  (v.nextInterval === undefined || isInterval(v.nextInterval)) &&
  (v.nextMilestone === undefined || isMilestone(v.nextMilestone)) &&
  MILESTONE_KINDS.some((kind) => kind === v.nearestMilestone);

/** 변곡점은 계약의 순서대로 넷이 모두 있어야 한다(화면이 그 순서를 믿고 "첫 번째~네 번째" 로 그린다) */
const isTiming = (v: unknown): v is ReportTiming =>
  isObject(v) &&
  typeof v.timeKnown === 'boolean' &&
  Array.isArray(v.milestones) &&
  v.milestones.length === MILESTONE_KINDS.length &&
  v.milestones.every((m, i) => isMilestone(m) && m.kind === MILESTONE_KINDS[i]) &&
  Array.isArray(v.intervals) &&
  v.intervals.every(isInterval) &&
  isTimingCurrent(v.current);

const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** 항목은 정확히 3개이고, 제목·본문은 빈 글이 아니며, 근거는 항목마다 하나 이상이어야 한다 */
export function isDirection(v: unknown): v is Direction {
  return (
    isObject(v) &&
    v.topic === 'LOVE' &&
    isText(v.title) &&
    Array.isArray(v.items) &&
    v.items.length === 3 &&
    v.items.every(
      (item) =>
        isObject(item) &&
        isText(item.title) &&
        isText(item.body) &&
        Array.isArray(item.basis) &&
        item.basis.length > 0 &&
        item.basis.every(isText),
    )
  );
}

/**
 * 네 영역이 계약의 순서대로 모두 있고, 영역마다 문단이 하나 이상 있어야 한다. 시기(timing)도 계약의 모양이어야 한다.
 * 시기가 생기기 전에 받아 기기에 둔 리포트는 여기서 걸러진다. 그 밖의 계약에 없는 필드는 보지 않는다.
 */
export function isReport(v: unknown): v is Report {
  return (
    isObject(v) &&
    isTiming(v.timing) &&
    Array.isArray(v.sections) &&
    v.sections.length === REPORT_AREAS.length &&
    v.sections.every(
      (s, i) =>
        isObject(s) &&
        s.area === REPORT_AREAS[i] &&
        typeof s.title === 'string' &&
        Array.isArray(s.paragraphs) &&
        s.paragraphs.length > 0 &&
        s.paragraphs.every(
          (p) => isObject(p) && typeof p.title === 'string' && typeof p.body === 'string' && isStringList(p.basis),
        ),
    )
  );
}

export function isReportState(v: unknown): v is ReportState {
  if (!isObject(v)) return false;
  if (v.status === 'DONE') return isReport(v.report);
  return v.status === 'NONE' || v.status === 'WRITING' || v.status === 'FAILED';
}

const isLongitudes = (v: unknown) =>
  Array.isArray(v) && v.every((p) => isObject(p) && typeof p.body === 'string' && typeof p.longitude === 'number');

const isSynastryOverlay = (v: unknown): v is SynastryOverlay =>
  isObject(v) &&
  isLongitudes(v.mine) &&
  isLongitudes(v.theirs) &&
  isOptionalNumber(v.mineAsc) &&
  Array.isArray(v.lines) &&
  v.lines.every(
    (l) => isObject(l) && typeof l.mine === 'string' && typeof l.theirs === 'string' && typeof l.type === 'string',
  );

const isOptionalString = (v: unknown) => ['string', 'undefined'].includes(typeof v);
const isKeywords = (v: unknown) => isStringList(v) && v.length === 3;

/** 점수의 범위(40~100)는 보지 않는다. 앱은 점수를 판정하지 않고 받은 숫자를 그대로 보여 준다 */
export function isSynastry(v: unknown): v is Synastry {
  return (
    isObject(v) &&
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    RELATIONS.some((r) => r === v.relation) &&
    typeof v.score === 'number' &&
    isOptionalString(v.scoreLabel) &&
    typeof v.headline === 'string' &&
    isKeywords(v.keywords) &&
    ['NONE', 'WRITING', 'FAILED', 'DONE'].includes(v.reportStatus as string) &&
    typeof v.createdAt === 'string' &&
    (v.overlay === undefined || isSynastryOverlay(v.overlay))
  );
}

const isSynastryList = (v: unknown): v is Synastry[] => Array.isArray(v) && v.every(isSynastry);

export function isSynastryRanking(v: unknown): v is SynastryRankingEntry[] {
  return (
    Array.isArray(v) &&
    v.every(
      (r) =>
        isObject(r) &&
        typeof r.id === 'string' &&
        typeof r.name === 'string' &&
        typeof r.score === 'number' &&
        isOptionalString(r.scoreLabel) &&
        isKeywords(r.keywords),
    )
  );
}

/** 네 영역이 계약의 순서대로 모두 있고, 영역마다 문단이 하나 이상 있어야 한다([isReport] 와 같은 기준) */
function isSynastryReport(v: unknown): v is SynastryReport {
  return (
    isObject(v) &&
    Array.isArray(v.sections) &&
    v.sections.length === SYNASTRY_REPORT_AREAS.length &&
    v.sections.every(
      (s, i) =>
        isObject(s) &&
        s.area === SYNASTRY_REPORT_AREAS[i] &&
        typeof s.title === 'string' &&
        Array.isArray(s.paragraphs) &&
        s.paragraphs.length > 0 &&
        s.paragraphs.every(
          (p) => isObject(p) && typeof p.title === 'string' && typeof p.body === 'string' && isStringList(p.basis),
        ),
    )
  );
}

export function isSynastryReportState(v: unknown): v is SynastryReportState {
  if (!isObject(v)) return false;
  if (v.status === 'DONE') return isSynastryReport(v.report);
  return v.status === 'NONE' || v.status === 'WRITING' || v.status === 'FAILED';
}

const isSynastryReportRequest = (v: unknown): v is SynastryReportRequest =>
  isObject(v) && (v.status === 'WRITING' || v.status === 'DONE' || v.status === 'FAILED');

/** 상대의 출생 정보를 요청 본문으로. placeId 는 시각이 있을 때만 싣는다(시각 "모름" 이면 키를 보내지 않는다) */
const partnerBirthBody = (birth: BirthInput) => ({
  date: birth.date,
  time: birth.time,
  ...(birth.time !== null && birth.placeId !== null ? { placeId: birth.placeId } : {}),
});

const isReportRequest = (v: unknown): v is ReportRequest =>
  isObject(v) && (v.status === 'WRITING' || v.status === 'DONE');

const isInquiryCreated = (v: unknown): v is InquiryCreated => isObject(v) && isText(v.id);

/** 하나라도 어긋나면 목록 전체를 받지 않는다. 계약에 없는 필드는 보지 않는다 */
export function isFaqList(v: unknown): v is Faq[] {
  return (
    Array.isArray(v) &&
    v.every((item) => isObject(item) && isText(item.id) && isText(item.question) && isText(item.answer))
  );
}

const isNullableString = (v: unknown): v is string | null => typeof v === 'string' || v === null;

const isPlatformConfig = (v: unknown): v is PlatformConfig =>
  isObject(v) &&
  isNullableString(v.minVersion) &&
  isNullableString(v.storeUrl) &&
  isNullableString(v.message) &&
  typeof v.blockNow === 'boolean';

export function isAppConfig(v: unknown): v is AppConfig {
  return isObject(v) && isPlatformConfig(v.ios) && isPlatformConfig(v.android);
}

const isDevSession = (v: unknown): v is DevSession => isObject(v) && typeof v.token === 'string' && v.token.length > 0;

/** `PUT /profile` 의 응답. 보낸 것과 같은 모양이다. time 이 null 이면 placeId 는 null 이거나 없다(결정 020) */
const isBirthInput = (v: unknown): v is BirthInput =>
  isObject(v) &&
  typeof v.date === 'string' &&
  (typeof v.time === 'string' || v.time === null) &&
  (typeof v.placeId === 'number' || (v.time === null && (v.placeId === null || v.placeId === undefined)));

// ── 호출 ───────────────────────────────────────────────────────────────────

export type ApiConfig = {
  baseUrl: string;
  /** 세션 토큰을 돌려준다. 없으면 null. 보관은 features/auth 가 한다 */
  getToken: () => string | null;
  /** 401 을 받았을 때 세션을 다시 받는다. 새 세션이 생겼으면 true. 없으면 다시 받지 않는다 */
  refreshSession?: () => Promise<boolean>;
  fetchFn?: typeof fetch;
  /** 개발용 가짜 서버. 켜면 서버를 부르지 않고 fixtures 로 답한다 */
  useFixtures?: boolean;
  /** 네이티브 앱의 플랫폼과 버전. 있으면 모든 요청에 버전 헤더를 붙인다. 웹은 없다(결정 027) */
  client?: AppClient | null;
  /** 서버가 426 `UPDATE_REQUIRED` 로 거절했을 때 부른다 */
  onUpdateRequired?: () => void;
};

type RequestOptions<T> = {
  body?: unknown;
  validate: (v: unknown) => v is T;
  /** false 면 세션 헤더를 붙이지 않고 401 에도 세션을 다시 받지 않는다(`GET /places`·`POST /auth/dev`·`GET /app-config`·`GET /faqs`) */
  auth?: boolean;
};

/** `{ error }` 로 오는 이름: 이 버전의 앱은 더 받지 않는다(상태 426) */
const UPDATE_REQUIRED = 'UPDATE_REQUIRED';

/** 가짜 서버의 설정. 아무도 막지 않는다 */
const FIXTURE_PLATFORM_CONFIG: PlatformConfig = { minVersion: null, storeUrl: null, message: null, blockNow: false };

/** 가짜 서버가 주는 세션 토큰 */
const FIXTURE_TOKEN = 'fixture-session';

export function createApi(config: ApiConfig) {
  /**
   * 실패한 호출을 스스로 다시 하지 않는다. 다시 시도는 화면에서 사용자가 누를 때만 한다.
   * 예외 하나: 401 이면 세션을 한 번 다시 받고 같은 호출을 한 번만 더 한다(retried 가 그 표시다).
   */
  async function request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    options: RequestOptions<T>,
    retried = false,
  ): Promise<ApiResult<T>> {
    const auth = options.auth !== false;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    const token = auth ? config.getToken() : null;
    if (token) headers.Authorization = `Bearer ${token}`;
    if (config.client) {
      headers['X-App-Platform'] = config.client.platform;
      headers['X-App-Version'] = config.client.version;
    }

    let response: Response;
    try {
      response = await (config.fetchFn ?? fetch)(`${config.baseUrl}${path}`, {
        method,
        headers,
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
    } catch {
      return { ok: false, error: 'NETWORK' };
    }

    const { status } = response;
    if (status === 401) {
      if (auth && !retried && config.refreshSession && (await config.refreshSession()))
        return request(method, path, options, true);
      return { ok: false, error: 'LOGIN_REQUIRED', status };
    }
    if (status === 429) return { ok: false, error: 'LIMIT', status };
    if (!response.ok) {
      // 오류 본문 `{ error }` 의 이름만 읽는다. 본문이 없거나 모양이 달라도 결과는 같다.
      const body: unknown = await response.json().catch(() => null);
      const code = isObject(body) && typeof body.error === 'string' ? { code: body.error } : {};
      if (status === 426 && code.code === UPDATE_REQUIRED) config.onUpdateRequired?.();
      return { ok: false, error: 'SERVER', status, ...code };
    }

    // 204 는 본문이 없으니 읽지 않는다(`DELETE /account`).
    let data: unknown = null;
    if (status !== 204) {
      try {
        data = await response.json();
      } catch {
        return { ok: false, error: 'INVALID', status };
      }
    }
    return options.validate(data) ? { ok: true, data } : { ok: false, error: 'INVALID', status };
  }

  return {
    /** `GET /places` 국내 시·군·구 전체 목록. 화면이 시·도별로 묶어 고르게 한다 */
    async listPlaces(): Promise<ApiResult<Place[]>> {
      if (config.useFixtures) return { ok: true, data: fixtures.places };
      return request('GET', '/places', { validate: isPlaceList, auth: false });
    },

    /** `GET /app-config` 플랫폼별 최소 버전 · 스토어 주소 · 안내(결정 027). 세션이 필요 없다 */
    async getAppConfig(): Promise<ApiResult<AppConfig>> {
      if (config.useFixtures)
        return { ok: true, data: { ios: FIXTURE_PLATFORM_CONFIG, android: FIXTURE_PLATFORM_CONFIG } };
      return request('GET', '/app-config', { validate: isAppConfig, auth: false });
    },

    /** `GET /faqs` 자주 묻는 질문(결정 028). 공개된 것만, 보여 줄 순서대로 온다(빈 목록일 수 있다). 세션이 필요 없다 */
    async listFaqs(): Promise<ApiResult<Faq[]>> {
      if (config.useFixtures) return { ok: true, data: fixtures.faqs };
      return request('GET', '/faqs', { validate: isFaqList, auth: false });
    },

    /** `POST /charts` 출생 정보로 차트를 받는다 */
    async createChart(input: BirthInput): Promise<ApiResult<Chart>> {
      if (config.useFixtures)
        return {
          ok: true,
          data: input.time === null ? fixtures.chartTimeUnknown : fixtures.chart,
        };
      return request('POST', '/charts', { body: input, validate: isChart });
    },

    /** `POST /auth/dev` 개발용 세션 토큰을 받는다. 서버가 개발용 로그인을 꺼 두었으면 404 다 */
    async createDevSession(): Promise<ApiResult<DevSession>> {
      if (config.useFixtures) return { ok: true, data: { token: FIXTURE_TOKEN } };
      return request('POST', '/auth/dev', { validate: isDevSession, auth: false });
    },

    /** `PUT /profile` 출생 정보를 서버에 저장한다. 요약 해석은 서버가 이 값으로 쓴다 */
    async saveProfile(input: BirthInput): Promise<ApiResult<BirthInput>> {
      if (config.useFixtures) return { ok: true, data: input };
      return request('PUT', '/profile', { body: input, validate: isBirthInput });
    },

    /**
     * `POST /readings` 요약 해석을 받는다. 본문은 없고 서버가 저장된 출생 정보로 쓴다(없으면 404).
     * 글을 쓰는 데 몇 초가 걸릴 수 있다. 같은 차트에는 같은 글이 온다.
     */
    async createReading(): Promise<ApiResult<Reading>> {
      if (config.useFixtures) return { ok: true, data: fixtures.reading };
      return request('POST', '/readings', { validate: isReading });
    },

    /**
     * `POST /directions` 방향성 제시(해 볼 만한 것 3개)를 받는다. 서버가 저장된 출생 정보로 쓴다(없으면 404 `NO_PROFILE`).
     * 처음에는 글을 다 쓸 때까지 기다렸다 답하므로 수십 초가 걸릴 수 있고, 그 뒤로는 저장된 글이 바로 온다.
     */
    async createDirection(topic: DirectionTopic): Promise<ApiResult<Direction>> {
      if (config.useFixtures) return { ok: true, data: fixtures.direction };
      return request('POST', '/directions', { body: { topic }, validate: isDirection });
    },

    /**
     * `POST /reports` 심층 리포트를 써 달라고 한다. 본문은 없고 서버가 저장된 출생 정보로 쓴다(없으면 404).
     * 글은 뒤에서 1~2분 동안 쓰이므로 여기서는 상태만 온다. 이미 쓰는 중이거나 써 두었으면 새로 쓰지 않는다.
     */
    async requestReport(): Promise<ApiResult<ReportRequest>> {
      if (config.useFixtures) return { ok: true, data: { status: 'DONE' } };
      return request('POST', '/reports', { validate: isReportRequest });
    },

    /** `GET /reports/me` 내 리포트의 상태. 다 썼으면(DONE) 글이 함께 온다 */
    async getReport(): Promise<ApiResult<ReportState>> {
      if (config.useFixtures) return { ok: true, data: { status: 'DONE', report: fixtures.report } };
      return request('GET', '/reports/me', { validate: isReportState });
    },

    /** `DELETE /account` 계정과 그 사람의 모든 것(세션 · 출생 정보 · 글)을 서버에서 지운다. 성공은 204 이고 본문이 없다 */
    async deleteAccount(): Promise<ApiResult<null>> {
      if (config.useFixtures) return { ok: true, data: null };
      return request('DELETE', '/account', { validate: (v): v is null => v === null });
    },

    /**
     * `POST /inquiries` 문의를 보낸다(결정 024). 400 은 code 로 온다(`INVALID_REQUEST` · `INVALID_CATEGORY` ·
     * `INVALID_BODY` · `INVALID_EMAIL`). 한 계정에 한 시간 5번을 넘으면 429(LIMIT)다. 내용과 주소는 어디에도 남기지 않는다.
     */
    async createInquiry(input: InquiryInput): Promise<ApiResult<InquiryCreated>> {
      if (config.useFixtures) return { ok: true, data: { id: 'fixture-inquiry' } };
      return request('POST', '/inquiries', {
        body: { category: input.category, body: input.body, replyEmail: input.replyEmail },
        validate: isInquiryCreated,
      });
    },

    /**
     * `POST /synastry/direct` 상대의 출생 정보로 궁합을 계산한다. 나는 서버에 저장된 출생 정보다(없으면 404 `NO_PROFILE`).
     * 서버가 글을 다 쓸 때까지 기다렸다 답하므로 수십 초가 걸릴 수 있다. 겹친 휠(`overlay`)은 이 응답에만 온다.
     */
    async createDirectSynastry(input: DirectSynastryInput): Promise<ApiResult<Synastry>> {
      if (config.useFixtures)
        return { ok: true, data: { ...fixtures.synastry, name: input.name, relation: input.relation } };
      return request('POST', '/synastry/direct', {
        body: { name: input.name, relation: input.relation, ...partnerBirthBody(input) },
        validate: isSynastry,
      });
    },

    /** `GET /synastry` 내가 본 궁합 전부, 새것부터. 겹친 휠은 없다 */
    async listSynastries(): Promise<ApiResult<Synastry[]>> {
      if (config.useFixtures) return { ok: true, data: fixtures.synastryList };
      return request('GET', '/synastry', { validate: isSynastryList });
    },

    /** `GET /synastry/{id}` 궁합 하나. 겹친 휠은 없다. 남의 것·없는 것은 404 */
    async getSynastry(id: string): Promise<ApiResult<Synastry>> {
      if (config.useFixtures) {
        const found = fixtures.synastryList.find((s) => s.id === id);
        return found ? { ok: true, data: found } : { ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' };
      }
      return request('GET', `/synastry/${encodeURIComponent(id)}`, { validate: isSynastry });
    },

    /** `GET /synastry/ranking?relation=` 그 관계 유형의 궁합을 서버가 정한 순서(점수가 높은 순)로 */
    async getSynastryRanking(relation: Relation): Promise<ApiResult<SynastryRankingEntry[]>> {
      if (config.useFixtures)
        return {
          ok: true,
          // 가짜 서버가 서버를 대신해 줄을 세운다. 화면은 받은 순서대로만 그린다.
          data: fixtures.synastryList.filter((s) => s.relation === relation).sort((a, b) => b.score - a.score),
        };
      return request('GET', `/synastry/ranking?relation=${relation}`, { validate: isSynastryRanking });
    },

    /**
     * `POST /synastry/{id}/report` 궁합 리포트를 써 달라고 한다. 서버에 상대의 출생 정보가 없어 다시 보낸다.
     * 400 `BIRTH_MISMATCH`(그 궁합의 상대가 아니다) · 409 `PROFILE_CHANGED`(내 출생 정보가 바뀌었다)는 code 로 온다.
     */
    async requestSynastryReport(id: string, birth: BirthInput): Promise<ApiResult<SynastryReportRequest>> {
      if (config.useFixtures) return { ok: true, data: { status: 'DONE' } };
      return request('POST', `/synastry/${encodeURIComponent(id)}/report`, {
        body: partnerBirthBody(birth),
        validate: isSynastryReportRequest,
      });
    },

    /** `GET /synastry/{id}/report` 궁합 리포트의 상태. 다 썼으면(DONE) 글이 함께 온다 */
    async getSynastryReport(id: string): Promise<ApiResult<SynastryReportState>> {
      if (config.useFixtures) return { ok: true, data: { status: 'DONE', report: fixtures.synastryReport } };
      return request('GET', `/synastry/${encodeURIComponent(id)}/report`, { validate: isSynastryReportState });
    },
  };
}

export type Api = ReturnType<typeof createApi>;

let sessionToken: string | null = null;
let sessionRefresher: (() => Promise<boolean>) | null = null;

/** 세션이 생기거나 사라질 때 features/auth 가 부른다. */
export function setSessionToken(token: string | null) {
  sessionToken = token;
}

/** 401 을 받았을 때 세션을 다시 받는 방법. features/auth 가 한 번 등록한다. */
export function setSessionRefresher(refresher: (() => Promise<boolean>) | null) {
  sessionRefresher = refresher;
}

let updateRequiredHandler: (() => void) | null = null;

/** 서버가 426 `UPDATE_REQUIRED` 로 거절했을 때 할 일. features/update 가 등록한다(결정 027). */
export function setUpdateRequiredHandler(handler: (() => void) | null) {
  updateRequiredHandler = handler;
}

/** 앱이 쓰는 인스턴스. 서버 주소와 가짜 서버 스위치는 환경 변수에서 온다(.env.example). */
export const api = createApi({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  getToken: () => sessionToken,
  refreshSession: async () => (sessionRefresher ? sessionRefresher() : false),
  useFixtures: process.env.EXPO_PUBLIC_USE_FIXTURES === '1',
  client: appClient,
  onUpdateRequired: () => updateRequiredHandler?.(),
});
