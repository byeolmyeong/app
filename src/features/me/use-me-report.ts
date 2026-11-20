/**
 * 나 탭 풀이(자세한 풀이, 결정 048 의 4 · 8 · 050)를 요청하고 다 쓰일 때까지 확인하는 상태와 기기 보관.
 * 글은 서버가 뒤에서 1분 안팎 동안 쓴다. 쓰는 중에는 화면이 떠 있는 동안만 5초마다 상태를 묻고(`GET /me-report`),
 * 다 썼거나 실패했거나 화면을 떠나면 멈춘다. 만들기(`POST /me-report`)는 사람이 누를 때만 한다 — 연결 복귀 · "다시 보기" 는 상태만 묻는다.
 * 다 쓴 풀이는 출생 정보별로 기기에 두고 다시 열 때 먼저 보여 준 뒤 뒤에서 새로 묻는다(결정 065 의 2). 출생 정보와 글은 로그에 남기지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, isMeReport, type ApiErrorKind, type ApiResult, type BirthInput, type MeReport } from '@/lib/api';

export const ME_REPORT_STORAGE_KEY = 'byeolmyeong.meReport.v1';

/** 쓰는 중일 때 상태를 묻는 주기 */
export const ME_REPORT_POLL_MS = 5000;

/**
 * 한 번의 요청을 기다리는 한도(처음 불러올 때의 10초 — 결정 065 의 2). 넘으면 못 받은 것으로 보고, 늦게 온 답은 버린다.
 * 쓰는 중 화면에는 머리 · 아래 탭이 없어(보드 11-8) 응답이 멈추면 갇히므로 끝없이 기다리지 않는다(리뷰).
 */
export const ME_REPORT_TIMEOUT_MS = 10_000;

/** 쓰는 중을 기다리는 한도(서버의 생성은 1분 안팎, 멈춘 생성은 2분 뒤 FAILED). 넘으면 확인을 멈추고 보드 19(다시 보기 = 상태만)로 */
export const ME_REPORT_MAX_WRITING_MS = 180_000;

/** 서버에 저장된 출생 정보가 없을 때(`NO_PROFILE`) · 받을 수 없을 때(`PURCHASE_REQUIRED`, 1.1.0 예약) */
const NO_PROFILE_STATUS = 404;
const PURCHASE_REQUIRED = 'PURCHASE_REQUIRED';

/**
 * checking 처음 확인하는 중 · none 받기 전(blocked: 서버가 지금은 받을 수 없다고 했다) · unknown 처음 확인을 못 했다(받기 전 화면에 카드 자리 안내) ·
 * writing 쓰는 중 · done 다 씀 · failed 의 stage 는 요청(POST)에서 실패했는지 쓰는 중 확인(GET)에서 실패했는지, error FAILED 는 서버가 끝내 못 썼다는 뜻
 */
export type MeReportView =
  | { status: 'checking' }
  | { status: 'none'; blocked?: boolean }
  | { status: 'unknown'; error: ApiErrorKind }
  | { status: 'writing' }
  | { status: 'done'; report: MeReport }
  | { status: 'failed'; error: ApiErrorKind | 'FAILED'; stage: 'request' | 'poll' };

const keyOf = (input: BirthInput) => JSON.stringify([input.date, input.time, input.placeId]);

/** 한도 안에 오지 않으면 서버 실패로 본다 */
function withTimeout<T>(promise: Promise<ApiResult<T>>): Promise<ApiResult<T>> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve({ ok: false, error: 'SERVER' }), ME_REPORT_TIMEOUT_MS);
    void promise.then((r) => {
      clearTimeout(timer);
      resolve(r);
    });
  });
}

/** 이 출생 정보로 받아 둔 풀이. 없거나 다른 출생 정보의 것이거나 옛 모양이면 null */
async function loadReport(key: string): Promise<MeReport | null> {
  try {
    const raw = await AsyncStorage.getItem(ME_REPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const stored = parsed as Record<string, unknown>;
    return stored.key === key && isMeReport(stored.report) ? stored.report : null;
  } catch {
    return null;
  }
}

async function saveReport(key: string, report: MeReport): Promise<void> {
  try {
    await AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key, report }));
  } catch {
    // 보관하지 못해도 받은 글은 보여 준다. 다음에 열 때 다시 받는다.
  }
}

/** 화면이 떠 있는 동안의 한 벌. 화면을 떠나거나 출생 정보가 바뀌면 alive 가 꺼지고 그 뒤의 응답은 버린다 */
type Run = {
  key: string;
  input: BirthInput;
  alive: boolean;
  /** 요청 중이거나 쓰는 중이라 확인이 돌고 있다. 이때 또 누른 요청 · 다시 보기는 받지 않는다 */
  busy: boolean;
  /** 쓰는 중을 본 뒤의 확인인가(그때의 FAILED 는 "끝내 못 씀", 처음 확인의 FAILED 는 받기 전) */
  polling: boolean;
  /** 쓰는 중을 처음 본 때(기다리는 한도를 잰다). 쓰는 중이 아니면 null */
  writingSince: number | null;
  timer: ReturnType<typeof setTimeout> | null;
  set: (state: MeReportView) => void;
};

function settle(run: Run, state: MeReportView) {
  run.busy = false;
  run.writingSince = null;
  run.set(state);
}

