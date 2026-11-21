/**
 * 자세한 풀이(나 탭 풀이 · 시기 풀이 — 결정 050)를 요청하고 다 쓰일 때까지 확인하는 상태와 기기 보관. 서버의 같은 생성 고리라(서버 결정 029)
 * 규칙도 하나다: 쓰는 중에는 화면이 떠 있는 동안만 5초마다 상태를 묻고(GET), 다 썼거나 실패했거나 화면을 떠나면 멈춘다(3분이 넘도록 쓰는 중이면
 * 확인을 멈추고 "다시 보기" 는 상태만). 만들기(POST)는 사람이 누를 때만 — 연결 복귀 · "다시 보기" 는 상태만 묻는다. 서버에 출생 정보가 없으면
 * 저장하고 한 번만 더, 받을 수 없으면(402 PURCHASE_REQUIRED, 1.1.0 예약) 받기 전 + 막힘.
 * 기기 보관(출생 정보별, 그 풀이의 보관 키 하나): 다 쓴 풀이와(rememberStatus 면) 받기 전 · 쓰는 중 기억을 따로 둔다 — 다시 열면 풀이가 있으면 풀이를,
 * 없으면 기억한 받기 전 · 쓰는 중을 곧바로 보인 뒤 뒤에서 확인한다(뼈대는 둘 다 없을 때만 — 결정 065 의 2 · 075). 늦게 온 앞의 답은 요청 번호로 버리고,
 * 그 사이 기기를 지웠으면(세대 표식) 늦은 답을 두지 않는다(리뷰 #87). 앱을 켤 때는 prefetchDetailReport 가 이번 실행에 한 번 상태를 받아 둔다.
 * 풀이마다 다른 것(경로 쌍 · 보관 키 · 검사 함수 · 기억 여부)은 config 로 받는다.
 * 쓰는 곳: 나 탭 풀이(features/me/use-me-report) · 시기 풀이(features/timing/use-timing-report). 출생 정보와 글은 로그에 남기지 않는다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, type ApiErrorKind, type ApiResult, type BirthInput } from '@/lib/api';
import { getStored, peekStored, setStored } from '@/lib/device-memory';
import { isSameGeneration, storageGeneration } from '@/lib/storage-generation';
import { withTimeout } from '@/lib/with-timeout';

/** 쓰는 중일 때 상태를 묻는 주기 */
export const DETAIL_REPORT_POLL_MS = 5000;

/** 쓰는 중을 기다리는 한도(서버의 생성은 1분 안팎, 멈춘 생성은 2분 뒤 FAILED). 넘으면 확인을 멈추고 보드 19(다시 보기 = 상태만)로 */
export const DETAIL_REPORT_MAX_WRITING_MS = 180_000;

/** 서버에 저장된 출생 정보가 없을 때(`NO_PROFILE`) · 받을 수 없을 때(`PURCHASE_REQUIRED`, 1.1.0 예약) */
const NO_PROFILE_STATUS = 404;
/** 상태 GET 의 404: 서버에 그 경로가 아직 없다(기억한 상태보다 앞선다) */
const NOT_FOUND = 404;
const PURCHASE_REQUIRED = 'PURCHASE_REQUIRED';

/** 상태 GET 의 응답: 풀이는 DONE 일 때만 */
export type DetailReportState<R> = { status: 'NONE' | 'WRITING' | 'FAILED' } | { status: 'DONE'; report: R };

/** 풀이마다 다른 것: 상태 GET · 만들기 POST(api 를 부르는 함수 — 시험의 가짜가 바꿔 끼운다) · 기기 보관 키 · 보관본의 검사 함수 */
export type DetailReportConfig<R> = {
  storageKey: string;
  get: () => Promise<ApiResult<DetailReportState<R>>>;
  request: () => Promise<ApiResult<{ status: 'WRITING' | 'DONE' | 'FAILED' }>>;
  isReport: (v: unknown) => v is R;
  /** 받기 전 · 쓰는 중이라는 상태도 기기에 두고 다시 열 때 곧바로 보이는가(시기 — 뼈대 없이 받기 화면으로, 소유자 지적 2026-11-21) */
  rememberStatus?: boolean;
};

/**
 * 기기에 둔 것: 다 쓴 풀이와(rememberStatus) 받기 전 · 쓰는 중이라는 상태 — 따로 둔다. 다 쓴 풀이를 둔 뒤 다시 받기(쓰는 중)를 기억해도
 * 풀이는 남아 다음에 열 때 곧바로 그린다(결정 075). 둘 다 없으면 null
 */
