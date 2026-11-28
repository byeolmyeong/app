import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import BirthScreen from '@/app/birth';
import HomeScreen from '@/app/index';
import { Colors, HomeMenuLayout, RelationColors } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { saveBirth } from '@/features/chart/use-birth-profile';
import * as homeReady from '@/features/home/home-ready';
import { READING_STORAGE_KEY } from '@/features/reading/use-reading';
import { TIMING_REPORT_STORAGE_KEY } from '@/features/timing/use-timing-report';
import { DAY_SKY_STORAGE_KEY } from '@/features/timing/use-today-sky';
import { MONTH_SKY_STORAGE_KEY } from '@/features/timing/use-month';
import { ME_REPORT_STORAGE_KEY } from '@/features/me/use-me-report';
import { refreshAccount } from '@/lib/account-store';
import { api } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  // 홈의 종이 화면이 보일 때마다 알림함을 다시 묻는다(useNotifications)
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
}));
// 쓰는 중에 온 푸시(결정 066 의 5) — 시험이 직접 보낸다
const mockPushListeners = new Set<(push: { type: string }) => void>();
jest.mock('@/features/push/push', () => ({
  ...jest.requireActual('@/features/push/push'),
  onPushReceived: (listener: (push: { type: string }) => void) => {
    mockPushListeners.add(listener);
    return () => mockPushListeners.delete(listener);
  },
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
    getMyAccount: jest.fn(),
    getNotifications: jest.fn(),
    // 앱을 켤 때 이번 달 달력을 받아 둔다(결정 075 의 3)
    getMonth: jest.fn(),
    // 앱을 켤 때 나 탭 풀이의 상태도 받아 둔다(결정 075 의 4)
    getMeReport: jest.fn(),
    // 오늘의 하늘 칸(결정 051)
    postDaySky: jest.fn(),
    markNotificationRead: jest.fn(),
    // 홈은 풀이를 부르지 않는다(POST /readings 는 옛 요약 해석만 있는 계정이면 새로 짓는다 — 서버 결정 030)
    createReading: jest.fn(),
    // 기기가 비어 있으면 서버의 출생 정보로 되살려 본다(결정 029) — 이 테스트들에서는 저장된 것이 없다
    getProfile: jest.fn(async () => ({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' })),
    // 앱을 켤 때 시기 풀이의 상태도 받아 둔다(결정 075 의 4 · 113 의 4) — 만들기(POST)는 시기 탭에서 사람이 누를 때만
    getTimingReport: jest.fn(),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const H = strings.home.menu;
type Profile = { date: string; time: string | null; place: { id: number; name: string } | null };
/** 그 출생 정보로 받아 둔 풀이를 기기에 넣는다(use-reading 의 열쇠: 날짜 · 시각 · 곳) */
const storeReading = (reading: object, p: Profile = profile) =>
  AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ key: JSON.stringify([p.date, p.time, p.place?.id ?? null]), reading }));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } });
  mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'NONE' } });
  mockApi.getNotifications.mockResolvedValue({ ok: true, data: { unread: 0, items: [] } });
  mockApi.getMonth.mockResolvedValue({ ok: true, data: fixtures.monthSky });
  mockApi.getMeReport.mockResolvedValue({ ok: true, data: { status: 'NONE' } });
  mockApi.postDaySky.mockResolvedValue({ ok: true, data: fixtures.daySky });
});

/** 기기 시계를 고정한 테스트가 쓴다(별명을 받은 지 N일) */
let nowSpy: jest.SpyInstance | null = null;
afterEach(() => {
  nowSpy?.mockRestore();
  nowSpy = null;
});

/** 홈이 다 그려졌다 — 메뉴판의 첫 카드 */
const homeShown = () => screen.findByTestId('home-menu-me');

