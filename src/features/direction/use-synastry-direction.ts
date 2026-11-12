/**
 * 방향성 제시(궁합: 이 사이에서 해 볼 만한 것)를 받아 오는 상태. 궁합(`id`)마다 한 편이고 서버가 저장한다.
 * 서버에 상대의 출생 정보가 없어 그 궁합의 글을 처음 만들 때만 다시 보낸다(서버 결정 011): 부른 쪽이 들고 있으면(방금 계산한 궁합)
 * 그 값을 함께 보내고, 없으면 식별자만 보낸 뒤 서버가 달라고 하면(`BIRTH_REQUIRED`) 다시 입력받아 보낸다.
 * 상대의 출생 정보도 받은 글도 기기에 두지 않는다(결정 026). 로그에도 남기지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';

import { api, type ApiErrorKind, type ApiResult, type BirthInput, type Direction } from '@/lib/api';

/**
 * 실패의 까닭. BIRTH_MISMATCH 보낸 출생 정보가 그 궁합의 상대가 아니다 · BIRTH_INVALID 서버가 날짜 · 시각 · 곳을 받지 못했다 ·
 * PROFILE_CHANGED 내 출생 정보가 궁합을 계산한 때와 다르다(궁합을 새로 계산해야 한다) · NOT_FOUND 없는 궁합이다
 */
export type SynastryDirectionError =
  ApiErrorKind | 'BIRTH_MISMATCH' | 'BIRTH_INVALID' | 'PROFILE_CHANGED' | 'NOT_FOUND';

/** birthRequired 글이 아직 없어 상대의 출생 정보를 받아야 한다 */
export type SynastryDirectionState =
  | { status: 'loading' }
  | { status: 'birthRequired' }
  | { status: 'done'; direction: Direction }
  | { status: 'failed'; error: SynastryDirectionError };

const INVALID_BIRTH_CODES = ['INVALID_DATE', 'INVALID_TIME', 'UNKNOWN_PLACE'];

function stateOf(result: ApiResult<Direction>): SynastryDirectionState {
  if (result.ok) return { status: 'done', direction: result.data };
  const { code } = result;
  if (code === 'BIRTH_REQUIRED') return { status: 'birthRequired' };
  if (code === 'BIRTH_MISMATCH' || code === 'PROFILE_CHANGED' || code === 'NOT_FOUND')
    return { status: 'failed', error: code };
  if (code !== undefined && INVALID_BIRTH_CODES.includes(code)) return { status: 'failed', error: 'BIRTH_INVALID' };
  return { status: 'failed', error: result.error };
}

/** 진행 중인 요청. 같은 궁합 · 같은 출생 정보로 겹쳐 부르면(화면이 두 번 그려지는 경우) 서버는 한 번만 부른다 */
let inflight: { key: string; promise: Promise<ApiResult<Direction>> } | null = null;

function requestOnce(id: string, birth: BirthInput | null): Promise<ApiResult<Direction>> {
  const key = JSON.stringify([id, birth?.date, birth?.time, birth?.placeId]);
  if (inflight?.key === key) return inflight.promise;
  const promise = api.createSynastryDirection(id, birth ?? undefined).finally(() => {
    if (inflight?.promise === promise) inflight = null;
  });
  inflight = { key, promise };
  return promise;
}

/**
 * 방향성 제시(궁합). id 가 null 이면(주소·세션을 아직 읽는 중) 서버를 부르지 않고 기다리는 중으로 둔다.
 * remembered 는 부른 쪽이 메모리에 들고 있는 상대의 출생 정보(없으면 null)다.
 * submit 은 다시 입력받은 상대의 출생 정보로 요청한다. retry 는 방금 보낸 것을 그대로 다시 보낸다.
 */
export function useSynastryDirection(id: string | null, remembered: BirthInput | null) {
  /** 이 화면에서 다시 입력받은 상대의 출생 정보. 어느 궁합의 것인지 함께 둔다(메모리) */
  const [typed, setTyped] = useState<{ id: string; birth: BirthInput } | null>(null);
  const [attempt, setAttempt] = useState(0);
  /** 어느 요청(id·attempt)의 결과인지 함께 둔다. 지금 요청의 것이 아니면 기다리는 중이다 */
  const [settled, setSettled] = useState<{ id: string; attempt: number; result: ApiResult<Direction> } | null>(null);

  const birth = typed && typed.id === id ? typed.birth : remembered;
  const date = birth?.date;
  const time = birth?.time;
  const placeId = birth?.placeId;

  useEffect(() => {
    if (id === null) return;
    let alive = true;
    const sent = date === undefined || time === undefined || placeId === undefined ? null : { date, time, placeId };
    requestOnce(id, sent).then((result) => {
      if (alive) setSettled({ id, attempt, result });
    });
    return () => {
      alive = false;
    };
  }, [id, attempt, date, time, placeId]);

  const submit = useCallback(
    (input: BirthInput) => {
      if (id === null) return;
      setTyped({ id, birth: input });
      setAttempt((n) => n + 1);
    },
    [id],
  );

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const result = settled && settled.id === id && settled.attempt === attempt ? settled.result : null;
  const state: SynastryDirectionState = result ? stateOf(result) : { status: 'loading' };
  return { state, submit, retry };
}
