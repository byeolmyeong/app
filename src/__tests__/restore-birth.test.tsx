import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import BirthScreen from '@/app/birth';
import HomeScreen from '@/app/index';
import MyScreen from '@/app/my';
import DeleteAccountScreen from '@/app/my/delete';
import { strings } from '@/content/strings';
import { loadBirth, saveBirth } from '@/features/chart/use-birth-profile';
import { recheckSession } from '@/features/auth/use-session';
import { getHomeReady, resetHomeReady } from '@/features/home/home-ready';
import type { Session } from '@/features/auth/session-store';
import { api, createApi, type ApiResult, type BirthInput } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const mockSession: { current: Session } = {
  current: { status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null },
};

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    canGoBack: jest.fn(() => true),
    canDismiss: jest.fn(() => false),
    dismissAll: jest.fn(),
  },
  Stack: { Screen: () => null },
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    getProfile: jest.fn(),
    createChart: jest.fn(),
    listPlaces: jest.fn(),
    saveProfile: jest.fn(),
    deleteAccount: jest.fn(),
    getMyAccount: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    // 홈의 시기 칸(결정 047 의 1-4)이 시기 풀이 상태를 묻는다
    getTimingReport: jest.fn(async () => ({ ok: true, data: { status: 'NONE' } })),
    getNotifications: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    postDaySky: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    getMonth: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    getMeReport: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => mockSession.current),
  getSession: jest.fn(() => mockSession.current),
  // 계정을 지우면 세션이 비워진다.
  clearSession: jest.fn(async () => {
    mockSession.current = { status: 'signedOut' as const, token: null, ready: true, lastError: null };
  }),
  recheckSession: jest.fn(async () => {}),
}));

const mockApi = api as jest.Mocked<typeof api>;
const H = strings.home;
const place = fixtures.places[0];
const known: BirthInput = { date: '2000-06-15', time: '21:00', placeId: place.id };
const unknown: BirthInput = { date: '2000-06-15', time: null, placeId: null };
const noProfile: ApiResult<BirthInput> = { ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' };

const formShown = () => screen.findByPlaceholderText(H.datePlaceholder);
const homeShown = () => screen.findByTestId('home-column');

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  resetHomeReady();
  mockSession.current = { status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null };
  mockApi.getProfile.mockResolvedValue(noProfile);
  mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chart });
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
});