describe('홈', () => {
  it('출생 정보가 없으면 입력부터 받는다', async () => {
    await render(<HomeScreen />);
    expect(await screen.findByPlaceholderText(strings.home.datePlaceholder)).toBeTruthy();
    expect(screen.queryByTestId('home-menu-me')).toBeNull();
  });

  it('로그인 전 · 가입 중이면(루트 가드가 소개 · 로그인으로 보내는 동안 가림막 아래) 출생 정보 입력을 그리지 않고 곳 목록도 받지 않는다(성능 계획 4)', async () => {
    for (const status of ['signedOut', 'signingUp'] as const) {
      (useSession as jest.Mock).mockReturnValue({ status, token: null, ready: true, lastError: null });
      const view = await render(<HomeScreen />);
      await act(async () => {});
      expect(screen.queryByPlaceholderText(strings.home.datePlaceholder)).toBeNull();
      expect(mockApi.listPlaces).not.toHaveBeenCalled();
      expect(mockApi.getProfile).not.toHaveBeenCalled();
      await view.unmount();
    }
    (useSession as jest.Mock).mockReturnValue({ status: 'signedIn', token: 't', ready: true, lastError: null });
  });

  it('아래에 탭 다섯이 있다: 홈 · 나 · 시기 · 궁합 · 마이(결정 102 의 3). 누르면 그 화면으로 바꾼다 — 나는 /me(결정 048 의 1), 시기는 /timing(시기 탭, 결정 049), 궁합은 /synastry', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await homeShown();
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['홈', '나', '시기', '궁합', '마이']);
    expect(tabs.map((t) => t.props.accessibilityState.selected)).toEqual([true, false, false, false, false]);
    await fireEvent.press(tabs[1]);
    expect(router.replace).toHaveBeenLastCalledWith('/me');
    await fireEvent.press(tabs[2]);
    expect(router.replace).toHaveBeenLastCalledWith('/timing');
    await fireEvent.press(tabs[3]);
    expect(router.replace).toHaveBeenLastCalledWith('/synastry');
    await fireEvent.press(tabs[4]);
    expect(router.replace).toHaveBeenLastCalledWith('/my');
    // 지금 있는 탭을 눌러도 아무 데도 가지 않는다
    (router.replace as jest.Mock).mockClear();
    await fireEvent.press(tabs[0]);
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('머리는 높이 56 · 왼쪽 로고, 첫 카드는 그 아래 12 · 카드 사이 12(시안 "홈 (1.1.0)" A)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await homeShown();
    expect(StyleSheet.flatten(screen.getByTestId('nav-bar').props.style).height).toBe(56);
    expect(screen.getByTestId('brand-mark')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('home-column').props.style)).toMatchObject({ paddingTop: 12, gap: 12 });
  });

  it('탭 이름은 시안 11 의 11/15 — 고른 탭은 600 · 본문색, 나머지는 500 · 안내색', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await homeShown();
    const style = (label: string) => StyleSheet.flatten(within(screen.getByLabelText(label)).getByText(label).props.style);
    expect(style('홈')).toMatchObject({ fontSize: 11, lineHeight: 15, fontWeight: '600', color: Colors.ink });
    expect(style('나')).toMatchObject({ fontSize: 11, lineHeight: 15, fontWeight: '500', color: Colors.hint });
  });

  it('끊기면 홈 카드들 맨 위에 띠가 뜨고, 돌아오면 사라진다(결정 061 의 4, 보드 20)', async () => {
    let listener: ((s: { isConnected: boolean; isInternetReachable: boolean }) => void) | null = null;
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      listener = cb;
      return () => {};
    });
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await homeShown();
    expect(screen.queryByTestId('offline-banner')).toBeNull();
    await act(async () => listener?.({ isConnected: false, isInternetReachable: false }));
    const column = within(screen.getByTestId('home-column'));
    expect(column.getByTestId('offline-banner')).toBeTruthy();
    expect(column.getByTestId('home-menu-me')).toBeTruthy();
    await act(async () => listener?.({ isConnected: true, isInternetReachable: true }));
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });

  it('끊긴 채 열어 계정을 못 받았으면, 연결이 돌아올 때 다시 받는다(알림 받기 권유의 받는 시간, 리뷰 PR #44)', async () => {
    let listener: ((s: { isConnected: boolean; isInternetReachable: boolean }) => void) | null = null;
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      listener = cb;
      return () => {};
    });
    mockApi.getMyAccount.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await homeShown();
    await act(async () => listener?.({ isConnected: false, isInternetReachable: false }));
    await act(async () => listener?.({ isConnected: true, isInternetReachable: true }));
    expect(mockApi.getMyAccount).toHaveBeenCalledTimes(2);
  });

  it('출생 정보를 넣기 전(입력 화면)에는 탭이 없다', async () => {
    await render(<HomeScreen />);
    await screen.findByPlaceholderText(strings.home.datePlaceholder);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});

