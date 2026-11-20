import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import {
  ME_REPORT_MAX_WRITING_MS,
  ME_REPORT_POLL_MS,
  ME_REPORT_STORAGE_KEY,
  ME_REPORT_TIMEOUT_MS,
  useMeReport,
} from '@/features/me/use-me-report';
import { api, type ApiResult, type MeReportRequest, type MeReportState } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { requestMeReport: jest.fn(), getMeReport: jest.fn(), saveProfile: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const input = { date: '2000-06-15', time: '21:00', placeId: 1841277 };
const report = fixtures.meReport;
const got = (status: 'NONE' | 'WRITING' | 'FAILED'): ApiResult<MeReportState> => ({ ok: true, data: { status } });
const done: ApiResult<MeReportState> = { ok: true, data: { status: 'DONE', report } };
const asked = (status: 'WRITING' | 'DONE' | 'FAILED'): ApiResult<MeReportRequest> => ({ ok: true, data: { status } });
const tick = (times = 1) => act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_POLL_MS * times)));
const storedKey = JSON.stringify([input.date, input.time, input.placeId]);

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.getMeReport.mockResolvedValue(got('NONE'));
  mockApi.requestMeReport.mockResolvedValue(asked('WRITING'));
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
});

afterEach(() => jest.useRealTimers());

