import type { EventName, EventProps } from './events';
import { screenNameOf, type RoutePattern } from './screen';

/**
 * 경로만 보고 정하는 이벤트(결정 040 · 081). 화면 코드를 고치지 않고 루트 레이아웃 · `Screen` 한 곳에서 보낸다.
 * 값은 경로 패턴 · 값 목록뿐이다 — 주소 속 공유 id · 문의 id · 인증 코드는 실리지 않는다.
 */
export type RouteEvent = { [E in EventName]: [E, EventProps<E>] }[EventName];

const BIRTH_INPUT: Partial<Record<RoutePattern, EventProps<'birth_input_started'>['context']>> = {
  '/signup/birth': 'signup',
  '/my/birth': 'profile_edit',
  '/birth': 'profile_edit',
};

/** 주소가 바뀌었을 때 보낼 것. `previous` 가 null 이면 이번 실행의 첫 화면이다 */
export function routeEvents(pathname: string, previous: string | null): RouteEvent[] {
  const screen = screenNameOf(pathname);
  if (previous !== null && screenNameOf(previous) === screen) return [];
  const events: RouteEvent[] = [];
  if (previous === null) events.push(['app_opened', { entry: screen === '/s/[shareId]' ? 'share' : 'direct' }]);
  events.push(['screen_viewed', { screen }]);
  const context = BIRTH_INPUT[screen];
  if (context) events.push(['birth_input_started', { context }]);
  return events;
}

const READ_TO_END: Partial<Record<RoutePattern, EventProps<'reading_read_to_end'>['kind']>> = {
  '/reading': 'summary',
  '/me': 'me_report',
  '/timing/period': 'timing_report',
  '/today': 'day_sky',
  '/timing/day': 'day_sky',
};

/** 끝까지 읽음을 재는 화면이면 그 종류, 아니면 null */
export const readToEndKindOf = (pathname: string) => READ_TO_END[screenNameOf(pathname)] ?? null;

/** 끝으로 보는 아래 여백(px) — 맨 아래 탭 · 버튼에 가려지는 몫 */
const END_SLACK = 120;

type ScrollMetrics = { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } };

/** 스크롤이 끝에 닿았는가. 내용이 화면보다 짧으면(뼈대 · 오류 화면) 닿지 않은 것으로 본다 */
export function reachedEnd({ contentOffset, contentSize, layoutMeasurement }: ScrollMetrics): boolean {
  if (contentSize.height <= layoutMeasurement.height) return false;
  return contentOffset.y + layoutMeasurement.height >= contentSize.height - END_SLACK;
}
