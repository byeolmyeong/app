import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useNotifications } from '@/features/notifications/use-notifications';
import type { PushData } from '@/features/push/push-data';
import { api } from '@/lib/api';

/** 화면이 보이는가 — 시험이 바꾸고 다시 그리면 포커스 효과가 붙었다 떨어진다(다른 화면이 위에 올라옴) */
const mockFocus = { value: true };
jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => {
    const { useEffect } = jest.requireActual('react');
    const focused = mockFocus.value;
    useEffect(() => (focused ? effect() : undefined), [effect, focused]);
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
}));
/** 쓰는 중에 온 푸시(결정 066 의 5) — 이 훅을 쓰는 화면마다 듣는다 */
const mockPushListeners = new Set<(push: PushData) => void>();
jest.mock('@/features/push/push', () => ({
  onPushReceived: (listener: (push: PushData) => void) => {
    mockPushListeners.add(listener);
    return () => mockPushListeners.delete(listener);
  },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getNotifications: jest.fn(), markNotificationRead: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const push = (data: PushData) => act(async () => mockPushListeners.forEach((l) => l(data)));

beforeEach(() => {
  jest.clearAllMocks();
  mockFocus.value = true;
  mockPushListeners.clear();
  mockApi.getNotifications.mockResolvedValue({ ok: true, data: { unread: 0, items: [] } });
});

describe('쓰는 중에 온 푸시와 알림함(리뷰 #66 의 8)', () => {
  it('풀이 완성 · 문의 답변 푸시면 다시 묻는다', async () => {
    const { result } = await renderHook(() => useNotifications());
    await waitFor(() => expect(result.current.state.status).toBe('ready'));
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(1);
    await push({ type: 'ME_REPORT_DONE' });
    await push({ type: 'INQUIRY_ANSWERED', inquiryId: 'q1' });
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(3);
  });

  it('오늘의 하늘 푸시는 알림 줄을 만들지 않아 묻지 않는다(오늘의 하늘 카드가 새로 본다)', async () => {
    await renderHook(() => useNotifications());
    await waitFor(() => expect(mockApi.getNotifications).toHaveBeenCalledTimes(1));
    await push({ type: 'TODAY_SKY', date: '2026-11-19' });
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(1);
  });

  it('홈(뒤에 깔림)과 알림함(위)이 함께 있으면 푸시 한 번에 보이는 화면만 묻는다 — 뒤의 화면은 다시 보일 때 묻는다', async () => {
    const home = await renderHook(() => useNotifications());
    await waitFor(() => expect(mockApi.getNotifications).toHaveBeenCalledTimes(1));
    // 알림함이 위에 올라온다: 홈은 가려지고 알림함이 보인다
    mockFocus.value = false;
    await home.rerender({});
    mockFocus.value = true;
    await renderHook(() => useNotifications());
    await waitFor(() => expect(mockApi.getNotifications).toHaveBeenCalledTimes(2));
    await push({ type: 'TIMING_REPORT_DONE' });
    expect(mockApi.getNotifications).toHaveBeenCalledTimes(3);
  });
});
