/**
 * 홈의 첫 데이터가 끝났는가(결정 068 의 2). 처음 열어 홈으로 갈 때 루트 레이아웃이 이것이 참이 될 때까지 스플래시를 둔다 —
 * 스플래시 → 불러오는 중 → 홈의 두 번 바뀜 대신 스플래시에서 바로 홈. 홈이 기기 저장소를 읽고(없으면 서버에서 되살리고)
 * 그릴 것이 정해지면, 또는 10초가 넘어 불러오지 못한 화면을 보이면 알린다. 한 번 참이면 그대로다(스플래시는 처음 한 번).
 */
import { useSyncExternalStore } from 'react';

let ready = false;
const listeners = new Set<() => void>();

export function markHomeReady(): void {
  if (ready) return;
  ready = true;
  listeners.forEach((listener) => listener());
}

export const getHomeReady = (): boolean => ready;

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useHomeReady(): boolean {
  return useSyncExternalStore(subscribe, getHomeReady, getHomeReady);
}

/** 시험용 */
export function resetHomeReady(): void {
  ready = false;
}
