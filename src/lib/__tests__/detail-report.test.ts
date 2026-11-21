import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { api, type ApiResult } from '@/lib/api';
import {
  DETAIL_REPORT_MAX_WRITING_MS,
  DETAIL_REPORT_POLL_MS,
  prefetchDetailReport,
  useDetailReport,
  type DetailReportConfig,
  type DetailReportState,
} from '@/lib/detail-report';
import { REQUEST_TIMEOUT_MS } from '@/lib/with-timeout';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { saveProfile: jest.fn() },
}));

// 자세한 풀이 두 가지(나 탭 풀이 · 시기 풀이)가 함께 쓰는 요청 · 확인 · 보관의 틀(서버의 같은 생성 고리, 서버 결정 029)
type Fake = { text: string };
const isFake = (v: unknown): v is Fake => typeof v === 'object' && v !== null && typeof (v as Fake).text === 'string';
const get = jest.fn<Promise<ApiResult<DetailReportState<Fake>>>, []>();
const request = jest.fn<Promise<ApiResult<{ status: 'WRITING' | 'DONE' | 'FAILED' }>>, []>();
const CONFIG: DetailReportConfig<Fake> = { storageKey: 'test.fake.v1', get: () => get(), request: () => request(), isReport: isFake };
const OTHER: DetailReportConfig<Fake> = { ...CONFIG, storageKey: 'test.other.v1' };
const mockApi = api as jest.Mocked<typeof api>;
const input = { date: '2000-06-15', time: '21:00', placeId: 1841277 };
const key = JSON.stringify([input.date, input.time, input.placeId]);
const report: Fake = { text: '글' };
const got = (status: 'NONE' | 'WRITING' | 'FAILED'): ApiResult<DetailReportState<Fake>> => ({ ok: true, data: { status } });
const done: ApiResult<DetailReportState<Fake>> = { ok: true, data: { status: 'DONE', report } };
const tick = (ms = DETAIL_REPORT_POLL_MS) => act(async () => void (await jest.advanceTimersByTimeAsync(ms)));

beforeEach(async () => {
  jest.useFakeTimers();
  await AsyncStorage.clear();
  jest.clearAllMocks();
  get.mockResolvedValue(got('NONE'));
  request.mockResolvedValue({ ok: true, data: { status: 'WRITING' } });
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
});

afterEach(() => jest.useRealTimers());

