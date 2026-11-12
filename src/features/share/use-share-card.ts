/**
 * 공유 카드 만들기(`POST /shares`, 서버 결정 012). 서버가 그 순간의 공개 글을 저장하고 카드와 공유 식별자를 준다.
 * 요청이 바뀌면(랭킹의 이름 표시) 다시 만든다. 같은 내용이면 서버가 있던 식별자를 준다. 실패를 스스로 다시 시도하지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  api,
  type ApiErrorKind,
  type ApiResult,
  type ShareCard,
  type ShareCreated,
  type ShareRequest,
} from '@/lib/api';

export type ShareCardState =
  | { status: 'loading' }
  | { status: 'done'; shareId: string; card: ShareCard }
  /** notFound: 공유할 것이 없다(서버의 404). 다시 시도해도 같다 */
  | { status: 'failed'; error: ApiErrorKind; notFound: boolean };

/** request 가 null 이면(내 이름을 아직 받지 않았다) 서버를 부르지 않고 만드는 중으로 둔다 */
export function useShareCard(request: ShareRequest | null) {
  const key = request ? JSON.stringify(request) : null;
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ key: string; attempt: number; result: ApiResult<ShareCreated> } | null>(
    null,
  );

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    api.createShare(JSON.parse(key) as ShareRequest).then((result) => {
      if (alive) setSettled({ key, attempt, result });
    });
    return () => {
      alive = false;
    };
  }, [key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const result = settled && settled.key === key && settled.attempt === attempt ? settled.result : null;
  const state: ShareCardState = !result
    ? { status: 'loading' }
    : result.ok
      ? { status: 'done', shareId: result.data.shareId, card: result.data.card }
      : { status: 'failed', error: result.error, notFound: result.status === 404 };
  return { state, retry };
}