type Stored<R> = { report?: R; status?: 'NONE' | 'WRITING' };

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

/** 보관된 글자에서 이 출생 정보의 것. 없거나 다른 출생 정보의 것이거나 옛 모양이면 null */
function parseStored<R>(config: DetailReportConfig<R>, key: string, raw: string | null): Stored<R> | null {
  try {
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const stored = parsed as Record<string, unknown>;
    if (stored.key !== key) return null;
    const report = config.isReport(stored.report) ? stored.report : undefined;
    const status = config.rememberStatus && (stored.status === 'NONE' || stored.status === 'WRITING') ? stored.status : undefined;
    return report === undefined && status === undefined ? null : { report, status };
  } catch {
    return null;
  }
}

/** 이 출생 정보로 기기에 둔 것(이번 실행에 읽었으면 메모리에서) */
async function loadStored<R>(config: DetailReportConfig<R>, key: string): Promise<Stored<R> | null> {
  return parseStored(config, key, await getStored(config.storageKey));
}

/** 이번 실행에 읽은 것으로 그릴 첫 화면 — 동기(다시 붙은 화면의 첫 그림, lib/device-memory). 모르면 null */
function peekView<R>(config: DetailReportConfig<R>, key: string): DetailReportView<R> | null {
  const raw = peekStored(config.storageKey);
  if (raw === undefined) return null;
  const stored = parseStored(config, key, raw);
  if (!stored) return null;
  if (stored.report !== undefined) return { status: 'done', report: stored.report };
  return stored.status === 'NONE' ? { status: 'none' } : stored.status === 'WRITING' ? { status: 'writing' } : null;
}

/** 세대 표식의 키 — 풀이마다 따로(보관 키에 붙인다, 머리가 `byeolmyeong.` 이라 기기를 지우면 함께 지워진다) */
const generationKeyOf = (config: DetailReportConfig<unknown>) => `${config.storageKey}.gen`;

/** 이 화면이 열릴 때의 세대가 그대로인가 — 그 사이 로그아웃 · 탈퇴 · 출생 정보 바꾸기로 기기를 지웠으면 늦은 답을 두지 않는다(리뷰 #87) */
const canWrite = <R,>(run: Run<R>) => run.gen !== null && isSameGeneration(generationKeyOf(run.config as DetailReportConfig<unknown>), run.gen);

async function saveReport<R>(run: Run<R>, report: R): Promise<void> {
  run.storedReport = report;
  if (!(await canWrite(run))) return;
  try {
    await setStored(run.config.storageKey, JSON.stringify({ key: run.key, report }));
  } catch {
    // 보관하지 못해도 받은 글은 보여 준다. 다음에 열 때 다시 받는다.
  }
}

