import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';
import { StyleSheet } from 'react-native';

import HomeScreen from '@/app/index';
import { setSplashGoneForTest } from '@/components/splash-view';
import { Colors } from '@/constants/theme';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { ME_REPORT_STORAGE_KEY } from '@/features/me/use-me-report';
import { INTRO_SEEN_KEY, resetIntroSeen } from '@/features/onboarding/intro-seen';
import { WHATS_NEW_KEY, resetWhatsNew, settleWhatsNew } from '@/features/onboarding/whats-new';
import { useUpdateSuggestion } from '@/features/update/update-gate';
import { api } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  ...jest.requireActual('@/features/auth/use-session'),
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
}));
// 업데이트 권유 창(결정 059)이 뜨는 방문인지 — 시험이 정한다(UpdateGate 밖의 기본은 'none')
jest.mock('@/features/update/update-gate', () => ({
  ...jest.requireActual('@/features/update/update-gate'),
  useUpdateSuggestion: jest.fn(() => 'none'),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    listPlaces: jest.fn(),
    getMyAccount: jest.fn(),
    getNotifications: jest.fn(),
    getMonth: jest.fn(),
    getMeReport: jest.fn(),
    getTimingReport: jest.fn(),
    postDaySky: jest.fn(),
    getProfile: jest.fn(async () => ({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' })),
  },
}));

const mockApi = api as jest.Mocked<typeof api>;
const W = strings.whatsNew;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const birthKey = JSON.stringify([profile.date, profile.time, profile.place.id]);

/** 앱을 켠다: 이번 실행의 메모리를 비우고, 루트 레이아웃이 하듯 실행이 시작할 때 새로워진 점을 정한다 */
const launch = async () => {
  resetIntroSeen();
  resetWhatsNew();
  await settleWhatsNew();
};

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  setSplashGoneForTest(true);
  (useUpdateSuggestion as jest.Mock).mockReturnValue('none');
  mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } });
  mockApi.getNotifications.mockResolvedValue({ ok: true, data: { unread: 0, items: [] } });
  mockApi.getMonth.mockResolvedValue({ ok: true, data: fixtures.monthSky });
  mockApi.getMeReport.mockResolvedValue({ ok: true, data: { status: 'NONE' } });
  mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'NONE' } });
  mockApi.postDaySky.mockResolvedValue({ ok: true, data: fixtures.daySky });
  await saveBirth({ profile, chart: fixtures.chart });
});