/** 시안 "홈 (1.1.0)" A — 오늘의 하늘 한 줄 + 메뉴판(결정 102) */
describe('홈 메뉴판(결정 102 의 1, 시안 "홈 (1.1.0)" A)', () => {
  beforeEach(async () => {
    await saveBirth({ profile, chart: fixtures.chart });
  });

  it('차례: 오늘의 하늘 한 줄 → 나 → 나의 시기 → 나의 사람들. 1.0.0 홈의 칸(작은 실천 · 지금 나의 시기 · 이번 달 눈여겨볼 날 · 별명 한 줄)은 없다(결정 102 의 2)', async () => {
    await render(<HomeScreen />);
    await screen.findByTestId('home-today-card');
    const order = ['home-today-card', 'home-menu-me', 'home-menu-timing', 'home-menu-people'];
    const seen = screen
      .getAllByTestId(/./)
      .map((e) => String(e.props.testID))
      .filter((id) => order.includes(id));
    expect(seen).toEqual(order);
    for (const gone of ['home-today-practices', 'home-timing-card', 'home-timing-empty', 'home-month-days', 'nickname-card']) expect(screen.queryByTestId(gone)).toBeNull();
    // 홈은 시기 풀이를 그리지 않는다 — 시기 칸이 없다
    expect(screen.queryByText('지금 나는 어떤 시기일까')).toBeNull();
  });

  it('세 카드는 같은 뼈대: 작은 분류 · 질문 제목 · 메뉴(시안 그대로의 글)', async () => {
    await render(<HomeScreen />);
    for (const [id, section] of [
      ['home-menu-me', H.me],
      ['home-menu-timing', H.timing],
      ['home-menu-people', H.people],
    ] as const) {
      const card = within(await screen.findByTestId(id));
      expect(card.getByText(section.eyebrow)).toBeTruthy();
      expect(card.getByText(section.title)).toBeTruthy();
    }
    expect([H.me.eyebrow, H.me.title, H.timing.eyebrow, H.timing.title, H.people.eyebrow, H.people.title]).toEqual([
      '나',
      '나는 어떤 사람일까?',
      '나의 시기',
      '지금 나는 어디쯤일까?',
      '나의 사람들',
      '우리는 어떻게 될까?',
    ]);
    const card = StyleSheet.flatten(screen.getByTestId('home-menu-me').props.style);
    expect(card).toMatchObject({ borderRadius: 20, borderColor: Colors.hair, backgroundColor: Colors.raised, paddingTop: 20, paddingHorizontal: 20, paddingBottom: 22 });
  });

  it('나 — 3×2 아이콘 격자: 내 별명 · 성격 · 연애 · 관계 · 일 · 감정. 내 별명은 /reading 으로, 나머지는 나 탭의 그 칩으로(쌓지 않고 탭을 바꾼다)', async () => {
    await render(<HomeScreen />);
    const items = within(await screen.findByTestId('home-menu-me')).getAllByTestId('home-menu-item');
    expect(items.map((i) => i.props.accessibilityLabel)).toEqual(['내 별명', '성격', '연애', '관계', '일', '감정']);
    expect(StyleSheet.flatten(within(screen.getByTestId('home-menu-me')).getByTestId('home-menu-grid').props.style)).toMatchObject({
      marginTop: HomeMenuLayout.grid.top,
      rowGap: HomeMenuLayout.grid.rowGap,
      columnGap: HomeMenuLayout.grid.columnGap,
    });
    await fireEvent.press(items[0]);
    expect(router.push).toHaveBeenLastCalledWith('/reading');
    const areas = ['PERSONALITY', 'LOVE', 'RELATIONSHIP', 'WORK', 'EMOTION'];
    for (const [i, area] of areas.entries()) {
      await fireEvent.press(items[i + 1]);
      expect(router.replace).toHaveBeenLastCalledWith({ pathname: '/me', params: { area } });
    }
  });

  it('나의 시기 — 아이콘 셋: 이번 달 · 올해 · 인생, 시기 탭의 그 칩으로', async () => {
    await render(<HomeScreen />);
    const items = within(await screen.findByTestId('home-menu-timing')).getAllByTestId('home-menu-item');
    expect(items.map((i) => i.props.accessibilityLabel)).toEqual(['이번 달', '올해', '인생']);
    for (const [i, tab] of ['month', 'year', 'life'].entries()) {
      await fireEvent.press(items[i]);
      expect(router.replace).toHaveBeenLastCalledWith({ pathname: '/timing', params: { tab } });
    }
  });

  it('나의 사람들 — 한 줄에 하나씩 연애 궁합 "설레는 사람과 나" · 친구 궁합 "가까운 친구와 나", 아이콘은 사이 색. 누르면 궁합 탭에 사이를 싣는다(입력 화면은 A④, 결정 113 의 3)', async () => {
    await render(<HomeScreen />);
    const card = within(await screen.findByTestId('home-menu-people'));
    const rows = card.getAllByTestId('home-menu-row');
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText('연애 궁합')).toBeTruthy();
    expect(within(rows[0]).getByText('설레는 사람과 나')).toBeTruthy();
    expect(within(rows[1]).getByText('친구 궁합')).toBeTruthy();
    expect(within(rows[1]).getByText('가까운 친구와 나')).toBeTruthy();
    expect(within(rows[0]).getByTestId('home-menu-icon-synastryLove', { includeHiddenElements: true }).props.stroke).toBe(RelationColors.LOVE);
    expect(within(rows[1]).getByTestId('home-menu-icon-synastryFriend', { includeHiddenElements: true }).props.stroke).toBe(RelationColors.FRIEND);
    // 링크 보내기 줄은 홈에 두지 않는다(결정 102 의 1-4)
    expect(card.queryByText('내 궁합 링크 보내기')).toBeNull();
    await fireEvent.press(rows[0]);
    expect(router.replace).toHaveBeenLastCalledWith({ pathname: '/synastry', params: { relation: 'LOVE' } });
    await fireEvent.press(rows[1]);
    expect(router.replace).toHaveBeenLastCalledWith({ pathname: '/synastry', params: { relation: 'FRIEND' } });
  });

  it('메뉴 아이콘은 주색 계열 한 색(궁합 두 줄만 사이 색)', async () => {
    await render(<HomeScreen />);
    await homeShown();
    const icons = screen.getAllByTestId(/^home-menu-icon-/, { includeHiddenElements: true });
    const colors = new Set(icons.filter((i) => !String(i.props.testID).includes('synastry')).map((i) => i.props.stroke));
    expect([...colors]).toEqual([Colors.accentText]);
  });

  it('메뉴는 서버를 기다리지 않는다 — 오늘의 하늘을 아직 받지 못해도 처음부터 보인다(결정 102 의 5)', async () => {
    // 받는 중인 오늘의 하늘은 시험이 끝날 때 끝낸다(모듈이 같은 날의 요청을 하나로 묶는다 — 다음 시험에 남지 않게)
    let finish: (v: Awaited<ReturnType<typeof api.postDaySky>>) => void = () => {};
    mockApi.postDaySky.mockReturnValue(new Promise((r) => (finish = r)));
    await render(<HomeScreen />);
    expect(await screen.findByTestId('home-menu-me')).toBeTruthy();
    expect(screen.getByTestId('home-menu-timing')).toBeTruthy();
    expect(screen.getByTestId('home-menu-people')).toBeTruthy();
    expect(screen.queryByTestId('home-today-card')).toBeNull();
    await act(async () => finish({ ok: true, data: fixtures.daySky }));
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


describe('홈 머리의 종(결정 052 의 4, 보드 11)', () => {
  const unreadItem = { id: 'n1', kind: 'ME_REPORT_DONE', createdAt: '2026-11-20T00:12:00Z', read: false };

  it('안 읽은 알림이 있으면 점, 누르면 알림함', async () => {
    mockApi.getNotifications.mockResolvedValue({ ok: true, data: { unread: 1, items: [unreadItem] } });
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    expect(await screen.findByTestId('home-bell-dot')).toBeTruthy();
    expect(screen.getByLabelText(strings.notifications.bellUnread)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('home-bell'));
    expect(router.push).toHaveBeenCalledWith('/notifications');
  });

  it('다 읽었거나 숨기는 종류(궁합 리포트)만 안 읽었으면 점이 없다', async () => {
    mockApi.getNotifications.mockResolvedValue({
      ok: true,
      data: { unread: 1, items: [{ ...unreadItem, read: true }, { ...unreadItem, id: 'n2', kind: 'SYNASTRY_REPORT_DONE', synastryId: 's1' }] },
    });
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    expect(await screen.findByTestId('home-bell')).toBeTruthy();
    expect(screen.queryByTestId('home-bell-dot')).toBeNull();
  });

  it('출생 정보를 넣기 전(입력 화면)에는 종이 없다 — 종은 출생 정보가 있는 홈에만(리뷰 #66)', async () => {
    await render(<HomeScreen />);
    await screen.findByPlaceholderText(strings.home.datePlaceholder);
    expect(screen.queryByTestId('home-bell')).toBeNull();
  });

  it('못 받았으면 점 없이 종은 둔다. 서버에 알림함이 없으면(404 — S⑤ 전) 종을 숨긴다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    mockApi.getNotifications.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const view = await render(<HomeScreen />);
    await screen.findByTestId('home-menu-me');
    expect(screen.getByTestId('home-bell')).toBeTruthy();
    expect(screen.queryByTestId('home-bell-dot')).toBeNull();
    await view.unmount();
    mockApi.getNotifications.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
    await render(<HomeScreen />);
    await screen.findByTestId('home-menu-me');
    await act(async () => {});
    expect(screen.queryByTestId('home-bell')).toBeNull();
  });
});

describe('홈의 오늘의 하늘 한 줄 카드(결정 102 의 1-1 · 051, 시안 "홈 (1.1.0)" A)', () => {
  /** 보드 11 의 글 — 한국 날짜 2026-11-19 */
  const sky = {
    ...fixtures.daySky,
    date: '2026-11-19',
    title: '마음이 가는 사람에게 먼저 안부를 건네 보기 좋은 날',
    reason: { when: 'DAY', items: [{ kind: 'TRANSIT', mover: 'MOON', target: 'VENUS', type: 'CONJUNCTION' }] },
  };
  beforeEach(() => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-19T01:00:00Z'));
    mockApi.postDaySky.mockResolvedValue({ ok: true, data: sky });
  });

  it('"오늘의 하늘 · 11월 19일 목요일" 과 꺾쇠 · 제목 · 짧은 한 줄 · 오른쪽 달. 흐름 셋 · 작은 실천은 홈에 없다(오늘의 하늘 화면에 그대로), 누르면 /today', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    const card = await screen.findByTestId('home-today-card');
    expect(within(card).getByTestId('home-card-chevron').props.width).toBe(22);
    expect(within(card).getByText('오늘의 하늘 · 11월 19일 목요일')).toBeTruthy();
    expect(within(card).getByText(sky.title)).toBeTruthy();
    expect(within(card).getByText('오늘은 달이 내 금성 자리를 지나요')).toBeTruthy();
    expect(within(card).getByTestId('home-today-moon', { includeHiddenElements: true })).toBeTruthy();
    expect(within(card).queryAllByTestId('home-today-flow')).toHaveLength(0);
    expect(screen.queryByText(sky.flow.people)).toBeNull();
    expect(screen.queryByText(sky.practices[0].title)).toBeNull();
    expect(StyleSheet.flatten(card.props.style)).toMatchObject({ borderRadius: 24, padding: 20 });
    expect(mockApi.postDaySky).toHaveBeenCalledWith();
    await fireEvent.press(card);
    expect(router.push).toHaveBeenCalledWith('/today');
  });

  it('못 썼으면 그 자리에 작은 안내와 다시 쓰기(19-1) — 누르면 다시 부른다', async () => {
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 502, code: 'GENERATION_FAILED' });
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    expect(await screen.findByText(strings.today.fail)).toBeTruthy();
    await fireEvent.press(screen.getByText(strings.states.writeFail.retry));
    expect(await screen.findByTestId('home-today-card')).toBeTruthy();
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
  });

  it('연결이 돌아오면 끊겨서 못 받은 것만 다시 묻는다 — 못 쓴 것(502)은 다시 쓰기를 누를 때만(리뷰 #66)', async () => {
    let listener: ((s: { isConnected: boolean; isInternetReachable: boolean }) => void) | null = null;
    (NetInfo.addEventListener as jest.Mock).mockImplementation((cb) => {
      listener = cb;
      return () => {};
    });
    await saveBirth({ profile, chart: fixtures.chart });
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 502, code: 'GENERATION_FAILED' });
    const view = await render(<HomeScreen />);
    expect(await screen.findByText(strings.today.fail)).toBeTruthy();
    await act(async () => listener?.({ isConnected: false, isInternetReachable: false }));
    await act(async () => listener?.({ isConnected: true, isInternetReachable: true }));
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
    await view.unmount();
    mockApi.postDaySky.mockClear();
    mockApi.postDaySky.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<HomeScreen />);
    await homeShown();
    await act(async () => listener?.({ isConnected: false, isInternetReachable: false }));
    await act(async () => listener?.({ isConnected: true, isInternetReachable: true }));
    expect(await screen.findByTestId('home-today-card')).toBeTruthy();
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
  });

  it('서버에 그 경로가 없으면(404 — S④ 전) 칸을 숨긴다 — 메뉴는 그대로', async () => {
    mockApi.postDaySky.mockResolvedValue({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
    mockApi.saveProfile.mockResolvedValue({ ok: false, error: 'SERVER', status: 500 });
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await homeShown();
    await act(async () => {});
    expect(screen.queryByTestId('home-today-card')).toBeNull();
    expect(screen.queryByTestId('card-fail')).toBeNull();
    expect(screen.getByTestId('home-menu-people')).toBeTruthy();
  });
});

