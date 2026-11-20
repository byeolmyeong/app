import { useEffect, useState } from 'react';

/**
 * 처음 불러올 때의 단계(보드 24 · 24-1, ADR 065 예정).
 * - blank: 불러오기를 시작하고 0.3초 전 — 아무것도 그리지 않는다(빨리 오면 뼈대가 번쩍이지 않게)
 * - skeleton: 0.3초가 넘었다 — 뼈대(components/skeleton.tsx)를 그린다
 * - timeout: 10초가 넘었다 — 화면은 실패 화면(보드 19, StateScreen)으로 바꾼다
 * - done: 불러오지 않는다(다 받았거나 실패했다)
 * 한 번 본 화면은 기기에 받아 둔 내용을 먼저 보여 주고 뒤에서 새로 받는다 — 그때는 이것도 뼈대도 쓰지 않는다(화면 쪽 규칙).
 */
export type LoadingPhase = 'blank' | 'skeleton' | 'timeout' | 'done';

const SKELETON_AFTER_MS = 300;
const TIMEOUT_AFTER_MS = 10_000;

/** loading 이 참이 될 때마다 처음부터 센다(실패 화면의 "다시 보기") */
export function useLoadingPhase(loading: boolean): LoadingPhase {
  const [phase, setPhase] = useState<LoadingPhase>(loading ? 'blank' : 'done');
  const [was, setWas] = useState(loading);
  if (was !== loading) {
    setWas(loading);
    setPhase(loading ? 'blank' : 'done');
  }
  useEffect(() => {
    if (!loading) return;
    const skeleton = setTimeout(() => setPhase('skeleton'), SKELETON_AFTER_MS);
    const timeout = setTimeout(() => setPhase('timeout'), TIMEOUT_AFTER_MS);
    return () => {
      clearTimeout(skeleton);
      clearTimeout(timeout);
    };
  }, [loading]);
  return phase;
}
