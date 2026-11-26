import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import Constants from 'expo-constants';
import { router } from 'expo-router';

import MyScreen from '@/app/my';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { READING_STORAGE_KEY } from '@/features/reading/use-reading';
import { api, type MyAccount } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// 테스트에는 expo 설정이 실리지 않는다. 화면이 설정의 버전을 그대로 적는지만 본다.
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '9.8.7' } } }));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
  // 화면이 보일 때 = 그릴 때 한 번
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getMyAccount: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const M = strings.my;
const R = M.rows;
const account: MyAccount = { nickname: '새벽별', avatar: 3, email: 'dawnstar@kakao.com', provider: 'KAKAO', marketingConsent: false, suspended: false };
const profile = { date: '1999-03-08', time: '14:10', place: { id: 1, name: '서울특별시 강남구' } };
type Profile = { date: string; time: string | null; place: { id: number; name: string } | null };
/** 그 출생 정보로 받아 둔 풀이를 기기에 넣는다(use-reading 의 열쇠: 날짜 · 시각 · 곳) */
const storeReading = (reading: object, p: Profile = profile) =>
  AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ key: JSON.stringify([p.date, p.time, p.place?.id ?? null]), reading }));

let nowSpy: jest.SpyInstance | null = null;
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.getMyAccount.mockResolvedValue({ ok: true, data: account });
});
afterEach(() => {
  nowSpy?.mockRestore();
  nowSpy = null;
});

