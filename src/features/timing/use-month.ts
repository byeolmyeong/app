/**
 * 시기 탭의 이번 달(결정 049 의 2, `GET /timing/month`). 처음에는 달 없이 불러(= 서버의 이번 달) 그 달을 기준(base)으로 삼고,
 * ‹ › 는 기준의 지난달 · 다음 달 사이에서만 옮긴다. 다른 달로 넘기면 그때 부른다(AI 없음 — 서버가 요청 때 계산한다).
 * 기기에 보관하지 않는다(결정 049 의 9). 화면이 떠 있는 동안 한 번 받은 달은 기억해 두고 다시 부르지 않는다.
 * 서버에 출생 정보가 없으면(404 `NO_PROFILE`) 저장하고 한 번만 더 부른다. 한 번의 요청은 10초까지만 기다린다(결정 065 의 2).
 */
import { useCallback, useEffect, useState } from 'react';

import { shiftMonth } from '@/features/timing/dates';
import { api, type ApiErrorKind, type ApiResult, type BirthInput, type MonthSky } from '@/lib/api';

/** 한 번의 요청을 기다리는 한도(처음 불러올 때의 10초 — 결정 065 의 2) */
export const MONTH_TIMEOUT_MS = 10_000;

const NO_PROFILE_STATUS = 404;

export type MonthState = { status: 'loading' } | { status: 'done'; sky: MonthSky } | { status: 'failed'; error: ApiErrorKind };

const keyOf = (input: BirthInput) => JSON.stringify([input.date, input.time, input.placeId]);

function withTimeout<T>(promise: Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: 'SERVER' }), MONTH_TIMEOUT_MS);
    void promise.then((r) => {
      clearTimeout(timer);
      resolve(r);
    });
  });
}

async function load(month: string | undefined, input: BirthInput): Promise<ApiResult<MonthSky>> {
  let r = await withTimeout(api.getMonth(month));
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await withTimeout(api.saveProfile(input))).ok) r = await withTimeout(api.getMonth(month));
  return r;
}

/**
 * input 이 null 이면(출생 정보 · 세션을 아직 읽는 중) 부르지 않는다.
 * base 처음 받은 달 · shown 보이는 달(처음 받기 전에는 null) · go(±1) 달 옮기기 · retry 못 받은 달을 다시 부르기.
 */
export function useMonth(input: BirthInput | null) {
  const date = input?.date;
  const time = input?.time;
  const placeId = input?.placeId;
  const key = date === undefined || time === undefined || placeId === undefined ? null : keyOf({ date, time, placeId });
  const [base, setBase] = useState<{ key: string; month: string } | null>(null);
  /** 고른 달(null 이면 처음 받은 달) · 다시 부른 횟수 */
  const [picked, setPicked] = useState<{ key: string; month: string | null; attempt: number } | null>(null);
  const [failed, setFailed] = useState<{ key: string; month: string | null; attempt: number; error: ApiErrorKind } | null>(null);
  /** 받은 달(출생 정보|달 → 응답). 화면이 떠 있는 동안만 */
  const [cache, setCache] = useState<Record<string, MonthSky>>({});

  const baseMonth = base && base.key === key ? base.month : null;
  const want = picked && picked.key === key ? picked.month : null;
  const attempt = picked && picked.key === key ? picked.attempt : 0;
  const shown = want ?? baseMonth;
  const cached = key && shown ? cache[`${key}|${shown}`] : undefined;

  useEffect(() => {
    if (key === null || date === undefined || time === undefined || placeId === undefined || cached) return;
    let alive = true;
    void load(want ?? undefined, { date, time, placeId }).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setCache((c) => ({ ...c, [`${key}|${r.data.month}`]: r.data }));
        if (want === null) setBase({ key, month: r.data.month });
      } else setFailed({ key, month: want, attempt, error: r.error });
    });
    return () => {
      alive = false;
    };
  }, [key, date, time, placeId, want, attempt, cached]);

  const go = useCallback(
    (delta: 1 | -1) => {
      if (key === null || !baseMonth || !shown) return;
      const next = shiftMonth(shown, delta);
      if (next < shiftMonth(baseMonth, -1) || next > shiftMonth(baseMonth, 1)) return;
      setPicked({ key, month: next, attempt: 0 });
    },
    [key, baseMonth, shown],
  );

  const retry = useCallback(() => {
    if (key === null) return;
    setPicked((p) => ({ key, month: p && p.key === key ? p.month : null, attempt: (p && p.key === key ? p.attempt : 0) + 1 }));
  }, [key]);

  let state: MonthState = { status: 'loading' };
  if (cached) state = { status: 'done', sky: cached };
  else if (failed && failed.key === key && failed.month === want && failed.attempt === attempt) state = { status: 'failed', error: failed.error };

  return {
    base: baseMonth,
    shown,
    state,
    canPrev: baseMonth !== null && shown !== null && shown > shiftMonth(baseMonth, -1),
    canNext: baseMonth !== null && shown !== null && shown < shiftMonth(baseMonth, 1),
    go,
    retry,
  };
}