/** `GET /me-report` 를 한 번 부르고 상태를 옮긴다. 쓰는 중이면 주기 뒤에 다시 묻는다 */
async function check(run: Run): Promise<void> {
  const r = await withTimeout(api.getMeReport());
  if (!run.alive) return;
  if (!r.ok) return settle(run, run.polling ? { status: 'failed', error: r.error, stage: 'poll' } : { status: 'unknown', error: r.error });
  const { data } = r;
  if (data.status === 'DONE') {
    await saveReport(run.key, data.report);
    if (run.alive) settle(run, { status: 'done', report: data.report });
  } else if (data.status === 'WRITING') {
    run.busy = true;
    run.polling = true;
    run.writingSince ??= Date.now();
    run.set({ status: 'writing' });
    waitAndCheck(run);
  } else if (data.status === 'FAILED' && run.polling) settle(run, { status: 'failed', error: 'FAILED', stage: 'poll' });
  else settle(run, { status: 'none' });
}

function waitAndCheck(run: Run) {
  // 너무 오래 쓰는 중이면 확인을 멈춘다 — 서버는 계속 쓰고 있을 수 있어 "다시 보기" 는 상태만 묻는다
  if (run.writingSince !== null && Date.now() - run.writingSince >= ME_REPORT_MAX_WRITING_MS)
    return settle(run, { status: 'failed', error: 'SERVER', stage: 'poll' });
  run.timer = setTimeout(() => {
    run.timer = null;
    void check(run);
  }, ME_REPORT_POLL_MS);
}

/** 보관본을 보여 준 뒤 뒤에서 새로 묻는다. 다 쓴 풀이가 아니면(받지 못했어도) 보관본을 그대로 둔다 */
async function refresh(run: Run): Promise<void> {
  const r = await withTimeout(api.getMeReport());
  if (!run.alive || !r.ok || r.data.status !== 'DONE') return;
  await saveReport(run.key, r.data.report);
  if (run.alive) run.set({ status: 'done', report: r.data.report });
}

/** `POST /me-report` 뒤 확인을 시작한다. "자세한 풀이 받기" 와 "다시 쓰기" · "다시 시도"(요청이 끊겼을 때)가 함께 쓴다 */
async function request(run: Run): Promise<void> {
  if (!run.alive || run.busy) return;
  run.busy = true;
  run.polling = true;
  run.writingSince = Date.now();
  run.set({ status: 'writing' });
  let r = await withTimeout(api.requestMeReport());
  if (!run.alive) return;
  // 서버에 출생 정보가 없으면(이 기능 전에 입력했거나 서버 저장이 비워진 경우) 저장하고 한 번만 더 요청한다
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await api.saveProfile(run.input)).ok) r = await withTimeout(api.requestMeReport());
  if (!run.alive) return;
  if (!r.ok) {
    // 받을 수 있는지는 서버가 판정한다(결정 050 의 4) — 1.0.0 에서는 한 줄만 보인다
    if (r.code === PURCHASE_REQUIRED) return settle(run, { status: 'none', blocked: true });
    return settle(run, { status: 'failed', error: r.error, stage: 'request' });
  }
  if (r.data.status === 'DONE') await check(run);
  else if (r.data.status === 'FAILED') settle(run, { status: 'failed', error: 'FAILED', stage: 'request' });
  else waitAndCheck(run);
}

/**
 * 나 탭 풀이. input 이 null 이면(출생 정보 · 세션을 아직 읽는 중) 서버를 부르지 않고 확인 중으로 둔다.
 * start: 받기 · 다시 쓰기, recheck: 상태만 다시 묻기(연결 복귀 · 다시 보기), dismiss: 실패 화면의 "나중에 하기"(받기 전으로).
 */
export function useMeReport(input: BirthInput | null) {
  const date = input?.date;
  const time = input?.time;
  const placeId = input?.placeId;
  const key = date === undefined || time === undefined || placeId === undefined ? null : keyOf({ date, time, placeId });
  const [settled, setSettled] = useState<{ key: string; state: MeReportView } | null>(null);
  const current = useRef<Run | null>(null);

  useEffect(() => {
    if (date === undefined || time === undefined || placeId === undefined || key === null) return;
    const run: Run = {
      key,
      input: { date, time, placeId },
      alive: true,
      busy: false,
      polling: false,
      writingSince: null,
      timer: null,
      set: (state) => setSettled({ key, state }),
    };
    current.current = run;
    loadReport(key).then((stored) => {
      if (!run.alive) return;
      if (!stored) {
        run.busy = true;
        return void check(run);
      }
      run.set({ status: 'done', report: stored });
      void refresh(run);
    });
    return () => {
      run.alive = false;
      if (run.timer) clearTimeout(run.timer);
      if (current.current === run) current.current = null;
    };
  }, [date, time, placeId, key]);

  const start = useCallback(() => {
    if (current.current) void request(current.current);
  }, []);

  const recheck = useCallback(() => {
    const run = current.current;
    if (!run || run.busy) return;
    // 기다리는 동안 또 누르거나 연결 복귀가 겹쳐도 GET 은 하나
    run.busy = true;
    void check(run);
  }, []);

  const dismiss = useCallback(() => {
    const run = current.current;
    if (!run || run.busy) return;
    run.polling = false;
    run.set({ status: 'none' });
  }, []);

  const state: MeReportView = settled && settled.key === key ? settled.state : { status: 'checking' };
  return { state, start, recheck, dismiss };
}