/** 받기 전 · 쓰는 중이라는 상태를 둔다(rememberStatus 일 때만, 바뀔 때만 — 쓰는 중 확인마다 쓰지 않는다) */
async function remember<R>(run: Run<R>, status: 'NONE' | 'WRITING'): Promise<void> {
  if (!run.config.rememberStatus || run.remembered === status) return;
  run.remembered = status;
  if (!(await canWrite(run))) return;
  try {
    // 다 쓴 풀이가 있으면 함께 둔다(다시 받기를 눌러도 다음에 열 때 풀이를 곧바로 — 결정 075)
    const report = run.storedReport === null ? {} : { report: run.storedReport };
    await setStored(run.config.storageKey, JSON.stringify({ key: run.key, ...report, status }));
  } catch {
    // 기억하지 못하면 다음에 열 때 처음 확인부터 한다
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
  /** 기기에 둔 상태(같은 것을 거듭 쓰지 않게). 풀이를 두었거나 아직 두지 않았으면 null */
  remembered: 'NONE' | 'WRITING' | null;
  /** 기기에 둔 다 쓴 풀이(상태를 기억할 때 함께 둔다). 없으면 null */
  storedReport: R | null;
  /** 상태 묻기(GET) · 만들기(POST)의 번호 — 늦게 온 앞의 답은 버린다(겹친 확인이 두 줄이 되거나 다 쓴 풀이를 쓰는 중으로 덮지 않게, 리뷰 #87) */
  seq: number;
  /** 화면이 열릴 때 읽은 세대 표식. 읽지 못했으면 null(두지 않는다) */
  gen: string | null;
  timer: ReturnType<typeof setTimeout> | null;
  set: (state: DetailReportView<R>) => void;
};

function settle<R>(run: Run<R>, state: DetailReportView<R>) {
  run.busy = false;
  run.writingSince = null;
  run.set(state);
}

/** 상태(GET)를 묻는다. 화면을 떠났거나 그 뒤에 다른 묻기 · 만들기를 시작했으면 null(늦은 답은 버린다) */
async function ask<R>(run: Run<R>): Promise<ApiResult<DetailReportState<R>> | null> {
  const mine = ++run.seq;
  const r = await withTimeout(run.config.get());
  return run.alive && run.seq === mine ? r : null;
}

/** 상태(GET)를 한 번 묻고 옮긴다. 쓰는 중이면 주기 뒤에 다시 묻는다 */
async function check<R>(run: Run<R>): Promise<void> {
  const r = await ask(run);
  if (!r) return;
  if (!r.ok)
    return settle(run, run.polling ? { status: 'failed', error: r.error, stage: 'poll' } : { status: 'unknown', error: r.error, code: r.status });
  await apply(run, r.data);
}

/** 물어 받은 상태로 옮긴다 */
async function apply<R>(run: Run<R>, data: DetailReportState<R>): Promise<void> {
  if (data.status === 'DONE') {
    await saveReport(run, data.report);
    run.remembered = null;
    if (run.alive) settle(run, { status: 'done', report: data.report });
  } else if (data.status === 'WRITING') {
    await remember(run, 'WRITING');
    if (!run.alive) return;
    // 상태만 보는 곳은 쓰는 중이라는 것만 알고 더 묻지 않는다(다른 화면에 덮여도 묻거나 3분 뒤 실패로 굳지 않게 — 리뷰 #63)
    if (!run.poll) return settle(run, { status: 'writing' });
    run.busy = true;
    run.polling = true;
    run.writingSince ??= Date.now();
    run.set({ status: 'writing' });
    waitAndCheck(run);
  } else {
    // 끝내 못 썼어도 서버는 다음에 받기 전이라고 한다 — 받기 전으로 기억한다
    await remember(run, 'NONE');
    if (!run.alive) return;
    if (data.status === 'FAILED' && run.polling) settle(run, { status: 'failed', error: 'FAILED', stage: 'poll' });
    else settle(run, { status: 'none' });
  }
}

/**
 * 기억한 받기 전을 곧바로 보인 채 뒤에서 묻는다. 그사이 받기를 눌렀으면(busy) 늦게 온 답은 버리고, 못 물었거나 그대로 받기 전이면 둔다
 * — 다 썼거나 쓰는 중으로 바뀌었을 때만 옮긴다. 다만 서버에 그 경로가 없으면(404) 처음 확인과 같이 "모름"(홈은 칸을 숨긴다, 계획 "위험").
 * 확인 중으로 막지 않아 받기는 곧바로 누를 수 있다.
 */
async function confirmQuietly<R>(run: Run<R>): Promise<void> {
  const r = await ask(run);
  if (!r || run.busy) return;
  if (!r.ok) {
    if (r.status === NOT_FOUND) settle(run, { status: 'unknown', error: r.error, code: r.status });
    return;
  }
  if (r.data.status === 'NONE' || r.data.status === 'FAILED') return;
  run.busy = true;
  await apply(run, r.data);
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
  const r = await ask(run);
  if (!r || !r.ok) return;
  // 서버가 쓰는 중이라고 하면(다시 받기) 그때 쓰는 중으로 — 받기 전이라고 하면 보던 풀이를 둔다
  if (r.data.status === 'WRITING') {
    run.busy = true;
    return apply(run, r.data);
  }
  if (r.data.status !== 'DONE') return;
  await saveReport(run, r.data.report);
  run.remembered = null;
  if (run.alive) run.set({ status: 'done', report: r.data.report });
}

/** 만들기(POST) 뒤 확인을 시작한다. "자세한 풀이 받기" 와 "다시 쓰기" · "다시 시도"(요청이 끊겼을 때)가 함께 쓴다 */
async function request<R>(run: Run<R>): Promise<void> {
  if (!run.alive || run.busy) return;
  run.busy = true;
  // 기다리던 조용한 확인의 답은 버린다(받기를 누른 뒤 늦게 온 받기 전 · 쓰는 중이 화면을 되돌리지 않게)
  run.seq++;
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
  else if (r.data.status === 'FAILED') {
    await remember(run, 'NONE');
    if (run.alive) settle(run, { status: 'failed', error: 'FAILED', stage: 'request' });
  } else {
    await remember(run, 'WRITING');
    if (run.alive) waitAndCheck(run);
  }
}

/** 이번 실행에 받아 두기를 한 것(보관 키 · 세대 · 출생 정보) */
const prefetched = new Set<string>();

/**
 * 앱을 켤 때(홈의 첫 데이터) 상태를 한 번 받아 둔다 — 그 탭을 열면 기다리지 않고 받기 · 쓰는 중 · 풀이를 곧바로 그린다(결정 075 의 4).
 * 기기에 둔 것이 있으면 묻지 않는다(그 화면이 열 때 뒤에서 확인한다). 못 물었으면 아무것도 두지 않는다.
 */
export async function prefetchDetailReport<R>(config: DetailReportConfig<R>, input: BirthInput): Promise<void> {
  const key = keyOf(input);
  if (await loadStored(config, key)) return;
  const genKey = generationKeyOf(config as DetailReportConfig<unknown>);
  const gen = await storageGeneration(genKey).catch(() => null);
  // 이번 실행에 한 번 — 탭을 바꿀 때마다 홈이 다시 붙어도 못 받은 것(끊김 · 404)을 거듭 묻지 않는다. 기기를 지우면(세대) 다시(리뷰 #87 의 5)
  const once = `${genKey}|${gen}|${key}`;
  if (gen === null || prefetched.has(once)) return;
  prefetched.add(once);
  const r = await withTimeout(config.get());
  if (!r.ok) return;
  // 쓰기 직전에 다시 본다: 그 사이 기기를 지웠거나(세대) 화면이 먼저 기억 · 보관했으면(늦은 받기 전이 쓰는 중을 덮지 않게) 두지 않는다(리뷰 #87)
  if (!(await isSameGeneration(genKey, gen)) || (await loadStored(config, key))) return;
  try {
    if (r.data.status === 'DONE') await setStored(config.storageKey, JSON.stringify({ key, report: r.data.report }));
    else if (config.rememberStatus)
      await setStored(config.storageKey, JSON.stringify({ key, status: r.data.status === 'WRITING' ? 'WRITING' : 'NONE' }));
  } catch {
    // 두지 못하면 그 화면이 열 때 처음 확인부터 한다
  }
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
      remembered: null,
      storedReport: null,
      seq: 0,
      gen: null,
      timer: null,
      set: (state) => setSettled({ key, state }),
    };
    current.current = run;
    void (async () => {
      run.gen = await storageGeneration(generationKeyOf(config as DetailReportConfig<unknown>)).catch(() => null);
      return loadStored(config, key);
    })().then((stored) => {
      if (!run.alive) return;
      if (!stored) {
        run.busy = true;
        return void check(run);
      }
      run.storedReport = stored.report ?? null;
      run.remembered = stored.status ?? null;
      // 다 쓴 풀이가 있으면 쓰는 중 기억이 있어도 풀이를 먼저 그리고 뒤에서 확인한다 — 서버가 쓰는 중이라고 할 때만 쓰는 중으로(결정 075)
      if (stored.report !== undefined) {
        run.set({ status: 'done', report: stored.report });
        return void refreshQuietly(run);
      }
      if (stored.status === 'NONE') {
        run.set({ status: 'none' });
        return void confirmQuietly(run);
      }
      // 기억한 쓰는 중: 곧바로 쓰는 중을 보이고 처음 확인처럼 묻는다(쓰는 중이면 5초마다)
      run.set({ status: 'writing' });
      run.busy = true;
      void check(run);
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
      // 그새 쓰는 중으로 바뀌어 확인이 돌고 있으면(writingSince) 그대로 둔다
      if (run.writingSince === null) run.busy = false;
    });
  }, []);

  const dismiss = useCallback(() => {
    const run = current.current;
    if (!run || run.busy) return;
    run.polling = false;
    run.set({ status: 'none' });
  }, []);

  // 이번 실행에 읽었으면 첫 그림부터 그 화면(탭을 바꿔 다시 붙은 화면) — 뒤의 확인은 그대로
  const state: DetailReportView<R> = settled && settled.key === key ? settled.state : ((key !== null ? peekView(config, key) : null) ?? { status: 'checking' });
  return { state, start, recheck, refresh, dismiss };
}
