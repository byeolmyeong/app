import { useSyncExternalStore } from 'react';

/**
 * 웹: 화면 키패드가 문서의 창 바닥을 덮은 높이(결정 085). 떠 있지 않으면 0.
 * 휴대폰 브라우저의 키패드는 페이지 위를 덮는다 — 보이는 칸(visualViewport)만 줄고 문서의 창(clientHeight)은 그대로다.
 * 덮은 높이 = 문서의 창 높이 − 보이는 칸의 아래 끝(pageTop + height). 손가락으로 확대한 동안(scale ≠ 1)은 키패드가 아니라 0.
 * 보이는 칸을 모르면(서버 그리기 · 옛 브라우저) 0.
 */
let height = 0;
const listeners = new Set<() => void>();

function measure(): number {
  const viewport = globalThis.visualViewport;
  if (!viewport || Math.abs(viewport.scale - 1) > 0.01) return 0;
  const covered = document.documentElement.clientHeight - (viewport.pageTop + viewport.height);
  return covered > 0 ? Math.round(covered) : 0;
}

function update() {
  const next = measure();
  if (next === height) return;
  height = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  const viewport = globalThis.visualViewport;
  if (!viewport) return () => {};
  if (listeners.size === 0) {
    height = measure();
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    viewport.removeEventListener('resize', update);
    viewport.removeEventListener('scroll', update);
  };
}

const ignore = () => () => {};
const current = () => height;
const onServer = () => 0;

/** 화면 키패드가 문서의 창 바닥을 덮은 높이. enabled 가 false 면 듣지 않고 0 */
export function useKeyboardHeight(enabled = true): number {
  const value = useSyncExternalStore(enabled ? subscribe : ignore, current, onServer);
  return enabled ? value : 0;
}
