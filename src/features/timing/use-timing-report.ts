/**
 * 시기 풀이(자세한 풀이, 결정 049 의 7 · 9 · 050)의 요청 · 확인 · 기기 보관 — 규칙은 자세한 풀이 공용 훅(lib/detail-report)이고, 여기는 시기의 것만:
 * 경로 쌍(`POST` · `GET /timing-report`) · 보관 키 · 검사 함수. "지금" · 대표 구간은 서버가 부를 때마다 그날로 붙이므로 보관본을 먼저 보인 뒤
 * 새로 받으면 오늘 것이 된다(결정 049 의 9). 홈의 시기 칸은 `{ poll: false }` 로 상태만 한 번 묻는다.
 */
import { api, isTimingReport, type BirthInput, type TimingReport } from '@/lib/api';
import { DETAIL_REPORT_MAX_WRITING_MS, DETAIL_REPORT_POLL_MS, useDetailReport, type DetailReportConfig, type DetailReportView } from '@/lib/detail-report';
import { REQUEST_TIMEOUT_MS } from '@/lib/with-timeout';

export const TIMING_REPORT_STORAGE_KEY = 'byeolmyeong.timingReport.v1';

/** 쓰는 중일 때 상태를 묻는 주기 · 한 번의 요청을 기다리는 한도 · 쓰는 중을 기다리는 한도(공용 훅의 값) */
export const TIMING_REPORT_POLL_MS = DETAIL_REPORT_POLL_MS;
export const TIMING_REPORT_TIMEOUT_MS = REQUEST_TIMEOUT_MS;
export const TIMING_REPORT_MAX_WRITING_MS = DETAIL_REPORT_MAX_WRITING_MS;

export type TimingReportView = DetailReportView<TimingReport>;

const TIMING_REPORT: DetailReportConfig<TimingReport> = {
  storageKey: TIMING_REPORT_STORAGE_KEY,
  get: () => api.getTimingReport(),
  request: () => api.requestTimingReport(),
  isReport: isTimingReport,
};

/**
 * 시기 풀이. start: 받기 · 다시 쓰기, recheck: 상태만 다시 묻기(연결 복귀 · 다시 보기), refresh: 다 받은 풀이를 조용히 새로,
 * dismiss: 실패 화면의 "나중에 하기"(받기 전으로). poll: false 면 쓰는 중이어도 5초마다 묻지 않는다(홈의 시기 칸).
 */
export function useTimingReport(input: BirthInput | null, options: { poll?: boolean } = {}) {
  return useDetailReport(TIMING_REPORT, input, options);
}
