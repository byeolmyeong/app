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
import { TIMING_REPORT_STORAGE_KEY } from '@/features/timing/use-timing-report';
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
    getMyAccount: jest.fn(),
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

  it('받아 둔 풀이가 없으면 "아직 별명을 짓지 않았어요" 와 "내 별명 읽기" — 누르면 /reading(풀이를 부르지 않는다)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    expect(within(await screen.findByTestId('nickname-card')).getByText(M.readingEmpty)).toBeTruthy();
    await fireEvent.press(screen.getByText(M.readingCta));
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
    expect(within(card).getByText(strings.home.card.read)).toBeTruthy();
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

  it('시기 풀이가 없으면 "지금 나는 어떤 시기일까 · 자세한 풀이 받기" — 누르면 시기 탭(여기서 만들기를 시작하지 않는다)', async () => {
    await render(<HomeScreen />);
    const empty = await screen.findByTestId('home-timing-empty');
    expect(within(empty).getByText(T.home.emptyTitle)).toBeTruthy();
    await fireEvent.press(within(empty).getByRole('button', { name: T.home.request }));
    expect(router.replace).toHaveBeenLastCalledWith('/timing');
    expect(screen.queryByTestId('home-timing-card')).toBeNull();
  });

  it('쓰는 중이면 칸이 없다(보드 11-2)', async () => {
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'WRITING' } });
    await render(<HomeScreen />);
    await screen.findByTestId('nickname-card');
    await act(async () => {});
    expect(screen.queryByTestId('home-timing-card')).toBeNull();
    expect(screen.queryByTestId('home-timing-empty')).toBeNull();
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
