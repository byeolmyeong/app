/**
 * 한 번의 요청을 기다리는 한도(처음 불러올 때의 10초 — 결정 065 의 2). 넘으면 서버 실패(SERVER)로 보고, 늦게 온 답은 버린다.
 * 기다리는 화면이 끝없이 갇히지 않게 한다(쓰는 중 화면에는 머리 · 아래 탭이 없다 — 리뷰 #49). 자세한 풀이(나 탭 · 시기) · 이번 달이 함께 쓴다.
 */
import type { ApiResult } from '@/lib/api';

export const REQUEST_TIMEOUT_MS = 10_000;

export function withTimeout<T>(promise: Promise<ApiResult<T>>, ms: number = REQUEST_TIMEOUT_MS): Promise<ApiResult<T>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: 'SERVER' }), ms);
    void promise.then((r) => {
      clearTimeout(timer);
      resolve(r);
    });
  });
}
