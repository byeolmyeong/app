import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import BirthScreen from '@/app/birth';
import HomeScreen from '@/app/index';
import { Colors, NicknameCardLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { saveBirth } from '@/features/chart/use-birth-profile';
import * as homeReady from '@/features/home/home-ready';
import { READING_STORAGE_KEY } from '@/features/reading/use-reading';
import { TIMING_REPORT_STORAGE_KEY } from '@/features/timing/use-timing-report';
import { DAY_SKY_STORAGE_KEY } from '@/features/timing/use-today-sky';
import { MONTH_SKY_STORAGE_KEY } from '@/features/timing/use-month';
import { ME_REPORT_STORAGE_KEY } from '@/features/me/use-me-report';
import { ACCOUNT_STORAGE_KEY, refreshAccount } from '@/lib/account-store';
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
    // 홈의 시기 칸(결정 047 의 1-4)은 시기 풀이 상태만 묻는다 — 만들기(POST)는 시기 탭에서 사람이 누를 때만
    getTimingReport: jest.fn(),
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

describe('홈', () => {
  it('출생 정보가 없으면 입력부터 받는다', async () => {
    await render(<HomeScreen />);
    expect(await screen.findByPlaceholderText(strings.home.datePlaceholder)).toBeTruthy();
    expect(screen.queryByTestId('nickname-card')).toBeNull();
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

  it('홈 별명 카드는 "풀이 읽기" 글자 없이 오른쪽 위 꺾쇠만 — 다른 홈 카드의 이름표 줄 꺾쇠와 같은 자리 · 크기 · 색, 카드 전체가 눌린다(결정 080 — 078 의 정정 대체)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading);
    await render(<HomeScreen />);
    const card = await screen.findByTestId('nickname-card');
    await within(card).findByText(fixtures.reading.headline);
    expect(within(card).queryByText(strings.home.card.read)).toBeNull();
    const chevron = within(card).getByTestId('nickname-card-chevron');
    expect(chevron.props.width).toBe(22);
    // 자리: 카드 안쪽 여백 그대로 오른쪽 위(이름표 줄의 꺾쇠가 놓이는 자리) · 색: 다른 카드의 꺾쇠와 같은 hint
    expect(StyleSheet.flatten(chevron.props.style)).toMatchObject({ position: 'absolute', top: NicknameCardLayout.padding, right: NicknameCardLayout.padding });
    expect(within(card).getByTestId('nickname-card-chevron-path').props.stroke).toEqual({ type: 0, payload: parseInt(`ff${Colors.hint.slice(1)}`, 16) });
    // 화면 읽기는 보이는 글 차례대로 + "풀이 읽기"(나 탭 카드와 같은 규칙, 결정 078 의 1)
    expect(screen.getByRole('button', { name: ['새벽별 님', '쌍둥이자리', fixtures.reading.headline, strings.home.card.read].join(', ') })).toBe(card);
    await fireEvent.press(card);
    expect(router.push).toHaveBeenCalledWith('/reading');
  });

  it('별명 카드 오른쪽 위의 별자리 그림은 차트의 해 별자리(서버 값) 그대로 — 사람마다 다르다(소유자 지적: 처녀자리인데 다른 자리)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    const view = await render(<HomeScreen />);
    const card = within(await screen.findByTestId('nickname-card'));
    expect(card.getByTestId('card-constellation-GEMINI', { includeHiddenElements: true })).toBeTruthy();
    // 오른쪽 위 꺾쇠 둘레는 비운다(결정 080) — 어느 별자리든 선이 꺾쇠 밑을 지나지 않게
    expect(card.getByTestId('card-constellation-clear', { includeHiddenElements: true })).toBeTruthy();
    await view.unmount();
    // 해가 처녀자리인 차트 — 달 · 상승궁이 아니라 해의 별자리로 고른다
    const virgo = { ...fixtures.chart, positions: fixtures.chart.positions.map((p) => (p.body === 'SUN' ? { ...p, sign: 'VIRGO' } : p)) };
    await saveBirth({ profile, chart: virgo });
    await render(<HomeScreen />);
    const again = within(await screen.findByTestId('nickname-card'));
    expect(again.getByTestId('card-constellation-VIRGO', { includeHiddenElements: true })).toBeTruthy();
    expect(again.queryByTestId('card-constellation-GEMINI', { includeHiddenElements: true })).toBeNull();
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
    for (const result of [{ ok: false, error: 'NETWORK' } as const, { ok: true, data: { nickname: null, avatar: null, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } } as const]) {
      mockApi.getMyAccount.mockResolvedValueOnce(result);
      const view = await render(<HomeScreen />);
      expect(await screen.findByText(fixtures.reading.headline)).toBeTruthy();
      expect(screen.queryByText(/ 님$/)).toBeNull();
      expect(screen.queryByRole('image')).toBeNull();
      expect(within(screen.getByTestId('nickname-card')).getByText('쌍둥이자리')).toBeTruthy();
      await view.unmount();
    }
  });

  it('모르는 프로필 번호면 그림만 빼고 이름은 그린다(리뷰 PR #41)', async () => {
    mockApi.getMyAccount.mockResolvedValueOnce({ ok: true, data: { nickname: '새벽별', avatar: 9, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } });
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading);
    await render(<HomeScreen />);
    expect(await screen.findByText('새벽별 님')).toBeTruthy();
    expect(screen.queryByRole('image')).toBeNull();
  });

  it('받아 둔 풀이가 없으면 "아직 별명을 짓지 않았어요" 와 오른쪽 위 꺾쇠 — 화면 읽기는 "내 별명 읽기", 누르면 /reading(풀이를 부르지 않는다)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    const card = await screen.findByTestId('nickname-card');
    expect(within(card).getByText(M.readingEmpty)).toBeTruthy();
    expect(within(card).queryByText(M.readingCta)).toBeNull();
    expect(within(card).getByTestId('nickname-card-chevron')).toBeTruthy();
    expect(card.props.accessibilityLabel.endsWith(`${M.readingEmpty}, ${M.readingCta}`)).toBe(true);
    await fireEvent.press(card);
    expect(router.push).toHaveBeenCalledWith('/reading');
    expect(screen.queryByText(fixtures.reading.headline)).toBeNull();
  });

  it('업데이트 직후: 기기에 옛 모양(근거 구조 없음 · 보완점 3)으로 받아 둔 풀이도 한 줄 별명은 홈에 보인다 — 서버를 부르지 않는다(PR #49 리뷰)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    const old = {
      headline: '궁금한 것이 많고, 멀리 보는 사람',
      sections: [{ title: '생각이 먼저 움직입니다', body: '본문', basis: ['태양', '쌍둥이', '6하우스'] }],
      strengths: ['하나', '둘', '셋'],
      cautions: ['하나', '둘', '셋'],
    };
    await storeReading(old);
    await render(<HomeScreen />);
    const card = await screen.findByTestId('nickname-card');
    expect(await within(card).findByText(old.headline)).toBeTruthy();
    expect(within(card).queryByText(M.readingEmpty)).toBeNull();
    expect(card.props.accessibilityLabel.endsWith(`${old.headline}, ${strings.home.card.read}`)).toBe(true);
    // 만든 때가 없는 옛 글이라 "받은 지 N일" 은 없다
    expect(within(card).queryByText(/별명을 받은 지/)).toBeNull();
    expect(mockApi.createReading).not.toHaveBeenCalled();
  });

  it('기기에 둔 것이 풀이 모양이 아니면(한 줄 별명이 없음) 받아 둔 것이 없는 것과 같다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading({ headline: '', sections: [] });
    await render(<HomeScreen />);
    expect(within(await screen.findByTestId('nickname-card')).getByText(M.readingEmpty)).toBeTruthy();
  });

  it('다른 출생 정보로 받은 풀이는 보여 주지 않는다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading, { date: '1990-01-01', time: null, place: { id: 1, name: 'x' } });
    await render(<HomeScreen />);
    expect(within(await screen.findByTestId('nickname-card')).getByText(M.readingEmpty)).toBeTruthy();
  });

  it('아래에 탭 넷이 있다: 홈 · 나 · 시기 · 마이(결정 055 의 2). 누르면 그 화면으로 바꾼다 — 나는 /me(결정 048 의 1), 시기는 /timing(시기 탭, 결정 049)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await screen.findByTestId('nickname-card');
    const tabs = screen.getAllByRole('tab');
    expect(tabs.map((t) => t.props.accessibilityLabel)).toEqual(['홈', '나', '시기', '마이']);
    expect(tabs.map((t) => t.props.accessibilityState.selected)).toEqual([true, false, false, false]);
    await fireEvent.press(tabs[1]);
    expect(router.replace).toHaveBeenLastCalledWith('/me');
    await fireEvent.press(tabs[2]);
    expect(router.replace).toHaveBeenLastCalledWith('/timing');
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
    mockApi.getMyAccount.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading);
    await render(<HomeScreen />);
    await screen.findByTestId('nickname-card');
    expect(screen.queryByText('새벽별 님')).toBeNull();
    await act(async () => listener?.({ isConnected: false, isInternetReachable: false }));
    await act(async () => listener?.({ isConnected: true, isInternetReachable: true }));
    expect(await screen.findByText('새벽별 님')).toBeTruthy();
    expect(mockApi.getMyAccount).toHaveBeenCalledTimes(2);
  });

  it('출생 정보를 넣기 전(입력 화면)에는 탭이 없다', async () => {
    await render(<HomeScreen />);
    await screen.findByPlaceholderText(strings.home.datePlaceholder);
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});

