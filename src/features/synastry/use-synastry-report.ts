/**
 * 궁합 리포트를 요청하고 다 쓰일 때까지 확인하는 상태. 심층 리포트(`features/report/use-report.ts`)와 같은 흐름이다:
 * 글은 서버가 뒤에서 쓰고, 쓰는 중에는 화면이 떠 있는 동안만 5초마다 상태를 확인한다. 요청(POST)은 사용자가 누를 때만 한다.
 * 다른 점: 서버에 상대의 출생 정보가 없어 요청마다 다시 보낸다(서버 결정 008). 그 값은 부른 쪽이 넘겨주고 여기서 보관하지 않는다.
 * 리포트의 글도 기기에 보관하지 않는다(다 쓴 글은 출생 정보 없이 `GET` 으로 다시 받는다). 출생 정보와 글은 로그에 남기지 않는다.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { forgetFreshBirth } from '@/features/synastry/fresh-synastry';
import { api, type ApiErrorKind, type BirthInput, type SynastryReport } from '@/lib/api';

/** 쓰는 중일 때 상태를 확인하는 주기 */
export const SYNASTRY_REPORT_POLL_MS = 5000;

/**
 * 실패의 까닭. FAILED 서버가 쓰지 못했다 · BIRTH_MISMATCH 보낸 출생 정보가 그 궁합의 상대가 아니다 ·
 * PROFILE_CHANGED 내 출생 정보가 궁합을 계산한 때와 다르다(궁합을 새로 계산해야 한다)
 */
export type SynastryReportError = ApiErrorKind | 'FAILED' | 'BIRTH_MISMATCH' | 'PROFILE_CHANGED';

/**
 * checking 처음 확인하는 중 · none 아직 요청한 적 없음 · writing 쓰는 중.
 * failed 의 stage: check 는 상태 확인(GET)이 실패했다(다시 확인하면 된다), request 는 요청이 실패했거나 서버가 쓰지 못했다(다시 요청해야 한다).
 */
export type SynastryReportViewState =
  | { status: 'checking' }
  | { status: 'none' }
  | { status: 'writing' }
  | { status: 'done'; report: SynastryReport }
  | { status: 'failed'; error: SynastryReportError; stage: 'check' | 'request' };

/** 화면이 떠 있는 동안의 한 벌. 화면을 떠나거나 궁합이 바뀌면 alive 가 꺼지고 그 뒤의 응답은 버린다 */
type Run = {
  id: string;
  alive: boolean;
  /** 요청했거나 쓰는 중이라 확인이 돌고 있다. 이때 또 누른 요청은 받지 않는다 */
  busy: boolean;
  timer: ReturnType<typeof setTimeout> | null;
  set: (state: SynastryReportViewState) => void;
};

function settle(run: Run, state: SynastryReportViewState) {
  run.busy = false;
  run.set(state);
}

/** `GET /synastry/{id}/report` 를 한 번 부르고 상태를 옮긴다. 쓰는 중이면 주기 뒤에 다시 확인한다 */
async function check(run: Run): Promise<void> {
  const r = await api.getSynastryReport(run.id);
  if (!run.alive) return;
  if (!r.ok) return settle(run, { status: 'failed', error: r.error, stage: 'check' });
  if (r.data.status === 'DONE') {
    // 다 쓰였으면 상대의 출생 정보를 더 쓸 일이 없다.
    forgetFreshBirth(run.id);
    settle(run, { status: 'done', report: r.data.report });
  } else if (r.data.status === 'WRITING') {
    run.busy = true;
    run.set({ status: 'writing' });
    waitAndCheck(run);
  } else if (r.data.status === 'FAILED') settle(run, { status: 'failed', error: 'FAILED', stage: 'request' });
  else settle(run, { status: 'none' });
}

function waitAndCheck(run: Run) {
  run.timer = setTimeout(() => {
    run.timer = null;
    void check(run);
  }, SYNASTRY_REPORT_POLL_MS);
}

/** `POST /synastry/{id}/report` 뒤 확인을 시작한다. birth 는 상대의 출생 정보다 */
async function request(run: Run, birth: BirthInput): Promise<void> {
  if (!run.alive || run.busy) return;
  run.busy = true;
  run.set({ status: 'writing' });
  const r = await api.requestSynastryReport(run.id, birth);
  if (!run.alive) return;
  if (!r.ok) {
    const error = r.code === 'BIRTH_MISMATCH' || r.code === 'PROFILE_CHANGED' ? r.code : r.error;
    return settle(run, { status: 'failed', error, stage: 'request' });
  }
  // 이미 써 둔 글이면 바로 받아 오고, 쓰는 중이면 주기 뒤부터 확인한다.
  if (r.data.status === 'DONE') await check(run);
  else if (r.data.status === 'WRITING') waitAndCheck(run);
  else settle(run, { status: 'failed', error: 'FAILED', stage: 'request' });
}

/**
 * 궁합 리포트. id 가 null 이면(주소·세션을 아직 읽는 중) 서버를 부르지 않고 확인 중으로 둔다.
 * start 는 상대의 출생 정보로 요청한다(처음 요청과 다시 요청). recheck 는 상태 확인만 다시 한다.
 */
export function useSynastryReport(id: string | null) {
  /** 어느 궁합의 상태인지 함께 둔다. 지금 것이 아니면 확인 중이다 */
  const [settled, setSettled] = useState<{ id: string; state: SynastryReportViewState } | null>(null);
  const current = useRef<Run | null>(null);

  useEffect(() => {
    if (id === null) return;
    const run: Run = { id, alive: true, busy: false, timer: null, set: (state) => setSettled({ id, state }) };
    current.current = run;
    void check(run);
    return () => {
      run.alive = false;
      if (run.timer) clearTimeout(run.timer);
      if (current.current === run) current.current = null;
    };
  }, [id]);

  const start = useCallback((birth: BirthInput) => {
    if (current.current) void request(current.current, birth);
  }, []);

  const recheck = useCallback(() => {
    const run = current.current;
    if (!run || run.busy) return;
    run.set({ status: 'checking' });
    void check(run);
  }, []);

  const state: SynastryReportViewState = settled && settled.id === id ? settled.state : { status: 'checking' };
  return { state, start, recheck };
}