describe('출생 정보 되살리기(결정 029)', () => {
  it('기기가 비어 있고 서버에 출생 정보가 있으면 차트와 곳 이름을 받아 기기에 두고 홈을 보여 준다', async () => {
    mockApi.getProfile.mockResolvedValue({ ok: true, data: known });
    await render(<HomeScreen />);
    expect(await homeShown()).toBeTruthy();
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();

    expect(mockApi.getProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.createChart).toHaveBeenCalledTimes(1);
    expect(mockApi.createChart).toHaveBeenCalledWith(known);
    // 서버의 값을 받은 것이라 다시 저장하지 않는다.
    expect(mockApi.saveProfile).not.toHaveBeenCalled();
    expect(await loadBirth()).toEqual({
      profile: { date: known.date, time: known.time, place: { id: place.id, name: place.name } },
      chart: fixtures.chart,
    });
  });

  it('시각 "모름" 인 출생 정보는 곳 없이 되살린다(곳 목록을 받지 않는다)', async () => {
    mockApi.getProfile.mockResolvedValue({ ok: true, data: unknown });
    mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
    await render(<HomeScreen />);
    await homeShown();
    expect(mockApi.createChart).toHaveBeenCalledWith(unknown);
    expect(mockApi.listPlaces).not.toHaveBeenCalled();
    expect(await loadBirth()).toEqual({
      profile: { date: unknown.date, time: null, place: null },
      chart: fixtures.chartTimeUnknown,
    });
  });

  it.each([
    ['곳 목록을 받지 못했다', { ok: false, error: 'NETWORK' }],
    ['목록에 그 식별자가 없다', { ok: true, data: fixtures.places.slice(1) }],
  ] as [string, Awaited<ReturnType<typeof api.listPlaces>>][])(
    '곳 이름을 찾지 못해도(%s) 식별자만 두고 되살린다. 출생 정보 줄은 곳 없이, 입력 칸은 안내로 보인다',
    async (_name, places) => {
      mockApi.getProfile.mockResolvedValue({ ok: true, data: known });
      mockApi.listPlaces.mockResolvedValue(places);
      const home = await render(<HomeScreen />);
      await homeShown();
      expect((await loadBirth())?.profile).toEqual({
        date: known.date,
        time: known.time,
        place: { id: place.id, name: '' },
      });
      await home.unmount();

      const my = await render(<MyScreen />);
      expect(await screen.findByText('2000년 6월 15일 · 오후 9:00')).toBeTruthy();
      await my.unmount();

      await render(<BirthScreen />);
      expect(await screen.findByDisplayValue('2000-06-15')).toBeTruthy();
      expect(screen.getByText(H.placePlaceholder)).toBeTruthy();
    },
  );

  it('서버에 저장된 것이 없으면(404 NO_PROFILE) 입력 화면을 보여 주고 다시 부르지 않는다', async () => {
    await render(<HomeScreen />);
    expect(await formShown()).toBeTruthy();
    expect(screen.queryByTestId('home-column')).toBeNull();
    expect(mockApi.getProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.createChart).not.toHaveBeenCalled();
    expect(await loadBirth()).toBeNull();
  });

  // 있는 사람에게 입력 화면을 보이면 조금 다르게 다시 넣은 값이 PUT /profile 로 가 서버가 풀이 · 리포트를 지운다(결정 112)
  it.each([
    ['네트워크', { ok: false, error: 'NETWORK' }],
    ['서버 오류', { ok: false, error: 'SERVER', status: 500 }],
    ['한도', { ok: false, error: 'LIMIT', status: 429 }],
    ['NO_PROFILE 이 아닌 404', { ok: false, error: 'SERVER', status: 404 }],
    ['모양이 다름', { ok: false, error: 'INVALID', status: 200 }],
    ['로그인 필요', { ok: false, error: 'LOGIN_REQUIRED', status: 401 }],
  ] as [string, ApiResult<BirthInput>][])(
    '있는지 알 수 없으면(%s) 입력 화면 대신 불러오지 못한 화면(19)을 보이고, 다시 보기를 누르면 다시 되살린다',
    async (_name, result) => {
      mockApi.getProfile.mockResolvedValueOnce(result);
      await render(<HomeScreen />);
      expect(await screen.findByText(strings.states.loadFail.title.home)).toBeTruthy();
      expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
      expect(getHomeReady()).toBe(true);
      expect(await loadBirth()).toBeNull();

      mockApi.getProfile.mockResolvedValue({ ok: true, data: known });
      await fireEvent.press(screen.getByRole('button', { name: strings.states.loadFail.retry }));
      expect(await homeShown()).toBeTruthy();
      expect(mockApi.getProfile).toHaveBeenCalledTimes(2);
    },
  );

  it('출생 정보는 받았는데 차트를 받지 못하면 입력 화면 대신 불러오지 못한 화면(19) — 기기에 두지 않는다', async () => {
    mockApi.getProfile.mockResolvedValue({ ok: true, data: known });
    mockApi.createChart.mockResolvedValue({ ok: false, error: 'SERVER', status: 502 });
    await render(<HomeScreen />);
    expect(await screen.findByText(strings.states.loadFail.title.home)).toBeTruthy();
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    expect(await loadBirth()).toBeNull();
  });

  it('인터넷이 끊겨 되살리지 못했으면 볼 게 없는 화면(20-1) — 다시 시도는 다시 되살린다', async () => {
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      cb({ isConnected: false, isInternetReachable: false });
      return () => {};
    });
    try {
      mockApi.getProfile.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
      await render(<HomeScreen />);
      expect(await screen.findByText(strings.states.offlineEmpty.title)).toBeTruthy();
      expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
      mockApi.getProfile.mockResolvedValue({ ok: true, data: known });
      await fireEvent.press(screen.getByRole('button', { name: strings.states.offlineEmpty.retry }));
      await waitFor(() => expect(mockApi.getProfile).toHaveBeenCalledTimes(2));
    } finally {
      (NetInfo.addEventListener as jest.Mock).mockReset();
    }
  });

  it('기기에 출생 정보가 있으면 서버에 묻지 않는다(기기의 것을 그대로 둔다)', async () => {
    const mine = { profile: { date: '1990-01-02', time: null, place: null }, chart: fixtures.chartTimeUnknown };
    await saveBirth(mine);
    mockApi.getProfile.mockResolvedValue({ ok: true, data: known });
    await render(<HomeScreen />);
    await homeShown();
    expect(mockApi.getProfile).not.toHaveBeenCalled();
    expect(mockApi.createChart).not.toHaveBeenCalled();
    expect(await loadBirth()).toEqual(mine);
  });

  it('세션이 없으면 서버에 묻지 않는다 — 루트 가드가 로그인으로 보내는 동안 가림막 아래에서 입력 화면도 그리지 않는다(곳 목록을 받지 않게, 성능 계획 4)', async () => {
    mockSession.current = { status: 'signedOut' as const, token: null, ready: true, lastError: null };
    mockApi.getProfile.mockResolvedValue({ ok: true, data: known });
    await render(<HomeScreen />);
    await act(async () => {});
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    expect(mockApi.getProfile).not.toHaveBeenCalled();
    expect(mockApi.listPlaces).not.toHaveBeenCalled();
  });

  it('가짜 서버에서는 되살리지 않고 입력 화면을 보여 준다', async () => {
    const fixtureApi = createApi({ baseUrl: '', getToken: () => 't', useFixtures: true });
    mockApi.getProfile.mockImplementation(() => fixtureApi.getProfile());
    await render(<HomeScreen />);
    expect(await formShown()).toBeTruthy();
    expect(mockApi.createChart).not.toHaveBeenCalled();
    expect(await loadBirth()).toBeNull();
  });

  it('확인하는 동안에는 입력 화면이 비치지 않는다: 세션을 기다릴 때도, 서버의 답을 기다릴 때도 되살린 뒤의 홈을 본뜬 뼈대만 보인다(결정 071)', async () => {
    mockSession.current = { status: 'checking' as const, token: null, ready: false, lastError: null };
    let answer: (r: ApiResult<BirthInput>) => void = () => {};
    mockApi.getProfile.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const seenForm = () => screen.queryByPlaceholderText(H.datePlaceholder) !== null;

    const view = await render(<HomeScreen />);
    // 기기 저장소를 읽은 뒤: 세션 확인을 기다린다. 아직 서버에 묻지 않는다(0.3초가 넘으면 뼈대).
    expect(await screen.findByTestId('home-skeleton')).toBeTruthy();
    expect(seenForm()).toBe(false);
    expect(mockApi.getProfile).not.toHaveBeenCalled();

    mockSession.current = { status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null };
    await view.rerender(<HomeScreen />);
    await waitFor(() => expect(mockApi.getProfile).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('home-skeleton')).toBeTruthy();
    expect(seenForm()).toBe(false);

    await act(async () => answer({ ok: true, data: known }));
    await homeShown();
    expect(seenForm()).toBe(false);
    expect(screen.queryByTestId('home-skeleton')).toBeNull();
    expect(mockApi.getProfile).toHaveBeenCalledTimes(1);
  });

  it('답이 "없다" 이면 뼈대가 입력 화면으로 바뀐다', async () => {
    let answer: (r: ApiResult<BirthInput>) => void = () => {};
    mockApi.getProfile.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<HomeScreen />);
    expect(await screen.findByTestId('home-skeleton')).toBeTruthy();
    await act(async () => answer(noProfile));
    expect(await formShown()).toBeTruthy();
    expect(screen.queryByTestId('home-skeleton')).toBeNull();
  });

  it('계정을 지운 뒤: 세션이 비어 묻지 않고(가드가 로그인으로), 새 세션으로 물어도 서버에 없으면 입력 화면', async () => {
    await saveBirth({ profile: { date: known.date, time: null, place: null }, chart: fixtures.chartTimeUnknown });
    mockApi.deleteAccount.mockResolvedValue({ ok: true, data: null });
    const del = await render(<DeleteAccountScreen />);
    await fireEvent.press(screen.getByRole('checkbox'));
    await fireEvent.press(screen.getByRole('button', { name: strings.my.delete.confirm }));
    await waitFor(async () => expect(await loadBirth()).toBeNull());
    // "계정을 지웠어요" 의 확인에서 세션을 비운다
    await fireEvent.press(await screen.findByText(strings.my.delete.doneConfirm));
    await waitFor(() => expect(mockSession.current.status).toBe('signedOut'));
    await del.unmount();

    // 세션이 비었다 — 루트 가드가 로그인으로 보낸다(홈은 입력 화면을 그리지 않고 서버에도 묻지 않는다)
    const first = await render(<HomeScreen />);
    await act(async () => {});
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    expect(mockApi.getProfile).not.toHaveBeenCalled();
    await first.unmount();

    // 다음에 켜서 새 세션을 받았다. 지운 계정의 출생 정보는 서버에 없다.
    mockSession.current = { status: 'signedIn' as const, token: 'new-token', ready: true, lastError: null };
    await render(<HomeScreen />);
    expect(await formShown()).toBeTruthy();
    expect(mockApi.getProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.createChart).not.toHaveBeenCalled();
  });
});

