/**
 * 오늘의 하늘(결정 051): 홈의 오늘의 하늘 카드와 `/today` 가 함께 쓴다. `POST /day-sky` 를 날짜 없이 부르면 서버가 한국 날짜의 오늘 것을 준다 —
 * 그날 처음이면 서버가 그때 써서 저장하고(수십 초, 동기 응답), 다시 부르면 저장본이 바로 온다.
 * 받은 글은 그날 동안 기기에 둔다(`byeolmyeong.daySky.v1` — 마지막에 받은 것 하나, 출생 정보와 함께). 다시 열면 그것을 먼저 그리고 서버를 부르지 않는다
 * (같은 날 · 같은 차트는 서버도 같은 글이다). 받아 둔 날이 오늘(기기의 한국 날짜)이 아니면 지난날 것은 그리지 않고 다시 부른다 — 화면이 보일 때 · 앱으로 돌아올 때도 견준다.
 * 홈 카드와 오늘의 하늘이 같은 때 열려도 서버에는 한 번만 묻는다(같은 출생 정보의 요청을 함께 기다린다).
 * 서버에 출생 정보가 없으면(404 `NO_PROFILE`) 저장하고 한 번만 더 부른다. 다시 쓰기(retry)는 사람이 누를 때만 — 스스로 다시 부르지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { koreaToday } from '@/features/timing/dates';
import { api, isDaySky, type ApiErrorKind, type ApiResult, type BirthInput, type DaySky } from '@/lib/api';

export const DAY_SKY_STORAGE_KEY = 'byeolmyeong.daySky.v1';
const NO_PROFILE_STATUS = 404;

/** failed 의 code 는 서버가 적어 준 이름(`GENERATION_FAILED` · `NO_PROFILE` …), httpStatus 는 상태 번호 */
export type TodaySkyState =
  | { status: 'loading' }
  | { status: 'done'; sky: DaySky }
  | { status: 'failed'; error: ApiErrorKind; code?: string; httpStatus?: number };

type Stored = { key: string; sky: DaySky };

const keyOf = (input: BirthInput) => JSON.stringify([input.date, input.time, input.placeId]);

/** 기기에 둔 것: 같은 출생 정보 · 모양이 맞는 것만. 날짜는 쓰는 쪽이 오늘과 견준다 */
async function readStored(key: string): Promise<DaySky | null> {
  try {
    const raw = await AsyncStorage.getItem(DAY_SKY_STORAGE_KEY);
    const v: unknown = raw ? JSON.parse(raw) : null;
    if (typeof v !== 'object' || v === null) return null;
    const stored = v as Partial<Stored>;
    return stored.key === key && isDaySky(stored.sky) ? stored.sky : null;
  } catch {
    return null;
  }
}

/** 같은 출생 정보로 서버를 기다리는 중인 요청(홈 카드 · 오늘의 하늘이 함께 기다린다) */
const pending = new Map<string, Promise<ApiResult<DaySky>>>();

/** fresh 면 기다리는 요청이 있어도 새로 묻는다(사람이 누른 "다시 쓰기" — 멈춘 요청에 묶이지 않게) */
function load(key: string, input: BirthInput, fresh: boolean): Promise<ApiResult<DaySky>> {
  const running = pending.get(key);
  if (running && !fresh) return running;
  const request = (async () => {
    let r = await api.postDaySky();
    if (!r.ok && r.status === NO_PROFILE_STATUS && (await api.saveProfile(input)).ok) r = await api.postDaySky();
    if (r.ok) await AsyncStorage.setItem(DAY_SKY_STORAGE_KEY, JSON.stringify({ key, sky: r.data } satisfies Stored)).catch(() => undefined);
    return r;
  })().finally(() => {
    if (pending.get(key) === request) pending.delete(key);
  });
  pending.set(key, request);
  return request;
}

/** input 이 null 이면(출생 정보 · 세션을 읽는 중) 부르지 않는다 */
export function useTodaySky(input: BirthInput | null) {
  const key = input ? keyOf(input) : null;
  const [state, setState] = useState<TodaySkyState>({ status: 'loading' });
  /** 지금 그린 글의 날짜 — 화면이 보일 때 · 앱으로 돌아올 때 오늘과 견준다 */
  const shownDate = useRef<string | null>(null);
  const latest = useRef(0);

  const fetchToday = useCallback((fresh = false) => {
    if (key === null) return;
    const [date, time, placeId] = JSON.parse(key) as [string, string | null, number | null];
    const mine = ++latest.current;
    setState({ status: 'loading' });
    void load(key, { date, time, placeId }, fresh).then((r) => {
      if (latest.current !== mine) return;
      if (r.ok) shownDate.current = r.data.date;
      setState(r.ok ? { status: 'done', sky: r.data } : { status: 'failed', error: r.error, code: r.code, httpStatus: r.status });
    });
  }, [key]);

  // 처음: 기기에 둔 오늘 것이 있으면 그것만 그린다. 없거나 지난날 것이면 서버에 묻는다
  useEffect(() => {
    if (key === null) return;
    let alive = true;
    const requests = latest;
    void readStored(key).then((stored) => {
      if (!alive) return;
      if (stored && stored.date === koreaToday()) {
        shownDate.current = stored.date;
        setState({ status: 'done', sky: stored });
      } else fetchToday();
    });
    return () => {
      alive = false;
      // 출생 정보가 바뀌거나 떠나면 기다리던 답을 버린다
      requests.current++;
    };
  }, [key, fetchToday]);

  // 날이 바뀌었으면 다시 부른다: 화면이 다시 보일 때 · 앱으로 돌아올 때(앱을 켜 둔 채 자정을 넘긴 다음 날 아침)
  const recheckDay = useCallback(() => {
    if (shownDate.current !== null && shownDate.current !== koreaToday()) fetchToday();
  }, [fetchToday]);
  useFocusEffect(recheckDay);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') recheckDay();
    });
    return () => sub.remove();
  }, [recheckDay]);

  /** 못 썼을 때의 "다시 쓰기" · 연결이 돌아왔을 때 — 늘 새로 묻는다 */
  const retry = useCallback(() => fetchToday(true), [fetchToday]);
  return { state, retry };
}

/**
 * 받아 둔 날이면 서버가 곧바로 준다 — 이만큼 넘게 기다리면 그날을 처음 쓰는 중으로 보고 쓰는 중 모양으로 바꾼다(그날의 하늘 화면과 같은 기준).
 * 서버는 쓰는 중인지 알려 주지 않는다(동기 응답).
 */
const WRITING_AFTER_MS = 3000;

/** loading 이 3초 넘게 이어졌는가(쓰는 중으로 볼 때) */
export function useWritingAfter(loading: boolean): boolean {
  const [writing, setWriting] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setWriting(true), WRITING_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setWriting(false);
    };
  }, [loading]);
  return writing;
}
