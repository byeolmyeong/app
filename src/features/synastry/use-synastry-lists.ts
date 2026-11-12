/**
 * 궁합의 목록 두 가지: 관계 유형별 랭킹(`GET /synastry/ranking`)과 지금까지 본 궁합(`GET /synastry`).
 * 순서는 서버가 정한다(랭킹은 점수가 높은 순, 목록은 새것부터). 앱은 받은 순서대로만 그리고 다시 줄 세우지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';

import {
  api,
  type ApiErrorKind,
  type ApiResult,
  type Relation,
  type Synastry,
  type SynastryRankingEntry,
} from '@/lib/api';

export type RankingState =
  | { status: 'loading' }
  | { status: 'done'; entries: SynastryRankingEntry[] }
  | { status: 'failed'; error: ApiErrorKind };

/** relation 이 null 이면(세션을 아직 읽는 중) 서버를 부르지 않고 불러오는 중으로 둔다 */
export function useRanking(relation: Relation | null) {
  const [attempt, setAttempt] = useState(0);
  const [settled, setSettled] = useState<{
    relation: Relation;
    attempt: number;
    result: ApiResult<SynastryRankingEntry[]>;
  } | null>(null);

  useEffect(() => {
    if (relation === null) return;
    let alive = true;
    api.getSynastryRanking(relation).then((result) => {
      if (alive) setSettled({ relation, attempt, result });
    });
    return () => {
      alive = false;
    };
  }, [relation, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const result = settled && settled.relation === relation && settled.attempt === attempt ? settled.result : null;
  const state: RankingState = !result
    ? { status: 'loading' }
    : result.ok
      ? { status: 'done', entries: result.data }
      : { status: 'failed', error: result.error };
  return { state, retry };
}

/**
 * 지금까지 본 궁합. 입력 화면 아래에 곁들이는 목록이라 받지 못하면 빈 목록으로 둔다(입력을 막지 않는다).
 * enabled 가 false 면 서버를 부르지 않는다.
 */
export function useSynastryList(enabled: boolean): Synastry[] {
  const [list, setList] = useState<Synastry[]>([]);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    api.listSynastries().then((result) => {
      if (alive && result.ok) setList(result.data);
    });
    return () => {
      alive = false;
    };
  }, [enabled]);

  return list;
}
