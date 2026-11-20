/**
 * 스플래시를 붙잡는 문(결정 068). 루트에 걸리는 문(예: 이용 정지 확인 — 답이 올 때까지 스스로 화면을 가린다)이 준비될 때까지
 * 루트 레이아웃이 스플래시를 둔다 — 스플래시가 먼저 걷히고 문의 가림막이 한 번 더 보이지 않게. 문은 준비 전 동안 `useSplashHold(true)`.
 * 루트와 함께 그려지는 문만 쓴다(효과는 그린 뒤 걸리므로, 나중에 그려지는 화면은 home-ready 처럼 루트가 미리 알아야 한다).
 * 붙잡아도 웹은 10초 · 앱은 5초 뒤에는 걷힌다(splash-view 의 useSplashDone 상한).
 */
import { useEffect, useSyncExternalStore } from 'react';

let holds = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

/** active 인 동안 스플래시를 붙잡는다 */
export function useSplashHold(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    holds += 1;
    emit();
    return () => {
      holds -= 1;
      emit();
    };
  }, [active]);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const held = () => holds > 0;

/** 붙잡는 문이 하나라도 있는가(루트 레이아웃이 본다) */
export function useSplashHeld(): boolean {
  return useSyncExternalStore(subscribe, held, held);
}
