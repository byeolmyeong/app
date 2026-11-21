/**
 * 시기 탭의 이번 달(결정 049 의 2, `GET /timing/month`). 처음에는 달 없이 불러(= 서버의 이번 달) 그 달을 기준(base)으로 삼고,
 * ‹ › 는 기준의 지난달 · 다음 달 사이에서만 옮긴다. 다른 달로 넘기면 그때 부른다(AI 없음 — 서버가 요청 때 계산한다).
 * 처음 받은 이번 달 하나만 기기에 둔다(결정 074 — 049 의 9 대체): `byeolmyeong.monthSky.v1` 에 출생 정보 키와 달력 응답 그대로. 다음에 열면
 * 그것을 바로 그리고 뒤에서 새로 받는다(받으면 바꾸고 다시 둔다, 못 받으면 그대로). 둔 달이 기기의 이번 달(한국 날짜)이 아니면 쓰지 않는다.
 * ‹ › 로 본 달은 기기에 두지 않는다. 늦게 온 답은 세대 표식이 같을 때만 둔다(로그아웃 뒤 다시 쓰지 않게).
 * 이번 달을 그리면 ‹ › 가 갈 수 있는 앞뒤 달을 뒤에서 한 번씩 받아 이번 실행 메모리(lib/device-memory)에 둔다 — 넘기면 서버를 기다리지 않는다
 * (소유자 지적 — 처음 넘길 때 버벅임 · 반짝임, 빌드 11). 미리 받기가 실패하면 조용히 넘어가고 넘길 때 다시 부른다. 받는 중에 넘겼으면 그 요청을
 * 같이 기다리고, 그동안 그릴 달(drawn)은 이전 달 그대로다 — 다 받으면 한 번에 바뀐다(뼈대 · 빈 칸으로 깜빡이지 않게).
 * 서버에 출생 정보가 없으면(404 `NO_PROFILE`) 저장하고 한 번만 더 부른다. 한 번의 요청은 10초까지만 기다린다(결정 065 의 2).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { koreaToday, shiftMonth } from '@/features/timing/dates';
import { api, isMonthSky, type ApiErrorKind, type ApiResult, type BirthInput, type MonthSky } from '@/lib/api';
import { getStored, peekStored, setMemoryOnly, setStored } from '@/lib/device-memory';
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
function parseStored(raw: string | null, key: string): MonthSky | null {
  try {
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (typeof v !== 'object' || v === null) return null;
    const stored = v as { key?: unknown; sky?: unknown };
    return stored.key === key && isMonthSky(stored.sky) && stored.sky.month === koreaToday().slice(0, 7) ? stored.sky : null;
  } catch {
    return null;
  }
}

/** 이번 실행에 읽었으면 메모리에서 */
const readStored = async (key: string) => parseStored(await getStored(MONTH_SKY_STORAGE_KEY), key);

/** 앞뒤 달의 이번 실행 메모리 키(기기에는 두지 않는다 — 로그아웃 · 탈퇴 · 출생 정보 바꾸기가 메모리와 함께 비운다) */
const runKey = (key: string, month: string) => `byeolmyeong.monthSkyRun.v1|${key}|${month}`;

/** 이번 실행에 받은 그 달 — 동기. 없거나 모양이 틀리면 null */
function peekRunMonth(key: string, month: string): MonthSky | null {
  try {
    const raw = peekStored(runKey(key, month));
    const v: unknown = raw ? JSON.parse(raw) : null;
    return isMonthSky(v) && v.month === month ? v : null;
  } catch {
    return null;
  }
}

/** 이번 실행에 읽은 이번 달 — 동기(다시 붙은 시기 탭의 첫 그림, lib/device-memory). 모르면 null */
function peekMonth(key: string | null): MonthSky | null {
  if (key === null) return null;
  const raw = peekStored(MONTH_SKY_STORAGE_KEY);
  return raw === undefined ? null : parseStored(raw, key);
}