describe('마이 v2(/my) — 별명 카드 · 목록 카드 둘(결정 056, 보드 16)', () => {
  it('카드에 프로필 · 닉네임 · "해 별자리 · 별명을 받은 지 N일" · 한 줄 별명 · 출생 정보 한 줄 · 꺾쇠를 보인다(버튼 없음, 결정 084)', async () => {
    // 한국 날짜로 2026-11-20, 받은 날 2026-11-09 → 12일째
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-20T03:00:00Z'));
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading({ ...fixtures.reading, createdAt: '2026-11-09T01:00:00Z' });
    await render(<MyScreen />);
    const card = within(await screen.findByTestId('my-card'));
    expect(await card.findByText('새벽별')).toBeTruthy();
    // 홈 카드와 달리 "님" 을 붙이지 않는다(보드 16)
    expect(card.queryByText(/님/)).toBeNull();
    expect(await card.findByText('쌍둥이자리 · 별명을 받은 지 12일')).toBeTruthy();
    expect(card.getByText(fixtures.reading.headline)).toBeTruthy();
    expect(card.getByText('1999년 3월 8일 · 오후 2:10 · 서울 강남구')).toBeTruthy();
    expect(card.getByTestId('my-card-chevron')).toBeTruthy();
    expect(card.queryByText('프로필 수정')).toBeNull();
    expect(card.queryByText('출생 정보 수정')).toBeNull();
    expect(card.getByLabelText(strings.nickname.avatars[2])).toBeTruthy();
  });

  it('카드 오른쪽 위의 별자리 그림은 차트의 해 별자리(서버 값) 그대로 — 홈 카드와 같은 그림, 출생 정보가 없으면 그림도 없다', async () => {
    const virgo = { ...fixtures.chart, positions: fixtures.chart.positions.map((p) => (p.body === 'SUN' ? { ...p, sign: 'VIRGO' } : p)) };
    await saveBirth({ profile, chart: virgo });
    const view = await render(<MyScreen />);
    const card = within(await screen.findByTestId('my-card'));
    expect(await card.findByTestId('card-constellation-VIRGO', { includeHiddenElements: true })).toBeTruthy();
    await view.unmount();
    await AsyncStorage.clear();
    await render(<MyScreen />);
    const empty = within(await screen.findByTestId('my-card'));
    expect(empty.queryByTestId(/^card-constellation/, { includeHiddenElements: true })).toBeNull();
  });

  it('시각 "모름" 이면 "시각 모름", 만든 때(createdAt)가 없는 옛 풀이면 받은 날 없이 해 별자리만 적는다', async () => {
    const unknown = { date: '1999-03-08', time: null, place: null };
    await saveBirth({ profile: unknown, chart: fixtures.chartTimeUnknown });
    await storeReading(fixtures.reading, unknown);
    await render(<MyScreen />);
    const card = within(await screen.findByTestId('my-card'));
    expect(await card.findByText('1999년 3월 8일 · 시각 모름')).toBeTruthy();
    expect(await card.findByText('쌍둥이자리')).toBeTruthy();
    expect(card.queryByText(/별명을 받은 지/)).toBeNull();
  });

  it('업데이트 직후: 기기에 옛 모양(근거 구조 없음 · 보완점 3)으로 받아 둔 풀이도 한 줄 별명은 그대로 보인다(리뷰 #49)', async () => {
    const unknown = { date: '1999-03-08', time: null, place: null };
    await saveBirth({ profile: unknown, chart: fixtures.chartTimeUnknown });
    const old = { headline: '옛 요약 해석의 한 줄 별명', sections: [{ title: 't', body: 'b', basis: ['태양'] }], strengths: ['a', 'b', 'c'], cautions: ['a', 'b', 'c'] };
    await storeReading(old, unknown);
    await render(<MyScreen />);
    const card = within(await screen.findByTestId('my-card'));
    expect(await card.findByText(old.headline)).toBeTruthy();
  });

  it('출생 정보 · 풀이가 기기에 없으면 카드는 닉네임과 꺾쇠만, 줄들과 아래 탭은 그대로 보인다', async () => {
    await render(<MyScreen />);
    const card = within(await screen.findByTestId('my-card'));
    expect(await card.findByText('새벽별')).toBeTruthy();
    expect(card.getByTestId('my-card-chevron')).toBeTruthy();
    expect(card.queryByText(/년 .*월/)).toBeNull();
    for (const label of [R.notifications, R.faq, R.inquiry, R.terms, R.privacy, R.version]) expect(screen.getByText(label)).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityState.selected)).toEqual([false, false, false, true]);
  });

  it('계정을 받지 못하면(끊김) 카드는 닉네임 · 프로필 없이 그린다', async () => {
    mockApi.getMyAccount.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<MyScreen />);
    const card = within(await screen.findByTestId('my-card'));
    expect(await card.findByText('1999년 3월 8일 · 오후 2:10 · 서울 강남구')).toBeTruthy();
    await waitFor(() => expect(mockApi.getMyAccount).toHaveBeenCalledTimes(1));
    expect(card.queryByText('새벽별')).toBeNull();
    expect(card.queryByLabelText(strings.nickname.avatars[2])).toBeNull();
  });

  it('줄은 카드 아래 알림 · 자주 묻는 질문 · 문의하기 / 이용약관 · 개인정보 처리방침 · 앱 버전(숫자만) 순서다. 로그아웃 · 계정 삭제는 없다', async () => {
    await render(<MyScreen />);
    await screen.findByText('새벽별');
    const labels = ['새벽별', R.notifications, R.faq, R.inquiry, R.terms, R.privacy, R.version];
    const shown = JSON.stringify(screen.toJSON());
    const places = labels.map((label) => shown.indexOf(`"${label}"`));
    expect(places.every((p) => p >= 0)).toBe(true);
    expect(places).toEqual([...places].sort((a, b) => a - b));
    expect(Constants.expoConfig?.version).toBe('9.8.7');
    expect(screen.getByText('9.8.7')).toBeTruthy();
    // 056 의 2 · 3: 로그아웃 · 계정 삭제는 계정 화면에. 묶음 제목(도움 · 정보)도 없다
    expect(screen.queryByText(strings.my.account.logout)).toBeNull();
    expect(screen.queryByText(strings.my.account.delete)).toBeNull();
    expect(screen.queryByText('도움')).toBeNull();
    // 개인정보 수집 · 이용 동의 줄은 두지 않는다(056 의 2 — 카드 둘째 줄은 셋뿐)
    expect(screen.queryByText(/수집 · 이용 동의/)).toBeNull();
  });

  it.each([
    [R.notifications, '/my/notifications'],
    [R.faq, '/settings/faq'],
    [R.inquiry, '/my/inquiries'],
    [R.terms, '/settings/terms'],
    [R.privacy, '/settings/privacy'],
  ])('"%s" 는 %s 로 간다', async (label, path) => {
    await render(<MyScreen />);
    await screen.findByText('새벽별');
    await fireEvent.press(screen.getByText(label));
    expect(router.push).toHaveBeenLastCalledWith(path);
  });

  it('알림 줄에는 받는 시간을 적지 않는다 — 오늘의 하늘을 켜 두어도 이름뿐(받는 시간은 알림 설정 안에서만, 소유자 2026-11-21)', async () => {
    mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { ...account, pushConsent: true, todaySkyPush: true, todaySkyTime: '21:05' } });
    await render(<MyScreen />);
    await screen.findByText('새벽별');
    const row = screen.getByRole('button', { name: R.notifications });
    expect(within(row).queryByText(/오전|오후/)).toBeNull();
    expect(within(row).getAllByText(/./).map((t) => t.props.children)).toEqual([R.notifications]);
  });

  it('별명 카드 전체를 누르면 내 정보(/my/account)로 간다 — 화면 읽기 이름은 보이는 글 차례대로 + "내 정보"(결정 084)', async () => {
    nowSpy = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-11-20T03:00:00Z'));
    await saveBirth({ profile, chart: fixtures.chart });
    await storeReading({ ...fixtures.reading, createdAt: '2026-11-09T01:00:00Z' });
    await render(<MyScreen />);
    await screen.findByText(fixtures.reading.headline);
    const card = screen.getByRole('button', {
      name: ['새벽별', '쌍둥이자리 · 별명을 받은 지 12일', fixtures.reading.headline, '1999년 3월 8일 · 오후 2:10 · 서울 강남구', '내 정보'].join(', '),
    });
    expect(card.props.testID).toBe('my-card');
    await fireEvent.press(card);
    expect(router.push).toHaveBeenLastCalledWith('/my/account');
    // 출생 정보 수정은 내 정보 안에서만 들어간다
    expect(router.push).not.toHaveBeenCalledWith('/my/birth');
  });

  it('문의 메일 주소를 어디에도 적지 않는다(결정 024)', async () => {
    await render(<MyScreen />);
    await screen.findByText('새벽별');
    expect(JSON.stringify(screen.toJSON())).not.toMatch(/@|mailto/);
    expect(JSON.stringify(strings)).not.toMatch(/@|mailto/);
  });

  it('기기 저장소를 읽는 동안에도 아래 탭이 보인다', async () => {
    const pending = jest.spyOn(AsyncStorage, 'getItem').mockReturnValue(new Promise(() => {}));
    try {
      await render(<MyScreen />);
      expect(screen.queryByText(R.faq)).toBeNull();
      expect(screen.getByText(strings.tabs.home)).toBeTruthy();
    } finally {
      pending.mockRestore();
    }
  });
});