describe('useDetailReport', () => {
  it('확인은 5초마다 · 쓰는 중은 3분까지 · 한 번의 요청은 10초까지', () => {
    expect(DETAIL_REPORT_POLL_MS).toBe(5000);
    expect(DETAIL_REPORT_MAX_WRITING_MS).toBe(180_000);
    expect(REQUEST_TIMEOUT_MS).toBe(10_000);
  });

  it('받기 → 쓰는 중 → 5초마다 확인 → 다 씀: 그 풀이의 보관 키에 출생 정보별로 둔다', async () => {
    const { result } = await renderHook(() => useDetailReport(CONFIG, input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    get.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce(done);
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'writing' });
    await tick();
    await tick();
    expect(result.current.state).toEqual({ status: 'done', report });
    expect(JSON.parse((await AsyncStorage.getItem('test.fake.v1'))!)).toEqual({ key, report });
    expect(await AsyncStorage.getItem('test.other.v1')).toBeNull();
  });

  it('보관본은 그 풀이의 검사 함수를 통과해야 쓰고, 다른 풀이의 보관 키는 보지 않는다', async () => {
    await AsyncStorage.setItem('test.fake.v1', JSON.stringify({ key, report }));
    get.mockReturnValue(new Promise(() => {}));
    const fake = await renderHook(() => useDetailReport(CONFIG, input));
    await waitFor(() => expect(fake.result.current.state).toEqual({ status: 'done', report }));
    const other = await renderHook(() => useDetailReport(OTHER, input));
    await act(async () => {});
    expect(other.result.current.state).toEqual({ status: 'checking' });
    await AsyncStorage.setItem('test.other.v1', JSON.stringify({ key, report: { text: 1 } }));
    const broken = await renderHook(() => useDetailReport(OTHER, input));
    await act(async () => {});
    expect(broken.result.current.state).toEqual({ status: 'checking' });
  });

  it('처음 확인을 못 하면 "모름"(상태 번호와 함께), 처음 확인의 FAILED 는 받기 전', async () => {
    get.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404 });
    const { result } = await renderHook(() => useDetailReport(CONFIG, input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'unknown', error: 'SERVER', code: 404 }));
    get.mockResolvedValueOnce(got('FAILED'));
    await act(async () => result.current.recheck());
    expect(result.current.state).toEqual({ status: 'none' });
    expect(request).not.toHaveBeenCalled();
  });

  it('402 PURCHASE_REQUIRED 는 받기 전 + 막힘, 404 는 출생 정보를 저장하고 한 번만 더 요청', async () => {
    const { result } = await renderHook(() => useDetailReport(CONFIG, input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    request.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 402, code: 'PURCHASE_REQUIRED' });
    await act(async () => result.current.start());
    expect(result.current.state).toEqual({ status: 'none', blocked: true });
    request.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    await act(async () => result.current.start());
    expect(mockApi.saveProfile).toHaveBeenCalledWith(input);
    expect(request).toHaveBeenCalledTimes(3);
  });

  it('쓰는 중이 3분을 넘으면 확인을 멈추고 확인 단계의 실패, 화면을 떠나면 더 묻지 않는다', async () => {
    get.mockResolvedValue(got('WRITING'));
    const { result, unmount } = await renderHook(() => useDetailReport(CONFIG, input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'writing' }));
    await tick(DETAIL_REPORT_MAX_WRITING_MS + DETAIL_REPORT_POLL_MS);
    expect(result.current.state).toEqual({ status: 'failed', error: 'SERVER', stage: 'poll' });
    const calls = get.mock.calls.length;
    await unmount();
    await tick(DETAIL_REPORT_POLL_MS * 3);
    expect(get.mock.calls.length).toBe(calls);
  });

  it('poll: false 면 쓰는 중이어도 한 번만 묻는다', async () => {
    get.mockResolvedValue(got('WRITING'));
    const { result } = await renderHook(() => useDetailReport(CONFIG, input, { poll: false }));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'writing' }));
    await tick(DETAIL_REPORT_POLL_MS * 4);
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('응답이 10초 넘게 오지 않으면 "모름"', async () => {
    get.mockReturnValueOnce(new Promise(() => {}));
    const { result } = await renderHook(() => useDetailReport(CONFIG, input));
    await tick(REQUEST_TIMEOUT_MS);
    expect(result.current.state).toEqual({ status: 'unknown', error: 'SERVER' });
  });
});

