/**
 * 서버 호출. 타입은 서버 저장소 docs/architecture.md "API 계약" 을 옮긴 것이다.
 * 계약에 없는 필드는 여기서 만들지 않는다. 어긋나면 서버 저장소의 계약 표를 먼저 고친다.
 * 출생 정보와 세션 토큰은 로그에 남기지 않는다(이 파일은 아무것도 기록하지 않는다).
 */
import { Platform } from 'react-native';

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
/** 세션 토큰. 웹은 서버가 쿠키로 들고 있어 언제나 null 이다(결정 034) */
export type DevSession = { token: string | null };

/**
 * `POST /auth/login` 에 보내는 공급자 자격 증명(결정 034, 서버 결정 021). 카카오 웹만 ID 토큰 대신 인가 코드를 보낸다.
 * 애플은 authorization code(탈퇴 때 철회용)를 함께 보내고, 웹은 그 로그인에 쓴 돌아올 주소도 보낸다.
 */
export type ProviderCredential =
  | { provider: 'GOOGLE'; idToken: string }
  | { provider: 'APPLE'; idToken: string; authorizationCode?: string; redirectUri?: string }
  | { provider: 'KAKAO'; idToken: string }
  | { provider: 'KAKAO'; code: string; redirectUri: string };

/** 로그인 결과: 계정이 있으면 세션(웹은 token 이 null), 처음 온 사람은 가입권 */
export type LoginResult =
  | { status: 'SIGNED_IN'; token: string | null }
  /** expiresAt: 가입권이 끝나는 때(ms). 서버가 주지 않았거나 읽을 수 없으면 없다 */
  | { status: 'SIGNUP_REQUIRED'; signupToken: string; expiresAt?: number };

/** 가입 결과. 웹은 token 이 null 이다 */
export type SignupResult = { token: string | null };

/**
 * `POST /auth/signup` 에 출생 정보와 함께 보내는 가입 단계의 값(결정 042). avatar 는 정수 1~8, 동의는 참거짓이다(서버가 타입을 정확히 본다).
 * termsVersion · privacyVersion 은 `src/content/legal-versions.ts` 의 문자열 그대로다.
 */
export type SignupExtra = {
  nickname: string;
  avatar: number;
  termsVersion: string;
  privacyVersion: string;
  pushConsent: boolean;
  marketingConsent: boolean;
};

/** `POST /auth/nickname-check` 의 응답. 영문 대소문자는 같은 이름으로 본다(결정 042) */
export type NicknameAvailability = { available: boolean };

/**
 * "이렇게 풀이한 이유" 의 근거 하나(서버 결정 031, 앱 결정 054). 글자는 `Chart` 의 body · sign · type 과 같고, 상승점 · 중천은 "ASC" · "MC" 다.
 * 시각을 모르면 house 키 · CLUSTER · ASC · MC 가 오지 않는다. 값이 없는 키는 오지 않는다.
 */
export type KnownBasisItem =
  | { kind: 'PLACEMENT'; body: string; sign: string; house?: number }
  | { kind: 'CLUSTER'; house: number; bodies: string[] }
  | { kind: 'ASPECT'; a: string; b: string; type: string }
  | { kind: 'RULER'; body: string; ruler: string }
  | { kind: 'TRANSIT'; mover: string; target?: string; type?: string; house?: number };

/** 모르는 kind 는 풀이 전체를 거절하지 않고 받아 두고, 그리는 쪽이 그 이유 줄만 숨긴다(결정 054 의 7) */
export type BasisItem = KnownBasisItem | { kind: string };

/** 근거의 때: 태어날 때 · 지금 지나는 시기 · 그날. 모르는 때는 풀이 전체를 거절하지 않고 받아 두고, 그리는 쪽이 그 이유 줄만 숨긴다(결정 054 의 7) */
export const REASON_WHENS = ['BIRTH', 'NOW', 'DAY'] as const;
export type ReasonWhen = (typeof REASON_WHENS)[number];
export type Reason = { when: ReasonWhen | (string & {}); items: BasisItem[] };

/** "이 풀이에 쓰인 별" 하나: 놓인 자리는 body + sign, 하우스 모임은 house + count, 각도 · 다스리는 별은 body 하나 */
export type Star = { body?: string; sign?: string; house?: number; count?: number };

export type Reading = {
  headline: string;
  /** reason 은 요약 해석 v2 의 근거 구조. basis 는 옛 근거 낱말로 서버 S⑦ 까지만 함께 온다(앱은 읽지 않는다) */
  sections: { title: string; body: string; reason: Reason; basis?: string[] }[];
  strengths: string[];
  /** 보완점 2(요약 해석 v2) */
  cautions: string[];
  /** 요약 해석 v2 의 만든 때(UTC ISO-8601, 서버 결정 030 · 031). 옛 응답에는 없다 — 홈의 "별명을 받은 지 N일"(결정 047) */
  createdAt?: string;
};

/** 나 탭 풀이의 영역(결정 048). 서버는 이 순서로 다섯 영역을 모두 준다 */
export const ME_AREAS = ['PERSONALITY', 'LOVE', 'RELATIONSHIP', 'WORK', 'EMOTION'] as const;
export type MeArea = (typeof ME_AREAS)[number];

/**
 * 나 탭 풀이의 한 영역. 공통 칸 + 영역마다의 칸 하나(그 영역이 아니면 키가 없다): 성격 glance · 연애 practices + reason ·
 * 관계 closer · 일 workStyle(서버가 차트로 셈한 10~90, 0 쪽 혼자서 · 계획대로 · 꼼꼼하게) · 감정 shaken. 연애는 문단이 없다.
 */
export type MeAreaReport = {
  area: MeArea;
  title: string;
  keywords: [string, string, string];
  stars: Star[];
  paragraphs: { title: string; body: string; reason: Reason }[];
  glance?: { shining: [string, string]; tiring: [string, string] };
  practices?: { title: string; body: string }[];
  reason?: Reason;
  closer?: { first: string; close: string; longtime: string };
  workStyle?: { together: number; flexible: number; fast: number };
  shaken?: { when: string; comfort: string };
};

export type MeReport = { areas: MeAreaReport[] };

/** `GET /me-report`. 풀이는 DONE 일 때만 온다(지금 프로필의 차트 기준 — 출생 정보를 고치면 NONE) */
export type MeReportState = { status: 'NONE' | 'WRITING' | 'FAILED' } | { status: 'DONE'; report: MeReport };

/** `POST /me-report` 의 응답(202). FAILED 는 뒤에서 일할 자리가 없어 시작하지 못했다는 뜻 */
export type MeReportRequest = { status: 'WRITING' | 'DONE' | 'FAILED' };

/**
 * `GET /account` · `PATCH /account` 에서 앱이 쓰는 값 — 홈 별명 카드와 마이 · 계정 화면이 함께 쓴다(결정 047 · 056):
 * 닉네임 · 프로필 그림(계약은 1~8, 옛 계정은 둘 다 null — 서버 결정 025 · 028) · 이메일(옛 계정 null) · 공급자 · 마케팅 수신 동의 ·
 * 이용 정지 여부(`suspended` — 없는 옛 서버는 false, 사유는 오지 않는다). 공급자는 계약이 `GOOGLE | APPLE | KAKAO | DEV` 지만
 * 모르는 이름도 받는다 — 화면이 아는 것만 그린다.
 */
export type MyAccount = {
  nickname: string | null;
  avatar: number | null;
  email: string | null;
  provider: string;
  marketingConsent: boolean;
  suspended: boolean;
  /** 푸시 알림 받기 동의(서버 결정 027). 이 칸이 없는 옛 서버는 알림 화면이 "받지 못함" 으로 본다 */
  pushConsent?: boolean;
  /**
   * 오늘의 하늘 알림 스위치 · 받는 시간 "HH:mm"(24시간 · 5분 단위, 서버 S10-2). 사용자가 직접 정한 적 없으면 서버가 `pushConsent` 를 따라 준다 —
   * 그대로 그린다. 보내기는 푸시 동의와 이 스위치가 둘 다 켜졌을 때만이다. 이 칸이 없는 서버면 둘 다 없다
   */
  todaySkyPush?: boolean;
  todaySkyTime?: string;
};

/** `POST /push/devices` 의 몸통(서버 S10-2): Expo 푸시 토큰 · 기기 종류 */
export type PushDevice = { expoToken: string; platform: 'IOS' | 'ANDROID' };

/** `PATCH /account` 의 요청 — 보낸 칸만 바꾼다(서버 결정 025 · 027 · 028, S10-2). 동의 · 오늘의 하늘은 알림 화면(계획 A8-2)과 홈의 알림 받기 권유가 보낸다 */
export type AccountPatch = {
  nickname?: string;
  avatar?: number;
  pushConsent?: boolean;
  marketingConsent?: boolean;
  todaySkyPush?: boolean;
  todaySkyTime?: string;
};

/** 오늘의 하늘 받는 시간의 꼴: "HH:mm" 24시간, 5분 단위(서버 S10-2 — 아니면 400 `INVALID_TODAY_SKY_TIME`) */
export const isTodaySkyTime = (v: unknown): v is string => typeof v === 'string' && /^([01]\d|2[0-3]):[0-5][05]$/.test(v);

