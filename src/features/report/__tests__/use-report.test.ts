import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { REPORT_POLL_MS, REPORT_STORAGE_KEY, useReport } from '@/features/report/use-report';
import { api, type ApiResult, type ReportRequest, type ReportState } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { requestReport: jest.fn(), getReport: jest.fn(), saveProfile: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const input = { date: '2000-06-15', time: '21:00', placeId: 1841277 };
const report = fixtures.report;
const got = (status: 'NONE' | 'WRITING' | 'FAILED'): ApiResult<ReportState> => ({ ok: true, data: { status } });
const done: ApiResult<ReportState> = { ok: true, data: { status: 'DONE', report } };
const asked = (status: 'WRITING' | 'DONE'): ApiResult<ReportRequest> => ({ ok: true, data: { status } });
const noProfile: ApiResult<ReportRequest> = { ok: false, error: 'SERVER', status: 404 };

/** 확인 주기만큼 시간을 보낸다 */
const tick = (times = 1) => act(async () => void (await jest.advanceTimersByTimeAsync(REPORT_POLL_MS * times)));

/** 예시 리포트의 "지금" 이 만들어진 날(한국 날짜)의 낮 */
const SAME_DAY = new Date(`${report.timing.current.date}T03:00:00Z`);
/** 예시 리포트를 받은 다음 날에 서버가 줄 리포트: 글은 같고 "지금" 의 날짜만 다르다 */
const nextDay = '2026-11-12';
const reportNextDay = { ...report, timing: { ...report.timing, current: { ...report.timing.current, date: nextDay } } };

beforeEach(async () => {
  jest.useFakeTimers({ now: SAME_DAY });
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.getReport.mockResolvedValue(got('NONE'));
  mockApi.requestReport.mockResolvedValue(asked('WRITING'));
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useReport', () => {
  it('확인은 5초마다 한다', () => {
    expect(REPORT_POLL_MS).toBe(5000);
  });

  it('출생 정보가 아직 없으면 서버를 부르지 않고 확인 중으로 둔다', async () => {
    const { result } = await renderHook(() => useReport(null));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'checking' });
    expect(mockApi.getReport).not.toHaveBeenCalled();
  });

  it('없음 → (요청) 쓰는 중 → 5초마다 확인 → 완료. 완료 뒤에는 더 확인하지 않는다', async () => {
    let resolve: (r: ApiResult<ReportState>) => void = () => {};
    mockApi.getReport.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useReport(input));
    expect(result.current.state).toEqual({ status: 'checking' });
    await act(async () => resolve(got('NONE')));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    expect(mockApi.getReport).toHaveBeenCalledTimes(1);
    // 요청하지 않으면 스스로 확인을 되풀이하지 않는다
    await tick(3);
    expect(mockApi.getReport).toHaveBeenCalledTimes(1);
    expect(mockApi.requestReport).not.toHaveBeenCalled();

    mockApi.getReport.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce(done);
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'writing' });
    expect(mockApi.requestReport).toHaveBeenCalledTimes(1);
    expect(mockApi.requestReport).toHaveBeenCalledWith();
    // 5초가 되기 전에는 확인하지 않는다
    await act(async () => void (await jest.advanceTimersByTimeAsync(REPORT_POLL_MS - 1)));
    expect(mockApi.getReport).toHaveBeenCalledTimes(1);
    await act(async () => void (await jest.advanceTimersByTimeAsync(1)));
    expect(mockApi.getReport).toHaveBeenCalledTimes(2);
    expect(result.current.state).toEqual({ status: 'writing' });
    await tick();
    expect(mockApi.getReport).toHaveBeenCalledTimes(3);
    expect(result.current.state).toEqual({ status: 'done', report });
    await tick(4);
    expect(mockApi.getReport).toHaveBeenCalledTimes(3);
    expect(mockApi.requestReport).toHaveBeenCalledTimes(1);
  });

  it('열었을 때 이미 쓰는 중이면 요청 없이 확인을 이어 간다', async () => {
    mockApi.getReport.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce(done);
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'writing' }));
    await tick();
    expect(result.current.state).toEqual({ status: 'done', report });
    expect(mockApi.requestReport).not.toHaveBeenCalled();
  });

  it('요청했더니 이미 써 두었다고 하면(DONE) 바로 글을 받아 온다', async () => {
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state.status).toBe('none'));
    mockApi.requestReport.mockResolvedValue(asked('DONE'));
    mockApi.getReport.mockResolvedValue(done);
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'done', report });
    expect(mockApi.getReport).toHaveBeenCalledTimes(2);
  });

  it('다 쓴 리포트를 기기에 두어, 같은 출생 정보로 같은 날 다시 열면 서버를 부르지 않는다', async () => {
    mockApi.getReport.mockResolvedValue(done);
    const first = await renderHook(() => useReport(input));
    await waitFor(() => expect(first.result.current.state.status).toBe('done'));
    await first.unmount();
    const second = await renderHook(() => useReport({ ...input }));
    await waitFor(() => expect(second.result.current.state).toEqual({ status: 'done', report }));
    expect(mockApi.getReport).toHaveBeenCalledTimes(1);
  });

  it('한국 날짜로 같은 날이면 자정 직전(한국 23:59)에도 서버를 부르지 않는다', async () => {
    const key = JSON.stringify([input.date, input.time, input.placeId]);
    await AsyncStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify({ key, report }));
    jest.setSystemTime(new Date(`${report.timing.current.date}T14:59:00Z`));
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report }));
    await tick();
    expect(mockApi.getReport).not.toHaveBeenCalled();
  });

  it('보관된 리포트의 "지금" 이 오늘 것이 아니면 보관본을 먼저 보여 주고, 한 번 다시 받아 바꾸고 보관한다', async () => {
    const key = JSON.stringify([input.date, input.time, input.placeId]);
    await AsyncStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify({ key, report }));
    // 한국 날짜로 다음 날 00:01
    jest.setSystemTime(new Date(`${report.timing.current.date}T15:01:00Z`));
    let answer: (r: ApiResult<ReportState>) => void = () => {};
    mockApi.getReport.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report }));
    await waitFor(() => expect(mockApi.getReport).toHaveBeenCalledTimes(1));
    await act(async () => answer({ ok: true, data: { status: 'DONE', report: reportNextDay } }));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report: reportNextDay }));
    expect(JSON.parse((await AsyncStorage.getItem(REPORT_STORAGE_KEY)) as string).report.timing.current.date).toBe(
      nextDay,
    );
    await tick(3);
    expect(mockApi.getReport).toHaveBeenCalledTimes(1);
    expect(mockApi.requestReport).not.toHaveBeenCalled();
  });

  it('다시 받지 못했거나 다 쓴 리포트가 오지 않으면 보관본을 그대로 보여 준다', async () => {
    const key = JSON.stringify([input.date, input.time, input.placeId]);
    for (const answer of [{ ok: false, error: 'NETWORK' } as const, got('NONE'), got('FAILED'), got('WRITING')]) {
      await AsyncStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify({ key, report }));
      jest.setSystemTime(new Date(`${nextDay}T03:00:00Z`));
      mockApi.getReport.mockClear();
      mockApi.getReport.mockResolvedValue(answer);
      const view = await renderHook(() => useReport(input));
      await waitFor(() => expect(mockApi.getReport).toHaveBeenCalledTimes(1));
      await tick(2);
      expect(view.result.current.state).toEqual({ status: 'done', report });
      expect(mockApi.getReport).toHaveBeenCalledTimes(1);
      await view.unmount();
    }
  });

  it('출생 정보가 달라지면 보관된 리포트를 쓰지 않고 서버에 확인한다', async () => {
    mockApi.getReport.mockResolvedValue(done);
    const first = await renderHook(() => useReport(input));
    await waitFor(() => expect(first.result.current.state.status).toBe('done'));
    await first.unmount();
    mockApi.getReport.mockResolvedValue(got('NONE'));
    const second = await renderHook(() => useReport({ ...input, time: null }));
    await waitFor(() => expect(second.result.current.state).toEqual({ status: 'none' }));
    expect(mockApi.getReport).toHaveBeenCalledTimes(2);
  });

  it('보관된 값이 깨졌으면 버리고 서버에 확인한다', async () => {
    const key = JSON.stringify([input.date, input.time, input.placeId]);
    await AsyncStorage.setItem(REPORT_STORAGE_KEY, JSON.stringify({ key, report: { sections: [] } }));
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    expect(mockApi.getReport).toHaveBeenCalledTimes(1);
  });

  it('쓰는 중이거나 실패한 것은 보관하지 않는다', async () => {
    mockApi.getReport.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce(got('FAILED'));
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state.status).toBe('writing'));
    await tick();
    expect(result.current.state).toEqual({ status: 'failed', error: 'FAILED' });
    expect(await AsyncStorage.getItem(REPORT_STORAGE_KEY)).toBeNull();
  });

  it('서버가 실패했다고 하면(FAILED) 확인을 멈추고, 다시 시도하면 요청부터 다시 한다', async () => {
    mockApi.getReport.mockResolvedValue(got('FAILED'));
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed', error: 'FAILED' }));
    await tick(3);
    expect(mockApi.getReport).toHaveBeenCalledTimes(1);
    // 스스로 다시 요청하지 않는다
    expect(mockApi.requestReport).not.toHaveBeenCalled();

    mockApi.getReport.mockResolvedValue(done);
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'writing' });
    expect(mockApi.requestReport).toHaveBeenCalledTimes(1);
    await tick();
    expect(result.current.state).toEqual({ status: 'done', report });
  });

  it('처음 확인이 실패하면(네트워크) 실패가 되고 스스로 다시 부르지 않는다', async () => {
    mockApi.getReport.mockResolvedValue({ ok: false, error: 'NETWORK' });
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed', error: 'NETWORK' }));
    await tick(3);
    expect(mockApi.getReport).toHaveBeenCalledTimes(1);
    expect(mockApi.requestReport).not.toHaveBeenCalled();
  });

  it('요청이 실패하면 실패가 되고 스스로 다시 요청하지 않는다', async () => {
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state.status).toBe('none'));
    mockApi.requestReport.mockResolvedValue({ ok: false, error: 'LIMIT', status: 429 });
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'failed', error: 'LIMIT' });
    await tick(3);
    expect(mockApi.requestReport).toHaveBeenCalledTimes(1);
    expect(mockApi.getReport).toHaveBeenCalledTimes(1);
  });

  it('쓰는 중에 확인이 실패하면 확인을 멈추고 실패가 된다', async () => {
    mockApi.getReport.mockResolvedValueOnce(got('WRITING')).mockResolvedValue({ ok: false, error: 'SERVER', status: 500 });
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state.status).toBe('writing'));
    await tick();
    expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER' });
    await tick(3);
    expect(mockApi.getReport).toHaveBeenCalledTimes(2);
  });

  it('화면을 떠나면 확인을 멈춘다', async () => {
    mockApi.getReport.mockResolvedValue(got('WRITING'));
    const { result, unmount } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state.status).toBe('writing'));
    await tick();
    expect(mockApi.getReport).toHaveBeenCalledTimes(2);
    await unmount();
    await tick(4);
    expect(mockApi.getReport).toHaveBeenCalledTimes(2);
  });

  it('서버에 출생 정보가 없다고 하면(404) 저장한 뒤 한 번만 더 요청한다', async () => {
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state.status).toBe('none'));
    mockApi.requestReport.mockResolvedValueOnce(noProfile);
    await act(async () => result.current.start());
    expect(mockApi.saveProfile).toHaveBeenCalledWith(input);
    expect(mockApi.requestReport).toHaveBeenCalledTimes(2);
    expect(result.current.state).toEqual({ status: 'writing' });
  });

  it('저장한 뒤에도 404 이면 거기서 멈춘다', async () => {
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state.status).toBe('none'));
    mockApi.requestReport.mockResolvedValue(noProfile);
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER' });
    expect(mockApi.saveProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.requestReport).toHaveBeenCalledTimes(2);
    await tick(3);
    expect(mockApi.requestReport).toHaveBeenCalledTimes(2);
  });

  it('요청을 연달아 눌러도 한 번만 요청하고 확인도 한 줄로만 돈다', async () => {
    const { result } = await renderHook(() => useReport(input));
    await waitFor(() => expect(result.current.state.status).toBe('none'));
    mockApi.getReport.mockResolvedValue(got('WRITING'));
    await act(async () => {
      result.current.start();
      result.current.start();
    });
    await act(async () => result.current.start());
    expect(mockApi.requestReport).toHaveBeenCalledTimes(1);
    await tick(2);
    expect(mockApi.getReport).toHaveBeenCalledTimes(3);
  });
});
