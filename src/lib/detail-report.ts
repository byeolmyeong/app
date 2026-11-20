/**
 * 자세한 풀이(나 탭 풀이 · 시기 풀이 — 결정 050)를 요청하고 다 쓰일 때까지 확인하는 상태와 기기 보관. 서버의 같은 생성 고리라(서버 결정 029)
 * 규칙도 하나다: 쓰는 중에는 화면이 떠 있는 동안만 5초마다 상태를 묻고(GET), 다 썼거나 실패했거나 화면을 떠나면 멈춘다(3분이 넘도록 쓰는 중이면
 * 확인을 멈추고 "다시 보기" 는 상태만). 만들기(POST)는 사람이 누를 때만 — 연결 복귀 · "다시 보기" 는 상태만 묻는다. 서버에 출생 정보가 없으면
 * 저장하고 한 번만 더, 받을 수 없으면(402 PURCHASE_REQUIRED, 1.1.0 예약) 받기 전 + 막힘. 다 쓴 풀이는 출생 정보별로 그 풀이의 보관 키에 두고
 * 다시 열 때 먼저 보여 준 뒤 뒤에서 새로 묻는다(결정 065 의 2). 풀이마다 다른 것(경로 쌍 · 보관 키 · 검사 함수)은 config 로 받는다.
 * 쓰는 곳: 나 탭 풀이(features/me/use-me-report) · 시기 풀이(features/timing/use-timing-report). 출생 정보와 글은 로그에 남기지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, type ApiErrorKind, type ApiResult, type BirthInput } from '@/lib/api';
import { withTimeout } from '@/lib/with-timeout';

/** 쓰는 중일 때 상태를 묻는 주기 */
export const DETAIL_REPORT_POLL_MS = 5000;

/** 쓰는 중을 기다리는 한도(서버의 생성은 1분 안팎, 멈춘 생성은 2분 뒤 FAILED). 넘으면 확인을 멈추고 보드 19(다시 보기 = 상태만)로 */
export const DETAIL_REPORT_MAX_WRITING_MS = 180_000;

/** 서버에 저장된 출생 정보가 없을 때(`NO_PROFILE`) · 받을 수 없을 때(`PURCHASE_REQUIRED`, 1.1.0 예약) */
const NO_PROFILE_STATUS = 404;
const PURCHASE_REQUIRED = 'PURCHASE_REQUIRED';

/** 상태 GET 의 응답: 풀이는 DONE 일 때만 */
export type DetailReportState<R> = { status: 'NONE' | 'WRITING' | 'FAILED' } | { status: 'DONE'; report: R };

/** 풀이마다 다른 것: 상태 GET · 만들기 POST(api 를 부르는 함수 — 시험의 가짜가 바꿔 끼운다) · 기기 보관 키 · 보관본의 검사 함수 */
export type DetailReportConfig<R> = {
  storageKey: string;
  get: () => Promise<ApiResult<DetailReportState<R>>>;
  request: () => Promise<ApiResult<{ status: 'WRITING' | 'DONE' | 'FAILED' }>>;
  isReport: (v: unknown) => v is R;
};

/**
 * checking 처음 확인하는 중 · none 받기 전(blocked: 서버가 지금은 받을 수 없다고 했다) · unknown 처음 확인을 못 했다(카드 자리 안내 —
 * code 는 상태 번호: 404 는 서버에 그 경로가 아직 없다는 뜻이라 홈은 칸을 숨긴다, 계획 "위험") ·
 * writing 쓰는 중 · done 다 씀 · failed 의 stage 는 요청(POST)에서 실패했는지 쓰는 중 확인(GET)에서 실패했는지, error FAILED 는 서버가 끝내 못 썼다는 뜻
 */
export type DetailReportView<R> =
  | { status: 'checking' }
  | { status: 'none'; blocked?: boolean }
  | { status: 'unknown'; error: ApiErrorKind; code?: number }
  | { status: 'writing' }
  | { status: 'done'; report: R }
  | { status: 'failed'; error: ApiErrorKind | 'FAILED'; stage: 'request' | 'poll' };

