import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  TIMING_REPORT_MAX_WRITING_MS,
  TIMING_REPORT_POLL_MS,
  TIMING_REPORT_STORAGE_KEY,
  TIMING_REPORT_TIMEOUT_MS,
  useTimingReport,
} from '@/features/timing/use-timing-report';
import { api, type ApiResult, type TimingReportRequest, type TimingReportState } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { requestTimingReport: jest.fn(), getTimingReport: jest.fn(), saveProfile: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const input = { date: '2000-06-15', time: '21:00', placeId: 1841277 };
const report = fixtures.timingReport;
const got = (status: 'NONE' | 'WRITING' | 'FAILED'): ApiResult<TimingReportState> => ({ ok: true, data: { status } });
const done = (r = report): ApiResult<TimingReportState> => ({ ok: true, data: { status: 'DONE', report: r } });
const asked = (status: 'WRITING' | 'DONE' | 'FAILED'): ApiResult<TimingReportRequest> => ({ ok: true, data: { status } });
const tick = (times = 1) => act(async () => void (await jest.advanceTimersByTimeAsync(TIMING_REPORT_POLL_MS * times)));
const storedKey = JSON.stringify([input.date, input.time, input.placeId]);
const store = (r: unknown, key = storedKey) => AsyncStorage.setItem(TIMING_REPORT_STORAGE_KEY, JSON.stringify({ key, report: r }));

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.getTimingReport.mockResolvedValue(got('NONE'));
  mockApi.requestTimingReport.mockResolvedValue(asked('WRITING'));
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
});

afterEach(() => jest.useRealTimers());