// 받기 전 · 쓰는 중이라는 상태도 기기에 둔다(시기 탭 — 기억이 있으면 뼈대 없이 곧바로 그 화면, 뒤에서 확인해 바뀌면 바꾼다. 소유자 지적 2026-11-21)
describe('useDetailReport · rememberStatus', () => {
  const REMEMBER: DetailReportConfig<Fake> = { ...CONFIG, storageKey: 'test.remember.v1', rememberStatus: true };
  const stored = async () => JSON.parse((await AsyncStorage.getItem('test.remember.v1')) ?? 'null');
  const remember = (status: 'NONE' | 'WRITING', k = key) => AsyncStorage.setItem('test.remember.v1', JSON.stringify({ key: k, status }));

  it('확인한 상태를 출생 정보별로 둔다: 받기 전 NONE → 쓰는 중 WRITING → 다 쓰면 풀이', async () => {
    const { result } = await renderHook(() => useDetailReport(REMEMBER, input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    expect(await stored()).toEqual({ key, status: 'NONE' });
    get.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce(done);
    await act(async () => result.current.start());
    expect(await stored()).toEqual({ key, status: 'WRITING' });
    await tick();
    await tick();
    expect(result.current.state).toEqual({ status: 'done', report });
    expect(await stored()).toEqual({ key, report });
  });

  it('다 쓴 풀이를 둔 뒤 다시 받기(쓰는 중)를 기억해도 풀이는 지우지 않는다 — 다 쓰면 새 풀이만(결정 075)', async () => {
    await AsyncStorage.setItem('test.remember.v1', JSON.stringify({ key, report }));
    get.mockResolvedValueOnce(done).mockResolvedValueOnce(got('WRITING'));
    const { result } = await renderHook(() => useDetailReport(REMEMBER, input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report }));
    await act(async () => result.current.recheck());
    expect(result.current.state).toEqual({ status: 'writing' });
    expect(await stored()).toEqual({ key, report, status: 'WRITING' });
  });

  it('보관한 풀이 + 쓰는 중 기억이면 첫 그림부터 풀이(쓰는 중을 먼저 보이지 않음) — 서버가 다 썼다고 하면 그대로, 쓰는 중이라고 할 때만 쓰는 중으로(결정 075)', async () => {
    await AsyncStorage.setItem('test.remember.v1', JSON.stringify({ key, report, status: 'WRITING' }));
    const seen: string[] = [];
    let answer: (v: ApiResult<DetailReportState<Fake>>) => void = () => {};
    get.mockReturnValueOnce(new Promise((r) => (answer = r)));
    const { result } = await renderHook(() => {
      const r = useDetailReport(REMEMBER, input);
      seen.push(r.state.status);
      return r;
    });
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'done', report });
    await act(async () => answer(done));
    expect(result.current.state).toEqual({ status: 'done', report });
    expect(seen).not.toContain('writing');
    expect(await stored()).toEqual({ key, report });
    // 다시 열었는데 서버가 정말 쓰는 중이면 그때 쓰는 중으로
    await AsyncStorage.setItem('test.remember.v1', JSON.stringify({ key, report, status: 'WRITING' }));
    get.mockResolvedValueOnce(got('WRITING'));
    const again = await renderHook(() => useDetailReport(REMEMBER, input));
    await waitFor(() => expect(again.result.current.state).toEqual({ status: 'writing' }));
  });

  it('끝내 못 썼으면(FAILED) 받기 전으로 기억한다 — 다음에 열 때 서버도 받기 전이라고 한다', async () => {
    const { result } = await renderHook(() => useDetailReport(REMEMBER, input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'none' }));
    get.mockResolvedValueOnce(got('FAILED'));
    await act(async () => result.current.start());
    await tick();
    expect(result.current.state).toEqual({ status: 'failed', error: 'FAILED', stage: 'poll' });
    expect(await stored()).toEqual({ key, status: 'NONE' });
  });

  it('기억한 받기 전은 곧바로 받기 전(확인 중을 거치지 않음) — 뒤에서 물어 같으면 그대로, 못 물었어도 그대로', async () => {
    await remember('NONE');
    get.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const { result } = await renderHook(() => useDetailReport(REMEMBER, input));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'none' });
    expect(get).toHaveBeenCalledTimes(1);
    await tick(REQUEST_TIMEOUT_MS);
    expect(result.current.state).toEqual({ status: 'none' });
  });

  it('기억한 받기 전이라도 서버에 그 경로가 없으면(404) 처음 확인처럼 "모름"(상태 번호와 함께 — 홈은 칸을 숨긴다)', async () => {
    await remember('NONE');
    get.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404 });
    const { result } = await renderHook(() => useDetailReport(REMEMBER, input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'unknown', error: 'SERVER', code: 404 }));
  });

  it('기억한 받기 전인데 서버가 다 썼다고 하면 다 쓴 풀이로 바꾼다', async () => {
    await remember('NONE');
    get.mockResolvedValueOnce(done);
    const { result } = await renderHook(() => useDetailReport(REMEMBER, input));
    await waitFor(() => expect(result.current.state).toEqual({ status: 'done', report }));
    expect(await stored()).toEqual({ key, report });
  });

  it('뒤에서 묻는 동안 받기를 누르면 막히지 않고, 늦게 온 "받기 전" 이 쓰는 중을 덮지 않는다', async () => {
    await remember('NONE');
    let late: (r: ApiResult<DetailReportState<Fake>>) => void = () => {};
    get.mockReturnValueOnce(new Promise((r) => (late = r)));
    const { result } = await renderHook(() => useDetailReport(REMEMBER, input));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'none' });
    await act(async () => result.current.start());
    expect(request).toHaveBeenCalledTimes(1);
    expect(result.current.state).toEqual({ status: 'writing' });
    await act(async () => late(got('NONE')));
    expect(result.current.state).toEqual({ status: 'writing' });
  });

  it('기억한 쓰는 중은 곧바로 쓰는 중이고 5초마다 확인한다', async () => {
    await remember('WRITING');
    get.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce(done);
    const { result } = await renderHook(() => useDetailReport(REMEMBER, input));
    await act(async () => {});
    expect(result.current.state).toEqual({ status: 'writing' });
    await tick();
    expect(result.current.state).toEqual({ status: 'done', report });
  });

  it('다른 출생 정보의 기억 · rememberStatus 가 없는 풀이의 기억은 쓰지 않는다(처음 확인부터)', async () => {
    await remember('NONE', JSON.stringify(['1990-01-01', '09:00', 1]));
    get.mockReturnValue(new Promise(() => {}));
    const other = await renderHook(() => useDetailReport(REMEMBER, input));
    await act(async () => {});
    expect(other.result.current.state).toEqual({ status: 'checking' });
    await AsyncStorage.setItem('test.fake.v1', JSON.stringify({ key, status: 'NONE' }));
    const plain = await renderHook(() => useDetailReport(CONFIG, input));
    await act(async () => {});
    expect(plain.result.current.state).toEqual({ status: 'checking' });
  });
});