// 시안 "홈 (1.1.0)" R3 · 결정 109 의 6 · 113 의 1 · 2
describe('새로워진 점 창(1.1.0 처음 켤 때 한 번 · 1.0.0 에서 업데이트한 사람만)', () => {
  it('1.0.x 기기면 홈 위에 "별명이 새로워졌어요" — 궁합이 생겼어요 · 홈이 한눈에 보여요, 받은 풀이가 없으면 셋째 줄은 없다', async () => {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    await launch();
    await render(<HomeScreen />);
    const dialog = within(await screen.findByTestId('whats-new'));
    expect(dialog.getByText(W.title)).toBeTruthy();
    expect(dialog.getByText('궁합이 생겼어요')).toBeTruthy();
    expect(dialog.getByText('연애 · 친구 궁합을 볼 수 있어요')).toBeTruthy();
    expect(dialog.getByText('홈이 한눈에 보여요')).toBeTruthy();
    expect(dialog.getByText('나 · 나의 시기 · 나의 사람들을 한곳에')).toBeTruthy();
    expect(dialog.queryByText('받았던 자세한 풀이는 그대로')).toBeNull();
    expect(dialog.getByText(W.close)).toBeTruthy();
    expect(dialog.getByText(W.synastry)).toBeTruthy();
  });

  it('1.0.0 에서 받은 풀이가 있으면(기기에 둔 나 탭 풀이) 셋째 줄 "받았던 자세한 풀이는 그대로"', async () => {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    await AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, report: fixtures.meReport }));
    await launch();
    await render(<HomeScreen />);
    expect(within(await screen.findByTestId('whats-new')).getByText('받았던 자세한 풀이는 그대로')).toBeTruthy();
    expect(screen.getByText('1.0.0 에서 받은 풀이는 계속 볼 수 있어요')).toBeTruthy();
  });

  it('기기에는 없어도 서버가 다 쓴 시기 풀이가 있다고 하면(앱을 켤 때 받아 두는 상태) 셋째 줄이 있다', async () => {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    mockApi.getTimingReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report: fixtures.timingReport } });
    await launch();
    await render(<HomeScreen />);
    expect(within(await screen.findByTestId('whats-new')).getByText('받았던 자세한 풀이는 그대로')).toBeTruthy();
  });

  it('카드 모양은 시안 R3 — 채운 면 · 모서리 20, 버튼은 닫기(보조) 1 : 궁합 보러 가기(주) 1.4 · 높이 50', async () => {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    await launch();
    await render(<HomeScreen />);
    const card = await screen.findByTestId('whats-new-card');
    expect(StyleSheet.flatten(card.props.style)).toMatchObject({ backgroundColor: Colors.fill, borderRadius: 20, paddingTop: 26, paddingHorizontal: 20, paddingBottom: 20 });
    const close = StyleSheet.flatten(screen.getByTestId('whats-new-close').props.style);
    const go = StyleSheet.flatten(screen.getByTestId('whats-new-synastry').props.style);
    expect(close).toMatchObject({ flex: 1, height: 50, backgroundColor: Colors.hair });
    expect(go).toMatchObject({ flex: 1.4, height: 50, backgroundColor: Colors.primary });
  });

  it('"궁합 보러 가기" 는 궁합 탭으로, 본 것을 적어 다시 띄우지 않는다', async () => {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    await launch();
    await render(<HomeScreen />);
    await fireEvent.press(await screen.findByText(W.synastry));
    expect(router.replace).toHaveBeenLastCalledWith('/synastry');
    expect(screen.queryByTestId('whats-new')).toBeNull();
    expect(await AsyncStorage.getItem(WHATS_NEW_KEY)).not.toBeNull();
  });

  it('닫으면 홈 그대로 — 다음에 켜도 다시 띄우지 않는다(한 번만)', async () => {
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    await launch();
    const first = await render(<HomeScreen />);
    await fireEvent.press(await screen.findByText(W.close));
    expect(screen.queryByTestId('whats-new')).toBeNull();
    expect(router.replace).not.toHaveBeenCalled();
    await first.unmount();
    await launch();
    await render(<HomeScreen />);
    await screen.findByTestId('home-menu-me');
    await act(async () => {});
    expect(screen.queryByTestId('whats-new')).toBeNull();
  });

  it('스플래시 · 이용 정지 확인이 걷히기 전에는 띄우지 않는다 — 걷히면 그때(알림 받기 권유와 같다)', async () => {
    setSplashGoneForTest(false);
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    await launch();
    await render(<HomeScreen />);
    await screen.findByTestId('home-menu-me');
    await act(async () => {});
    expect(screen.queryByTestId('whats-new')).toBeNull();
    await act(async () => setSplashGoneForTest(true));
    expect(await screen.findByTestId('whats-new')).toBeTruthy();
  });

  it('업데이트 권유 창이 뜬 방문에서는 띄우지 않고 다음으로 미룬다 — 본 것으로 적지 않는다', async () => {
    (useUpdateSuggestion as jest.Mock).mockReturnValue('suggesting');
    await AsyncStorage.setItem(INTRO_SEEN_KEY, '1');
    await launch();
    const view = await render(<HomeScreen />);
    await screen.findByTestId('home-menu-me');
    await act(async () => {});
    expect(screen.queryByTestId('whats-new')).toBeNull();
    // 권유 창을 닫아도 이번 방문에는 그대로 — 다음 방문(홈을 다시 열 때)에
    (useUpdateSuggestion as jest.Mock).mockReturnValue('none');
    await view.rerender(<HomeScreen />);
    await act(async () => {});
    expect(screen.queryByTestId('whats-new')).toBeNull();
    expect(await AsyncStorage.getItem(WHATS_NEW_KEY)).toBeNull();
    await view.unmount();
    await render(<HomeScreen />);
    expect(await screen.findByTestId('whats-new')).toBeTruthy();
  });

  it('새로 깐 사람(소개 기록 없음)은 보지 않는다', async () => {
    await launch();
    await render(<HomeScreen />);
    await screen.findByTestId('home-menu-me');
    await act(async () => {});
    expect(screen.queryByTestId('whats-new')).toBeNull();
  });
});
