import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import BirthScreen from '@/app/birth';
import HomeScreen from '@/app/index';
import MyScreen from '@/app/my';
import SettingsScreen from '@/app/settings/index';
import { strings } from '@/content/strings';
import { loadBirth, saveBirth } from '@/features/chart/use-birth-profile';
import { api, createApi, type ApiResult, type BirthInput } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

const mockSession: { current: { token: string | null; ready: boolean } } = {
  current: { token: 'dev-token', ready: true },
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
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    getProfile: jest.fn(),
    createChart: jest.fn(),
    listPlaces: jest.fn(),
    saveProfile: jest.fn(),
    deleteAccount: jest.fn(),
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => mockSession.current),
  getSession: jest.fn(() => mockSession.current),
  // 계정을 지우면 세션이 비워진다.
  clearSession: jest.fn(async () => {
    mockSession.current = { token: null, ready: true };
  }),
}));

const mockApi = api as jest.Mocked<typeof api>;
const H = strings.home;
const place = fixtures.places[0];
const known: BirthInput = { date: '2000-06-15', time: '21:00', placeId: place.id };
const unknown: BirthInput = { date: '2000-06-15', time: null, placeId: null };
const noProfile: ApiResult<BirthInput> = { ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' };

const formShown = () => screen.findByPlaceholderText(H.datePlaceholder);
const homeShown = () => screen.findAllByTestId('home-category');

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockSession.current = { token: 'dev-token', ready: true };
  mockApi.getProfile.mockResolvedValue(noProfile);
  mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chart });
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
});

describe('출생 정보 되살리기(결정 029)', () => {
  it('기기가 비어 있고 서버에 출생 정보가 있으면 차트와 곳 이름을 받아 기기에 두고 홈을 보여 준다', async () => {
    mockApi.getProfile.mockResolvedValue({ ok: true, data: known });
    await render(<HomeScreen />);
    expect(await homeShown()).toHaveLength(4);
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
      expect(await screen.findByText('2000. 6. 15. 오후 9:00')).toBeTruthy();
      await my.unmount();

      await render(<BirthScreen />);
      expect(await screen.findByDisplayValue('2000-06-15')).toBeTruthy();
      expect(screen.getByText(H.placePlaceholder)).toBeTruthy();
    },
  );

  it.each([
    ['저장된 것이 없다(404)', noProfile],
    ['네트워크', { ok: false, error: 'NETWORK' }],
    ['서버 오류', { ok: false, error: 'SERVER', status: 500 }],
    ['모양이 다름', { ok: false, error: 'INVALID', status: 200 }],
    ['로그인 필요', { ok: false, error: 'LOGIN_REQUIRED', status: 401 }],
  ] as [string, ApiResult<BirthInput>][])(
    '되살리지 못하면(%s) 입력 화면을 보여 주고 다시 부르지 않는다',
    async (_name, result) => {
      mockApi.getProfile.mockResolvedValue(result);
      await render(<HomeScreen />);
      expect(await formShown()).toBeTruthy();
      expect(screen.queryByTestId('home-category')).toBeNull();
      expect(mockApi.getProfile).toHaveBeenCalledTimes(1);
      expect(mockApi.createChart).not.toHaveBeenCalled();
      expect(await loadBirth()).toBeNull();
    },
  );

  it('출생 정보는 받았는데 차트를 받지 못하면 입력 화면을 보여 주고 기기에 두지 않는다', async () => {
    mockApi.getProfile.mockResolvedValue({ ok: true, data: known });
    mockApi.createChart.mockResolvedValue({ ok: false, error: 'SERVER', status: 502 });
    await render(<HomeScreen />);
    expect(await formShown()).toBeTruthy();
    expect(await loadBirth()).toBeNull();
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

  it('세션이 없으면 서버에 묻지 않고 입력 화면을 보여 준다', async () => {
    mockSession.current = { token: null, ready: true };
    mockApi.getProfile.mockResolvedValue({ ok: true, data: known });
    await render(<HomeScreen />);
    expect(await formShown()).toBeTruthy();
    expect(mockApi.getProfile).not.toHaveBeenCalled();
  });

  it('가짜 서버에서는 되살리지 않고 입력 화면을 보여 준다', async () => {
    const fixtureApi = createApi({ baseUrl: '', getToken: () => 't', useFixtures: true });
    mockApi.getProfile.mockImplementation(() => fixtureApi.getProfile());
    await render(<HomeScreen />);
    expect(await formShown()).toBeTruthy();
    expect(mockApi.createChart).not.toHaveBeenCalled();
    expect(await loadBirth()).toBeNull();
  });

  it('확인하는 동안에는 입력 화면이 비치지 않는다: 세션을 기다릴 때도, 서버의 답을 기다릴 때도 "불러오는 중" 만 보인다', async () => {
    mockSession.current = { token: null, ready: false };
    let answer: (r: ApiResult<BirthInput>) => void = () => {};
    mockApi.getProfile.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const seenForm = () => screen.queryByPlaceholderText(H.datePlaceholder) !== null;

    const view = await render(<HomeScreen />);
    // 기기 저장소를 읽은 뒤: 세션 확인을 기다린다. 아직 서버에 묻지 않는다.
    expect(await screen.findByText(H.restoring)).toBeTruthy();
    expect(seenForm()).toBe(false);
    expect(mockApi.getProfile).not.toHaveBeenCalled();

    mockSession.current = { token: 'dev-token', ready: true };
    await view.rerender(<HomeScreen />);
    await waitFor(() => expect(mockApi.getProfile).toHaveBeenCalledTimes(1));
    expect(screen.getByText(H.restoring)).toBeTruthy();
    expect(seenForm()).toBe(false);

    await act(async () => answer({ ok: true, data: known }));
    await homeShown();
    expect(seenForm()).toBe(false);
    expect(screen.queryByText(H.restoring)).toBeNull();
    expect(mockApi.getProfile).toHaveBeenCalledTimes(1);
  });

  it('답이 "없다" 이면 불러오는 중이 입력 화면으로 바뀐다', async () => {
    let answer: (r: ApiResult<BirthInput>) => void = () => {};
    mockApi.getProfile.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    await render(<HomeScreen />);
    expect(await screen.findByText(H.restoring)).toBeTruthy();
    await act(async () => answer(noProfile));
    expect(await formShown()).toBeTruthy();
    expect(screen.queryByText(H.restoring)).toBeNull();
  });

  it('계정을 지운 뒤에는 입력 화면이 보인다: 세션이 비어 묻지 않고, 새 세션으로 물어도 서버에 없다', async () => {
    await saveBirth({ profile: { date: known.date, time: null, place: null }, chart: fixtures.chartTimeUnknown });
    mockApi.deleteAccount.mockResolvedValue({ ok: true, data: null });
    const settings = await render(<SettingsScreen />);
    await fireEvent.press(screen.getByText(strings.settings.deleteAccount));
    await fireEvent.press(await screen.findByText(strings.settings.deleteSheet.confirm));
    await waitFor(async () => expect(await loadBirth()).toBeNull());
    await settings.unmount();

    const first = await render(<HomeScreen />);
    expect(await formShown()).toBeTruthy();
    expect(mockApi.getProfile).not.toHaveBeenCalled();
    await first.unmount();

    // 다음에 켜서 새 세션을 받았다. 지운 계정의 출생 정보는 서버에 없다.
    mockSession.current = { token: 'new-token', ready: true };
    await render(<HomeScreen />);
    expect(await formShown()).toBeTruthy();
    expect(mockApi.getProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.createChart).not.toHaveBeenCalled();
  });
});