describe('홈 · 시기 칸(결정 047 의 1-4 · 1-5, 보드 11 · 11-1 · 11-2)', () => {
  const T = strings.timing;
  const report = fixtures.timingReport;
  const main = report.intervals.find((i) => i.id === report.current.mainId)!;
  const birthKey = JSON.stringify([profile.date, profile.time, profile.place.id]);
  beforeEach(async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading);
  });

  it('시기 풀이가 다 됐으면 "지금 나의 시기"(지나온 시기 — 지금 — 2028 큰 변화, 대표 구간 이름 · "2027년 1월까지") · 작은 실천 셋, 누르면 시기 탭', async () => {
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report } });
    await render(<HomeScreen />);
    const card = await screen.findByTestId('home-timing-card');
    expect(within(card).getByText(T.now)).toBeTruthy();
    // 카드 머리의 꺾쇠는 22(소유자 2026-11-23, 빌드 13)
    expect(within(card).getByTestId('home-card-chevron').props.width).toBe(22);
    expect(within(card).getByText(T.home.past)).toBeTruthy();
    expect(within(card).getByText('2028 큰 변화')).toBeTruthy();
    expect(within(card).getByText(main.title)).toBeTruthy();
    expect(within(card).getByText('2027년 1월까지')).toBeTruthy();
    const practices = screen.getByTestId('home-timing-practices');
    expect(within(practices).getAllByTestId('timing-todo')).toHaveLength(3);
    expect(within(practices).getByText(main.practices![0].title)).toBeTruthy();
    await fireEvent.press(card);
    expect(router.replace).toHaveBeenLastCalledWith('/timing');
  });

  it('받아 둔 시기 풀이는 기기에서 먼저 그린다(결정 047 의 2)', async () => {
    await AsyncStorage.setItem(TIMING_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, report }));
    mockApi.getTimingReport.mockReturnValue(new Promise(() => {}));
    await render(<HomeScreen />);
    expect(await screen.findByTestId('home-timing-card')).toBeTruthy();
  });

  it('처음 묻는 중이 0.3초를 넘으면 다 그려질 시기 칸의 뼈대(결정 071, 보드 24)', async () => {
    jest.useFakeTimers();
    mockApi.getTimingReport.mockReturnValue(new Promise(() => {}));
    await render(<HomeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(400)));
    expect(screen.getByTestId('sk-home-timing-card')).toBeTruthy();
    expect(screen.getByTestId('sk-home-timing-practices')).toBeTruthy();
    expect(screen.getAllByTestId('sk-timing-todo')).toHaveLength(3);
    jest.useRealTimers();
  });

  it('시기 풀이가 없으면 "지금 나는 어떤 시기일까" 카드 — 글자 단추 없이 이름표 줄 오른쪽 위 꺾쇠, 카드 전체를 누르면 시기 탭(결정 080, 여기서 만들기를 시작하지 않는다)', async () => {
    await render(<HomeScreen />);
    const empty = await screen.findByTestId('home-timing-empty');
    expect(within(empty).getByText(T.home.emptyTitle)).toBeTruthy();
    expect(within(empty).queryByText(T.home.request)).toBeNull();
    // 꺾쇠는 다른 홈 카드의 머리와 같은 부품 · 22
    expect(within(empty).getByTestId('home-card-chevron').props.width).toBe(22);
    // 화면 읽기는 보이는 글 차례대로 + "자세한 풀이 받기"
    await fireEvent.press(screen.getByRole('button', { name: [T.now, T.home.emptyTitle, T.home.emptyBody, T.home.request].join(', ') }));
    expect(router.replace).toHaveBeenLastCalledWith('/timing');
    expect(screen.queryByTestId('home-timing-card')).toBeNull();
  });

  it('쓰는 중이면 그 자리에 "만들고 있어요" 카드(뼈대 없이, 결정 075 — 047 의 1-5 대체) — 홈은 5초마다 묻지 않고, 끝남 푸시가 오면 다시 물어 같은 자리에서 완료 카드', async () => {
    jest.useFakeTimers();
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'WRITING' } });
    await render(<HomeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(0)));
    await screen.findByTestId('nickname-card');
    expect(screen.getByTestId('home-timing-writing')).toBeTruthy();
    expect(screen.getByText(T.home.writing.title)).toBeTruthy();
    await act(async () => void (await jest.advanceTimersByTimeAsync(20_000)));
    expect(screen.queryAllByTestId(/^sk-home-timing/)).toHaveLength(0);
    expect(mockApi.getTimingReport).toHaveBeenCalledTimes(1);
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report } });
    await act(async () => mockPushListeners.forEach((l) => l({ type: 'TIMING_REPORT_DONE' })));
    expect(await screen.findByTestId('home-timing-card')).toBeTruthy();
    expect(screen.queryByTestId('home-timing-writing')).toBeNull();
    expect(mockApi.getTimingReport).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });

  it('앱을 껐다 켜도(기기에 쓰는 중을 기억) 첫 그림부터 쓰는 중 카드 — 서버가 다 썼다고 하면 같은 자리에서 완료 카드', async () => {
    await AsyncStorage.setItem(TIMING_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, status: 'WRITING' }));
    let answer: (v: Awaited<ReturnType<typeof api.getTimingReport>>) => void = () => {};
    mockApi.getTimingReport.mockReturnValue(new Promise((r) => (answer = r)));
    await render(<HomeScreen />);
    expect(await screen.findByTestId('home-timing-writing')).toBeTruthy();
    await act(async () => answer({ ok: true, data: { status: 'DONE', report } }));
    expect(await screen.findByTestId('home-timing-card')).toBeTruthy();
  });

  it('상태를 못 물었으면 그 자리에 안내(19-1) · 다시 보기, 서버에 경로가 없으면(404) 칸을 숨긴다', async () => {
    mockApi.getTimingReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 500 });
    const view = await render(<HomeScreen />);
    expect(await screen.findByTestId('card-fail')).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: strings.states.loadFail.retry }));
    expect(await screen.findByTestId('home-timing-empty')).toBeTruthy();
    await view.unmount();
    mockApi.getTimingReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404 });
    await render(<HomeScreen />);
    await screen.findByTestId('nickname-card');
    await act(async () => {});
    expect(screen.queryByTestId('card-fail')).toBeNull();
    expect(screen.queryByTestId('home-timing-empty')).toBeNull();
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
    await screen.findByTestId('nickname-card');
    expect(screen.getByTestId('home-bell')).toBeTruthy();
    expect(screen.queryByTestId('home-bell-dot')).toBeNull();
    await view.unmount();
    mockApi.getNotifications.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
    await render(<HomeScreen />);
    await screen.findByTestId('nickname-card');
    await act(async () => {});
    expect(screen.queryByTestId('home-bell')).toBeNull();
  });
});