describe('useMeReport(결정 048 의 4 · 8)', () => {
  it('확인은 5초마다, 보관 키는 byeolmyeong.meReport.v1', () => {
    expect(ME_REPORT_POLL_MS).toBe(5000);
    expect(ME_REPORT_STORAGE_KEY).toBe('byeolmyeong.meReport.v1');
  });

  it('출생 정보 · 세션을 읽는 중이면 서버를 부르지 않는다', async () => {
    const { result } = await renderHook(() => useMeReport(null));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'checking' });
    expect(mockApi.getMeReport).not.toHaveBeenCalled();
  });

  it('받기 전 → (받기) 쓰는 중 → 5초마다 확인 → 다 씀(기기에 보관). 다 쓴 뒤에는 더 확인하지 않는다', async () => {
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    await tick(3);
    expect(mockApi.getMeReport).toHaveBeenCalledTimes(1);
    expect(mockApi.requestMeReport).not.toHaveBeenCalled();

    mockApi.getMeReport.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce(done);
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'writing' });
    expect(mockApi.requestMeReport).toHaveBeenCalledWith();
    await act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_POLL_MS - 1)));
    expect(mockApi.getMeReport).toHaveBeenCalledTimes(1);
    await tick();
    expect(result.current.state).toEqual({ status: 'writing' });
    await tick();
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report }));
    expect(JSON.parse((await AsyncStorage.getItem(ME_REPORT_STORAGE_KEY)) ?? 'null')).toEqual({ key: storedKey, report });
    await tick(3);
    expect(mockApi.getMeReport).toHaveBeenCalledTimes(3);
  });

  it('쓰는 중에 화면을 떠나면 확인을 멈춘다(리뷰 초점 3)', async () => {
    mockApi.getMeReport.mockResolvedValue(got('WRITING'));
    const { result, unmount } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'writing' }));
    await tick();
    expect(mockApi.getMeReport).toHaveBeenCalledTimes(2);
    await unmount();
    await tick(4);
    expect(mockApi.getMeReport).toHaveBeenCalledTimes(2);
  });

  it('받기를 연달아 눌러도 요청은 하나다', async () => {
    let resolve: (r: ApiResult<MeReportRequest>) => void = () => {};
    mockApi.requestMeReport.mockReturnValue(new Promise((r) => (resolve = r)));
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    await act(async () => {
      result.current.start();
      result.current.start();
    });
    expect(mockApi.requestMeReport).toHaveBeenCalledTimes(1);
    await act(async () => resolve(asked('WRITING')));
  });

  it('이미 다 써 둔 풀이면(DONE) 바로 받아 온다', async () => {
    mockApi.requestMeReport.mockResolvedValue(asked('DONE'));
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    mockApi.getMeReport.mockResolvedValueOnce(done);
    await act(async () => result.current.start());
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report }));
  });

  it('쓰다가 실패하면(FAILED) "다시 쓰기" 상태, 다시 쓰기는 새로 요청하고, 나중에 하기는 받기 전으로 돌린다', async () => {
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    mockApi.getMeReport.mockResolvedValueOnce(got('FAILED'));
    await act(async () => result.current.start());
    await tick();
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed', error: 'FAILED', stage: 'poll' }));
    await act(async () => result.current.dismiss());
    expect(result.current.state).toEqual({ status: 'none' });
    await act(async () => result.current.start());
    expect(mockApi.requestMeReport).toHaveBeenCalledTimes(2);
  });

  it('처음 확인에서 FAILED 면(전에 쓰다 멈춘 것) 받기 전으로 둔다 — 다시 받기를 누를 수 있게', async () => {
    mockApi.getMeReport.mockResolvedValue(got('FAILED'));
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
  });

  it('받을 수 없음(402 PURCHASE_REQUIRED, 1.1.0 예약)이면 받기 전 + 막힘 표시, 한도(429) · 끊김은 요청 단계의 실패', async () => {
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    mockApi.requestMeReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 402, code: 'PURCHASE_REQUIRED' });
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'none', blocked: true });
    mockApi.requestMeReport.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'failed', error: 'LIMIT', stage: 'request' });
    mockApi.requestMeReport.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'failed', error: 'NETWORK', stage: 'request' });
  });

  it('서버에 출생 정보가 없으면(404) 저장하고 한 번만 더 요청한다', async () => {
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    mockApi.requestMeReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    await act(async () => result.current.start());
    expect(mockApi.saveProfile).toHaveBeenCalledWith(input);
    expect(mockApi.requestMeReport).toHaveBeenCalledTimes(2);
    expect(result.current.state).toEqual({ status: 'writing' });
  });

  it('처음 확인을 못 하면 "모름"(받기 전 화면에 카드 자리 안내), 다시 보기는 상태만 다시 묻는다(만들기는 사람이 누를 때만)', async () => {
    mockApi.getMeReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 500 });
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'unknown', error: 'SERVER' }));
    mockApi.getMeReport.mockResolvedValueOnce(done);
    await act(async () => result.current.recheck());
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report }));
    expect(mockApi.requestMeReport).not.toHaveBeenCalled();
  });

  it('쓰는 중 확인이 끊기면 확인 단계의 실패, 다시 보기는 확인을 이어 간다', async () => {
    mockApi.getMeReport.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'writing' }));
    await tick();
    await waitFor(() => expect(result.current.state).toEqual({ status: 'failed', error: 'NETWORK', stage: 'poll' }));
    mockApi.getMeReport.mockResolvedValueOnce(got('WRITING'));
    await act(async () => result.current.recheck());
    await waitFor(() => expect(result.current.state).toEqual({ status: 'writing' }));
    expect(mockApi.requestMeReport).not.toHaveBeenCalled();
  });

  it('한 번 받은 풀이는 기기에서 바로 보이고(뼈대 없음) 뒤에서 새로 묻는다. 옛 모양 보관본은 없는 것으로 본다', async () => {
    await AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key: storedKey, report }));
    let resolve: (r: ApiResult<MeReportState>) => void = () => {};
    mockApi.getMeReport.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    const { result, unmount } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report }));
    expect(mockApi.getMeReport).toHaveBeenCalledTimes(1);
    // 새로 받지 못해도(다 쓴 것이 아니어도) 보관본을 그대로 둔다
    await act(async () => resolve(got('NONE')));
    expect(result.current.state).toEqual({ status: 'done', report });
    await unmount();

    await AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key: storedKey, report: { areas: [] } }));
    mockApi.getMeReport.mockResolvedValue(got('NONE'));
    const second = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(second.result.current.state).toEqual({ status: 'none' }));
  });

  it('응답이 10초 넘게 오지 않으면 기다리지 않는다: 처음 확인은 "모름", 받기는 요청 단계의 실패(리뷰 — 쓰는 중 화면에 갇히지 않게)', async () => {
    expect(ME_REPORT_TIMEOUT_MS).toBe(10_000);
    mockApi.getMeReport.mockReturnValueOnce(new Promise(() => {}));
    const { result } = await renderHook(() => useMeReport(input));
    await act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_TIMEOUT_MS - 1)));
    expect(result.current.state).toEqual({ status: 'checking' });
    await act(async () => void (await jest.advanceTimersByTimeAsync(1)));
    expect(result.current.state).toEqual({ status: 'unknown', error: 'SERVER' });
    // 다시 보기는 막히지 않는다
    await act(async () => result.current.recheck());
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    mockApi.requestMeReport.mockReturnValueOnce(new Promise(() => {}));
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'writing' });
    await act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_TIMEOUT_MS)));
    expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER', stage: 'request' });
  });

  it('출생 정보를 서버에 다시 저장하는 것(404 뒤 PUT /profile)도 10초까지만 기다린다(리뷰 #49)', async () => {
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    mockApi.requestMeReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    mockApi.saveProfile.mockReturnValueOnce(new Promise(() => {}));
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'writing' });
    await act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_TIMEOUT_MS)));
    expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER', stage: 'request' });
    expect(mockApi.requestMeReport).toHaveBeenCalledTimes(1);
  });

  it('쓰는 중이 3분을 넘으면 확인을 멈추고 확인 단계의 실패로 둔다 — 다시 보기는 상태만 다시 묻는다', async () => {
    expect(ME_REPORT_MAX_WRITING_MS).toBe(180_000);
    mockApi.getMeReport.mockResolvedValue(got('WRITING'));
    const { result } = await renderHook(() => useMeReport(input));
    // 열었을 때 이미 쓰는 중이다(전에 받기를 눌렀다)
    await waitFor(() => expect(result.current.state).toEqual({ status: 'writing' }));
    await act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_MAX_WRITING_MS - ME_REPORT_POLL_MS)));
    expect(result.current.state).toEqual({ status: 'writing' });
    await act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_POLL_MS * 2)));
    expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER', stage: 'poll' });
    const calls = mockApi.getMeReport.mock.calls.length;
    await tick(3);
    expect(mockApi.getMeReport).toHaveBeenCalledTimes(calls);
    await act(async () => result.current.recheck());
    await waitFor(() => expect(result.current.state).toEqual({ status: 'writing' }));
    expect(mockApi.requestMeReport).not.toHaveBeenCalled();
  });

  it('다 받은 풀이를 보던 중 새로 받기(refresh)는 조용히 — 못 받아도 풀이는 그대로, 겹쳐 부르지 않는다(결정 061 의 4, 리뷰 #49)', async () => {
    await AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key: storedKey, report }));
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report }));
    await waitFor(() => expect(mockApi.getMeReport).toHaveBeenCalledTimes(1));
    mockApi.getMeReport.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await act(async () => result.current.refresh());
    expect(result.current.state).toEqual({ status: 'done', report });
    mockApi.getMeReport.mockResolvedValueOnce(got('NONE'));
    await act(async () => result.current.refresh());
    expect(result.current.state).toEqual({ status: 'done', report });
    let resolve: (r: ApiResult<MeReportState>) => void = () => {};
    mockApi.getMeReport.mockReturnValueOnce(new Promise((r) => (resolve = r)));
    await act(async () => {
      result.current.refresh();
      result.current.refresh();
    });
    expect(mockApi.getMeReport).toHaveBeenCalledTimes(4);
    await act(async () => resolve(done));
    expect(result.current.state).toEqual({ status: 'done', report });
  });

  it('다른 출생 정보의 보관본은 쓰지 않는다', async () => {
    await AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key: JSON.stringify(['1999-01-01', null, null]), report }));
    const { result } = await renderHook(() => useMeReport(input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
  });
});