/**
 * 홈 뼈대(결정 071 · 102 의 5). 처음 열 때는 스플래시가 홈의 첫 데이터까지 가려(결정 068 의 2) 보이지 않고,
 * 스플래시가 이미 걷힌 뒤 기기가 비어 서버에서 되살릴 때 보인다. 뼈대는 오늘의 하늘 카드 자리만 — 메뉴는 처음부터 보인다.
 */
describe('홈 뼈대 — 서버에서 되살리는 동안(결정 071 · 102 의 5)', () => {
  const restored = { date: profile.date, time: profile.time, placeId: profile.place.id };
  afterEach(() => jest.useRealTimers());

  it('0.3초 전에는 머리(로고) · 아래 탭만, 넘으면 오늘의 하늘 한 줄 카드의 뼈대와 메뉴 셋 — 종은 없다(리뷰 #66)', async () => {
    jest.useFakeTimers();
    mockApi.getProfile.mockReturnValue(new Promise(() => {}));
    await render(<HomeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(100)));
    expect(screen.queryByTestId('home-skeleton')).toBeNull();
    expect(screen.queryByTestId('home-menu-me')).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(5);
    await act(async () => void (await jest.advanceTimersByTimeAsync(300)));
    expect(screen.getByTestId('home-skeleton').props.accessibilityLabel).toBe(strings.states.loading);
    expect(screen.getByTestId('sk-home-today-card', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByTestId('home-menu-me')).toBeTruthy();
    expect(screen.getByTestId('home-menu-timing')).toBeTruthy();
    expect(screen.getByTestId('home-menu-people')).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityState.selected)).toEqual([true, false, false, false, false]);
    expect(screen.queryByTestId('home-bell')).toBeNull();
  });

  it('되살린 뒤에는 뼈대 자리에 오늘의 하늘 카드, 메뉴는 같은 자리 그대로', async () => {
    mockApi.getProfile.mockResolvedValue({ ok: true, data: restored });
    mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chart });
    await render(<HomeScreen />);
    expect(await screen.findByTestId('home-today-card')).toBeTruthy();
    expect(screen.queryByTestId('home-skeleton')).toBeNull();
    expect(screen.getByTestId('home-menu-me')).toBeTruthy();
  });
});