describe('홈의 오늘의 하늘 카드(결정 047 의 1-3 · 051, 보드 11)', () => {
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

  it('"오늘의 하늘 · 11월 19일" · 제목 · 짧은 이유 — 별명 카드 바로 아래, 누르면 /today', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    const card = await screen.findByTestId('home-today-card');
    // 카드 머리의 꺾쇠는 22(소유자 2026-11-23, 빌드 13)
    expect(within(card).getByTestId('home-card-chevron').props.width).toBe(22);
    expect(within(card).getByText('오늘의 하늘 · 11월 19일')).toBeTruthy();
    expect(within(card).getByText(sky.title)).toBeTruthy();
    expect(within(card).getByText('오늘은 달이 내 금성 자리를 지나요')).toBeTruthy();
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
    await screen.findByTestId('nickname-card');
    await act(async () => listener?.({ isConnected: false, isInternetReachable: false }));
    await act(async () => listener?.({ isConnected: true, isInternetReachable: true }));
    expect(await screen.findByTestId('home-today-card')).toBeTruthy();
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(2);
  });

  it('서버에 그 경로가 없으면(404 — S④ 전) 칸을 숨긴다', async () => {
    mockApi.postDaySky.mockResolvedValue({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
    mockApi.saveProfile.mockResolvedValue({ ok: false, error: 'SERVER', status: 500 });
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    await screen.findByTestId('nickname-card');
    await act(async () => {});
    expect(screen.queryByTestId('home-today-card')).toBeNull();
    expect(screen.queryByTestId('card-fail')).toBeNull();
  });
});

/**
 * 홈 뼈대(결정 071, 보드 24). 처음 열 때는 스플래시가 홈의 첫 데이터까지 가려(결정 068 의 2) 보이지 않고,
 * 스플래시가 이미 걷힌 뒤 기기가 비어 서버에서 되살릴 때(다른 기기 · 웹에서 로그인 · 로그아웃 뒤 다시 로그인 · 19 의 다시 보기) 보인다.
 * 그때의 홈은 받아 둔 풀이가 없는 별명 카드 · 오늘의 하늘 · 시기 · 작은 실천 — 뼈대는 그 배치 그대로, 각 칸은 그 카드의 뼈대를 쓴다.
 */
describe('홈 뼈대 — 서버에서 되살리는 동안(결정 071, 보드 24)', () => {
  const report = fixtures.timingReport;
  const restored = { date: profile.date, time: profile.time, placeId: profile.place.id };
  /** 칸 이름(뼈대는 sk- 를 앞에, -skeleton 을 뒤에 붙인다) */
  const BLOCKS = ['nickname-card', 'home-today-card', 'home-timing-card', 'home-timing-practices'];
  const blocks = () =>
    screen
      .queryAllByTestId(/./, { includeHiddenElements: true })
      .map((e) => String(e.props.testID).replace(/^sk-/, '').replace(/-skeleton$/, ''))
      .filter((id) => BLOCKS.includes(id));
  afterEach(() => jest.useRealTimers());

  it('0.3초 전에는 머리(로고) · 아래 탭만, 넘으면 별명 카드(받아 둔 풀이가 없는 꼴) · 오늘의 하늘 · 시기 · 작은 실천의 뼈대 — 종은 없다(리뷰 #66)', async () => {
    jest.useFakeTimers();
    mockApi.getProfile.mockReturnValue(new Promise(() => {}));
    await render(<HomeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(100)));
    expect(screen.queryByTestId('home-skeleton')).toBeNull();
    expect(screen.getAllByRole('tab')).toHaveLength(4);
    await act(async () => void (await jest.advanceTimersByTimeAsync(300)));
    expect(screen.getByTestId('home-skeleton').props.accessibilityLabel).toBe(strings.states.loading);
    expect(blocks()).toEqual(BLOCKS);
    // 받아 둔 풀이가 없다(기기가 비었다) — 한 줄 별명 두 줄 대신 "아직 별명을 짓지 않았어요" 한 줄 자리
    expect(screen.getByTestId('nickname-card-skeleton')).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityState.selected)).toEqual([true, false, false, false]);
    expect(screen.queryByTestId('home-bell')).toBeNull();
    expect(screen.queryByText(M.readingEmpty)).toBeNull();
  });

  it('뼈대의 칸 = 되살린 뒤 다 그려진 홈의 칸(같은 순서 · 같은 수)', async () => {
    mockApi.getProfile.mockResolvedValue({ ok: true, data: restored });
    mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chart });
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report } });
    await render(<HomeScreen />);
    expect(await screen.findByTestId('home-timing-practices')).toBeTruthy();
    expect(await screen.findByTestId('home-today-card')).toBeTruthy();
    expect(screen.getByText(M.readingEmpty)).toBeTruthy();
    expect(blocks()).toEqual(BLOCKS);
  });
});