describe('useTimingReport(결정 049 의 7 · 9)', () => {
  it('확인은 5초마다, 보관 키는 byeolmyeong.timingReport.v1', () => {
    expect(TIMING_REPORT_POLL_MS).toBe(5000);
    expect(TIMING_REPORT_STORAGE_KEY).toBe('byeolmyeong.timingReport.v1');
  });

  it('출생 정보 · 세션을 읽는 중이면 서버를 부르지 않는다', async () => {
    const { result } = await renderHook(() => useTimingReport(null));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'checking' });
    expect(mockApi.getTimingReport).not.toHaveBeenCalled();
  });

  it('받기 전 → (받기) 쓰는 중 → 5초마다 확인 → 다 씀(기기에 보관). 다 쓴 뒤에는 더 확인하지 않는다', async () => {
    const { result } = await renderHook(() => useTimingReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    mockApi.getTimingReport.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce(done());
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'writing' });
    expect(mockApi.requestTimingReport).toHaveBeenCalledTimes(1);
    await tick();
    expect(result.current.state).toEqual({ status: 'writing' });
    await tick();
    expect(result.current.state).toEqual({ status: 'done', report });
    expect(JSON.parse((await AsyncStorage.getItem(TIMING_REPORT_STORAGE_KEY))!)).toEqual({ key: storedKey, report });
    await tick(3);
    expect(mockApi.getTimingReport).toHaveBeenCalledTimes(3);
  });

  it('쓰는 중에 화면을 떠나면 확인을 멈춘다(리뷰 초점 3)', async () => {
    mockApi.getTimingReport.mockResolvedValue(got('WRITING'));
    const { result, unmount } = await renderHook(() => useTimingReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'writing' }));
    await unmount();
    await tick(4);
    expect(mockApi.getTimingReport).toHaveBeenCalledTimes(1);
  });

  it('받기를 연달아 눌러도 요청은 하나다', async () => {
    const { result } = await renderHook(() => useTimingReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    await act(async () => {
      result.current.start();
      result.current.start();
    });
    expect(mockApi.requestTimingReport).toHaveBeenCalledTimes(1);
  });

  it('쓰다가 실패하면(FAILED) 다시 쓰기 상태, 나중에 하기는 받기 전으로. 처음 확인의 FAILED 는 받기 전', async () => {
    mockApi.getTimingReport.mockResolvedValueOnce(got('FAILED'));
    const { result } = await renderHook(() => useTimingReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    mockApi.getTimingReport.mockResolvedValueOnce(got('FAILED'));
    await act(async () => result.current.start());
    await tick();
    expect(result.current.state).toEqual({ status: 'failed', error: 'FAILED', stage: 'poll' });
    await act(async () => result.current.dismiss());
    expect(result.current.state).toEqual({ status: 'none' });
  });

  it('받을 수 없음(402 PURCHASE_REQUIRED)이면 받기 전 + 막힘, 한도(429)는 요청 단계의 실패', async () => {
    const { result } = await renderHook(() => useTimingReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    mockApi.requestTimingReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 402, code: 'PURCHASE_REQUIRED' });
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'none', blocked: true });
    mockApi.requestTimingReport.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'failed', error: 'LIMIT', stage: 'request' });
  });

  it('서버에 출생 정보가 없으면(404) 저장하고 한 번만 더 요청한다', async () => {
    const { result } = await renderHook(() => useTimingReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    mockApi.requestTimingReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    await act(async () => result.current.start());
    expect(mockApi.saveProfile).toHaveBeenCalledWith(input);
    expect(mockApi.requestTimingReport).toHaveBeenCalledTimes(2);
  });

  it('처음 확인을 못 하면 "모름"(상태 번호와 함께 — 홈은 404 면 칸을 숨긴다), 다시 보기는 상태만 다시 묻는다', async () => {
    mockApi.getTimingReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404 });
    const { result } = await renderHook(() => useTimingReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'unknown', error: 'SERVER', code: 404 }));
    mockApi.getTimingReport.mockResolvedValueOnce(done());
    await act(async () => result.current.recheck());
    expect(result.current.state).toEqual({ status: 'done', report });
    expect(mockApi.requestTimingReport).not.toHaveBeenCalled();
  });

  it('받아 둔 풀이는 기기에서 바로 보이고 뒤에서 새로 묻는다 — 보관본의 오늘이 지났으면 새 "지금" 으로 바뀐다(결정 049 의 9)', async () => {
    const old = { ...report, current: { ...report.current, date: '2026-11-01' } };
    await store(old);
    let resolve: (r: ApiResult<TimingReportState>) => void = () => {};
    mockApi.getTimingReport.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useTimingReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report: old }));
    expect(mockApi.getTimingReport).toHaveBeenCalledTimes(1);
    await act(async () => resolve(done()));
    expect(result.current.state).toEqual({ status: 'done', report });
  });

  it('새로 묻기를 못 받거나 다 쓴 풀이가 아니면 보관본을 그대로 둔다. 옛 모양 · 다른 출생 정보의 보관본은 쓰지 않는다', async () => {
    await store(report);
    mockApi.getTimingReport.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const { result, unmount } = await renderHook(() => useTimingReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report }));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'done', report });
    await unmount();
    await store({ ...report, milestones: [] });
    const second = await renderHook(() => useTimingReport(input));
    await waitFor(() => expect(second.result.current.state).toEqual({ status: 'none' }));
    await store(report, JSON.stringify(['1999-01-01', null, null]));
    const third = await renderHook(() => useTimingReport(input));
    await waitFor(() => expect(third.result.current.state).toEqual({ status: 'none' }));
  });

  it('응답이 10초 넘게 오지 않으면 기다리지 않는다 · 쓰는 중이 3분을 넘으면 확인을 멈춘다', async () => {
    mockApi.getTimingReport.mockReturnValueOnce(new Promise(() => {}));
    const { result } = await renderHook(() => useTimingReport(input));
    await act(async () => void (await jest.advanceTimersByTimeAsync(TIMING_REPORT_TIMEOUT_MS)));
    expect(result.current.state).toEqual({ status: 'unknown', error: 'SERVER' });
    mockApi.getTimingReport.mockResolvedValue(got('WRITING'));
    await act(async () => result.current.start());
    await act(async () => void (await jest.advanceTimersByTimeAsync(TIMING_REPORT_MAX_WRITING_MS + TIMING_REPORT_POLL_MS)));
    expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER', stage: 'poll' });
  });
});
