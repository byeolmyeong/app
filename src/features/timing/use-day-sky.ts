/**
 * 그날의 하늘(결정 049 의 6, `POST /day-sky { date }`). 화면을 열 때 한 번 부르고, 처음 만드는 날이면 서버가 그때 써서 저장한다(수십 초 — 동기 응답).
 * 다시 열면 서버의 저장본이 바로 온다. 기기에는 보관하지 않는다(결정 049 의 9 — 오늘 것의 보관은 오늘의 하늘, 계획 A④).
 * 이번 실행에서 받은 날은 메모리(lib/device-memory)에 두어 다시 열면 첫 그림부터 글이고 다시 부르지 않는다(빌드 10 — 한 번 쓴 날의 글은 바뀌지 않고,
 * 출생 정보가 다르면 다른 키, 로그아웃 · 탈퇴 · 출생 정보 바꾸기가 비운다).
 * 서버에 출생 정보가 없으면(404 `NO_PROFILE`) 저장하고 한 번만 더 부른다. 다시 쓰기(retry)는 사람이 누를 때만 — 스스로 다시 부르지 않는다.
 * 날짜를 빨리 넘기면 생성 한도(429)에 걸릴 수 있다(서버 결정 034) — 화면이 한 줄로 알린다.
 * 한 번의 요청은 3분까지만 기다린다 — 쓰는 중 화면에는 머리(뒤로)가 없어 응답이 멈추면 갇히므로(소유자 지적 2026-11-21, 자세한 풀이의 3분과 같이).
 */
import { useCallback, useEffect, useMemo, useState } from 'react';

import { daySkyMadeGeneration, markDaySkyMade, wasDaySkyMade } from '@/features/timing/day-sky-made';
import { api, type ApiErrorKind, type ApiResult, type BirthInput, type DaySky } from '@/lib/api';
import { peekStored, setMemoryOnly } from '@/lib/device-memory';
import { withTimeout } from '@/lib/with-timeout';

const NO_PROFILE_STATUS = 404;

/** 한 번의 요청(그날을 처음 쓰면 수십 초)을 기다리는 한도. 넘으면 서버 실패로 보고(못 썼을 때 — 다시 쓰기 · 나중에 하기) 늦게 온 답은 버린다 */
export const DAY_SKY_MAX_WAIT_MS = 180_000;

/** failed 의 code 는 서버가 적어 준 이름(`DATE_OUT_OF_RANGE` · `INVALID_DATE` · `GENERATION_FAILED`), status 는 상태 번호 */
export type DaySkyState =
  | { status: 'loading' }
  | { status: 'done'; sky: DaySky }
  | { status: 'failed'; error: ApiErrorKind; code?: string; httpStatus?: number };

const keyOf = (date: string, input: BirthInput) => JSON.stringify([date, input.date, input.time, input.placeId]);

const birthKeyOf = (input: BirthInput) => JSON.stringify([input.date, input.time, input.placeId]);

const memoryKeyOf = (key: string) => `byeolmyeong.daySky.memory:${key}`;

/** 이번 실행에서 받아 둔 그날(없으면 null) — 동기, 첫 그림에 쓴다 */
function remembered(key: string | null, date: string | null): DaySky | null {
  const raw = key === null ? undefined : peekStored(memoryKeyOf(key));
  if (!raw) return null;
  try {
    const sky = JSON.parse(raw) as DaySky;
    return sky.date === date ? sky : null;
  } catch {
    return null;
  }
}

async function load(date: string, input: BirthInput): Promise<ApiResult<DaySky>> {
  const gen = await daySkyMadeGeneration();
  let r = await withTimeout(api.postDaySky(date), DAY_SKY_MAX_WAIT_MS);
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await api.saveProfile(input)).ok) r = await withTimeout(api.postDaySky(date), DAY_SKY_MAX_WAIT_MS);
  // 받은 날을 기억한다 — 다음에 열면 만든 적 있는 날이라 늦을 때만 뼈대(결정 075 의 2). 이번 실행 동안은 글도 메모리에(그 사이 기기를 지웠으면 두지 않는다)
  if (r.ok && (await markDaySkyMade(birthKeyOf(input), date, gen))) setMemoryOnly(memoryKeyOf(keyOf(date, input)), JSON.stringify(r.data));
  return r;
}

/** date 나 input 이 null 이면(주소가 틀렸거나 출생 정보 · 세션을 읽는 중) 부르지 않는다 */
export function useDaySky(date: string | null, input: BirthInput | null) {
  const birthDate = input?.date;
  const time = input?.time;
  const placeId = input?.placeId;
  const key = date === null || birthDate === undefined || time === undefined || placeId === undefined ? null : keyOf(date, { date: birthDate, time, placeId });
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ key: string; attempt: number; state: DaySkyState } | null>(null);
  /** 이 날을 이 기기에서 받은 적이 있는가(결정 075 — 없으면 뼈대 없이 곧바로 만드는 중). 읽기 전에는 null */
  const [made, setMade] = useState<{ key: string; made: boolean } | null>(null);
  const kept = useMemo(() => remembered(key, date), [key, date]);

  useEffect(() => {
    if (kept || key === null || date === null || birthDate === undefined || time === undefined || placeId === undefined) return;
    let alive = true;
    void wasDaySkyMade(birthKeyOf({ date: birthDate, time, placeId }), date).then((m) => {
      if (alive) setMade({ key, made: m });
    });
    return () => {
      alive = false;
    };
  }, [kept, key, date, birthDate, time, placeId]);

  useEffect(() => {
    // 이번 실행에서 받아 둔 날은 부르지 않는다(다시 쓰기는 못 썼을 때만 있다)
    if ((kept && attempt === 0) || key === null || date === null || birthDate === undefined || time === undefined || placeId === undefined) return;
    let alive = true;
    void load(date, { date: birthDate, time, placeId }).then((r) => {
      if (!alive) return;
      setResult({
        key,
        attempt,
        state: r.ok ? { status: 'done', sky: r.data } : { status: 'failed', error: r.error, code: r.code, httpStatus: r.status },
      });
    });
    return () => {
      alive = false;
    };
  }, [kept, key, date, birthDate, time, placeId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const state: DaySkyState =
    result && result.key === key && result.attempt === attempt
      ? result.state
      : kept && attempt === 0
        ? { status: 'done', sky: kept }
        : { status: 'loading' };
  return { state, retry, made: made && made.key === key ? made.made : null };
}
