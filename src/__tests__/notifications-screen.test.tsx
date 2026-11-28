import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import { router } from 'expo-router';

import NotificationsScreen from '@/app/notifications';
import { strings } from '@/content/strings';
import { api, type NotificationItem } from '@/lib/api';

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => false), dismissAll: jest.fn() },
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('@/features/auth/use-session', () => ({
  ...jest.requireActual('@/features/auth/use-session'),
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getNotifications: jest.fn(), markNotificationRead: jest.fn(), getMyAccount: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const N = strings.notifications;
/** 한국 시각 2026-11-20 15:00 */
const NOW = Date.parse('2026-11-20T06:00:00Z');

const items: NotificationItem[] = [
  { id: 'q', kind: 'INQUIRY_ANSWERED', createdAt: '2026-11-20T05:10:00Z', read: false, inquiryId: 'inq-1' },
  { id: 'syn', kind: 'SYNASTRY_REPORT_DONE', createdAt: '2026-11-20T04:00:00Z', read: false, synastryId: 's-1' },
  { id: 't', kind: 'TIMING_REPORT_DONE', createdAt: '2026-11-20T03:30:00Z', read: false },
  { id: 'm', kind: 'ME_REPORT_DONE', createdAt: '2026-11-17T00:12:00Z', read: false },
  { id: 'r', kind: 'READING_DONE', createdAt: '2026-11-07T01:00:00Z', read: true },
  { id: 'x', kind: 'INVITE_ACCEPTED', createdAt: '2026-11-07T00:00:00Z', read: false },
];

let nowSpy: jest.SpyInstance;
beforeEach(() => {
  jest.clearAllMocks();
  nowSpy = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  mockApi.getNotifications.mockResolvedValue({ ok: true, data: { unread: 5, items } });
  mockApi.markNotificationRead.mockResolvedValue({ ok: true, data: null });
  mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } });
});
afterEach(() => {
  nowSpy.mockRestore();
  jest.useRealTimers();
});

describe('알림함(결정 052 · 058, 보드 11-3)', () => {
  it('받은 날(한국 날짜)로 묶어 오늘 · 최근 7일 · 최근 30일 — 궁합 리포트 · 모르는 종류는 숨긴다', async () => {
    await render(<NotificationsScreen />);
    expect(await screen.findByText(N.kinds.INQUIRY_ANSWERED.title)).toBeTruthy();
    expect(screen.getAllByTestId('notification-group').map((g) => g.props.children)).toEqual(['오늘', '최근 7일', '최근 30일']);
    expect(screen.getAllByTestId('notification-row')).toHaveLength(4);
    // 아래 탭의 "궁합"(결정 102 의 3) 말고 알림 줄에는 궁합이 없다
    for (const row of screen.getAllByTestId('notification-row')) expect(within(row).queryByText(/궁합/)).toBeNull();
    // 안 읽음 점은 안 읽은 보이는 줄에만(문의 · 시기 · 나 탭)
    expect(screen.getAllByTestId('notification-unread')).toHaveLength(3);
    expect(screen.getByText('오후 2:10')).toBeTruthy();
    expect(screen.getByText('11월 17일')).toBeTruthy();
    expect(screen.getByText('11월 7일')).toBeTruthy();
    expect(await screen.findByText('새벽별 님의 별명과 풀이를 확인해 보세요.')).toBeTruthy();
  });

  it('누르면 읽음으로 하고 그 화면으로 — 문의 답변 · 시기 풀이 · 나 탭 풀이 · 별명(이미 읽은 줄은 읽음을 다시 보내지 않는다)', async () => {
    await render(<NotificationsScreen />);
    await fireEvent.press(await screen.findByText(N.kinds.INQUIRY_ANSWERED.title));
    expect(mockApi.markNotificationRead).toHaveBeenCalledWith('q');
    expect(router.push).toHaveBeenLastCalledWith({ pathname: '/my/inquiries/[id]', params: { id: 'inq-1' } });
    await fireEvent.press(screen.getByText(N.kinds.TIMING_REPORT_DONE.title));
    expect(router.push).toHaveBeenLastCalledWith('/timing');
    await fireEvent.press(screen.getByText(N.kinds.ME_REPORT_DONE.title));
    expect(router.push).toHaveBeenLastCalledWith('/me');
    await fireEvent.press(screen.getByText(N.kinds.READING_DONE.title));
    expect(router.push).toHaveBeenLastCalledWith('/reading');
    expect(mockApi.markNotificationRead).toHaveBeenCalledTimes(3);
    // 누른 줄은 바로 읽은 줄로 보인다
    expect(screen.queryAllByTestId('notification-unread')).toHaveLength(0);
  });

  it('읽음이 실패해도 이동한다', async () => {
    mockApi.markNotificationRead.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<NotificationsScreen />);
    await fireEvent.press(await screen.findByText(N.kinds.TIMING_REPORT_DONE.title));
    expect(router.push).toHaveBeenCalledWith('/timing');
  });

  it('비었으면 "아직 알림이 없어요"(보드 11-3-1) — 보이는 줄이 없을 때도', async () => {
    mockApi.getNotifications.mockResolvedValue({ ok: true, data: { unread: 1, items: [items[1]] } });
    await render(<NotificationsScreen />);
    expect(await screen.findByTestId('notifications-empty')).toBeTruthy();
    expect(screen.getByText(N.empty.title)).toBeTruthy();
    expect(screen.queryAllByTestId('notification-row')).toHaveLength(0);
  });

  it('못 받았으면 실패 화면(19) — 다시 보기를 누르면 다시 묻는다', async () => {
    mockApi.getNotifications.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 500 });
    await render(<NotificationsScreen />);
    expect(await screen.findByText(N.loadFail.title)).toBeTruthy();
    await fireEvent.press(screen.getByText(strings.states.loadFail.retry));
    expect(await screen.findByText(N.kinds.INQUIRY_ANSWERED.title)).toBeTruthy();
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(2);
  });

  it('처음 불러올 때 0.3초가 넘으면 다 그려질 배치를 본뜬 뼈대(결정 065 의 2 · 071) — 묶음 이름 하나와 안 읽은 줄 셋', async () => {
    jest.useFakeTimers();
    mockApi.getNotifications.mockReturnValue(new Promise(() => {}));
    await render(<NotificationsScreen />);
    expect(screen.queryByTestId('notifications-skeleton')).toBeNull();
    await act(async () => jest.advanceTimersByTime(300));
    expect(screen.getByTestId('notifications-skeleton')).toBeTruthy();
    expect(screen.getAllByTestId('notification-skeleton-row')).toHaveLength(3);
    // 머리 · 아래 탭은 진짜로 보인다
    expect(screen.getByText(N.title)).toBeTruthy();
    expect(screen.getAllByRole('tab').length).toBe(5);
  });
});