/** 방향성 제시의 주제: 이성 · 미래(지금의 시기) · 궁합(궁합 한 건). 주제가 달라도 글의 모양은 같다 */
export const DIRECTION_TOPICS = ['LOVE', 'FUTURE', 'SYNASTRY'] as const;
export type DirectionTopic = (typeof DIRECTION_TOPICS)[number];

/**
 * 방향성 제시: 한 줄 제목과 해 볼 만한 것 3개. 항목의 title 은 실천 한 줄, basis 는 1개 이상이다
 * (이성 · 미래는 `Reading` 과 같은 말, 궁합은 `SynastryReport` 와 같은 내 쪽 요소의 말).
 */
export type Direction = {
  topic: DirectionTopic;
  title: string;
  items: { title: string; body: string; basis: string[] }[];
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

/** 시기 자세히(14-3)의 01 무엇이 달라지나요 · 02 이렇게 지내 보세요 · 03 이 시기가 지나면(서버 결정 033) */
export type TimingDetail = { changes: string; howTo: string; after: string };

/** 시기의 영역: 일 · 사람·인연 · 나 자신 · 돈(시각을 모르면 돈이 없다) */
export const LIFE_AREAS = ['PEOPLE', 'WORK', 'MONEY', 'SELF'] as const;
export type LifeArea = (typeof LIFE_AREAS)[number];

/**
 * 나에게만 오는 구간. CHANGE 변화 · OPPORTUNITY 기회 · FATED 운명적 만남(시각을 알 때만). size 는 CHANGE 에만 있다.
 * title 은 서버 표의 제목(이번 달 내내와 같은 말). 시기 풀이에서 모델이 쓴 구간(풀이를 만든 날에 걸쳐 있거나 10년 안에 시작)에만
 * 한 줄 summary · 자세히 detail · 작은 실천 셋 practices · 근거 reason(`NOW`)이 있다 — 나머지는 키가 없다(서버 결정 033).
 */
export type TimingInterval = {
  id: string;
  kind: 'CHANGE' | 'OPPORTUNITY' | 'FATED';
  from: string;
  to: string;
  area: LifeArea;
  size?: TimingSize;
  title: string;
  body: string;
  summary?: string;
  detail?: TimingDetail;
  practices?: { title: string }[];
  reason?: Reason;
};

/** 지금 나의 구간. 서버가 `GET /timing-report` 때마다 그날(date)로 만든다. 없는 값은 키가 없다 */
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
  /** 시기 풀이의 대표 구간(오늘 걸친 구간 가운데 서버가 고른 것, 서버 결정 033). 걸친 구간이 없으면 키가 없다 */
  mainId?: string;
};

/**
 * 시기 풀이(결정 049 · 050, 서버 결정 033): 옛 심층 리포트의 시기 모양에 모델이 쓴 칸 · 대표 구간이 더해진 것. milestones 는 언제나 넷이
 * 시간 순서로, intervals 는 시작 순서로 온다(서로 겹칠 수 있다). 지금(current)은 GET 할 때마다 그날로 붙는다.
 */
export type TimingReport = {
  /** false 면 상승점 · 중천 · 하우스 · 버텍스가 대상인 구간(운명적 만남 · 돈)이 빠져 있다 */
  timeKnown: boolean;
  milestones: TimingMilestone[];
  intervals: TimingInterval[];
  current: TimingCurrent;
};

/** `GET /timing-report`. 풀이는 DONE 일 때만 온다(지금 프로필의 차트 기준 — 출생 정보를 고치면 NONE) */
export type TimingReportState = { status: 'NONE' | 'WRITING' | 'FAILED' } | { status: 'DONE'; report: TimingReport };

/** `POST /timing-report` 의 응답(202). FAILED 는 뒤에서 일할 자리가 없어 시작하지 못했다는 뜻 */
export type TimingReportRequest = { status: 'WRITING' | 'DONE' | 'FAILED' };

/** 눈여겨볼 날 · 그날의 하늘의 칩: 사람 · 일 · 마음(서버 결정 032 · 034). 모르는 칩은 받아 두고 그리는 쪽이 그 줄을 숨긴다 */
export const DAY_CATEGORIES = ['PEOPLE', 'WORK', 'MIND'] as const;
export type DayCategory = (typeof DAY_CATEGORIES)[number];

/** "이번 달 내내" 한 줄: 그달에 걸친 시기 구간의 영역 · 표 제목 · 기간(그달 밖으로 이어질 수 있다) */
export type MonthTheme = { area: LifeArea | (string & {}); title: string; from: string; to: string };

/** 눈여겨볼 날 하나 = 달력의 점. reason 은 `{ when: DAY, items: [TRANSIT] }` */
export type MonthDay = { date: string; category: DayCategory | (string & {}); text: string; reason: Reason };

/**
 * 이번 달(`GET /timing/month`, 서버 결정 032): month 는 계산한 달(`YYYY-MM` — 앱은 처음 받은 달로 앞뒤 한 달을 정한다),
 * themes 0~2 · days 0~3(날짜 순). 서버가 요청 때 계산하고 저장하지 않는다(AI 없음).
 */
export type MonthSky = { month: string; timeKnown: boolean; themes: MonthTheme[]; days: MonthDay[] };

/**
 * 그날의 하늘(`POST /day-sky`, 서버 결정 034): 달력에서 누른 날(날짜 없으면 오늘 = 오늘의 하늘). 그날의 흐름 셋 · 이유(`DAY`) · 실천 셋.
 * 소유자 · 차트 · 날짜마다 한 번 만들어 서버가 저장한다 — 다시 열면 같은 글. createdAt 은 만든 때(UTC)
 */
export type DaySky = {
  date: string;
  title: string;
  category: DayCategory | (string & {});
  flow: { people: string; work: string; mind: string };
  reason: Reason;
  practices: { title: string }[];
  createdAt: string;
};

/** 알림함의 종류(결정 052 · 058, 서버 결정 035). 문구는 앱(`strings.notifications`)이 갖고 서버는 종류만 준다. 궁합 리포트는 1.0.0 앱이 숨긴다(결정 055) */
export const NOTIFICATION_KINDS = ['READING_DONE', 'ME_REPORT_DONE', 'TIMING_REPORT_DONE', 'SYNASTRY_REPORT_DONE', 'INQUIRY_ANSWERED'] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** 알림 한 줄. 모르는 종류도 받아 두고 알림함이 그 줄만 숨긴다. synastryId · inquiryId 는 그 종류일 때만 있다. createdAt 은 UTC ISO-8601 */
export type NotificationItem = {
  id: string;
  kind: NotificationKind | (string & {});
  createdAt: string;
  read: boolean;
  synastryId?: string;
  inquiryId?: string;
};

/** `GET /notifications`: 최근 30일 · 새것부터 · 100개까지. unread 는 30일 안의 안 읽은 수 */
export type NotificationList = { unread: number; items: NotificationItem[] };

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

/** 문의의 종류(결정 058, 서버 결정 039): 오류 · 제안 · 계정 · 기타. 옛 문의의 다른 값(READING · SYNASTRY · OTHER …)은 앱이 기타로 읽는다 */
export const INQUIRY_CATEGORIES = ['BUG', 'IDEA', 'ACCOUNT', 'ETC'] as const;
export type InquiryCategory = (typeof INQUIRY_CATEGORIES)[number];

/**
 * `POST /inquiries` 의 요청. body 는 앞뒤 공백을 뗀 10~1000자(유니코드 코드 포인트로 센다). 이메일 칸은 없다 —
 * `replyEmail` 키를 보내면 서버가 옛 앱으로 보고 옛 규칙을 쓰므로 싣지 않는다(서버 결정 039 의 2).
 */
export type InquiryInput = { category: InquiryCategory; body: string };

/**
 * `GET /inquiries` · `GET /inquiries/{id}` 의 한 건에서 앱이 쓰는 값(결정 058). 모르는 종류는 `ETC`. 답(answer)이 있으면 답한 문의다 —
 * 서버의 `status` 는 답이 있을 때만 `ANSWERED` 라 같은 뜻이고, 앱은 답의 유무로 본다. `emailed` 는 옛 앱이 이메일로 답을 받기로 한 문의
 * (서버가 `replyEmail` 을 준 것 — 이메일 글자는 앱이 들고 있지 않는다).
 */
export type InquiryItem = {
  id: string;
  category: InquiryCategory;
  body: string;
  createdAt: string;
  answer: { body: string; answeredAt: string } | null;
  emailed: boolean;
};

/** `POST /inquiries` 의 응답(201). 접수된 문의의 식별자 */
export type InquiryCreated = { id: string };

/** `GET /faqs` 의 한 줄(결정 028). 관리자가 적은 질문과 답. answer 는 그냥 글자이고 줄바꿈이 들어 있을 수 있다 */
export type Faq = { id: string; question: string; answer: string };

/**
 * `GET /app-config` 의 한 플랫폼 몫(결정 027). minVersion 은 점으로 나눈 숫자("1.2.0")이고 null 이면 아무도 막지 않는다.
 * latestVersion 은 최신 버전(결정 059) — 이보다 낮으면 한 번 업데이트를 권한다. 이 칸을 내기 전의 옛 서버 응답에는 없어 null 로 읽는다.
 * message 는 관리자가 적은 안내(그냥 글자). blockNow 는 서버가 426 으로 바로 거절할지의 스위치다(앱은 판정에 쓰지 않는다).
 */
