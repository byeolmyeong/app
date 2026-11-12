/**
 * 방향성 제시(이성: 연애에서 해 볼 만한 것)를 받아 오는 상태와 기기 보관. 같은 출생 정보의 글은 한 번 받으면 기기에 두고
 * 다시 요청하지 않는다(같은 차트 = 같은 글이라 다시 생성은 없다). 실패하면 스스로 다시 부르지 않고 사용자가 누를 때만 다시 한다.
 * 글은 서버가 준 그대로 쓴다. 출생 정보와 보관된 값은 로그에 남기지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { api, isDirection, type ApiErrorKind, type ApiResult, type BirthInput, type Direction } from '@/lib/api';

export const DIRECTION_STORAGE_KEY = 'byeolmyeong.direction.love.v1';

/** 서버에 저장된 출생 정보가 없을 때의 상태(`NO_PROFILE`) */
const NO_PROFILE_STATUS = 404;

/** checking 기기에서 받아 둔 글을 찾는 중 · loading 서버의 글을 기다리는 중 */
export type DirectionState =
  | { status: 'checking' }
  | { status: 'loading' }
  | { status: 'done'; direction: Direction }
  | { status: 'failed'; error: ApiErrorKind };

/** 요약 해석의 보관과 같은 모양의 키 */
const keyOf = (input: BirthInput) => JSON.stringify([input.date, input.time, input.placeId]);

/** 이 출생 정보로 받아 둔 글. 없거나 다른 출생 정보의 글이거나 깨졌으면 null */
async function loadDirection(key: string): Promise<Direction | null> {
  try {
    const raw = await AsyncStorage.getItem(DIRECTION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const stored = parsed as Record<string, unknown>;
    return stored.key === key && isDirection(stored.direction) ? stored.direction : null;
  } catch {
    return null;
  }
}

async function saveDirection(key: string, direction: Direction): Promise<void> {
  try {
    await AsyncStorage.setItem(DIRECTION_STORAGE_KEY, JSON.stringify({ key, direction }));
  } catch {
    // 보관하지 못해도 받은 글은 보여 준다. 다음에 열 때 서버가 저장된 글을 바로 준다.
  }
}

async function requestDirection(input: BirthInput): Promise<ApiResult<Direction>> {
  let r = await api.createDirection('LOVE');
  // 서버에 출생 정보가 없으면 저장하고 한 번만 더 요청한다(요약 해석과 같다).
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await api.saveProfile(input)).ok)
    r = await api.createDirection('LOVE');
  // 실패한 것은 보관하지 않는다.
  if (r.ok) await saveDirection(keyOf(input), r.data);
  return r;
}

/** 진행 중인 요청. 같은 출생 정보로 겹쳐 부르면(화면이 두 번 그려지는 경우) 서버는 한 번만 부른다 */
let inflight: { key: string; promise: Promise<ApiResult<Direction>> } | null = null;

function requestDirectionOnce(input: BirthInput): Promise<ApiResult<Direction>> {
  const key = keyOf(input);
  if (inflight?.key === key) return inflight.promise;
  const promise = requestDirection(input).finally(() => {
    if (inflight?.promise === promise) inflight = null;
  });
  inflight = { key, promise };
  return promise;
}

/**
 * 방향성 제시(이성). 먼저 기기에 받아 둔 글을 찾고(세션을 기다리지 않는다), 없을 때만 세션이 준비된 뒤 서버에 요청한다.
 * input 이 null 이면(출생 정보를 아직 읽는 중) 아무것도 하지 않는다. retry 는 실패했을 때 사용자가 누르는 "다시 시도" 다.
 */
export function useDirection(input: BirthInput | null, sessionReady: boolean) {
  const date = input?.date;
  const time = input?.time;
  const placeId = input?.placeId;
  const key = date === undefined || time === undefined || placeId === undefined ? null : keyOf({ date, time, placeId });
  const [found, setFound] = useState<{ key: string; direction: Direction | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  /** 어느 요청(key·attempt)의 결과인지 함께 둔다. 지금 요청의 것이 아니면 기다리는 중이다 */
  const [settled, setSettled] = useState<{ key: string; attempt: number; result: ApiResult<Direction> } | null>(null);

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    loadDirection(key).then((direction) => {
      if (alive) setFound({ key, direction });
    });
    return () => {
      alive = false;
    };
  }, [key]);

  const stored = found && found.key === key ? found : null;
  const needsServer = sessionReady && stored !== null && stored.direction === null;

  useEffect(() => {
    if (!needsServer || date === undefined || time === undefined || placeId === undefined || key === null) return;
    let alive = true;
    requestDirectionOnce({ date, time, placeId }).then((result) => {
      if (alive) setSettled({ key, attempt, result });
    });
    return () => {
      alive = false;
    };
  }, [needsServer, date, time, placeId, key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const result = settled && settled.key === key && settled.attempt === attempt ? settled.result : null;
  const state: DirectionState = !stored
    ? { status: 'checking' }
    : stored.direction
      ? { status: 'done', direction: stored.direction }
      : !result
        ? { status: 'loading' }
        : result.ok
          ? { status: 'done', direction: result.data }
          : { status: 'failed', error: result.error };

  return { state, retry };
}