/** month 가 없으면(처음 받는 이번 달) 받은 것을 기기에 둔다 — 요청을 시작할 때의 세대가 그대로일 때만 */
async function load(month: string | undefined, input: BirthInput, key: string): Promise<ApiResult<MonthSky>> {
  const gen = month === undefined ? await storageGeneration(GENERATION_KEY).catch(() => null) : null;
  let r = await withTimeout(api.getMonth(month));
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await withTimeout(api.saveProfile(input))).ok) r = await withTimeout(api.getMonth(month));
  if (r.ok && gen !== null && (await isSameGeneration(GENERATION_KEY, gen)))
    await setStored(MONTH_SKY_STORAGE_KEY, JSON.stringify({ key, sky: r.data })).catch(() => undefined);
  return r;
}

/** 이번 실행에 받아 두기를 한 것(세대 · 출생 정보) */
const prefetchedMonths = new Set<string>();

/**
 * 앱을 켤 때(홈의 첫 데이터) 이번 달을 한 번 받아 둔다 — 시기 탭을 열면 기다리지 않고 달력(결정 075 의 3). 기기에 이번 달 것이 있으면 부르지 않는다
 * (시기 탭이 열 때 뒤에서 새로 받는다). 못 받아도 조용히 넘어간다.
 */
export async function prefetchMonth(input: BirthInput): Promise<void> {
  const key = keyOf(input);
  // 이번 실행에 한 번 — 탭을 바꿀 때마다 홈이 다시 붙어도 못 받은 것(끊김 · 404)을 거듭 묻지 않는다. 기기를 지우면(세대) 다시(리뷰 #87 의 5)
  const gen = await storageGeneration(GENERATION_KEY).catch(() => null);
  const once = `${gen}|${key}`;
  if (gen === null || prefetchedMonths.has(once)) return;
  prefetchedMonths.add(once);
  if (await readStored(key)) return;
  await load(undefined, input, key);
}


/**
 * input 이 null 이면(출생 정보 · 세션을 아직 읽는 중) 부르지 않는다.
 * base 처음 받은 달 · shown 고른 달(처음 받기 전에는 null) · state 고른 달의 상태 · drawn 그릴 달과 상태(고른 달을 받는 중이면 이전 달 그대로) ·
 * go(±1) 달 옮기기 · retry 못 받은 달을 다시 부르기.
 */