// 결정 068 의 2: 홈의 첫 데이터(기기 읽기 + 되살리기)가 끝날 때까지 루트가 스플래시를 둔다 — 홈은 끝났다고 알린다
describe('홈의 첫 데이터', () => {
  it('되살리는 동안은 끝나지 않았고, 되살려 홈을 그리면 끝났다고 알린다', async () => {
    let answer: (r: ApiResult<BirthInput>) => void = () => {};
    mockApi.getProfile.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<HomeScreen />);
    await waitFor(() => expect(mockApi.getProfile).toHaveBeenCalled());
    expect(getHomeReady()).toBe(false);
    await act(async () => answer({ ok: true, data: known }));
    await homeShown();
    expect(getHomeReady()).toBe(true);
  });

  it('기기에 있으면 읽자마자 끝났다고 알린다', async () => {
    await saveBirth({ profile: { date: known.date, time: null, place: null }, chart: fixtures.chartTimeUnknown });
    await render(<HomeScreen />);
    await homeShown();
    expect(getHomeReady()).toBe(true);
  });

  it('10초가 넘으면 불러오지 못한 화면(19)을 보이고 끝났다고 알린다. 다시 보기를 누르면 다시 되살린다', async () => {
    jest.useFakeTimers();
    try {
      mockApi.getProfile.mockReturnValue(new Promise(() => {}));
      await render(<HomeScreen />);
      await act(async () => jest.advanceTimersByTime(10_000));
      expect(screen.getByText(strings.states.loadFail.title.home)).toBeTruthy();
      expect(getHomeReady()).toBe(true);
      mockApi.getProfile.mockResolvedValue({ ok: true, data: known });
      await fireEvent.press(screen.getByRole('button', { name: strings.states.loadFail.retry }));
      await act(async () => jest.advanceTimersByTime(100));
      expect(mockApi.getProfile).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});

// 결정 068 의 4: 웹이 시작할 때 서버에 닿지 못했으면(offline) 로그인으로 보내지 않고 받아 둔 홈을 보인다. 받아 둔 것이 없으면
// 인터넷이 끊겼을 때만 20-1, 인터넷은 되는데 서버만 닿지 않으면 19 "불러오지 못했어요"(소유자 2026-11-21)
describe('홈: 서버에 닿지 못하고 시작함', () => {
  const offline = { status: 'offline' as const, token: null, ready: true, lastError: null };
  /** 인터넷이 끊긴 기기(연결 상태 알림) */
  const disconnect = () =>
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      cb({ isConnected: false, isInternetReachable: false });
      return () => {};
    });
  afterEach(() => (NetInfo.addEventListener as jest.Mock).mockReset());

  it('받아 둔 출생 정보가 있으면 홈. 서버에 묻지 않고, 인터넷이 되면 끊김 띠도 없다', async () => {
    await saveBirth({ profile: { date: known.date, time: null, place: null }, chart: fixtures.chartTimeUnknown });
    mockSession.current = offline;
    await render(<HomeScreen />);
    await homeShown();
    expect(screen.queryByText(strings.states.offline.title)).toBeNull();
    expect(mockApi.getProfile).not.toHaveBeenCalled();
    expect(getHomeReady()).toBe(true);
  });

  it('인터넷이 끊겼으면 받아 둔 홈 위에 끊김 띠', async () => {
    disconnect();
    await saveBirth({ profile: { date: known.date, time: null, place: null }, chart: fixtures.chartTimeUnknown });
    mockSession.current = offline;
    await render(<HomeScreen />);
    await homeShown();
    expect(screen.getByText(strings.states.offline.title)).toBeTruthy();
  });

  it('받아 둔 것이 없고 인터넷은 되면 19 "홈을 불러오지 못했어요" — 다시 보기는 세션을 다시 확인한다', async () => {
    mockSession.current = offline;
    await render(<HomeScreen />);
    expect(await screen.findByText(strings.states.loadFail.title.home)).toBeTruthy();
    expect(screen.queryByText(strings.states.offlineEmpty.title)).toBeNull();
    expect(getHomeReady()).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: strings.states.loadFail.retry }));
    expect(recheckSession).toHaveBeenCalledTimes(1);
  });

  it('받아 둔 것이 없고 인터넷이 끊겼으면 볼 게 없는 화면(20-1). 다시 시도는 세션을 다시 확인한다', async () => {
    disconnect();
    mockSession.current = offline;
    await render(<HomeScreen />);
    expect(await screen.findByText(strings.states.offlineEmpty.title)).toBeTruthy();
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    expect(getHomeReady()).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: strings.states.offlineEmpty.retry }));
    expect(recheckSession).toHaveBeenCalledTimes(1);
  });
});
