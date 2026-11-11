/**
 * 요약 해석을 받아 오는 상태와 기기 보관. 같은 출생 정보의 글은 한 번 받으면 기기에 두고 다시 요청하지 않는다
 * (같은 차트 = 같은 글이라 다시 생성은 없다). 실패하면 스스로 다시 부르지 않고 사용자가 누를 때만 다시 한다.
 * 글은 서버가 준 그대로 쓴다. 출생 정보와 보관된 값은 로그에 남기지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { api, isReading, type ApiErrorKind, type ApiResult, type BirthInput, type Reading } from '@/lib/api';

export const READING_STORAGE_KEY = 'byeolmyeong.reading.v1';

/** 서버에 저장된 출생 정보가 없을 때의 상태(`NO_PROFILE`) */
const NO_PROFILE_STATUS = 404;

export type ReadingState =
  | { status: 'loading' }
  | { status: 'done'; reading: Reading }
  | { status: 'failed'; error: ApiErrorKind };

const keyOf = (input: BirthInput) => JSON.stringify([input.date, input.time, input.placeId]);

/** 이 출생 정보로 받아 둔 글. 없거나 다른 출생 정보의 글이거나 깨졌으면 null */
async function loadReading(key: string): Promise<Reading | null> {
  try {
    const raw = await AsyncStorage.getItem(READING_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const stored = parsed as Record<string, unknown>;
    return stored.key === key && isReading(stored.reading) ? stored.reading : null;
  } catch {
    return null;
  }
}

async function saveReading(key: string, reading: Reading): Promise<void> {
  try {
    await AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ key, reading }));
  } catch {
    // 보관하지 못해도 받은 글은 보여 준다. 다음에 열 때 다시 받는다.
  }
}

async function requestReading(input: BirthInput): Promise<ApiResult<Reading>> {
  const key = keyOf(input);
  const stored = await loadReading(key);
  if (stored) return { ok: true, data: stored };
  let r = await api.createReading();
  // 서버에 출생 정보가 없으면(이 기능 전에 입력했거나 서버 저장이 비워진 경우) 저장하고 한 번만 더 요청한다.
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await api.saveProfile(input)).ok) r = await api.createReading();
  // 실패한 것은 보관하지 않는다.
  if (r.ok) await saveReading(key, r.data);
  return r;
}

/** 진행 중인 요청. 같은 출생 정보로 겹쳐 부르면(화면이 두 번 그려지는 경우) 서버는 한 번만 부른다 */
let inflight: { key: string; promise: Promise<ApiResult<Reading>> } | null = null;

function requestReadingOnce(input: BirthInput): Promise<ApiResult<Reading>> {
  const key = keyOf(input);
  if (inflight?.key === key) return inflight.promise;
  const promise = requestReading(input).finally(() => {
    if (inflight?.promise === promise) inflight = null;
  });
  inflight = { key, promise };
  return promise;
}

/**
 * 기기에 받아 둔 요약 해석. 서버를 부르지 않는다(홈에서 한 줄 총평을 보여 줄 때 쓴다).
 * 아직 읽는 중이거나, 받아 둔 글이 없거나, 다른 출생 정보의 글이면 null.
 */
export function useStoredReading(input: BirthInput | null): Reading | null {
  const key = input ? keyOf(input) : null;
  const [stored, setStored] = useState<{ key: string; reading: Reading | null } | null>(null);

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    loadReading(key).then((reading) => {
      if (alive) setStored({ key, reading });
    });
    return () => {
      alive = false;
    };
  }, [key]);

  return stored && stored.key === key ? stored.reading : null;
}

/**
 * 요약 해석. input 이 null 이면(출생 정보·세션을 아직 읽는 중) 요청하지 않고 생성 중으로 둔다.
 * retry 는 실패했을 때 사용자가 누르는 "다시 시도" 다.
 */
export function useReading(input: BirthInput | null) {
  const date = input?.date;
  const time = input?.time;
  const placeId = input?.placeId;
  const key = date === undefined || time === undefined || placeId === undefined ? null : keyOf({ date, time, placeId });
  const [attempt, setAttempt] = useState(0);
  /** 어느 요청(key·attempt)의 결과인지 함께 둔다. 지금 요청의 것이 아니면 생성 중이다 */
  const [settled, setSettled] = useState<{ key: string; attempt: number; result: ApiResult<Reading> } | null>(null);

  useEffect(() => {
    if (date === undefined || time === undefined || placeId === undefined || key === null) return;
    let alive = true;
    requestReadingOnce({ date, time, placeId }).then((result) => {
      if (alive) setSettled({ key, attempt, result });
    });
    return () => {
      alive = false;
    };
  }, [date, time, placeId, key, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const result = settled && settled.key === key && settled.attempt === attempt ? settled.result : null;
  const state: ReadingState = !result
    ? { status: 'loading' }
    : result.ok
      ? { status: 'done', reading: result.data }
      : { status: 'failed', error: result.error };

  return { state, retry };
}