describe('홈은 접속하자마자 — 받아 둔 것 먼저 · 첫 상태까지 스플래시(소유자 "뼈대 없이 바로 보였으면")', () => {
  /** 한국 날짜 2026-11-19 오전 */
  const NOW = Date.parse('2026-11-19T01:00:00Z');
  const report = fixtures.timingReport;
  const birthKey = JSON.stringify([profile.date, profile.time, profile.place.id]);
  const sky = {
    ...fixtures.daySky,
    date: '2026-11-19',
    title: '마음이 가는 사람에게 먼저 안부를 건네 보기 좋은 날',
    reason: { when: 'DAY', items: [{ kind: 'TRANSIT', mover: 'MOON', target: 'VENUS', type: 'CONJUNCTION' }] },
  };
  const skeletons = () => screen.queryAllByTestId(/^sk-home-/);
  beforeEach(async () => {
    homeReady.resetHomeReady();
    jest.useFakeTimers({ now: NOW });
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading);
  });
  afterEach(() => jest.useRealTimers());

  it('받아 둔 시기 풀이 · 오늘의 하늘이 있으면 스플래시를 걷는 첫 그림부터 카드 — 뼈대 없이, 뒤에서 서버를 한 번씩', async () => {
    await AsyncStorage.setItem(TIMING_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, report }));
    await AsyncStorage.setItem(DAY_SKY_STORAGE_KEY, JSON.stringify({ key: birthKey, sky }));
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report } });
    mockApi.postDaySky.mockResolvedValue({ ok: true, data: sky });
    await render(<HomeScreen />);
    await act(async () => {});
    expect(homeReady.getHomeReady()).toBe(true);
    expect(screen.getByTestId('home-today-card')).toBeTruthy();
    expect(screen.getByTestId('home-timing-card')).toBeTruthy();
    await act(async () => void (await jest.advanceTimersByTimeAsync(400)));
    expect(skeletons()).toHaveLength(0);
    expect(mockApi.getTimingReport).toHaveBeenCalledTimes(1);
    expect(mockApi.postDaySky).toHaveBeenCalledTimes(1);
  });

  it('앱을 켤 때 이번 달 달력과 나 탭 풀이의 상태를 한 번 받아 둔다 — 시기 · 나 탭을 열면 곧바로(결정 075 의 4)', async () => {
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'NONE' } });
    await render(<HomeScreen />);
    await act(async () => {});
    expect(mockApi.getMonth).toHaveBeenCalledTimes(1);
    expect(mockApi.getMeReport).toHaveBeenCalledTimes(1);
    expect(JSON.parse((await AsyncStorage.getItem(ME_REPORT_STORAGE_KEY))!)).toEqual({ key: birthKey, status: 'NONE' });
    expect(JSON.parse((await AsyncStorage.getItem(MONTH_SKY_STORAGE_KEY))!).sky.month).toBe(fixtures.monthSky.month);
  });

  it('시기 풀이를 받기 전이면 "자세한 풀이 받기" 카드가 바로 — 뼈대 없이', async () => {
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'NONE' } });
    await render(<HomeScreen />);
    await act(async () => {});
    expect(screen.getByTestId('home-timing-empty')).toBeTruthy();
    await act(async () => void (await jest.advanceTimersByTimeAsync(400)));
    expect(skeletons()).toHaveLength(0);
  });

  it('처음 들어올 때는 홈 카드의 첫 상태(시기 풀이 상태 응답)까지 스플래시를 걷지 않는다(markHomeReady 를 부르지 않음)', async () => {
    let answer: (v: Awaited<ReturnType<typeof api.getTimingReport>>) => void = () => {};
    mockApi.getTimingReport.mockReturnValue(new Promise((r) => (answer = r)));
    await render(<HomeScreen />);
    await act(async () => {});
    expect(screen.getByTestId('nickname-card')).toBeTruthy();
    expect(homeReady.getHomeReady()).toBe(false);
    await act(async () => answer({ ok: true, data: { status: 'NONE' } }));
    expect(homeReady.getHomeReady()).toBe(true);
    expect(screen.getByTestId('home-timing-empty')).toBeTruthy();
  });

  it('오늘의 하늘을 그날 처음 쓰는 중이면 생성을 기다리지 않는다 — 1초 안에 못 받으면 쓰는 중 카드로 스플래시를 걷고, 뼈대는 없다', async () => {
    let finish: (v: Awaited<ReturnType<typeof api.postDaySky>>) => void = () => {};
    mockApi.postDaySky.mockReturnValue(new Promise((r) => (finish = r)));
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'NONE' } });
    await render(<HomeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(400)));
    expect(homeReady.getHomeReady()).toBe(false);
    expect(skeletons()).toHaveLength(0);
    await act(async () => void (await jest.advanceTimersByTimeAsync(600)));
    expect(homeReady.getHomeReady()).toBe(true);
    expect(screen.getByTestId('home-today-making')).toBeTruthy();
    expect(skeletons()).toHaveLength(0);
    await act(async () => finish({ ok: true, data: sky }));
    expect(screen.getByTestId('home-today-card')).toBeTruthy();
  });
});

