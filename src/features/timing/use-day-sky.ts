/**
 * 그날의 하늘(결정 049 의 6, `POST /day-sky { date }`). 화면을 열 때 한 번 부르고, 처음 만드는 날이면 서버가 그때 써서 저장한다(수십 초 — 동기 응답).
 * 다시 열면 서버의 저장본이 바로 온다. 기기에는 보관하지 않는다(결정 049 의 9 — 오늘 것의 보관은 오늘의 하늘, 계획 A④).
 * 서버에 출생 정보가 없으면(404 `NO_PROFILE`) 저장하고 한 번만 더 부른다. 다시 쓰기(retry)는 사람이 누를 때만 — 스스로 다시 부르지 않는다.
 * 날짜를 빨리 넘기면 생성 한도(429)에 걸릴 수 있다(서버 결정 034) — 화면이 한 줄로 알린다.
 */
import { useCallback, useEffect, useState } from 'react';

import { api, type ApiErrorKind, type ApiResult, type BirthInput, type DaySky } from '@/lib/api';

const NO_PROFILE_STATUS = 404;

/** failed 의 code 는 서버가 적어 준 이름(`DATE_OUT_OF_RANGE` · `INVALID_DATE` · `GENERATION_FAILED`), status 는 상태 번호 */
export type DaySkyState =
  | { status: 'loading' }
  | { status: 'done'; sky: DaySky }
  | { status: 'failed'; error: ApiErrorKind; code?: string; httpStatus?: number };

const keyOf = (date: string, input: BirthInput) => JSON.stringify([date, input.date, input.time, input.placeId]);

async function load(date: string, input: BirthInput): Promise<ApiResult<DaySky>> {
  let r = await api.postDaySky(date);
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await api.saveProfile(input)).ok) r = await api.postDaySky(date);
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

  useEffect(() => {
    if (key === null || date === null || birthDate === undefined || time === undefined || placeId === undefined) return;
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
  }, [key, date, birthDate, time, placeId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const state: DaySkyState = result && result.key === key && result.attempt === attempt ? result.state : { status: 'loading' };
  return { state, retry };
}