const keyOf = (input: BirthInput) => JSON.stringify([input.date, input.time, input.placeId]);

/** 이 출생 정보로 받아 둔 풀이. 없거나 다른 출생 정보의 것이거나 옛 모양이면 null */
async function loadReport<R>(config: DetailReportConfig<R>, key: string): Promise<R | null> {
  try {
    const raw = await AsyncStorage.getItem(config.storageKey);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const stored = parsed as Record<string, unknown>;
    return stored.key === key && config.isReport(stored.report) ? stored.report : null;
  } catch {
    return null;
  }
}

async function saveReport<R>(config: DetailReportConfig<R>, key: string, report: R): Promise<void> {
  try {
    await AsyncStorage.setItem(config.storageKey, JSON.stringify({ key, report }));
  } catch {
    // 보관하지 못해도 받은 글은 보여 준다. 다음에 열 때 다시 받는다.
  }
}

/** 화면이 떠 있는 동안의 한 벌. 화면을 떠나거나 출생 정보가 바뀌면 alive 가 꺼지고 그 뒤의 응답은 버린다 */
type Run<R> = {
  config: DetailReportConfig<R>;
  key: string;
  input: BirthInput;
  alive: boolean;
  /** 요청 중이거나 쓰는 중이라 확인이 돌고 있다. 이때 또 누른 요청 · 다시 보기는 받지 않는다 */
  busy: boolean;
  /** 쓰는 중을 본 뒤의 확인인가(그때의 FAILED 는 "끝내 못 씀", 처음 확인의 FAILED 는 받기 전) */
  polling: boolean;
  /** 쓰는 중이면 5초마다 다시 묻는가. 상태만 보는 곳(홈의 시기 칸)은 한 번만 묻는다 */
  poll: boolean;
  /** 쓰는 중을 처음 본 때(기다리는 한도를 잰다). 쓰는 중이 아니면 null */
  writingSince: number | null;
  timer: ReturnType<typeof setTimeout> | null;
  set: (state: DetailReportView<R>) => void;
};

function settle<R>(run: Run<R>, state: DetailReportView<R>) {
  run.busy = false;
  run.writingSince = null;
  run.set(state);
}

/** 상태(GET)를 한 번 묻고 옮긴다. 쓰는 중이면 주기 뒤에 다시 묻는다 */
async function check<R>(run: Run<R>): Promise<void> {
  const r = await withTimeout(run.config.get());
  if (!run.alive) return;
  if (!r.ok)
    return settle(run, run.polling ? { status: 'failed', error: r.error, stage: 'poll' } : { status: 'unknown', error: r.error, code: r.status });
  const { data } = r;
  if (data.status === 'DONE') {
    await saveReport(run.config, run.key, data.report);
    if (run.alive) settle(run, { status: 'done', report: data.report });
  } else if (data.status === 'WRITING') {
    // 상태만 보는 곳은 쓰는 중이라는 것만 알고 더 묻지 않는다(다른 화면에 덮여도 묻거나 3분 뒤 실패로 굳지 않게 — 리뷰 #63)
    if (!run.poll) return settle(run, { status: 'writing' });
    run.busy = true;
    run.polling = true;
    run.writingSince ??= Date.now();
    run.set({ status: 'writing' });
    waitAndCheck(run);
  } else if (data.status === 'FAILED' && run.polling) settle(run, { status: 'failed', error: 'FAILED', stage: 'poll' });
  else settle(run, { status: 'none' });
}

function waitAndCheck<R>(run: Run<R>) {
  // 너무 오래 쓰는 중이면 확인을 멈춘다 — 서버는 계속 쓰고 있을 수 있어 "다시 보기" 는 상태만 묻는다
  if (run.writingSince !== null && Date.now() - run.writingSince >= DETAIL_REPORT_MAX_WRITING_MS)
    return settle(run, { status: 'failed', error: 'SERVER', stage: 'poll' });
  run.timer = setTimeout(() => {
    run.timer = null;
    void check(run);
  }, DETAIL_REPORT_POLL_MS);
}

