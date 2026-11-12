/**
 * 자주 묻는 질문을 받아 오는 상태(결정 028). 글은 서버(관리 화면)가 주인이고 앱에는 싣지 않는다.
 * 받은 목록은 기기에 보관하지 않는다. 앱이 켜져 있는 동안 메모리에만 5분 두고 그동안 다시 열면 그것을 쓴다.
 * 실패한 요청을 스스로 다시 하지 않는다(다시 누를 때만).
 */
import { useCallback, useEffect, useState } from 'react';

import { api, type ApiErrorKind, type ApiResult, type Faq } from '@/lib/api';

/** 받은 목록을 다시 쓰는 시간. 서버가 캐시해도 된다고 한 5분이다 */
export const FAQ_REUSE_MS = 5 * 60 * 1000;

export type FaqsState =
  { status: 'loading' } | { status: 'done'; faqs: Faq[] } | { status: 'failed'; error: ApiErrorKind };

let kept: { at: number; faqs: Faq[] } | null = null;

/** 메모리에 둔 목록을 버린다 */
export function forgetFaqs() {
  kept = null;
}

/** 실패와 빈 목록은 두지 않는다 */
async function loadFaqs(): Promise<ApiResult<Faq[]>> {
  if (kept && Date.now() - kept.at < FAQ_REUSE_MS) return { ok: true, data: kept.faqs };
  const r = await api.listFaqs();
  if (r.ok && r.data.length > 0) kept = { at: Date.now(), faqs: r.data };
  return r;
}

/** retry 는 실패했을 때 사용자가 누르는 "다시 시도" 다 */
export function useFaqs() {
  const [attempt, setAttempt] = useState(0);
  /** 어느 요청(attempt)의 결과인지 함께 둔다. 지금 요청의 것이 아니면 받는 중이다 */
  const [settled, setSettled] = useState<{ attempt: number; result: ApiResult<Faq[]> } | null>(null);

  useEffect(() => {
    let alive = true;
    loadFaqs().then((result) => {
      if (alive) setSettled({ attempt, result });
    });
    return () => {
      alive = false;
    };
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const result = settled && settled.attempt === attempt ? settled.result : null;
  const state: FaqsState = !result
    ? { status: 'loading' }
    : result.ok
      ? { status: 'done', faqs: result.data }
      : { status: 'failed', error: result.error };

  return { state, retry };
}