describe('홈은 접속하자마자 — 받아 둔 것 먼저 · 첫 상태까지 스플래시(소유자 "뼈대 없이 바로 보였으면")', () => {
  /** 한국 날짜 2026-11-19 오전 */
  const NOW = Date.parse('2026-11-19T01:00:00Z');
  const birthKey = JSON.stringify([profile.date, profile.time, profile.place.id]);
  const sky = {
    ...fixtures.daySky,
    date: '2026-11-19',
    title: '마음이 가는 사람에게 먼저 안부를 건네 보기 좋은 날',
    reason: { when: 'DAY', items: [{ kind: 'TRANSIT', mover: 'MOON', target: 'VENUS', type: 'CONJUNCTION' }] },
  };
  const skeletons = () => screen.queryAllByTestId(/^sk-home-/, { includeHiddenElements: true });
  beforeEach(async () => {
    homeReady.resetHomeReady();
    jest.useFakeTimers({ now: NOW });
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading);
  });
  afterEach(() => jest.useRealTimers());

  it('받아 둔 오늘의 하늘이 있으면 스플래시를 걷는 첫 그림부터 카드 — 뼈대 없이, 뒤에서 서버를 한 번', async () => {
    await AsyncStorage.setItem(DAY_SKY_STORAGE_KEY, JSON.stringify({ key: birthKey, sky }));
    mockApi.postDaySky.mockResolvedValue({ ok: true, data: sky });
    await render(<HomeScreen />);
    await act(async () => {});
    expect(homeReady.getHomeReady()).toBe(true);
    expect(screen.getByTestId('home-today-card')).toBeTruthy();
    await act(async () => void (await jest.advanceTimersByTimeAsync(400)));
    expect(skeletons()).toHaveLength(0);
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
  });

  it('앱을 켤 때 이번 달 달력 · 나 탭 풀이 · 시기 풀이의 상태를 한 번 받아 둔다 — 그 탭을 열면 곧바로(결정 075 의 4 · 113 의 4)', async () => {
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'NONE' } });
    await render(<HomeScreen />);
    await act(async () => {});
    expect(mockApi.getMonth).toHaveBeenCalledTimes(1);
    expect(mockApi.getMeReport).toHaveBeenCalledTimes(1);
    expect(mockApi.getTimingReport).toHaveBeenCalledTimes(1);
    expect(JSON.parse((await AsyncStorage.getItem(ME_REPORT_STORAGE_KEY))!)).toEqual({ key: birthKey, status: 'NONE' });
    expect(JSON.parse((await AsyncStorage.getItem(TIMING_REPORT_STORAGE_KEY))!)).toEqual({ key: birthKey, status: 'NONE' });
    expect(JSON.parse((await AsyncStorage.getItem(MONTH_SKY_STORAGE_KEY))!).sky.month).toBe(fixtures.monthSky.month);
  });

  it('스플래시는 시기 풀이의 상태를 기다리지 않는다 — 홈에 시기 칸이 없다(결정 113 의 4)', async () => {
    await AsyncStorage.setItem(DAY_SKY_STORAGE_KEY, JSON.stringify({ key: birthKey, sky }));
    mockApi.getTimingReport.mockReturnValue(new Promise(() => {}));
    mockApi.getMeReport.mockReturnValue(new Promise(() => {}));
    await render(<HomeScreen />);
    await act(async () => {});
    expect(homeReady.getHomeReady()).toBe(true);
  });

  it('오늘의 하늘을 그날 처음 쓰는 중이면 생성을 기다리지 않는다 — 1초 안에 못 받으면 쓰는 중 카드(흐름 줄 없이)로 스플래시를 걷고, 뼈대는 없다', async () => {
    let finish: (v: Awaited<ReturnType<typeof api.postDaySky>>) => void = () => {};
    mockApi.postDaySky.mockReturnValue(new Promise((r) => (finish = r)));
    await render(<HomeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(400)));
    expect(homeReady.getHomeReady()).toBe(false);
    expect(skeletons()).toHaveLength(0);
    await act(async () => void (await jest.advanceTimersByTimeAsync(600)));
    expect(homeReady.getHomeReady()).toBe(true);
    const making = screen.getByTestId('home-today-making');
    // 걸리는 시간을 약속하지 않는다(소유자 빌드 15 — "몇 초면 돼요" 는 10초 넘게 걸려 약속처럼 들렸다)
    expect(within(making).getByText('금방 보여 드릴게요')).toBeTruthy();
    expect(within(making).queryAllByTestId('home-today-flow')).toHaveLength(0);
    expect(skeletons()).toHaveLength(0);
    await act(async () => finish({ ok: true, data: sky }));
    expect(screen.getByTestId('home-today-card')).toBeTruthy();
  });
});