/** 보관본(또는 보던 풀이)을 둔 채 뒤에서 새로 묻는다. 다 쓴 풀이가 아니면(받지 못했어도) 보던 것을 그대로 둔다 */
async function refreshQuietly<R>(run: Run<R>): Promise<void> {
  const r = await withTimeout(run.config.get());
  if (!run.alive || !r.ok || r.data.status !== 'DONE') return;
  await saveReport(run.config, run.key, r.data.report);
  if (run.alive) run.set({ status: 'done', report: r.data.report });
}

/** 만들기(POST) 뒤 확인을 시작한다. "자세한 풀이 받기" 와 "다시 쓰기" · "다시 시도"(요청이 끊겼을 때)가 함께 쓴다 */
async function request<R>(run: Run<R>): Promise<void> {
  if (!run.alive || run.busy) return;
  run.busy = true;
  run.polling = true;
  run.writingSince = Date.now();
  run.set({ status: 'writing' });
  let r = await withTimeout(run.config.request());
  if (!run.alive) return;
  // 서버에 출생 정보가 없으면(이 기능 전에 입력했거나 서버 저장이 비워진 경우) 저장하고 한 번만 더 요청한다
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await withTimeout(api.saveProfile(run.input))).ok) r = await withTimeout(run.config.request());
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
 * 자세한 풀이 하나. config 는 그 풀이의 경로 쌍(get · request) · 보관 키 · 검사 함수 — 모듈에 한 번 만든 값을 넘긴다(바뀌지 않게).
 * input 이 null 이면(출생 정보 · 세션을 아직 읽는 중) 서버를 부르지 않고 확인 중으로 둔다.
 * start: 받기 · 다시 쓰기, recheck: 상태만 다시 묻기(연결 복귀 · 다시 보기), dismiss: 실패 화면의 "나중에 하기"(받기 전으로).
 * poll: false 면 쓰는 중이어도 5초마다 묻지 않는다 — 홈의 시기 칸처럼 상태만 보는 곳(홈은 열릴 때마다 새로 묻는다).
 */
export function useDetailReport<R>(config: DetailReportConfig<R>, input: BirthInput | null, { poll = true }: { poll?: boolean } = {}) {
  const date = input?.date;
  const time = input?.time;
  const placeId = input?.placeId;
  const key = date === undefined || time === undefined || placeId === undefined ? null : keyOf({ date, time, placeId });
  const [settled, setSettled] = useState<{ key: string; state: DetailReportView<R> } | null>(null);
  const current = useRef<Run<R> | null>(null);

  useEffect(() => {
    if (date === undefined || time === undefined || placeId === undefined || key === null) return;
    const run: Run<R> = {
      config,
      key,
      input: { date, time, placeId },
      alive: true,
      busy: false,
      polling: false,
      poll,
      writingSince: null,
      timer: null,
      set: (state) => setSettled({ key, state }),
    };
    current.current = run;
    loadReport(config, key).then((stored) => {
      if (!run.alive) return;
      if (!stored) {
        run.busy = true;
        return void check(run);
      }
      run.set({ status: 'done', report: stored });
      void refreshQuietly(run);
    });
    return () => {
      run.alive = false;
      if (run.timer) clearTimeout(run.timer);
      if (current.current === run) current.current = null;
    };
  }, [config, date, time, placeId, key, poll]);

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

  /**
   * 다 받은 풀이를 보던 중 연결이 돌아왔을 때 조용히 새로 받는다(결정 061 의 4). 못 받거나 다 쓴 풀이가 아니면 보던 것을 그대로 둔다
   * — 상태 확인(recheck)과 달리 화면을 실패로 바꾸지 않는다. 겹쳐 부르지 않는다.
   */
  const refresh = useCallback(() => {
    const run = current.current;
    if (!run || run.busy) return;
    run.busy = true;
    void refreshQuietly(run).finally(() => {
      run.busy = false;
    });
  }, []);

  const dismiss = useCallback(() => {
    const run = current.current;
    if (!run || run.busy) return;
    run.polling = false;
    run.set({ status: 'none' });
  }, []);

  const state: DetailReportView<R> = settled && settled.key === key ? settled.state : { status: 'checking' };
  return { state, start, recheck, refresh, dismiss };
}
