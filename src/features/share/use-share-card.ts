/**
 * 공유 카드 만들기(`POST /shares`, 서버 결정 012 · 036). 서버가 그 순간의 공개 글을 저장하고 카드와 공유 식별자를 준다.
 * 받아 둔 카드(share-cache.ts)가 있으면 서버를 기다리지 않고 먼저 보여 주고, 뒤에서 받은 카드로 바꾼다(같은 내용이면 서버가 같은 식별자를 준다).
 * 뒤에서 확인하다 실패하면 받아 둔 카드를 그대로 두고, 공유할 것이 없어졌으면(404) 그 말을 보인다. 요청이 바뀌면(랭킹의 이름 표시) 다시 만든다.
 * 실패를 스스로 다시 시도하지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';

import { fetchShare, readCachedShare, shareKeyOf } from '@/features/share/share-cache';
import type { ApiErrorKind, ApiResult, ShareCard, ShareCreated, ShareRequest } from '@/lib/api';

export type ShareCardState =
  | { status: 'loading' }
  | { status: 'done'; shareId: string; card: ShareCard }
  /** notFound: 공유할 것이 없다(서버의 404). 다시 시도해도 같다 */
  | { status: 'failed'; error: ApiErrorKind; notFound: boolean };

type Settled<T> = { key: string; attempt: number; value: T };

/** request 가 null 이면(내 이름을 아직 받지 않았다) 서버를 부르지 않고 만드는 중으로 둔다 */
export function useShareCard(request: ShareRequest | null) {
  const key = request ? JSON.stringify(request) : null;
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<Settled<ApiResult<ShareCreated>> | null>(null);
  const [cached, setCached] = useState<Settled<ShareCreated> | null>(null);

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    const req = JSON.parse(key) as ShareRequest;
    const cacheKey = shareKeyOf(req);
    if (cacheKey)
      void readCachedShare(cacheKey).then((value) => {
        if (alive && value) setCached({ key, attempt, value });
      });
    void fetchShare(req).then((value) => {
      if (alive) setSettled({ key, attempt, value });
    });
    return () => {
      alive = false;
    };
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const result = settled && settled.key === key && settled.attempt === attempt ? settled.value : null;
  const kept = cached && cached.key === key && cached.attempt === attempt ? cached.value : null;
  let state: ShareCardState;
  if (result?.ok) state = { status: 'done', shareId: result.data.shareId, card: result.data.card };
  else if (result && (result.status === 404 || !kept)) state = { status: 'failed', error: result.error, notFound: result.status === 404 };
  else if (kept) state = { status: 'done', shareId: kept.shareId, card: kept.card };
  else state = { status: 'loading' };
  return { state, retry };
}
