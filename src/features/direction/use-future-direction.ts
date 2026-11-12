/**
 * 방향성 제시(미래: 이 시기에 해 볼 만한 것)를 받아 오는 상태. 이 글은 "지금의 시기" 가 같은 동안에만 같고,
 * 어느 구간이 시작하거나 끝난 날부터는 같은 요청에 서버가 새 글을 준다. 그 날을 아는 것은 서버뿐이라
 * 기기에 두지 않고 보일 때마다 요청한다(결정 026). 저장된 글이 있으면 서버가 바로 답한다.
 * 실패하면 스스로 다시 부르지 않고 사용자가 누를 때만 다시 한다. 출생 정보와 글은 로그에 남기지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';

import { api, type ApiErrorKind, type ApiResult, type BirthInput, type Direction } from '@/lib/api';

/** 서버에 저장된 출생 정보가 없을 때의 상태(`NO_PROFILE`) */
const NO_PROFILE_STATUS = 404;

export type FutureDirectionState =
  { status: 'loading' } | { status: 'done'; direction: Direction } | { status: 'failed'; error: ApiErrorKind };

const keyOf = (input: BirthInput) => JSON.stringify([input.date, input.time, input.placeId]);

async function requestFuture(input: BirthInput): Promise<ApiResult<Direction>> {
  const r = await api.createDirection('FUTURE');
  // 서버에 출생 정보가 없으면 저장하고 한 번만 더 요청한다(요약 해석과 같다).
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await api.saveProfile(input)).ok)
    return api.createDirection('FUTURE');
  return r;
}

/** 진행 중인 요청. 같은 출생 정보로 겹쳐 부르면(탭을 빠르게 오가는 경우) 서버는 한 번만 부른다 */
let inflight: { key: string; promise: Promise<ApiResult<Direction>> } | null = null;

function requestFutureOnce(input: BirthInput): Promise<ApiResult<Direction>> {
  const key = keyOf(input);
  if (inflight?.key === key) return inflight.promise;
  const promise = requestFuture(input).finally(() => {
    if (inflight?.promise === promise) inflight = null;
  });
  inflight = { key, promise };
  return promise;
}

/**
 * 방향성 제시(미래). 이 훅을 쓰는 부품이 화면에 나타날 때마다 서버에 요청한다.
 * input 이 null 이면(세션이나 출생 정보를 아직 읽는 중) 부르지 않고 기다리는 중으로 둔다.
 * retry 는 실패했을 때 사용자가 누르는 "다시 시도" 다.
 */
export function useFutureDirection(input: BirthInput | null) {
  const date = input?.date;
  const time = input?.time;
  const placeId = input?.placeId;
  const key = date === undefined || time === undefined || placeId === undefined ? null : keyOf({ date, time, placeId });
  const [attempt, setAttempt] = useState(0);
  /** 어느 요청(key·attempt)의 결과인지 함께 둔다. 지금 요청의 것이 아니면 기다리는 중이다 */
  const [settled, setSettled] = useState<{ key: string; attempt: number; result: ApiResult<Direction> } | null>(null);

  useEffect(() => {
    if (date === undefined || time === undefined || placeId === undefined || key === null) return;
    let alive = true;
    requestFutureOnce({ date, time, placeId }).then((result) => {
      if (alive) setSettled({ key, attempt, result });
    });
    return () => {
      alive = false;
    };
  }, [date, time, placeId, key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const result = settled && settled.key === key && settled.attempt === attempt ? settled.result : null;
  const state: FutureDirectionState = !result
    ? { status: 'loading' }
    : result.ok
      ? { status: 'done', direction: result.data }
      : { status: 'failed', error: result.error };

  return { state, retry };
}
