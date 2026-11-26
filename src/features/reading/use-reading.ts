/**
 * 요약 해석을 받아 오는 상태와 기기 보관. 같은 출생 정보의 글은 한 번 받으면 기기에 두고 다시 요청하지 않는다
 * (같은 차트 = 같은 글이라 다시 생성은 없다). 실패하면 스스로 다시 부르지 않고 사용자가 누를 때만 다시 한다.
 * 글은 서버가 준 그대로 쓴다. 출생 정보와 보관된 값은 로그에 남기지 않는다.
 */
import { useCallback, useEffect, useState } from 'react';

import { getStored, peekStored, setStored } from '@/lib/device-memory';
import { api, isReading, type ApiErrorKind, type ApiResult, type BirthInput, type Reading } from '@/lib/api';
import { GENERATION_MAX_WAIT_MS, withTimeout } from '@/lib/with-timeout';

export const READING_STORAGE_KEY = 'byeolmyeong.reading.v1';

/** 서버에 저장된 출생 정보가 없을 때의 상태(`NO_PROFILE`) */
const NO_PROFILE_STATUS = 404;

export type ReadingState =
  | { status: 'loading' }
  | { status: 'done'; reading: Reading }
  | { status: 'failed'; error: ApiErrorKind };

const keyOf = (input: BirthInput) => JSON.stringify([input.date, input.time, input.placeId]);

/** 보관된 글자에서 이 출생 정보의 글. 없거나 다른 출생 정보의 글이거나 깨졌으면 null */
function parseReading(raw: string | null, key: string): Reading | null {
  try {
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const stored = parsed as Record<string, unknown>;
    return stored.key === key && isReading(stored.reading) ? stored.reading : null;
  } catch {
    return null;
  }
}

/** 이 출생 정보로 받아 둔 글(이번 실행에 읽었으면 메모리에서) */
async function loadReading(key: string): Promise<Reading | null> {
  return parseReading(await getStored(READING_STORAGE_KEY), key);
}

/** 이번 실행에 읽은 글 — 동기(다시 붙은 화면의 첫 그림). 아직 읽지 않았으면 undefined */
function peekReading(key: string): Reading | null | undefined {
  const raw = peekStored(READING_STORAGE_KEY);
  return raw === undefined ? undefined : parseReading(raw, key);
}

async function saveReading(key: string, reading: Reading): Promise<void> {
  try {
    await setStored(READING_STORAGE_KEY, JSON.stringify({ key, reading }));
  } catch {
    // 보관하지 못해도 받은 글은 보여 준다. 다음에 열 때 다시 받는다.
  }
}

async function requestReading(input: BirthInput): Promise<ApiResult<Reading>> {
  const key = keyOf(input);
  const stored = await loadReading(key);
  if (stored) return { ok: true, data: stored };
  // 별명 짓는 중 화면에는 머리가 없어 3분이 넘으면 기다리지 않는다(못 지었을 때로 — 빌드 13)
  let r = await withTimeout(api.createReading(), GENERATION_MAX_WAIT_MS);
  // 서버에 출생 정보가 없으면(이 기능 전에 입력했거나 서버 저장이 비워진 경우) 저장하고 한 번만 더 요청한다.
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await api.saveProfile(input)).ok) r = await withTimeout(api.createReading(), GENERATION_MAX_WAIT_MS);
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
 * 기기에 받아 둔 요약 해석. 서버를 부르지 않는다(홈의 한 줄 총평, 풀이 글 화면의 첫 확인).
 * `checked` 는 기기를 다 찾아봤는가, `reading` 은 찾은 글(없거나 다른 출생 정보의 글이면 null).
 */
export function useStoredReading(input: BirthInput | null): { checked: boolean; reading: Reading | null } {
  const key = input ? keyOf(input) : null;
  const [stored, setFound] = useState<{ key: string; reading: Reading | null } | null>(null);

  useEffect(() => {
    if (key === null) return;
    let alive = true;
    loadReading(key).then((reading) => {
      if (alive) setFound({ key, reading });
    });
    return () => {
      alive = false;
    };
  }, [key]);

  if (stored && stored.key === key) return { checked: true, reading: stored.reading };
  // 이번 실행에 읽었으면 첫 그림부터(탭을 바꿔 다시 붙은 화면 — lib/device-memory)
  const peeked = key === null ? undefined : peekReading(key);
  return peeked === undefined ? { checked: false, reading: null } : { checked: true, reading: peeked };
}

/** 홈 별명 카드에 쓰는 받아 둔 풀이의 한 줄 별명과 만든 때 */
export type StoredHeadline = { headline: string; createdAt: string | null };

/**
 * 이 출생 정보로 받아 둔 풀이의 한 줄 별명(홈 별명 카드 — 결정 047). 서버를 부르지 않는다.
 * 옛 모양(근거 구조가 없는 요약 해석 — 결정 048 의 8 로 글 화면은 다시 받는다)이어도 한 줄 별명은 그대로 보인다:
 * 서버에는 다시 짓지 않고 돌려줄 길(GET)이 없고 `POST /readings` 는 옛 글만 있는 계정이면 새로 지으므로, 홈은 부르지 않고
 * 기기에 있는 별명을 쓴다(업데이트 직후 "아직 별명을 짓지 않았어요" 가 틀리게 보이지 않게 — PR #49 리뷰). 나 · 내 별명을 열면 새 모양으로 바뀐다.
 */
function parseHeadline(raw: string | null, key: string): StoredHeadline | null {
  try {
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const stored = parsed as Record<string, unknown>;
    const reading = stored.reading;
    if (stored.key !== key || typeof reading !== 'object' || reading === null) return null;
    const { headline, createdAt } = reading as Record<string, unknown>;
    if (typeof headline !== 'string' || headline.length === 0) return null;
    return { headline, createdAt: typeof createdAt === 'string' ? createdAt : null };
  } catch {
    return null;
  }
}

async function loadHeadline(key: string): Promise<StoredHeadline | null> {
  return parseHeadline(await getStored(READING_STORAGE_KEY), key);
}

/** `useStoredReading` 과 같은 꼴 — `checked` 는 기기를 다 찾아봤는가, `stored` 는 찾은 별명(없으면 null) */
export function useStoredHeadline(input: BirthInput | null): { checked: boolean; stored: StoredHeadline | null } {
  const key = input ? keyOf(input) : null;
  const [found, setFound] = useState<{ key: string; stored: StoredHeadline | null } | null>(null);
  useEffect(() => {
    if (key === null) return;
    let alive = true;
    loadHeadline(key).then((stored) => {
      if (alive) setFound({ key, stored });
    });
    return () => {
      alive = false;
    };
  }, [key]);
  if (found && found.key === key) return { checked: true, stored: found.stored };
  const raw = key === null ? undefined : peekStored(READING_STORAGE_KEY);
  return raw === undefined || key === null ? { checked: false, stored: null } : { checked: true, stored: parseHeadline(raw, key) };
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

  const peeked = key === null || attempt > 0 ? undefined : peekReading(key);
  // 이번 실행에 받아 둔 글이 메모리에 있으면 첫 그림부터 그 글(요청은 그 글을 그대로 돌려준다)
  const result = settled && settled.key === key && settled.attempt === attempt ? settled.result : peeked ? ({ ok: true, data: peeked } as const) : null;
  const state: ReadingState = !result
    ? { status: 'loading' }
    : result.ok
      ? { status: 'done', reading: result.data }
      : { status: 'failed', error: result.error };

  return { state, retry };
}
