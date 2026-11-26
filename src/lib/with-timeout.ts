/**
 * 한 번의 요청을 기다리는 한도(처음 불러올 때의 10초 — 결정 065 의 2). 넘으면 서버 실패(SERVER)로 보고, 늦게 온 답은 버린다.
 * 기다리는 화면이 끝없이 갇히지 않게 한다(쓰는 중 화면에는 머리 · 아래 탭이 없다 — 리뷰 #49). 자세한 풀이(나 탭 · 시기) · 이번 달이 함께 쓴다.
 */
import type { ApiResult } from '@/lib/api';

export const REQUEST_TIMEOUT_MS = 10_000;

/**
 * 글을 쓰는 동기 요청(요약 해석 · 오늘의 / 그날의 하늘 — 처음이면 수십 초)을 기다리는 한도. 쓰는 중 화면에는 머리(뒤로)가 없어
 * 응답이 멈추면 갇히므로 넘으면 서버 실패로 보고 머리가 있는 "못 썼을 때" 로 바꾼다(소유자 — 쓰는 중은 머리 없이, 빌드 13 · 자세한 풀이의 3분과 같다)
 */
export const GENERATION_MAX_WAIT_MS = 180_000;

export function withTimeout<T>(promise: Promise<ApiResult<T>>, ms: number = REQUEST_TIMEOUT_MS): Promise<ApiResult<T>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: 'SERVER' }), ms);
    void promise.then((r) => {
      clearTimeout(timer);
      resolve(r);
    });
  });
}
