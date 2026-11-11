/**
 * 심층 리포트를 요청하고 다 쓰일 때까지 확인하는 상태와 기기 보관.
 * 글은 서버가 뒤에서 1~2분 동안 쓴다. 쓰는 중에는 화면이 떠 있는 동안만 5초마다 상태를 확인하고,
 * 다 썼거나 실패했거나 화면을 떠나면 멈춘다. 요청(POST)은 사용자가 누를 때만 한다(스스로 다시 요청하지 않는다).
 * 다 쓴 리포트는 출생 정보별로 기기에 두고 다시 열 때 바로 보여 준다(같은 차트 = 같은 글).
 * 시기의 "지금 나의 구간" 만은 서버가 그날 날짜로 만들므로, 보관본이 오늘 것이 아니면 한 번 조용히 다시 받는다(결정 021).
 * 글은 서버가 준 그대로 쓴다. 출생 정보와 리포트의 글은 로그에 남기지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

import { api, isReport, type ApiErrorKind, type BirthInput, type Report } from '@/lib/api';

export const REPORT_STORAGE_KEY = 'byeolmyeong.report.v1';

/** 쓰는 중일 때 상태를 확인하는 주기 */
export const REPORT_POLL_MS = 5000;

/** 서버에 저장된 출생 정보가 없을 때의 상태(`NO_PROFILE`) */
const NO_PROFILE_STATUS = 404;

/** checking 처음 확인하는 중 · none 아직 요청한 적 없음 · writing 쓰는 중 · failed 의 FAILED 는 서버가 쓰지 못했다는 뜻 */
export type ReportViewState =
  | { status: 'checking' }
  | { status: 'none' }
  | { status: 'writing' }
  | { status: 'done'; report: Report }
  | { status: 'failed'; error: ApiErrorKind | 'FAILED' };

const keyOf = (input: BirthInput) => JSON.stringify([input.date, input.time, input.placeId]);

/** 이 출생 정보로 받아 둔 리포트. 없거나 다른 출생 정보의 것이거나 깨졌으면 null */
async function loadReport(key: string): Promise<Report | null> {
  try {
    const raw = await AsyncStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const stored = parsed as Record<string, unknown>;
    return stored.key === key && isReport(stored.report) ? stored.report : null;
  } catch {
    return null;
  }
}

async function saveReport(key: string, report: Report): Promise<void> {
  try {
    await AsyncStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify({ key, report }));
  } catch {
    // 보관하지 못해도 받은 글은 보여 준다. 다음에 열 때 다시 받는다.
  }
}

/** 기기의 오늘(한국 날짜, YYYY-MM-DD). 보관본의 "지금" 이 오늘 것인지 견주는 데만 쓴다 */
const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;
const koreaToday = () => new Date(Date.now() + KOREA_OFFSET_MS).toISOString().slice(0, 10);

/** 화면이 떠 있는 동안의 한 벌. 화면을 떠나거나 출생 정보가 바뀌면 alive 가 꺼지고 그 뒤의 응답은 버린다 */
type Run = {
  key: string;
  input: BirthInput;
  alive: boolean;
  /** 요청했거나 쓰는 중이라 확인이 돌고 있다. 이때 또 누른 요청은 받지 않는다 */
  busy: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  set: (state: ReportViewState) => void;
};

function settle(run: Run, state: ReportViewState) {
  run.busy = false;
  run.set(state);
}

/** `GET /reports/me` 를 한 번 부르고 상태를 옮긴다. 쓰는 중이면 주기 뒤에 다시 확인한다 */
async function check(run: Run): Promise<void> {
  const r = await api.getReport();
  if (!run.alive) return;
  if (!r.ok) return settle(run, { status: 'failed', error: r.error });
  if (r.data.status === 'DONE') {
    await saveReport(run.key, r.data.report);
    if (run.alive) settle(run, { status: 'done', report: r.data.report });
  } else if (r.data.status === 'WRITING') {
    run.busy = true;
    run.set({ status: 'writing' });
    waitAndCheck(run);
  } else if (r.data.status === 'FAILED') settle(run, { status: 'failed', error: 'FAILED' });
  else settle(run, { status: 'none' });
}

/** 보관본을 보여 준 뒤 "지금" 을 오늘 것으로 바꾼다. 받지 못했거나 다 쓴 리포트가 아니면 보관본을 그대로 둔다 */
async function refresh(run: Run): Promise<void> {
  const r = await api.getReport();
  if (!run.alive || !r.ok || r.data.status !== 'DONE') return;
  await saveReport(run.key, r.data.report);
  if (run.alive) run.set({ status: 'done', report: r.data.report });
}

function waitAndCheck(run: Run) {
  run.timer = setTimeout(() => {
    run.timer = null;
    void check(run);
  }, REPORT_POLL_MS);
}

/** `POST /reports` 뒤 확인을 시작한다. 처음 요청과 "다시 시도" 가 함께 쓴다 */
async function request(run: Run): Promise<void> {
  if (!run.alive || run.busy) return;
  run.busy = true;
  run.set({ status: 'writing' });
  let r = await api.requestReport();
  // 서버에 출생 정보가 없으면(이 기능 전에 입력했거나 서버 저장이 비워진 경우) 저장하고 한 번만 더 요청한다.
  if (!r.ok && r.status === NO_PROFILE_STATUS && (await api.saveProfile(run.input)).ok) r = await api.requestReport();
  if (!run.alive) return;
  if (!r.ok) return settle(run, { status: 'failed', error: r.error });
  // 이미 써 둔 글이면 바로 받아 오고, 쓰는 중이면 주기 뒤부터 확인한다.
  if (r.data.status === 'DONE') await check(run);
  else waitAndCheck(run);
}

/**
 * 심층 리포트. input 이 null 이면(출생 정보·세션을 아직 읽는 중) 서버를 부르지 않고 확인 중으로 둔다.
 * start 는 "리포트 받기" 와 실패했을 때의 "다시 시도" 다.
 */
export function useReport(input: BirthInput | null) {
  const date = input?.date;
  const time = input?.time;
  const placeId = input?.placeId;
  const key = date === undefined || time === undefined || placeId === undefined ? null : keyOf({ date, time, placeId });
  /** 어느 출생 정보의 상태인지 함께 둔다. 지금 것이 아니면 확인 중이다 */
  const [settled, setSettled] = useState<{ key: string; state: ReportViewState } | null>(null);
  const current = useRef<Run | null>(null);

  useEffect(() => {
    if (date === undefined || time === undefined || placeId === undefined || key === null) return;
    const run: Run = {
      key,
      input: { date, time, placeId },
      alive: true,
      busy: false,
      timer: null,
      set: (state) => setSettled({ key, state }),
    };
    current.current = run;
    loadReport(key).then((stored) => {
      if (!run.alive) return;
      if (!stored) return void check(run);
      run.set({ status: 'done', report: stored });
      if (stored.timing.current.date !== koreaToday()) void refresh(run);
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

  const state: ReportViewState = settled && settled.key === key ? settled.state : { status: 'checking' };
  return { state, start };
}