describe('계정(알림 받기 권유의 받는 시간)은 기기 · 메모리에서', () => {
  it('정지 문이 로그인 때 받은 계정을 홈이 같이 쓴다 — /account 를 한 번 더 부르지 않는다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await refreshAccount();
    expect(mockApi.getMyAccount).toHaveBeenCalledTimes(1);
    await render(<HomeScreen />);
    await homeShown();
    await act(async () => {});
    expect(mockApi.getMyAccount).toHaveBeenCalledTimes(1);
  });
});

describe('홈을 다시 붙여도 종 점 · 카드가 첫 그림부터(이번 실행의 메모리)', () => {
  it('받은 알림함 목록 · 출생 정보는 기기 · 서버를 늦게 읽어도 첫 그림부터 — 점이 나중에 생기지 않는다', async () => {
    mockApi.getNotifications.mockResolvedValue({ ok: true, data: { unread: 1, items: [{ id: 'n1', kind: 'ME_REPORT_DONE', createdAt: '2026-11-20T00:12:00Z', read: false }] } });
    await saveBirth({ profile, chart: fixtures.chart });
    const first = await render(<HomeScreen />);
    expect(await screen.findByTestId('home-bell-dot')).toBeTruthy();
    await first.unmount();
    mockApi.getNotifications.mockReturnValue(new Promise(() => {}));
    const getItem = AsyncStorage.getItem as jest.Mock;
    const original = getItem.getMockImplementation();
    getItem.mockImplementation(() => new Promise(() => {}));
    try {
      await render(<HomeScreen />);
      expect(screen.getByTestId('home-menu-me')).toBeTruthy();
      expect(screen.getByTestId('home-bell-dot')).toBeTruthy();
    } finally {
      getItem.mockImplementation(original);
    }
  });
});
