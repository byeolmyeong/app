/**
 * 제품 분석(결정 040 · 081). 화면 코드는 SDK 를 직접 부르지 않고 여기만 부른다.
 * core: 초기화 · 보내기 · 사용자 잇기 · events: 이벤트와 값 목록의 단일 출처 · screen · routes: 경로 패턴과 경로로 정하는 이벤트 · hooks: 화면에서 쓰는 훅
 */
export { identify, initAnalytics, isAnalyticsEnabled, resetAnalytics, track } from './core';
export { EVENTS, type EventName, type EventProps } from './events';
export { onReadScroll, useRouteAnalytics, useTrackOnce } from './hooks';
export { ROUTE_PATTERNS, screenNameOf, type RoutePattern } from './screen';
