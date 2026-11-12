/**
 * 궁합 하나. 방금 계산한 것이면 메모리의 것(겹친 휠 포함)을 쓰고 서버를 부르지 않는다.
 * 아니면 `GET /synastry/{id}` 로 받는다. 그때는 겹친 휠이 없다(서버가 상대의 위치를 저장하지 않는다).
 */
import { useCallback, useEffect, useState } from 'react';

import { freshOf } from '@/features/synastry/fresh-synastry';
import { api, type ApiErrorKind, type ApiResult, type Synastry } from '@/lib/api';

const NOT_FOUND_STATUS = 404;

export type SynastryState =
  | { status: 'loading' }
  | { status: 'done'; synastry: Synastry }
  | { status: 'failed'; error: ApiErrorKind; notFound: boolean };

/** id 가 null 이면(주소·세션을 아직 읽는 중) 서버를 부르지 않고 불러오는 중으로 둔다 */
export function useSynastry(id: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{ id: string; attempt: number; result: ApiResult<Synastry> } | null>(null);

  useEffect(() => {
    if (id === null || freshOf(id)) return;
    let alive = true;
    api.getSynastry(id).then((result) => {
      if (alive) setSettled({ id, attempt, result });
    });
    return () => {
      alive = false;
    };
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const fresh = id === null ? null : freshOf(id);
  const result = settled && settled.id === id && settled.attempt === attempt ? settled.result : null;
  const state: SynastryState = fresh
    ? { status: 'done', synastry: fresh.synastry }
    : !result
      ? { status: 'loading' }
      : result.ok
        ? { status: 'done', synastry: result.data }
        : { status: 'failed', error: result.error, notFound: result.status === NOT_FOUND_STATUS };

  return { state, retry };
}