describe('prefetchDetailReport — 앱을 켤 때 상태를 받아 둔다(결정 075 의 4)', () => {
  const REMEMBER: DetailReportConfig<Fake> = { ...CONFIG, storageKey: 'test.prefetch.v1', rememberStatus: true };
  const stored = async () => JSON.parse((await AsyncStorage.getItem('test.prefetch.v1')) ?? 'null');

  it('기기에 아무것도 없으면 상태를 한 번 묻고 받기 전 · 쓰는 중은 기억, 다 썼으면 풀이를 둔다', async () => {
    get.mockResolvedValueOnce(got('NONE'));
    await prefetchDetailReport(REMEMBER, input);
    expect(await stored()).toEqual({ key, status: 'NONE' });
    await AsyncStorage.clear();
    get.mockResolvedValueOnce(got('WRITING'));
    await prefetchDetailReport(REMEMBER, input);
    expect(await stored()).toEqual({ key, status: 'WRITING' });
    await AsyncStorage.clear();
    get.mockResolvedValueOnce(done);
    await prefetchDetailReport(REMEMBER, input);
    expect(await stored()).toEqual({ key, report });
  });

  it('기기에 둔 것이 있으면(화면이 열 때 뒤에서 확인한다) 묻지 않고, 못 물었으면 아무것도 두지 않는다', async () => {
    await AsyncStorage.setItem('test.prefetch.v1', JSON.stringify({ key, status: 'NONE' }));
    await prefetchDetailReport(REMEMBER, input);
    expect(get).not.toHaveBeenCalled();
    await AsyncStorage.clear();
    get.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await prefetchDetailReport(REMEMBER, input);
    expect(await stored()).toBeNull();
  });
});
