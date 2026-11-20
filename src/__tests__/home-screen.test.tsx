import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import BirthScreen from '@/app/birth';
import HomeScreen from '@/app/index';
import { Colors } from '@/constants/theme';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { READING_STORAGE_KEY } from '@/features/reading/use-reading';
import { api } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
}));
// 홈은 로그인한 사람만 온다(루트 가드) — 계정은 로그인이 확인된 뒤에 묻는다
jest.mock('@/features/auth/use-session', () => ({
  ...jest.requireActual('@/features/auth/use-session'),
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    listPlaces: jest.fn(),
    createChart: jest.fn(),
    saveProfile: jest.fn(),
    getAccount: jest.fn(),
    // 기기가 비어 있으면 서버의 출생 정보로 되살려 본다(결정 029) — 이 테스트들에서는 저장된 것이 없다
    getProfile: jest.fn(async () => ({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' })),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const M = strings.main;
type Profile = { date: string; time: string | null; place: { id: number; name: string } | null };
/** 그 출생 정보로 받아 둔 풀이를 기기에 넣는다(use-reading 의 열쇠: 날짜 · 시각 · 곳) */
const storeReading = (reading: object, p: Profile = profile) =>
  AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ key: JSON.stringify([p.date, p.time, p.place?.id ?? null]), reading }));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  mockApi.getAccount.mockResolvedValue({ ok: true, data: { nickname: '새벽별', avatar: 3 } });
});

/** 기기 시계를 고정한 테스트가 쓴다(별명을 받은 지 N일) */
let nowSpy: jest.SpyInstance | null = null;
afterEach(() => {
  nowSpy?.mockRestore();
  nowSpy = null;
});

describe('홈', () => {
  it('출생 정보가 없으면 입력부터 받는다', async () => {
    await render(<HomeScreen />);
    expect(await screen.findByPlaceholderText(strings.home.datePlaceholder)).toBeTruthy();
    expect(screen.queryByTestId('nickname-card')).toBeNull();
  });

  it('출생 정보가 있으면 머리의 로고와 별명 카드 — 프로필 그림 · "새벽별 님" · "쌍둥이자리 · 별명을 받은 지 12일" · 한 줄 별명 · 풀이 읽기(결정 047, 보드 11). 카테고리 · 궁합 칸은 없다(결정 055)', async () => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-11-20T01:00:00Z').getTime());
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading({ ...fixtures.reading, createdAt: '2026-11-09T01:00:00Z' });
    await render(<HomeScreen />);
    expect(await screen.findByText('새벽별 님')).toBeTruthy();
    expect(screen.getByText('쌍둥이자리 · 별명을 받은 지 12일')).toBeTruthy();
    expect(screen.getByText(fixtures.reading.headline)).toBeTruthy();
    expect(screen.getByLabelText(strings.nickname.avatars[2])).toBeTruthy();
    expect(screen.getByTestId('brand-mark')).toBeTruthy();
    expect(screen.queryByTestId('home-category')).toBeNull();
    expect(screen.queryByText(/궁합/)).toBeNull();
    await fireEvent.press(screen.getByTestId('nickname-card'));
    expect(router.push).toHaveBeenCalledWith('/reading');
  });

  it('만든 때(createdAt)가 없는 옛 풀이면 해 별자리만 적는다(결정 047 의 3)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading);
    await render(<HomeScreen />);
    expect(within(await screen.findByTestId('nickname-card')).getByText('쌍둥이자리')).toBeTruthy();
    expect(screen.queryByText(/별명을 받은 지/)).toBeNull();
  });

  it('시각 "모름" 이어도 같은 카드다 — 해 별자리는 서버 차트의 값(결정 047 의 4)', async () => {
    const unknown = { date: '2000-06-15', time: null, place: null };
    await saveBirth({ profile: unknown, chart: fixtures.chartTimeUnknown });
    await storeReading(fixtures.reading, unknown);
    await render(<HomeScreen />);
    expect(await screen.findByText(fixtures.reading.headline)).toBeTruthy();
    expect(screen.getByText('새벽별 님')).toBeTruthy();
    expect(within(screen.getByTestId('nickname-card')).getByText('쌍둥이자리')).toBeTruthy();
  });

  it('계정을 받지 못했거나 옛 계정(닉네임 · 프로필 null)이면 이름 줄 없이 그린다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading);
    for (const result of [{ ok: false, error: 'NETWORK' } as const, { ok: true, data: { nickname: null, avatar: null } } as const]) {
      mockApi.getAccount.mockResolvedValueOnce(result);
      const view = await render(<HomeScreen />);
      expect(await screen.findByText(fixtures.reading.headline)).toBeTruthy();
      expect(screen.queryByText(/ 님$/)).toBeNull();
      expect(screen.queryByRole('image')).toBeNull();
      expect(within(screen.getByTestId('nickname-card')).getByText('쌍둥이자리')).toBeTruthy();
      await view.unmount();
    }
  });

  it('모르는 프로필 번호면 그림만 빼고 이름은 그린다(리뷰 PR #41)', async () => {
    mockApi.getAccount.mockResolvedValueOnce({ ok: true, data: { nickname: '새벽별', avatar: 9 } });
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading);
    await render(<HomeScreen />);
    expect(await screen.findByText('새벽별 님')).toBeTruthy();
    expect(screen.queryByRole('image')).toBeNull();
  });

  it('받아 둔 풀이가 없으면 "아직 별명을 짓지 않았어요" 와 "내 별명 읽기" — 누르면 /reading(풀이를 부르지 않는다)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    expect(within(await screen.findByTestId('nickname-card')).getByText(M.readingEmpty)).toBeTruthy();
    await fireEvent.press(screen.getByText(M.readingCta));
    expect(router.push).toHaveBeenCalledWith('/reading');
    expect(screen.queryByText(fixtures.reading.headline)).toBeNull();
  });

  it('다른 출생 정보로 받은 풀이는 보여 주지 않는다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading, { date: '1990-01-01', time: null, place: { id: 1, name: 'x' } });
    await render(<HomeScreen />);
    expect(within(await screen.findByTestId('nickname-card')).getByText(M.readingEmpty)).toBeTruthy();
  });

  it('아래에 탭 넷이 있다: 홈 · 나 · 시기 · 마이(결정 055 의 2). 누르면 그 화면으로 바꾼다 — 나는 /me(결정 048 의 1), 시기는 /report?area=TIMING(결정 046 의 4)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await screen.findByTestId('nickname-card');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['홈', '나', '시기', '마이']);
    expect(tabs.map((t) => t.props.accessibilityState.selected)).toEqual([true, false, false, false]);
    await fireEvent.press(tabs[1]);
    expect(router.replace).toHaveBeenLastCalledWith('/me');
    await fireEvent.press(tabs[2]);
    expect(router.replace).toHaveBeenLastCalledWith('/report?area=TIMING');
    await fireEvent.press(tabs[3]);
    expect(router.replace).toHaveBeenLastCalledWith('/my');
    // 지금 있는 탭을 눌러도 아무 데도 가지 않는다
    (router.replace as jest.Mock).mockClear();
    await fireEvent.press(tabs[0]);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('머리는 높이 56, 별명 카드는 그 아래 12(보드 11 · 11-1)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    const card = await screen.findByTestId('nickname-card');
    expect(StyleSheet.flatten(screen.getByTestId('nav-bar').props.style).height).toBe(56);
    expect(card).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('home-column').props.style)).toMatchObject({ paddingTop: 12, gap: 12 });
  });

  it('탭 이름은 시안 11 의 11/15 — 고른 탭은 600 · 본문색, 나머지는 500 · 안내색', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await screen.findByTestId('nickname-card');
    const style = (label: string) => StyleSheet.flatten(within(screen.getByLabelText(label)).getByText(label).props.style);
    expect(style('홈')).toMatchObject({ fontSize: 11, lineHeight: 15, fontWeight: '600', color: Colors.ink });
    expect(style('나')).toMatchObject({ fontSize: 11, lineHeight: 15, fontWeight: '500', color: Colors.hint });
  });

  it('끊기면 별명 카드 위에 띠가 뜨고, 돌아오면 사라진다(결정 061 의 4, 보드 20)', async () => {
    let listener: ((s: { isConnected: boolean; isInternetReachable: boolean }) => void) | null = null;
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      listener = cb;
      return () => {};
    });
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await screen.findByTestId('nickname-card');
    expect(screen.queryByTestId('offline-banner')).toBeNull();
    await act(async () => listener?.({ isConnected: false, isInternetReachable: false }));
    const column = within(screen.getByTestId('home-column'));
    expect(column.getByTestId('offline-banner')).toBeTruthy();
    expect(column.getByTestId('nickname-card')).toBeTruthy();
    await act(async () => listener?.({ isConnected: true, isInternetReachable: true }));
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });

  it('끊긴 채 열어 계정을 못 받았으면, 연결이 돌아올 때 다시 받는다(띠의 "연결되면 새로 불러올게요", 리뷰 PR #44)', async () => {
    let listener: ((s: { isConnected: boolean; isInternetReachable: boolean }) => void) | null = null;
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      listener = cb;
      return () => {};
    });
    mockApi.getAccount.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading);
    await render(<HomeScreen />);
    await screen.findByTestId('nickname-card');
    expect(screen.queryByText('새벽별 님')).toBeNull();
    await act(async () => listener?.({ isConnected: false, isInternetReachable: false }));
    await act(async () => listener?.({ isConnected: true, isInternetReachable: true }));
    expect(await screen.findByText('새벽별 님')).toBeTruthy();
    expect(mockApi.getAccount).toHaveBeenCalledTimes(2);
  });

  it('출생 정보를 넣기 전(입력 화면)에는 탭이 없다', async () => {
    await render(<HomeScreen />);
    await screen.findByPlaceholderText(strings.home.datePlaceholder);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});

describe('출생 정보 바꾸기(/birth)', () => {
  it('넣어 둔 값으로 채운 입력 화면을 보여 준다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<BirthScreen />);
    expect(await screen.findByDisplayValue('2000-06-15')).toBeTruthy();
    expect(screen.getByText('오후 9:00')).toBeTruthy();
    // 칸에는 짧은 시 · 도 이름으로 적는다(결정 042 시안)
    expect(screen.getByText('서울 마포구')).toBeTruthy();
  });
});
