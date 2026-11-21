/**
 * 시기 탭의 이번 달(결정 049 의 2, `GET /timing/month`). 처음에는 달 없이 불러(= 서버의 이번 달) 그 달을 기준(base)으로 삼고,
 * ‹ › 는 기준의 지난달 · 다음 달 사이에서만 옮긴다. 다른 달로 넘기면 그때 부른다(AI 없음 — 서버가 요청 때 계산한다).
 * 처음 받은 이번 달 하나만 기기에 둔다(결정 074 — 049 의 9 대체): `byeolmyeong.monthSky.v1` 에 출생 정보 키와 달력 응답 그대로. 다음에 열면
 * 그것을 바로 그리고 뒤에서 새로 받는다(받으면 바꾸고 다시 둔다, 못 받으면 그대로). 둔 달이 기기의 이번 달(한국 날짜)이 아니면 쓰지 않는다.
 * ‹ › 로 본 달은 두지 않고, 화면이 떠 있는 동안만 기억해 다시 부르지 않는다. 늦게 온 답은 세대 표식이 같을 때만 둔다(로그아웃 뒤 다시 쓰지 않게).
 * 서버에 출생 정보가 없으면(404 `NO_PROFILE`) 저장하고 한 번만 더 부른다. 한 번의 요청은 10초까지만 기다린다(결정 065 의 2).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

import { koreaToday, shiftMonth } from '@/features/timing/dates';
import { api, isMonthSky, type ApiErrorKind, type ApiResult, type BirthInput, type MonthSky } from '@/lib/api';
import { isSameGeneration, storageGeneration } from '@/lib/storage-generation';
import { REQUEST_TIMEOUT_MS, withTimeout } from '@/lib/with-timeout';

/** 처음 받은 이번 달 하나(결정 074). 머리가 `byeolmyeong.` 이라 로그아웃 · 계정 삭제 · 출생 정보 바꾸기가 함께 지운다 */
export const MONTH_SKY_STORAGE_KEY = 'byeolmyeong.monthSky.v1';
const GENERATION_KEY = 'byeolmyeong.monthSkyGen.v1';

/** 한 번의 요청을 기다리는 한도(처음 불러올 때의 10초 — 결정 065 의 2, 공용 withTimeout 의 값) */
export const MONTH_TIMEOUT_MS = REQUEST_TIMEOUT_MS;

const NO_PROFILE_STATUS = 404;

export type MonthState = { status: 'loading' } | { status: 'done'; sky: MonthSky } | { status: 'failed'; error: ApiErrorKind };

const keyOf = (input: BirthInput) => JSON.stringify([input.date, input.time, input.placeId]);

/** 기기에 둔 이번 달: 같은 출생 정보 · 모양이 맞고 · 기기의 이번 달(한국 날짜)인 것만. 달이 바뀌었으면 쓰지 않는다 */
async function readStored(key: string): Promise<MonthSky | null> {
  try {
    const raw = await AsyncStorage.getItem(MONTH_SKY_STORAGE_KEY);
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (typeof v !== 'object' || v === null) return null;
    const stored = v as { key?: unknown; sky?: unknown };
    return stored.key === key && isMonthSky(stored.sky) && stored.sky.month === koreaToday().slice(0, 7) ? stored.sky : null;
  } catch {
    return null;
  }
}

/** month 가 없으면(처음 받는 이번 달) 받은 것을 기기에 둔다 — 요청을 시작할 때의 세대가 그대로일 때만 */
async function load(month: string | undefined, input: BirthInput, key: string): Promise<ApiResult<MonthSky>> {
  const gen = month === undefined ? await storageGeneration(GENERATION_KEY).catch(() => null) : null;
  let r = await withTimeout(api.getMonth(month));
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await withTimeout(api.saveProfile(input))).ok) r = await withTimeout(api.getMonth(month));
  if (r.ok && gen !== null && (await isSameGeneration(GENERATION_KEY, gen)))
    await AsyncStorage.setItem(MONTH_SKY_STORAGE_KEY, JSON.stringify({ key, sky: r.data })).catch(() => undefined);
  return r;
}

/**
 * 앱을 켤 때(홈의 첫 데이터) 이번 달을 한 번 받아 둔다 — 시기 탭을 열면 기다리지 않고 달력(결정 075 의 3). 기기에 이번 달 것이 있으면 부르지 않는다
 * (시기 탭이 열 때 뒤에서 새로 받는다). 못 받아도 조용히 넘어간다.
 */
export async function prefetchMonth(input: BirthInput): Promise<void> {
  const key = keyOf(input);
  if (await readStored(key)) return;
  await load(undefined, input, key);
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
  /** 받은 달(출생 정보|달 → 응답). 화면이 떠 있는 동안만(이번 달은 기기에도) */
  const [cache, setCache] = useState<Record<string, MonthSky>>({});
  /** 기기에 둔 이번 달을 읽은 출생 정보 — 읽기 전에는 부르지 않는다(보관본이 있으면 뒤에서 새로 받는 것 하나만) */
  const [restored, setRestored] = useState<string | null>(null);

  const baseMonth = base && base.key === key ? base.month : null;
  const want = picked && picked.key === key ? picked.month : null;
  const attempt = picked && picked.key === key ? picked.attempt : 0;
  const shown = want ?? baseMonth;
  const cached = key && shown ? cache[`${key}|${shown}`] : undefined;

  // 처음: 기기에 둔 이번 달이 있으면 바로 그리고 뒤에서 새로 받는다(받으면 바꾸고 다시 둔다, 못 받으면 보관본 그대로)
  useEffect(() => {
    if (key === null || date === undefined || time === undefined || placeId === undefined) return;
    let alive = true;
    void readStored(key).then((sky) => {
      if (!alive) return;
      if (sky) {
        setCache((c) => ({ ...c, [`${key}|${sky.month}`]: sky }));
        setBase({ key, month: sky.month });
        void load(undefined, { date, time, placeId }, key).then((r) => {
          if (!alive || !r.ok) return;
          setCache((c) => ({ ...c, [`${key}|${r.data.month}`]: r.data }));
          setBase({ key, month: r.data.month });
        });
      }
      setRestored(key);
    });
    return () => {
      alive = false;
    };
  }, [key, date, time, placeId]);

  useEffect(() => {
    if (key === null || date === undefined || time === undefined || placeId === undefined || restored !== key || cached) return;
    let alive = true;
    void load(want ?? undefined, { date, time, placeId }, key).then((r) => {
      if (!alive) return;
      if (r.ok) {
        setCache((c) => ({ ...c, [`${key}|${r.data.month}`]: r.data }));
        if (want === null) setBase({ key, month: r.data.month });
      } else setFailed({ key, month: want, attempt, error: r.error });
    });
    return () => {
      alive = false;
    };
  }, [key, date, time, placeId, want, attempt, cached, restored]);

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
