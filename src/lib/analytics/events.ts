import { ROUTE_PATTERNS } from './screen';

/**
 * 보내는 이벤트와 속성 값의 단일 출처(결정 040, 계획 docs/plans/2026-11-19-product-analytics.md "이벤트").
 * 속성 값은 아래 목록·참거짓만 받는다. 자유 글자(이름·날짜·주소·글)를 받는 자리를 두지 않아 출생 정보가 실려 갈 길이 없다.
 * 더하려면 계획의 표부터 고친다.
 */
const PROVIDERS = ['google', 'apple', 'kakao'] as const;
const BOOLEAN = [true, false] as const;
// 2026-11-26 지금 화면에 맞춤(결정 081): 요약 해석(내 별명) · 나 탭 풀이 · 시기 풀이 · 그날의 하늘. 궁합 · 방향성은 1.1.0
const KINDS = ['summary', 'me_report', 'timing_report', 'day_sky', 'synastry', 'direction'] as const;
// 공유 v2 넷(결정 053): 내 별명 · 나 탭 영역 · 오늘의/그날의 하늘 · 다음 큰 변화. 궁합 점수 · 랭킹은 1.1.0
const CARDS = ['nickname', 'me_area', 'day_sky', 'next_big', 'synastry_score', 'ranking'] as const;

export const EVENTS = {
  app_opened: { entry: ['direct', 'share', 'invite'] },
  login_started: { provider: PROVIDERS },
  login_completed: { provider: PROVIDERS },
  signup_completed: { provider: PROVIDERS, time_known: BOOLEAN },
  birth_input_started: { context: ['signup', 'profile_edit', 'synastry_direct'] },
  chart_viewed: { time_known: BOOLEAN },
  reading_viewed: { kind: KINDS },
  reading_read_to_end: { kind: KINDS },
  share_started: { card: CARDS },
  shared_link_opened: { card: CARDS },
  // 모르는 주소는 주소를 옮기지 않고 (unknown)
  screen_viewed: { screen: [...ROUTE_PATTERNS, '(unknown)'] },
} as const satisfies Record<string, Record<string, readonly (string | boolean)[]>>;

export type EventName = keyof typeof EVENTS;
export type EventProps<E extends EventName> = {
  [K in keyof (typeof EVENTS)[E]]: (typeof EVENTS)[E][K] extends readonly (infer V)[] ? V : never;
};

export type Sanitized = { event: EventName; props: Record<string, string | boolean>; dropped: string[] };

/** 표에 없는 이벤트면 null. 표에 없는 속성과 값 목록 밖의 값은 버리고 그 키를 `dropped` 에 적는다(값은 적지 않는다) */
export function sanitize(event: string, props: Record<string, unknown>): Sanitized | null {
  if (!Object.prototype.hasOwnProperty.call(EVENTS, event)) return null;
  const allowed = EVENTS[event as EventName] as Record<string, readonly (string | boolean)[]>;
  const kept: Record<string, string | boolean> = {};
  const dropped: string[] = [];
  for (const [key, value] of Object.entries(props ?? {})) {
    const values = Object.prototype.hasOwnProperty.call(allowed, key) ? allowed[key] : undefined;
    if (values && (typeof value === 'string' || typeof value === 'boolean') && values.includes(value)) kept[key] = value;
    else dropped.push(key);
  }
  return { event: event as EventName, props: kept, dropped };
}