describe('계정은 기기 · 메모리에서 첫 그림부터(소유자 "이름이랑 프로필이 늦게 와")', () => {
  const me = { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false };
  beforeEach(async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading(fixtures.reading);
  });

  it('기기에 둔 계정이 있으면 /account 답 전에 이름 · 프로필 그림 — 자리표 없이', async () => {
    await AsyncStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify({ account: me }));
    mockApi.getMyAccount.mockReturnValue(new Promise(() => {}));
    await render(<HomeScreen />);
    expect(await screen.findByText('새벽별 님')).toBeTruthy();
    expect(screen.getByLabelText(strings.nickname.avatars[2])).toBeTruthy();
    expect(screen.queryByTestId('avatar-placeholder', { includeHiddenElements: true })).toBeNull();
  });

  it('처음(기기에도 없음)이면 그림 · 이름 자리에 같은 크기의 흐린 자리표, 답이 오면 그 자리에 그림 · 이름', async () => {
    let answer: (v: Awaited<ReturnType<typeof api.getMyAccount>>) => void = () => {};
    mockApi.getMyAccount.mockReturnValue(new Promise((r) => (answer = r)));
    await render(<HomeScreen />);
    // 자리표는 화면 읽기에서 숨긴다
    const hidden = { includeHiddenElements: true };
    expect(await screen.findByTestId('avatar-placeholder', hidden)).toBeTruthy();
    expect(screen.getByTestId('nickname-placeholder', hidden)).toBeTruthy();
    await act(async () => answer({ ok: true, data: me }));
    expect(screen.getByText('새벽별 님')).toBeTruthy();
    expect(screen.queryByTestId('avatar-placeholder', hidden)).toBeNull();
  });

  it('정지 문이 로그인 때 받은 계정을 홈이 같이 쓴다 — /account 를 한 번 더 부르지 않는다', async () => {
    await refreshAccount();
    expect(mockApi.getMyAccount).toHaveBeenCalledTimes(1);
    await render(<HomeScreen />);
    expect(await screen.findByText('새벽별 님')).toBeTruthy();
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
      expect(screen.getByTestId('nickname-card')).toBeTruthy();
      expect(screen.getByTestId('home-bell-dot')).toBeTruthy();
    } finally {
      getItem.mockImplementation(original);
    }
  });
});