export type PlatformConfig = {
  minVersion: string | null;
  latestVersion: string | null;
  storeUrl: string | null;
  message: string | null;
  blockNow: boolean;
};

/** 점검(결정 030). active 면 앱은 점검 안내만 보여 준다. message 는 관리자가 적은 안내(그냥 글자) */
export type Maintenance = { active: boolean; message: string | null };

/** maintenance 는 이 키를 내기 전의 옛 서버 응답에는 없다. 없으면 점검 중이 아닌 것으로 읽는다(결정 030) */
export type AppConfig = { ios: PlatformConfig; android: PlatformConfig; maintenance?: Maintenance };

/** 다음 변곡점 카드의 계절. 서버가 날짜를 해와 계절로 줄여서 준다(앱은 날짜를 받지 않는다) */
export const SEASONS = ['SPRING', 'SUMMER', 'AUTUMN', 'WINTER'] as const;
export type Season = (typeof SEASONS)[number];

/** 해 별자리(공유 v2 내 별명 카드의 `sunSign` — 차트 계약의 sign 과 같은 값) */
export const SIGNS = [
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
export type Sign = (typeof SIGNS)[number];

/**
 * 공유 카드(서버 결정 012 · 036). `kind` 로 가리는 여덟 모양이고 적힌 키가 전부다. 값이 없는 키는 오지 않는다.
 * 출생 정보 · 근거 · 본문은 어느 카드에도 없다. SCORE 의 names 는 [공유하는 사람, 상대] 순서,
 * RANKING 의 entries 는 1~3명이고 name 은 서버가 만든 이니셜이거나(기본) 적은 이름 그대로다.
 * 공유 v2 넷(NICKNAME · ME_AREA · DAY_SKY · NEXT_BIG, 결정 053)의 nickname 은 계정의 닉네임이고 옛 계정이라 없으면 키가 없다.
 * DAY_SKY 의 date 는 그 날(YYYY-MM-DD, 한국 날짜), NEXT_BIG 의 year · age 는 서버가 셈한 다음 큰 마디의 해와 만 나이다.
 */
export type ShareCard =
  | { kind: 'READING'; headline: string; keywords: [string, string, string] }
  | { kind: 'SCORE'; names: [string, string]; score: number; scoreLabel?: string; headline: string }
  | { kind: 'RANKING'; relation: Relation; entries: { name: string; score: number }[] }
  | { kind: 'NEXT_TURN'; year: number; season: Season; theme: string }
  | { kind: 'NICKNAME'; nickname?: string; sunSign: Sign; headline: string }
  | { kind: 'ME_AREA'; nickname?: string; area: MeArea; title: string }
  | { kind: 'DAY_SKY'; nickname?: string; date: string; title: string }
  | { kind: 'NEXT_BIG'; nickname?: string; year: number; age: number; title: string };

export type ShareKind = ShareCard['kind'];

/**
 * `POST /shares` 의 요청. myName 은 공유하는 사람을 부를 이름(1~20자), showNames 가 없으면 이니셜이다.
 * 옛 READING · NEXT_TURN 은 앱이 더 만들지 않는다(결정 053 의 6 — 옛 링크의 카드는 ShareCard 로 계속 읽는다).
 */
export type ShareRequest =
  | { kind: 'SCORE'; synastryId: string; myName: string }
  | { kind: 'RANKING'; relation: Relation; showNames?: boolean }
  | { kind: 'NICKNAME' }
  | { kind: 'ME_AREA'; area: MeArea }
  | { kind: 'DAY_SKY'; date: string }
  | { kind: 'NEXT_BIG' };

/** `POST /shares` 의 응답. card 는 `GET /shared/{shareId}` 가 주는 것과 같다 */
export type ShareCreated = { shareId: string; card: ShareCard };

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

const isHouseNumber = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 1 && (v as number) <= 12;
const isOptionalHouse = (v: unknown) => v === undefined || isHouseNumber(v);
const isNonEmptyText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** 아는 kind 는 제 필드가 계약의 모양이어야 한다. 모르는 kind 는 받는다(그 이유 줄만 숨긴다 — 결정 054 의 7) */
function isBasisItem(v: unknown): v is BasisItem {
  if (!isObject(v) || typeof v.kind !== 'string') return false;
  switch (v.kind) {
    case 'PLACEMENT':
      return isNonEmptyText(v.body) && isNonEmptyText(v.sign) && isOptionalHouse(v.house);
    case 'CLUSTER':
      return isHouseNumber(v.house) && Array.isArray(v.bodies) && v.bodies.length > 0 && v.bodies.every(isNonEmptyText);
    case 'ASPECT':
      return isNonEmptyText(v.a) && isNonEmptyText(v.b) && isNonEmptyText(v.type);
    case 'RULER':
      return isNonEmptyText(v.body) && isNonEmptyText(v.ruler);
    case 'TRANSIT':
      // 지나가는 별 × 내 별의 각도(target + type), 또는 지나가는 별 × 내 하우스(house)
      return (
        isNonEmptyText(v.mover) &&
        (v.target === undefined || isNonEmptyText(v.target)) &&
        (v.type === undefined || isNonEmptyText(v.type)) &&
        isOptionalHouse(v.house) &&
        ((v.target !== undefined && v.type !== undefined) || v.house !== undefined)
      );
    default:
      return true;
  }
}

/** 근거는 1~2개. 때(when)는 비지 않은 글자면 받는다 — 모르는 때는 그 이유 줄만 숨긴다(리뷰 #49) */
export function isReason(v: unknown): v is Reason {
  return (
    isObject(v) &&
    isNonEmptyText(v.when) &&
    Array.isArray(v.items) &&
    v.items.length >= 1 &&
    v.items.length <= 2 &&
    v.items.every(isBasisItem)
  );
}

/** 요약 해석 v2 의 보완점 수(서버 결정 030) */
const READING_CAUTIONS = 2;

/**
 * 요약 해석 v2: 문단마다 근거 구조(reason)가 있어야 받는다 — 옛 모양(근거 낱말만 · 보완점 3)으로 기기에 보관된 글은 여기서 걸러져
 * 다시 받는다(결정 048 의 8). 옛 근거 낱말(basis)은 서버 S⑦ 까지 함께 오고 그 뒤에 빠진다 — 있으면 낱말 목록이어야 한다.
 * 응답의 `shareId` 는 더 쓰지 않는 필드라 보지 않는다(서버 결정 012). 공유는 `POST /shares` 로 만든다.
 */
export function isReading(v: unknown): v is Reading {
  return (
    isObject(v) &&
    typeof v.headline === 'string' &&
    Array.isArray(v.sections) &&
    v.sections.every(
      (s) =>
        isObject(s) &&
        typeof s.title === 'string' &&
        typeof s.body === 'string' &&
        isReason(s.reason) &&
        (s.basis === undefined || isStringList(s.basis)),
    ) &&
    isStringList(v.strengths) &&
    isStringList(v.cautions) &&
    v.cautions.length === READING_CAUTIONS &&
    (v.createdAt === undefined || typeof v.createdAt === 'string')
  );
}

const isStar = (v: unknown): v is Star =>
  isObject(v) &&
  (v.body === undefined || isNonEmptyText(v.body)) &&
  (v.sign === undefined || isNonEmptyText(v.sign)) &&
  isOptionalHouse(v.house) &&
  (v.count === undefined || Number.isInteger(v.count));

const isTextList = (v: unknown, length: number) => Array.isArray(v) && v.length === length && v.every(isNonEmptyText);

/** 일 방식 막대의 값: 정수, 막대 위에 놓일 자리(0~100). 범위 10~90 은 서버의 몫이라 판정하지 않는다 */
const isBarValue = (v: unknown) => Number.isInteger(v) && (v as number) >= 0 && (v as number) <= 100;

/** 영역마다의 칸(키 이름)과 그 모양. 그 영역이 아니면 그 키가 없어야 한다 */
const ME_AREA_FIELDS: Record<MeArea, Record<string, (v: unknown) => boolean>> = {
  PERSONALITY: { glance: (v) => isObject(v) && isTextList(v.shining, 2) && isTextList(v.tiring, 2) },
  LOVE: {
    practices: (v) =>
      Array.isArray(v) && v.length === 3 && v.every((p) => isObject(p) && isNonEmptyText(p.title) && isNonEmptyText(p.body)),
    reason: isReason,
  },
  RELATIONSHIP: { closer: (v) => isObject(v) && isNonEmptyText(v.first) && isNonEmptyText(v.close) && isNonEmptyText(v.longtime) },
  WORK: { workStyle: (v) => isObject(v) && isBarValue(v.together) && isBarValue(v.flexible) && isBarValue(v.fast) },
  EMOTION: { shaken: (v) => isObject(v) && isNonEmptyText(v.when) && isNonEmptyText(v.comfort) },
};
const ME_EXTRA_KEYS = Object.values(ME_AREA_FIELDS).flatMap((fields) => Object.keys(fields));
/** 연애 말고 문단은 정확히 넷, 연애는 없다 */
const ME_PARAGRAPHS = 4;

function isMeAreaReport(v: unknown, area: MeArea): v is MeAreaReport {
  if (!isObject(v) || v.area !== area || !isNonEmptyText(v.title) || !isTextList(v.keywords, 3)) return false;
  if (!Array.isArray(v.stars) || v.stars.length < 1 || v.stars.length > 3 || !v.stars.every(isStar)) return false;
  const paragraphs = area === 'LOVE' ? 0 : ME_PARAGRAPHS;
  if (
    !Array.isArray(v.paragraphs) ||
    v.paragraphs.length !== paragraphs ||
    !v.paragraphs.every((p) => isObject(p) && isNonEmptyText(p.title) && isNonEmptyText(p.body) && isReason(p.reason))
  )
    return false;
  const own = ME_AREA_FIELDS[area];
  return ME_EXTRA_KEYS.every((key) => (key in own ? own[key](v[key]) : v[key] === undefined));
}

/** 다섯 영역이 계약의 순서대로 모두 있고, 영역마다 제 칸만 있어야 한다 */
export function isMeReport(v: unknown): v is MeReport {
  return (
    isObject(v) &&
    Array.isArray(v.areas) &&
    v.areas.length === ME_AREAS.length &&
    v.areas.every((a, i) => isMeAreaReport(a, ME_AREAS[i]))
  );
}

export function isMeReportState(v: unknown): v is MeReportState {
  if (!isObject(v)) return false;
  if (v.status === 'DONE') return isMeReport(v.report);
  return v.status === 'NONE' || v.status === 'WRITING' || v.status === 'FAILED';
}

const isMeReportRequest = (v: unknown): v is MeReportRequest =>
  isObject(v) && (v.status === 'WRITING' || v.status === 'DONE' || v.status === 'FAILED');

export function isMyAccount(v: unknown): v is MyAccount {
  return (
    isObject(v) &&
    (v.nickname === null || typeof v.nickname === 'string') &&
    // 계약은 1~8 이지만 모르는 번호여도 닉네임은 받는다 — 모르는 그림은 그리는 쪽이 숨긴다(isAvatarId)
    (v.avatar === null || (typeof v.avatar === 'number' && Number.isInteger(v.avatar))) &&
    (v.email === null || typeof v.email === 'string') &&
    typeof v.provider === 'string' &&
    typeof v.marketingConsent === 'boolean' &&
    (v.suspended === undefined || typeof v.suspended === 'boolean')
  );
}

const myAccountOf = (v: MyAccount): MyAccount => ({
  nickname: v.nickname,
  avatar: v.avatar,
  email: v.email,
  provider: v.provider,
  marketingConsent: v.marketingConsent,
  suspended: v.suspended === true,
  // 알림 칸은 꼴이 맞을 때만 둔다 — 없거나 틀리면 그 칸만 없는 것으로(홈 · 마이 · 정지 문이 같은 계정을 쓰니 계정 전체를 버리지 않는다, #59 리뷰)
  ...(typeof v.pushConsent === 'boolean' ? { pushConsent: v.pushConsent } : {}),
  ...(typeof v.todaySkyPush === 'boolean' && isTodaySkyTime(v.todaySkyTime) ? { todaySkyPush: v.todaySkyPush, todaySkyTime: v.todaySkyTime } : {}),
});

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

/** 시기 풀이의 실천 수(서버 결정 033 · 034 — 구간 · 그날 모두 셋) */
const PRACTICE_COUNT = 3;

const isPractices = (v: unknown) =>
  Array.isArray(v) && v.length === PRACTICE_COUNT && v.every((p) => isObject(p) && isNonEmptyText(p.title));

const isTimingDetail = (v: unknown) => isObject(v) && isNonEmptyText(v.changes) && isNonEmptyText(v.howTo) && isNonEmptyText(v.after);

/**
 * 크기는 변화 구간에만 있고 다른 종류에는 키가 없다. 모델이 쓴 칸(한 줄 · 자세히 · 실천 셋 · 근거)은 있으면 제 모양이어야 한다
 * (시기 풀이의 구간에만 있다 — 서버 결정 033)
 */
const isInterval = (v: unknown): v is TimingInterval =>
  isObject(v) &&
  typeof v.id === 'string' &&
  (v.kind === 'CHANGE' ? isSize(v.size) : (v.kind === 'OPPORTUNITY' || v.kind === 'FATED') && v.size === undefined) &&
  isDate(v.from) &&
  isDate(v.to) &&
  LIFE_AREAS.some((area) => area === v.area) &&
  typeof v.title === 'string' &&
  typeof v.body === 'string' &&
  (v.summary === undefined || isNonEmptyText(v.summary)) &&
  (v.detail === undefined || isTimingDetail(v.detail)) &&
  (v.practices === undefined || isPractices(v.practices)) &&
  (v.reason === undefined || isReason(v.reason));

const isTimingCurrent = (v: unknown): v is TimingCurrent =>
  isObject(v) &&
  isDate(v.date) &&
  Array.isArray(v.intervals) &&
  v.intervals.every(isInterval) &&
  (v.milestone === undefined || isMilestone(v.milestone)) &&
  (v.nextInterval === undefined || isInterval(v.nextInterval)) &&
  (v.nextMilestone === undefined || isMilestone(v.nextMilestone)) &&
  MILESTONE_KINDS.some((kind) => kind === v.nearestMilestone) &&
  (v.mainId === undefined || isNonEmptyText(v.mainId));

/** 변곡점은 계약의 순서대로 넷이 모두 있어야 한다(화면이 그 순서를 믿고 "첫 번째~네 번째" 로 그린다) */
const isTiming = (v: unknown): v is TimingReport =>
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
    DIRECTION_TOPICS.some((topic) => topic === v.topic) &&
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

/** 시기 풀이: 마디 넷이 계약의 순서대로 · 구간 · 지금(대표 구간은 있으면 글자) — 모델이 쓴 칸은 구간마다 isInterval 이 본다 */
export const isTimingReport = (v: unknown): v is TimingReport => isTiming(v);

export function isTimingReportState(v: unknown): v is TimingReportState {
  if (!isObject(v)) return false;
  if (v.status === 'DONE') return isTimingReport(v.report);
  return v.status === 'NONE' || v.status === 'WRITING' || v.status === 'FAILED';
}

const isTimingReportRequest = (v: unknown): v is TimingReportRequest =>
  isObject(v) && (v.status === 'WRITING' || v.status === 'DONE' || v.status === 'FAILED');

const isMonth = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** 영역 · 칩은 비지 않은 글자면 받는다 — 모르는 것은 그리는 쪽이 그 줄만 숨긴다(계획 "전역 제약") */
const isMonthTheme = (v: unknown) =>
  isObject(v) && isNonEmptyText(v.area) && isNonEmptyText(v.title) && isDate(v.from) && isDate(v.to);

const isMonthDay = (v: unknown) =>
  isObject(v) && isDate(v.date) && isNonEmptyText(v.category) && isNonEmptyText(v.text) && isReason(v.reason);

export function isMonthSky(v: unknown): v is MonthSky {
  return (
    isObject(v) &&
    isMonth(v.month) &&
    typeof v.timeKnown === 'boolean' &&
    Array.isArray(v.themes) &&
    v.themes.every(isMonthTheme) &&
    Array.isArray(v.days) &&
    v.days.every(isMonthDay)
  );
}

export function isDaySky(v: unknown): v is DaySky {
  return (
    isObject(v) &&
    isDate(v.date) &&
    isNonEmptyText(v.title) &&
    isNonEmptyText(v.category) &&
    isObject(v.flow) &&
    isNonEmptyText(v.flow.people) &&
    isNonEmptyText(v.flow.work) &&
    isNonEmptyText(v.flow.mind) &&
    isReason(v.reason) &&
    isPractices(v.practices) &&
    typeof v.createdAt === 'string'
  );
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

/** 네 영역이 계약의 순서대로 모두 있고, 영역마다 문단이 하나 이상 있어야 한다 */
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

/** 종류마다 제 필드가 모두 계약의 모양이어야 한다. 계약에 없는 필드는 보지 않는다(화면도 그리지 않는다) */
export function isShareCard(v: unknown): v is ShareCard {
  if (!isObject(v)) return false;
  switch (v.kind) {
    case 'READING':
      return isText(v.headline) && isKeywords(v.keywords);
    case 'SCORE':
      return (
        isStringList(v.names) &&
        v.names.length === 2 &&
        typeof v.score === 'number' &&
        isOptionalString(v.scoreLabel) &&
        typeof v.headline === 'string'
      );
    case 'RANKING':
      return (
        RELATIONS.some((r) => r === v.relation) &&
        Array.isArray(v.entries) &&
        v.entries.length >= 1 &&
        v.entries.length <= 3 &&
        v.entries.every((e) => isObject(e) && typeof e.name === 'string' && typeof e.score === 'number')
      );
    case 'NEXT_TURN':
      return Number.isInteger(v.year) && SEASONS.some((season) => season === v.season) && isText(v.theme);
    case 'NICKNAME':
      return isOptionalNickname(v.nickname) && SIGNS.some((sign) => sign === v.sunSign) && isText(v.headline);
    case 'ME_AREA':
      return isOptionalNickname(v.nickname) && ME_AREAS.some((area) => area === v.area) && isText(v.title);
    case 'DAY_SKY':
      return isOptionalNickname(v.nickname) && typeof v.date === 'string' && ISO_DATE.test(v.date) && isText(v.title);
    case 'NEXT_BIG':
      return (
        isOptionalNickname(v.nickname) &&
        Number.isInteger(v.year) &&
        Number.isInteger(v.age) &&
        (v.age as number) >= 0 &&
        isText(v.title)
      );
    default:
      return false;
  }
}

/** 공유 v2 카드의 닉네임: 없으면 키가 없고(옛 계정), 있으면 빈 글자가 아니다 */
const isOptionalNickname = (v: unknown) => v === undefined || isText(v);
/** 그날의 하늘 카드의 날짜 꼴(YYYY-MM-DD) */
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const isShareCreated = (v: unknown): v is ShareCreated => isObject(v) && isText(v.shareId) && isShareCard(v.card);

/** `POST /shares` 의 본문. 그 종류의 계약에 있는 값만 싣는다 */
const shareBody = (input: ShareRequest) => {
  switch (input.kind) {
    case 'SCORE':
      return { kind: input.kind, synastryId: input.synastryId, myName: input.myName };
    case 'RANKING':
      return { kind: input.kind, relation: input.relation, showNames: input.showNames === true };
    case 'ME_AREA':
      return { kind: input.kind, area: input.area };
    case 'DAY_SKY':
      return { kind: input.kind, date: input.date };
    default:
      return { kind: input.kind };
  }
};

/** 가짜 서버의 공유 식별자. 카드 예시(fixtures.shareCards)의 키마다 하나다 */
const FIXTURE_SHARE_PREFIX = 'fixture-share-';

/** 가짜 서버가 만드는 공유. 예시 카드에 받은 이름과 관계만 바꿔 넣는다 */
function fixtureShare(input: ShareRequest): ShareCreated {
  const C = fixtures.shareCards;
  switch (input.kind) {
    case 'SCORE':
      return {
        shareId: `${FIXTURE_SHARE_PREFIX}score`,
        card: { ...C.score, names: [input.myName, C.score.names[1]] },
      };
    case 'RANKING': {
      const key = input.showNames ? 'rankingNames' : 'ranking';
      return { shareId: `${FIXTURE_SHARE_PREFIX}${key}`, card: { ...C[key], relation: input.relation } };
    }
    case 'NICKNAME':
      return { shareId: `${FIXTURE_SHARE_PREFIX}nickname`, card: C.nickname };
    case 'ME_AREA': {
      // 서버와 같은 규칙: 연애는 영역 제목, 나머지는 첫 문단 제목(예시 나 탭 풀이에서)
      const area = fixtures.meReport.areas.find((a) => a.area === input.area);
      const title = (input.area === 'LOVE' ? area?.title : area?.paragraphs[0]?.title) ?? C.meArea.title;
      return { shareId: `${FIXTURE_SHARE_PREFIX}meArea`, card: { ...C.meArea, area: input.area, title } };
    }
    case 'DAY_SKY':
      return { shareId: `${FIXTURE_SHARE_PREFIX}daySky`, card: { ...C.daySky, date: input.date } };
    case 'NEXT_BIG':
      return { shareId: `${FIXTURE_SHARE_PREFIX}nextBig`, card: C.nextBig };
  }
}

/** 상대의 출생 정보를 요청 본문으로. placeId 는 시각이 있을 때만 싣는다(시각 "모름" 이면 키를 보내지 않는다) */
const partnerBirthBody = (birth: BirthInput) => ({
  date: birth.date,
  time: birth.time,
  ...(birth.time !== null && birth.placeId !== null ? { placeId: birth.placeId } : {}),
});

/** 요청한 주제의 글일 때만 받는다. 다른 주제의 글이 오면 계약과 다른 응답이다 */
const isDirectionOf =
  (topic: DirectionTopic) =>
  (v: unknown): v is Direction =>
    isDirection(v) && v.topic === topic;

const isInquiryCreated = (v: unknown): v is InquiryCreated => isObject(v) && isText(v.id);

/** 서버의 한 건(값이 없는 키는 빠져 온다 — answer · replyEmail) */
type InquiryItemWire = {
  id: string;
  category: string;
  body: string;
  status: string;
  createdAt: string;
  answer?: { body: string; answeredAt: string };
  replyEmail?: string | null;
};

const isInquiryItemWire = (v: unknown): v is InquiryItemWire =>
  isObject(v) &&
  isText(v.id) &&
  typeof v.category === 'string' &&
  typeof v.body === 'string' &&
  typeof v.status === 'string' &&
  isText(v.createdAt) &&
  (v.answer === undefined || (isObject(v.answer) && typeof v.answer.body === 'string' && isText(v.answer.answeredAt))) &&
  (v.replyEmail === undefined || v.replyEmail === null || typeof v.replyEmail === 'string');

const isInquiryList = (v: unknown): v is InquiryItemWire[] => Array.isArray(v) && v.every(isInquiryItemWire);

const isInquiryCategory = (v: string): v is InquiryCategory => INQUIRY_CATEGORIES.some((c) => c === v);

/** 앱이 쓰는 모양으로: 모르는 종류는 기타, 답이 없으면 null, 이메일 글자는 버리고 있었는지만 */
const inquiryItemOf = (v: InquiryItemWire): InquiryItem => ({
  id: v.id,
  category: isInquiryCategory(v.category) ? v.category : 'ETC',
  body: v.body,
  createdAt: v.createdAt,
  answer: v.answer ? { body: v.answer.body, answeredAt: v.answer.answeredAt } : null,
  emailed: typeof v.replyEmail === 'string' && v.replyEmail.length > 0,
});

const isOptionalText = (v: unknown) => v === undefined || isText(v);

const isNotificationItem = (v: unknown): v is NotificationItem =>
  isObject(v) &&
  isText(v.id) &&
  isText(v.kind) &&
  isText(v.createdAt) &&
  typeof v.read === 'boolean' &&
  isOptionalText(v.synastryId) &&
  isOptionalText(v.inquiryId);

/** 알림함: 안 읽은 수(0 이상 정수)와 줄. 종류는 비지 않은 글자면 받는다 — 모르는 종류는 알림함이 그 줄만 숨긴다(계획 "전역 제약") */
export function isNotificationList(v: unknown): v is NotificationList {
  return (
    isObject(v) &&
    Number.isInteger(v.unread) &&
    (v.unread as number) >= 0 &&
    Array.isArray(v.items) &&
    v.items.every(isNotificationItem)
  );
}

/** 하나라도 어긋나면 목록 전체를 받지 않는다. 계약에 없는 필드는 보지 않는다 */
export function isFaqList(v: unknown): v is Faq[] {
  return (
    Array.isArray(v) &&
    v.every((item) => isObject(item) && isText(item.id) && isText(item.question) && isText(item.answer))
  );
}

const isNullableString = (v: unknown): v is string | null => typeof v === 'string' || v === null;

/** 서버가 보내는 한 플랫폼 몫: latestVersion 은 옛 서버 응답에 없을 수 있다(결정 059). getAppConfig 가 null 로 채운다 */
type PlatformConfigBody = Omit<PlatformConfig, 'latestVersion'> & { latestVersion?: string | null };
type AppConfigBody = Omit<AppConfig, 'ios' | 'android'> & { ios: PlatformConfigBody; android: PlatformConfigBody };

const isPlatformConfig = (v: unknown): v is PlatformConfigBody =>
  isObject(v) &&
  isNullableString(v.minVersion) &&
  (v.latestVersion === undefined || isNullableString(v.latestVersion)) &&
  isNullableString(v.storeUrl) &&
  isNullableString(v.message) &&
  typeof v.blockNow === 'boolean';

const isMaintenance = (v: unknown): v is Maintenance =>
  isObject(v) && typeof v.active === 'boolean' && isNullableString(v.message);

/** maintenance · latestVersion 은 키가 없을 때만 넘어간다. 있는데 모양이 다르면 응답 전체를 받지 않는다 */
export function isAppConfig(v: unknown): v is AppConfigBody {
  return (
    isObject(v) &&
    isPlatformConfig(v.ios) &&
    isPlatformConfig(v.android) &&
    (v.maintenance === undefined || isMaintenance(v.maintenance))
  );
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** 세션 토큰이 든 응답(`POST /auth/dev` · `POST /auth/signup`). 쿠키 세션(웹)이면 토큰이 없어도 된다 */
const isSessionBody =
  (cookie: boolean) =>
  (v: unknown): v is { token?: string } =>
    isObject(v) && (isNonEmptyString(v.token) || (cookie && v.token === undefined));

type LoginBody = { status: 'SIGNED_IN'; token?: string } | { status: 'SIGNUP_REQUIRED'; signupToken: string; expiresAt?: unknown };

const isLoginBody =
  (cookie: boolean) =>
  (v: unknown): v is LoginBody =>
    isObject(v) &&
    ((v.status === 'SIGNED_IN' && (isNonEmptyString(v.token) || (cookie && v.token === undefined))) ||
      (v.status === 'SIGNUP_REQUIRED' && isNonEmptyString(v.signupToken)));

const isNicknameAvailability = (v: unknown): v is NicknameAvailability => isObject(v) && typeof v.available === 'boolean';

/** 본문이 없는 성공(204) */
const isEmpty = (v: unknown): v is null => v === null;

/** `GET /auth/analytics-id` 의 응답. 분석용 id 는 서버가 계정 id 로 만든 되돌릴 수 없는 값이다(결정 040 · 081) */
export type AnalyticsIdResult = { analyticsId: string };
const isAnalyticsId = (v: unknown): v is AnalyticsIdResult => isObject(v) && typeof v.analyticsId === 'string';

/** `PUT /profile` · `GET /profile` 의 응답. 보낸 것과 같은 모양이다. time 이 null 이면 placeId 는 null 이거나 없다(결정 020) */
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
  /** 서버가 503 `MAINTENANCE` 로 거절했을 때 부른다(결정 030) */
  onMaintenance?: () => void;
  /** 서버가 403 `ACCOUNT_SUSPENDED` 로 거절했을 때 부른다(이용 정지 — 결정 065 의 5, 서버 결정 044) */
  onSuspended?: () => void;
  /**
   * 웹이면 true: 세션은 서버의 httpOnly 쿠키 `bm_session` 이다(결정 034). 모든 요청에 쿠키를 싣고(`credentials: 'include'`),
   * Authorization 헤더를 붙이지 않으며, 로그인 · 가입 · 개발용 로그인에 `cookie: true` 를 보내고 받은 토큰을 버린다.
   */
  cookieSession?: boolean;
};

type RequestOptions<T> = {
  body?: unknown;
  validate: (v: unknown) => v is T;
  /** false 면 세션 헤더를 붙이지 않고 401 에도 세션을 다시 받지 않는다(`GET /places`·`POST /auth/dev`·`GET /app-config`·`GET /faqs`·`GET /shared/…`) */
  auth?: boolean;
};

/** `{ error }` 로 오는 이름: 이 버전의 앱은 더 받지 않는다(상태 426) */
const UPDATE_REQUIRED = 'UPDATE_REQUIRED';

/** `{ error }` 로 오는 이름: 점검 중이다(상태 503). `/app-config` 를 뺀 모든 주소가 이렇게 답한다 */
const MAINTENANCE = 'MAINTENANCE';
/** 이용이 정지된 계정의 거절 이름(서버 결정 044) — 문의 · 계정 보기 · 로그아웃 · 계정 삭제 말고는 모두 이 403 이다 */
const ACCOUNT_SUSPENDED = 'ACCOUNT_SUSPENDED';

/** 가짜 서버의 설정. 아무도 막지 않는다 */
const FIXTURE_PLATFORM_CONFIG: PlatformConfig = {
  minVersion: null,
  latestVersion: null,
  storeUrl: null,
  message: null,
  blockNow: false,
};

/** 가짜 서버가 주는 세션 토큰 */
const FIXTURE_TOKEN = 'fixture-session';

/** 모의 서버(`useFixtures`)의 내 계정 */
const FIXTURE_MY_ACCOUNT: MyAccount = {
  nickname: '새벽별',
  avatar: 3,
  email: 'dawnstar@kakao.com',
  provider: 'KAKAO',
  marketingConsent: false,
  suspended: false,
  pushConsent: true,
  todaySkyPush: true,
  todaySkyTime: '08:00',
};

export function createApi(config: ApiConfig) {
  /**
   * 실패한 호출을 스스로 다시 하지 않는다. 다시 시도는 화면에서 사용자가 누를 때만 한다.
   * 예외 하나: 401 이면 세션을 한 번 다시 받고 같은 호출을 한 번만 더 한다(retried 가 그 표시다).
   */
  const cookie = config.cookieSession === true;

  async function request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    path: string,
    options: RequestOptions<T>,
    retried = false,
  ): Promise<ApiResult<T>> {
    const auth = options.auth !== false;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    const token = auth && !cookie ? config.getToken() : null;
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
        ...(cookie ? { credentials: 'include' as const } : {}),
      });
    } catch {
      return { ok: false, error: 'NETWORK' };
    }

    const { status } = response;
    if (status === 401) {
      if (auth && !retried && config.refreshSession && (await config.refreshSession()))
        return request(method, path, options, true);
      // 로그인 · 가입의 401 은 이름(`INVALID_ID_TOKEN` · `SIGNUP_EXPIRED` 등)으로 갈린다.
      const body: unknown = await response.json().catch(() => null);
      const code = isObject(body) && typeof body.error === 'string' ? { code: body.error } : {};
      return { ok: false, error: 'LOGIN_REQUIRED', status, ...code };
    }
    if (status === 429) return { ok: false, error: 'LIMIT', status };
    if (!response.ok) {
      // 오류 본문 `{ error }` 의 이름만 읽는다. 본문이 없거나 모양이 달라도 결과는 같다.
      const body: unknown = await response.json().catch(() => null);
      const code = isObject(body) && typeof body.error === 'string' ? { code: body.error } : {};
      if (status === 426 && code.code === UPDATE_REQUIRED) config.onUpdateRequired?.();
      if (status === 503 && code.code === MAINTENANCE) config.onMaintenance?.();
      if (status === 403 && code.code === ACCOUNT_SUSPENDED) config.onSuspended?.();
      return { ok: false, error: 'SERVER', status, ...code };
    }

    // 204 는 본문이 없으니 읽지 않는다(`DELETE /account` · `DELETE /synastry/{id}`).
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

    /** `GET /app-config` 플랫폼별 최소 · 최신 버전 · 스토어 주소 · 안내(결정 027 · 059)와 점검 여부(결정 030). 세션이 필요 없다 */
    async getAppConfig(): Promise<ApiResult<AppConfig>> {
      if (config.useFixtures)
        return {
          ok: true,
          data: {
            ios: FIXTURE_PLATFORM_CONFIG,
            android: FIXTURE_PLATFORM_CONFIG,
            maintenance: { active: false, message: null },
          },
        };
      const res = await request('GET', '/app-config', { validate: isAppConfig, auth: false });
      if (!res.ok) return res;
      const withLatest = (p: PlatformConfigBody): PlatformConfig => ({ ...p, latestVersion: p.latestVersion ?? null });
      return { ok: true, data: { ...res.data, ios: withLatest(res.data.ios), android: withLatest(res.data.android) } };
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

    /** `POST /auth/dev` 개발용 세션을 받는다. 서버가 개발용 로그인을 꺼 두었으면 404 다. 웹은 쿠키로 받는다 */
    async createDevSession(): Promise<ApiResult<DevSession>> {
      if (config.useFixtures) return { ok: true, data: { token: FIXTURE_TOKEN } };
      const r = await request('POST', '/auth/dev', {
        body: cookie ? { cookie: true } : undefined,
        validate: isSessionBody(cookie),
        auth: false,
      });
      return r.ok ? { ok: true, data: { token: cookie ? null : (r.data.token ?? null) } } : r;
    },

    /**
     * `POST /auth/login` 공급자 자격 증명으로 로그인한다(결정 034). 계정이 있으면 세션, 처음 온 사람은 가입권.
     * 틀린 자격 증명은 401 `INVALID_ID_TOKEN` · `INVALID_CODE`, 공급자에 닿지 못하면 502 `PROVIDER_UNAVAILABLE` 이 code 로 온다.
     */
    async login(credential: ProviderCredential): Promise<ApiResult<LoginResult>> {
      if (config.useFixtures) return { ok: true, data: { status: 'SIGNED_IN', token: FIXTURE_TOKEN } };
      const r = await request('POST', '/auth/login', {
        body: cookie ? { ...credential, cookie: true } : credential,
        validate: isLoginBody(cookie),
        auth: false,
      });
      if (!r.ok) return r;
      if (r.data.status === 'SIGNUP_REQUIRED') {
        // 가입권이 끝나는 때 — 이어 하기의 보관 수명(min(30분, expiresAt), 결정 068). 읽을 수 없으면 버린다
        const expiresAt = typeof r.data.expiresAt === 'string' ? Date.parse(r.data.expiresAt) : NaN;
        return {
          ok: true,
          data: { status: 'SIGNUP_REQUIRED', signupToken: r.data.signupToken, ...(Number.isFinite(expiresAt) ? { expiresAt } : {}) },
        };
      }
      return { ok: true, data: { status: 'SIGNED_IN', token: cookie ? null : (r.data.token ?? null) } };
    },

    /**
     * `POST /auth/signup` 가입권 · 출생 정보 · 가입 단계의 값(닉네임 · 프로필 · 약관 버전 · 동의, 결정 042)으로 가입한다. 만 14세 판정은 서버가 한다.
     * 오류(code): 가입권이 없거나 만료 401 `SIGNUP_EXPIRED` · 약관 400 `TERMS_REQUIRED` · 닉네임 400 `INVALID_NICKNAME` · 프로필 400 `INVALID_AVATAR` ·
     * 출생 정보 `POST /charts` 와 같은 400 · 만 14세 미만 403 `UNDER_AGE`(가입권을 지운다) · 닉네임 중복 409 `NICKNAME_TAKEN`. 400 · 409 는 가입권이 남는다.
     */
    async signup(signupToken: string, birth: BirthInput, extra: SignupExtra): Promise<ApiResult<SignupResult>> {
      if (config.useFixtures) return { ok: true, data: { token: FIXTURE_TOKEN } };
      const body = {
        signupToken,
        date: birth.date,
        time: birth.time,
        placeId: birth.placeId,
        nickname: extra.nickname,
        avatar: extra.avatar,
        termsVersion: extra.termsVersion,
        privacyVersion: extra.privacyVersion,
        pushConsent: extra.pushConsent,
        marketingConsent: extra.marketingConsent,
      };
      const r = await request('POST', '/auth/signup', {
        body: cookie ? { ...body, cookie: true } : body,
        validate: isSessionBody(cookie),
        auth: false,
      });
      return r.ok ? { ok: true, data: { token: cookie ? null : (r.data.token ?? null) } } : r;
    },

    /**
     * `POST /auth/nickname-check` 가입권으로 닉네임을 쓸 수 있는지 묻는다(결정 042). 가입 단계의 "다음" 에서 한 번만 부른다.
     * 규칙에 어긋나면 400 `INVALID_NICKNAME`, 가입권이 없거나 만료면 401 `SIGNUP_EXPIRED` 가 code 로 온다. 세션 헤더는 붙이지 않는다.
     */
    async checkNickname(signupToken: string, nickname: string): Promise<ApiResult<NicknameAvailability>> {
      if (config.useFixtures) return { ok: true, data: { available: true } };
      return request('POST', '/auth/nickname-check', {
        body: { signupToken, nickname },
        validate: isNicknameAvailability,
        auth: false,
      });
    },

    /**
     * `GET /account/nickname-check?nickname=` 마이 › 닉네임 바꾸기에서 그 닉네임을 쓸 수 있는지(서버 결정 051, 가입 중 확인과 같은 규칙 —
     * 내 지금 닉네임이면 true). 틀리거나 비면 400 `INVALID_NICKNAME` 이 code 로 온다. 저장은 그대로 `PATCH /account`(그사이 가져가면 409)
     */
    async checkMyNickname(nickname: string): Promise<ApiResult<NicknameAvailability>> {
      if (config.useFixtures) return { ok: true, data: { available: true } };
      return request('GET', `/account/nickname-check?nickname=${encodeURIComponent(nickname)}`, { validate: isNicknameAvailability });
    },

    /** `GET /auth/session` 세션이 살아 있는지(204). 웹이 켜질 때 쿠키 세션을 확인한다 */
    async getSession(): Promise<ApiResult<null>> {
      if (config.useFixtures) return { ok: true, data: null };
      return request('GET', '/auth/session', { validate: isEmpty });
    },

    /** `GET /auth/analytics-id` 분석 도구에 보낼 사용자 id(결정 081). 앰플리튜드 키가 있을 때(운영)만 부른다 */
    async getAnalyticsId(): Promise<ApiResult<AnalyticsIdResult>> {
      if (config.useFixtures) return { ok: true, data: { analyticsId: '0'.repeat(32) } };
      return request('GET', '/auth/analytics-id', { validate: isAnalyticsId });
    },

    /** `DELETE /auth/session` 로그아웃. 이 기기의 세션만 지운다(웹은 쿠키도) */
    async logout(): Promise<ApiResult<null>> {
      if (config.useFixtures) return { ok: true, data: null };
      return request('DELETE', '/auth/session', { validate: isEmpty });
    },

    /** `PUT /profile` 출생 정보를 서버에 저장한다. 요약 해석은 서버가 이 값으로 쓴다 */
    async saveProfile(input: BirthInput): Promise<ApiResult<BirthInput>> {
      if (config.useFixtures) return { ok: true, data: input };
      return request('PUT', '/profile', { body: input, validate: isBirthInput });
    },

    /**
     * `GET /profile` 서버에 저장된 내 출생 정보(결정 029). 없으면 404 `NO_PROFILE` 이 code 로 온다.
     * 가짜 서버는 저장된 것이 없다고 답한다(기기가 비어 있을 때 되살리지 않고 입력부터 받는다).
     */
    async getProfile(): Promise<ApiResult<BirthInput>> {
      if (config.useFixtures) return { ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' };
      return request('GET', '/profile', { validate: isBirthInput });
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
     * `POST /directions` 의 궁합 주제: 직접 입력 궁합 한 건(`synastryId`)에 대한 글. birth 는 상대의 출생 정보이고
     * 그 궁합의 글을 처음 만들 때만 필요하다(서버에 없어 다시 보낸다). 글이 없는데 보내지 않으면 400 `BIRTH_REQUIRED`,
     * 그 궁합의 상대가 아니면 400 `BIRTH_MISMATCH`, 내 출생 정보가 바뀌었으면 409 `PROFILE_CHANGED` 가 code 로 온다.
     */
    async createSynastryDirection(synastryId: string, birth?: BirthInput): Promise<ApiResult<Direction>> {
      if (config.useFixtures) return { ok: true, data: fixtures.directionSynastry };
      return request('POST', '/directions', {
        body: { topic: 'SYNASTRY', synastryId, ...(birth ? partnerBirthBody(birth) : {}) },
        validate: isDirectionOf('SYNASTRY'),
      });
    },

    /** `POST /me-report` 나 탭 풀이를 쓰기 시작한다(결정 048). 202 로 바로 답하고 글은 뒤에서 쓴다. 402 `PURCHASE_REQUIRED` 는 1.1.0 예약 */
    async requestMeReport(): Promise<ApiResult<MeReportRequest>> {
      if (config.useFixtures) return { ok: true, data: { status: 'DONE' } };
      return request('POST', '/me-report', { validate: isMeReportRequest });
    },

    /** `GET /me-report` 나 탭 풀이의 상태와(DONE 이면) 글 */
    async getMeReport(): Promise<ApiResult<MeReportState>> {
      if (config.useFixtures) return { ok: true, data: { status: 'DONE', report: fixtures.meReport } };
      return request('GET', '/me-report', { validate: isMeReportState });
    },

    /**
     * `GET /timing/month` 이번 달(결정 049 의 2). month(`YYYY-MM`)가 없으면 서버의 이번 달이다. 앞뒤 한 달 밖이면 400 `MONTH_OUT_OF_RANGE`,
     * 서버에 출생 정보가 없으면 404 `NO_PROFILE`. 모의 서버는 예시의 달이 아니면 눈여겨볼 날 없이 그 달로 답한다
     */
    async getMonth(month?: string): Promise<ApiResult<MonthSky>> {
      if (config.useFixtures)
        return {
          ok: true,
          data: !month || month === fixtures.monthSky.month ? fixtures.monthSky : { ...fixtures.monthSky, month, days: [] },
        };
      return request('GET', month ? `/timing/month?month=${encodeURIComponent(month)}` : '/timing/month', { validate: isMonthSky });
    },

    /** `POST /timing-report` 시기 풀이를 쓰기 시작한다(결정 049 의 7). 202 로 바로 답하고 글은 뒤에서 쓴다. 402 `PURCHASE_REQUIRED` 는 1.1.0 예약 */
    async requestTimingReport(): Promise<ApiResult<TimingReportRequest>> {
      if (config.useFixtures) return { ok: true, data: { status: 'DONE' } };
      return request('POST', '/timing-report', { validate: isTimingReportRequest });
    },

    /** `GET /timing-report` 시기 풀이의 상태와(DONE 이면) 글. 지금(current) · 대표 구간은 부를 때마다 서버의 오늘로 붙는다 */
    async getTimingReport(): Promise<ApiResult<TimingReportState>> {
      if (config.useFixtures) return { ok: true, data: { status: 'DONE', report: fixtures.timingReport } };
      return request('GET', '/timing-report', { validate: isTimingReportState });
    },

    /**
     * `POST /day-sky` 그날의 하늘(결정 049 의 6). date 가 없으면 본문 없이 = 오늘의 하늘. 처음 만들 때는 수십 초가 걸릴 수 있고(동기 응답),
     * 새로 만들어야 할 때 생성 한도를 넘으면 429, 못 쓰면 502 `GENERATION_FAILED`(다시 보내면 된다)
     */
    async postDaySky(date?: string): Promise<ApiResult<DaySky>> {
      if (config.useFixtures) return { ok: true, data: date ? { ...fixtures.daySky, date } : fixtures.daySky };
      return request('POST', '/day-sky', { ...(date ? { body: { date } } : {}), validate: isDaySky });
    },

    /** `GET /account` 내 계정 — 홈 별명 카드(닉네임 · 프로필, 결정 047)와 마이 · 계정 화면(결정 056)이 함께 쓴다. 동의 일시는 버리고, 알림 칸(푸시 동의 · 오늘의 하늘)은 꼴이 맞을 때만 둔다 */
    async getMyAccount(): Promise<ApiResult<MyAccount>> {
      if (config.useFixtures) return { ok: true, data: FIXTURE_MY_ACCOUNT };
      const res = await request('GET', '/account', { validate: isMyAccount });
      if (!res.ok) return res;
      // 정지된 계정에도 이 경로는 200 이다 — 403 대신 이 값으로 정지를 알린다(서버 결정 044)
      if (res.data.suspended === true) config.onSuspended?.();
      return { ok: true, data: myAccountOf(res.data) };
    },

    /**
     * `PATCH /account` 닉네임 · 프로필 · 동의 · 오늘의 하늘을 바꾼다(보낸 칸만). 400 `INVALID_NICKNAME` · `INVALID_AVATAR` ·
     * `INVALID_TODAY_SKY_TIME`, 409 `NICKNAME_TAKEN` 은 code 로 온다 — 그때는 같이 보낸 칸도 바뀌지 않는다.
     */
    async updateAccount(patch: AccountPatch): Promise<ApiResult<MyAccount>> {
      if (config.useFixtures) return { ok: true, data: { ...FIXTURE_MY_ACCOUNT, ...patch } };
      const res = await request('PATCH', '/account', { body: patch, validate: isMyAccount });
      return res.ok ? { ok: true, data: myAccountOf(res.data) } : res;
    },

    /**
     * `POST /push/devices` 이 기기의 Expo 푸시 토큰을 내 계정에 등록한다(서버 S10-2). 같은 토큰이면 계정 · 시각만 갱신. 성공은 204.
     * 400 `INVALID_PUSH_TOKEN` · `INVALID_PLATFORM` 은 code 로 온다.
     */
    async registerPushDevice(device: PushDevice): Promise<ApiResult<null>> {
      if (config.useFixtures) return { ok: true, data: null };
      return request('POST', '/push/devices', { body: device, validate: (v): v is null => v === null });
    },

    /** `DELETE /push/devices/{토큰}` 로그아웃 때 이 기기 등록을 지운다(정지 중에도 된다). 성공은 204, 남의 것 · 없는 것은 404 */
    async deletePushDevice(expoToken: string): Promise<ApiResult<null>> {
      if (config.useFixtures) return { ok: true, data: null };
      return request('DELETE', `/push/devices/${encodeURIComponent(expoToken)}`, { validate: (v): v is null => v === null });
    },

    /** `DELETE /account` 계정과 그 사람의 모든 것(세션 · 출생 정보 · 글)을 서버에서 지운다. 성공은 204 이고 본문이 없다 */
    async deleteAccount(): Promise<ApiResult<null>> {
      if (config.useFixtures) return { ok: true, data: null };
      return request('DELETE', '/account', { validate: (v): v is null => v === null });
    },

    /**
     * `POST /inquiries` 문의를 보낸다(결정 058). 400 은 code 로 온다(`INVALID_REQUEST` · `INVALID_CATEGORY` · `INVALID_BODY`).
     * 한 계정에 한 시간 5번을 넘으면 429(LIMIT)다. 내용은 어디에도 남기지 않는다.
     */
    async createInquiry(input: InquiryInput): Promise<ApiResult<InquiryCreated>> {
      if (config.useFixtures) return { ok: true, data: { id: 'fixture-inquiry' } };
      return request('POST', '/inquiries', {
        body: { category: input.category, body: input.body },
        validate: isInquiryCreated,
      });
    },

    /** `GET /inquiries` 내 문의 전부, 새것부터(서버 순서 그대로). 없으면 빈 목록. 한 줄이라도 모양이 틀리면 INVALID */
    async getInquiries(): Promise<ApiResult<InquiryItem[]>> {
      if (config.useFixtures) return { ok: true, data: fixtures.inquiries };
      const res = await request('GET', '/inquiries', { validate: isInquiryList });
      return res.ok ? { ok: true, data: res.data.map(inquiryItemOf) } : res;
    },

    /** `GET /notifications` 알림함(결정 052) — 최근 30일의 줄과 안 읽은 수. 문구는 앱이 갖는다 */
    async getNotifications(): Promise<ApiResult<NotificationList>> {
      if (config.useFixtures) return { ok: true, data: fixtures.notifications };
      return request('GET', '/notifications', { validate: isNotificationList });
    },

    /** `POST /notifications/{id}/read` 읽음으로(204 — 이미 읽었어도). 남의 것 · 없는 것 · UUID 가 아닌 값은 404 `NOT_FOUND` */
    async markNotificationRead(id: string): Promise<ApiResult<null>> {
      if (config.useFixtures) return { ok: true, data: null };
      return request('POST', `/notifications/${encodeURIComponent(id)}/read`, { validate: isEmpty });
    },

    /** `GET /inquiries/{id}` 내 문의 한 건과 답. 남의 것 · 없는 것은 404 `NOT_FOUND` */
    async getInquiry(id: string): Promise<ApiResult<InquiryItem>> {
      if (config.useFixtures) {
        const found = fixtures.inquiries.find((item) => item.id === id);
        return found ? { ok: true, data: found } : { ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' };
      }
      const res = await request('GET', `/inquiries/${encodeURIComponent(id)}`, { validate: isInquiryItemWire });
      return res.ok ? { ok: true, data: inquiryItemOf(res.data) } : res;
    },

    /**
     * `POST /shares` 공유 카드를 만든다(서버 결정 012). 서버가 그 순간의 공개 글만 따로 저장하고 `card` 와 주소에 쓸 `shareId` 를 준다.
     * 공유할 것이 없으면(글 · 완성된 리포트 · 다음 변곡점 · 그 관계의 궁합이 없다, 남의 궁합이다) 404 `NOT_FOUND` 다.
     * 요청한 종류와 다른 카드가 오면 쓰지 않는다.
     */
    async createShare(input: ShareRequest): Promise<ApiResult<ShareCreated>> {
      if (config.useFixtures) return { ok: true, data: fixtureShare(input) };
      return request('POST', '/shares', {
        body: shareBody(input),
        validate: (v): v is ShareCreated => isShareCreated(v) && v.card.kind === input.kind,
      });
    },

    /**
     * `POST /shares/preview` 공유 카드를 미리 받는다(서버 결정 051 — 소유자 2026-11-21). 요청은 `POST /shares` 와 같고 응답은 `{ card }` 뿐이다.
     * 서버에 공유가 저장되지 않아(공유 행 · shareId · 감사 기록 없음) 화면에 들어올 때 불러도 된다. 공유를 누르면 그때 `POST /shares`.
     */
    async previewShare(input: ShareRequest): Promise<ApiResult<ShareCard>> {
      if (config.useFixtures) return { ok: true, data: fixtureShare(input).card };
      const res = await request('POST', '/shares/preview', {
        body: shareBody(input),
        validate: (v): v is { card: ShareCard } => isObject(v) && isShareCard(v.card) && v.card.kind === input.kind,
      });
      return res.ok ? { ok: true, data: res.data.card } : res;
    },

    /** `GET /shared/{shareId}` 공유 카드 하나. 세션 없이 부른다(공유 페이지). 없는 · 지워진 식별자는 404 `NOT_FOUND` */
    async getSharedCard(shareId: string): Promise<ApiResult<ShareCard>> {
      if (config.useFixtures) {
        const key = shareId.startsWith(FIXTURE_SHARE_PREFIX) ? shareId.slice(FIXTURE_SHARE_PREFIX.length) : '';
        const found = Object.entries(fixtures.shareCards).find(([name]) => name === key);
        return found ? { ok: true, data: found[1] } : { ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' };
      }
      return request('GET', `/shared/${encodeURIComponent(shareId)}`, { validate: isShareCard, auth: false });
    },

    /** `DELETE /shares/{shareId}` 내 공유를 지운다. 성공은 204 이고 그 뒤 링크는 404 다 */
    async deleteShare(shareId: string): Promise<ApiResult<null>> {
      if (config.useFixtures) return { ok: true, data: null };
      return request('DELETE', `/shares/${encodeURIComponent(shareId)}`, { validate: (v): v is null => v === null });
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

    /**
     * `DELETE /synastry/{id}` 궁합 하나를 지운다. 서버가 그 궁합의 리포트와 방향성 글도 함께 지운다. 성공은 204 이고 본문이 없다.
     * 이미 만든 공유 링크는 그때의 사본이라 남는다. 없는 · 남의 궁합은 404 `NOT_FOUND`.
     * 가짜 서버는 성공이라고만 답한다(예시 목록은 그대로다).
     */
    async deleteSynastry(id: string): Promise<ApiResult<null>> {
      if (config.useFixtures) return { ok: true, data: null };
      return request('DELETE', `/synastry/${encodeURIComponent(id)}`, { validate: (v): v is null => v === null });
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

let maintenanceHandler: (() => void) | null = null;

/** 서버가 503 `MAINTENANCE` 로 거절했을 때 할 일. features/update 가 등록한다(결정 030). */
export function setMaintenanceHandler(handler: (() => void) | null) {
  maintenanceHandler = handler;
}

let suspendedHandler: (() => void) | null = null;

/** 이용 정지(403 `ACCOUNT_SUSPENDED`)를 받았을 때 부를 것을 정한다. 정지 문(`features/auth/suspension-gate.tsx`)이 건다 */
export function setSuspendedHandler(handler: (() => void) | null) {
  suspendedHandler = handler;
}

/** 앱이 쓰는 인스턴스. 서버 주소와 가짜 서버 스위치는 환경 변수에서 온다(.env.example). */
export const api = createApi({
  baseUrl: process.env.EXPO_PUBLIC_API_URL ?? '',
  getToken: () => sessionToken,
  refreshSession: async () => (sessionRefresher ? sessionRefresher() : false),
  useFixtures: process.env.EXPO_PUBLIC_USE_FIXTURES === '1',
  client: appClient,
  onUpdateRequired: () => updateRequiredHandler?.(),
  onMaintenance: () => maintenanceHandler?.(),
  onSuspended: () => suspendedHandler?.(),
  cookieSession: Platform.OS === 'web',
});
