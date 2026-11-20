/**
 * 나 탭 풀이(자세한 풀이, 결정 048 의 4 · 8 · 050)의 요청 · 확인 · 기기 보관 — 규칙은 자세한 풀이 공용 훅(lib/detail-report)이고, 여기는 나 탭의 것만:
 * 경로 쌍(`POST` · `GET /me-report`) · 보관 키 · 검사 함수. 글은 서버가 뒤에서 1분 안팎 동안 쓴다. 출생 정보와 글은 로그에 남기지 않는다.
 */
import { api, isMeReport, type ApiErrorKind, type BirthInput, type MeReport } from '@/lib/api';
import { DETAIL_REPORT_MAX_WRITING_MS, DETAIL_REPORT_POLL_MS, useDetailReport, type DetailReportConfig, type DetailReportView } from '@/lib/detail-report';
import { REQUEST_TIMEOUT_MS } from '@/lib/with-timeout';

export const ME_REPORT_STORAGE_KEY = 'byeolmyeong.meReport.v1';

/** 쓰는 중일 때 상태를 묻는 주기 · 한 번의 요청을 기다리는 한도 · 쓰는 중을 기다리는 한도(공용 훅의 값) */
export const ME_REPORT_POLL_MS = DETAIL_REPORT_POLL_MS;
export const ME_REPORT_TIMEOUT_MS = REQUEST_TIMEOUT_MS;
export const ME_REPORT_MAX_WRITING_MS = DETAIL_REPORT_MAX_WRITING_MS;

/**
 * 공용 훅의 상태와 같되, unknown(처음 확인을 못 했다)에 상태 번호(code)를 싣지 않는다 — 그 번호는 홈의 시기 칸(404 면 칸을 숨김)만 쓰고,
 * 나 탭 화면은 status · error 만 본다. 그래서 예전 모양 그대로 낸다.
 */
export type MeReportView = Exclude<DetailReportView<MeReport>, { status: 'unknown' }> | { status: 'unknown'; error: ApiErrorKind };

const ME_REPORT: DetailReportConfig<MeReport> = {
  storageKey: ME_REPORT_STORAGE_KEY,
  get: () => api.getMeReport(),
  request: () => api.requestMeReport(),
  isReport: isMeReport,
};

/**
 * 나 탭 풀이. start: 받기 · 다시 쓰기, recheck: 상태만 다시 묻기(연결 복귀 · 다시 보기), refresh: 다 받은 풀이를 조용히 새로,
 * dismiss: 실패 화면의 "나중에 하기"(받기 전으로).
 */
export function useMeReport(input: BirthInput | null) {
  const report = useDetailReport(ME_REPORT, input);
  const { state } = report;
  const shown: MeReportView = state.status === 'unknown' ? { status: 'unknown', error: state.error } : state;
  return { ...report, state: shown };
}
