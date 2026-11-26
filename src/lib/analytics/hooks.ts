import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import type { EventName, EventProps } from './events';
import { track } from './core';
import { reachedEnd, readToEndKindOf, routeEvents } from './routes';

/** 지금 화면의 주소(루트 레이아웃이 적는다)와 그 화면에서 끝까지 읽음을 보냈는가 */
let currentPath: string | null = null;
let readSentFor: string | null = null;

/**
 * 루트 레이아웃에서 한 번(결정 040 · 081): 주소가 바뀔 때 screen_viewed(첫 화면이면 app_opened 도) · 출생 정보 입력 시작.
 * 화면 파일마다 부르지 않으려고 경로로 정한다(routes.ts).
 */
export function useRouteAnalytics(): void {
  const pathname = usePathname();
  const previous = useRef<string | null>(null);
  useEffect(() => {
    for (const [event, props] of routeEvents(pathname, previous.current)) track(event, props as never);
    previous.current = pathname;
    if (currentPath !== pathname) {
      currentPath = pathname;
      readSentFor = null;
    }
  }, [pathname]);
}

/**
 * `Screen` 의 스크롤에 건다: 끝까지 읽음을 재는 화면(routes.ts)에서 끝에 닿으면 reading_read_to_end 를 화면에 들어올 때마다 한 번.
 * 훅이 아니라 화면 부품이 라우터를 몰라도 된다(루트가 적어 둔 주소를 본다).
 */
export function onReadScroll(e: NativeSyntheticEvent<NativeScrollEvent>): void {
  if (currentPath === null || readSentFor === currentPath) return;
  const kind = readToEndKindOf(currentPath);
  if (!kind || !reachedEnd(e.nativeEvent)) return;
  readSentFor = currentPath;
  track('reading_read_to_end', { kind });
}

/** 부품이 그려질 때(또는 `when` 이 참이 될 때) 한 번 — 해석 글 · 차트가 보일 때. 값이 바뀌면 다시 보낸다 */
export function useTrackOnce<E extends EventName>(event: E, props: EventProps<E>, when = true): void {
  const key = JSON.stringify(props);
  useEffect(() => {
    if (when) track(event, JSON.parse(key) as EventProps<E>);
  }, [event, key, when]);
}