export function useMonth(input: BirthInput | null) {
  const date = input?.date;
  const time = input?.time;
  const placeId = input?.placeId;
  const key = date === undefined || time === undefined || placeId === undefined ? null : keyOf({ date, time, placeId });
  // 이번 실행에 받아 둔 이번 달이 메모리에 있으면 첫 그림부터 달력(탭을 바꿔 다시 붙은 화면)
  const [initial] = useState(() => peekMonth(key));
  const [base, setBase] = useState<{ key: string; month: string } | null>(() => (key !== null && initial ? { key, month: initial.month } : null));
  /** 고른 달(null 이면 처음 받은 달) · 다시 부른 횟수 */
  const [picked, setPicked] = useState<{ key: string; month: string | null; attempt: number } | null>(null);
  const [failed, setFailed] = useState<{ key: string; month: string | null; attempt: number; error: ApiErrorKind } | null>(null);
  /** 받은 달(출생 정보|달 → 응답). 화면이 떠 있는 동안만(이번 달은 기기에도) */
  const [cache, setCache] = useState<Record<string, MonthSky>>(() => (key !== null && initial ? { [`${key}|${initial.month}`]: initial } : {}));
  /** 지금 그린 달 — 고른 달을 받는 중이면 이것을 그대로 그린다 */
  const [drawnMonth, setDrawnMonth] = useState<{ key: string; month: string } | null>(null);
  /** 받는 중인 다른 달(출생 정보|달 → 요청). 미리 받기와 넘길 때가 같은 요청을 함께 기다린다 */
  const inflight = useRef(new Map<string, Promise<ApiResult<MonthSky>>>());
  /** 기기에 둔 이번 달을 읽은 출생 정보 — 읽기 전에는 부르지 않는다(보관본이 있으면 뒤에서 새로 받는 것 하나만) */
  const [restored, setRestored] = useState<string | null>(null);

  const baseMonth = base && base.key === key ? base.month : null;
  const want = picked && picked.key === key ? picked.month : null;
  const attempt = picked && picked.key === key ? picked.attempt : 0;
  const shown = want ?? baseMonth;
  /** 받은 그 달 — 이 화면에서 받은 것, 없으면 이번 실행 메모리(화면이 다시 붙어도 앞뒤 달을 다시 부르지 않게) */
  const skyOf = (month: string | null): MonthSky | undefined =>
    key !== null && month !== null ? (cache[`${key}|${month}`] ?? peekRunMonth(key, month) ?? undefined) : undefined;
  const cached = skyOf(shown);
  if (key !== null && shown !== null && cached && (drawnMonth?.key !== key || drawnMonth.month !== shown)) setDrawnMonth({ key, month: shown });

  /** 다른 달(기준의 앞뒤)을 한 번 부른다 — 받는 중이면 그 요청을 같이 기다리고, 받으면 화면 캐시와 이번 실행 메모리에 둔다 */
  const fetchOther = useCallback(
    (month: string): Promise<ApiResult<MonthSky>> | null => {
      if (key === null || date === undefined || time === undefined || placeId === undefined) return null;
      const id = `${key}|${month}`;
      const running = inflight.current.get(id);
      if (running) return running;
      const request = load(month, { date, time, placeId }, key).then((r) => {
        if (r.ok) {
          setMemoryOnly(runKey(key, r.data.month), JSON.stringify(r.data));
          setCache((c) => ({ ...c, [`${key}|${r.data.month}`]: r.data }));
        }
        return r;
      });
      inflight.current.set(id, request);
      void request.finally(() => {
        if (inflight.current.get(id) === request) inflight.current.delete(id);
      });
      return request;
    },
    [key, date, time, placeId],
  );

  // 이번 달을 그리면 ‹ › 가 갈 수 있는 앞뒤 달을 뒤에서 한 번씩 받아 둔다(이번 실행에 받은 것은 메모리에 있어 부르지 않는다). 실패는 조용히 — 넘길 때 다시 부른다
  useEffect(() => {
    if (key === null || baseMonth === null) return;
    for (const month of [shiftMonth(baseMonth, -1), shiftMonth(baseMonth, 1)]) if (!peekRunMonth(key, month)) void fetchOther(month);
  }, [key, baseMonth, fetchOther]);

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
    const request = want === null ? load(undefined, { date, time, placeId }, key) : fetchOther(want);
    void request?.then((r) => {
      if (!alive) return;
      if (r.ok) {
        setCache((c) => ({ ...c, [`${key}|${r.data.month}`]: r.data }));
        if (want === null) setBase({ key, month: r.data.month });
      } else setFailed({ key, month: want, attempt, error: r.error });
    });
    return () => {
      alive = false;
    };
  }, [key, date, time, placeId, want, attempt, cached, restored, fetchOther]);

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
  // 고른 달을 받는 중이면 이전에 그린 달을 그대로(제목 · 칸 · 점 · 목록이 한 번에 바뀐다 — 제목 · 칸만 먼저 바꾸면 점 · 목록이 비었다 채워져 높이가 두 번 바뀐다).
  // 못 받은 달을 "다시 보기" 로 다시 부를 때(attempt > 0)는 그 달의 자리에서 기다린다(안내 → 이전 달 → 그 달로 오가지 않게)
  const previous = drawnMonth && drawnMonth.key === key ? skyOf(drawnMonth.month) : undefined;
  const drawn: { month: string | null; state: MonthState } =
    state.status === 'loading' && attempt === 0 && previous && drawnMonth
      ? { month: drawnMonth.month, state: { status: 'done', sky: previous } }
      : { month: shown, state };

  return {
    base: baseMonth,
    shown,
    state,
    drawn,
    canPrev: baseMonth !== null && shown !== null && shown > shiftMonth(baseMonth, -1),
    canNext: baseMonth !== null && shown !== null && shown < shiftMonth(baseMonth, 1),
    go,
    retry,
  };
}
