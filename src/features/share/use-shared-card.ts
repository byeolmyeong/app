/**
 * 공유 페이지의 카드 받기(`GET /shared/{shareId}`). 세션 없이 부른다. 실패를 스스로 다시 시도하지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';

import { shareCardOf } from '@/features/share/share-analytics';
import { track } from '@/lib/analytics';
import { api, type ApiErrorKind, type ApiResult, type ShareCard } from '@/lib/api';

export type SharedCardState =
  | { status: 'loading' }
  | { status: 'done'; card: ShareCard }
  /** notFound: 없는 · 지워진 공유(서버의 404) */
  | { status: 'failed'; error: ApiErrorKind; notFound: boolean };

/** shareId 가 null 이면(주소를 아직 읽는 중) 서버를 부르지 않는다 */
export function useSharedCard(shareId: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ shareId: string; attempt: number; result: ApiResult<ShareCard> } | null>(
    null,
  );

  useEffect(() => {
    if (shareId === null) return;
    let alive = true;
    api.getSharedCard(shareId).then((result) => {
      if (!alive) return;
      // 공유 링크로 들어온 사람이 카드를 봤다(결정 040 — 공유 유입 전환의 분모). 공유 id 는 보내지 않는다
      if (result.ok) track('shared_link_opened', { card: shareCardOf[result.data.kind] });
      setSettled({ shareId, attempt, result });
    });
    return () => {
      alive = false;
    };
  }, [shareId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const result = settled && settled.shareId === shareId && settled.attempt === attempt ? settled.result : null;
  const state: SharedCardState = !result
    ? { status: 'loading' }
    : result.ok
      ? { status: 'done', card: result.data }
      : { status: 'failed', error: result.error, notFound: result.status === 404 };
  return { state, retry };
}
