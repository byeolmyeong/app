import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';
import { Linking, Platform, StyleSheet } from 'react-native';

import NotificationsScreen from '@/app/my/notifications';
import { strings } from '@/content/strings';
import { api, type ApiResult, type MyAccount } from '@/lib/api';

jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: jest.fn(() => true), replace: jest.fn() },
  // 화면이 보일 때 = 그릴 때 한 번
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getMyAccount: jest.fn(), updateAccount: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const N = strings.my.notifications;
const base: MyAccount = { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false };
const full: MyAccount = { ...base, pushConsent: true, todaySkyPush: true, todaySkyTime: '08:00' };

const sw = (label: string) => screen.getByRole('switch', { name: label });
const isOn = (label: string) => sw(label).props.accessibilityState.checked;

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.getMyAccount.mockResolvedValue({ ok: true, data: full });
});

describe('마이 › 알림(/my/notifications, 보드 16-2 · 16-2-2)', () => {
  it('푸시 알림 받기 / 오늘의 하늘 알림 · 받는 시간 / 이벤트 · 혜택 알림을 서버 값대로, 설명과 함께 보인다', async () => {
    await render(<NotificationsScreen />);
    expect(await screen.findByText(N.push.label)).toBeTruthy();
    expect(screen.getByText(N.push.description)).toBeTruthy();
    expect(screen.getByText(N.todaySky.description)).toBeTruthy();
    expect(screen.getByText(N.marketing.description)).toBeTruthy();
    expect(isOn(N.push.label)).toBe(true);
    expect(isOn(N.todaySky.label)).toBe(true);
    expect(isOn(N.marketing.label)).toBe(false);
    expect(within(screen.getByRole('button', { name: N.time })).getByText('오전 8:00')).toBeTruthy();
    // 푸시가 켜져 있으면 안내 글은 없고 흐리지 않다
    expect(screen.queryByText(N.pushOff)).toBeNull();
    expect(screen.getByTestId('today-sky').props.accessibilityState).toEqual({ disabled: false });
  });

  it('줄 순서는 푸시 → 오늘의 하늘 → 받는 시간 → 이벤트 · 혜택(보드 16-2)', async () => {
    await render(<NotificationsScreen />);
    await screen.findByText(N.push.label);
    const shown = JSON.stringify(screen.toJSON());
    const places = [N.push.label, N.todaySky.label, N.time, N.marketing.label].map((l) => shown.indexOf(`"${l}"`));
    expect(places.every((p) => p >= 0)).toBe(true);
    expect(places).toEqual([...places].sort((a, b) => a - b));
  });

  it('스위치를 누르면 바로 바뀌고 그 칸만 PATCH /account 로 보낸다', async () => {
    mockApi.updateAccount.mockResolvedValue({ ok: true, data: { ...full, marketingConsent: true } });
    await render(<NotificationsScreen />);
    await screen.findByText(N.marketing.label);
    await fireEvent.press(sw(N.marketing.label));
    expect(isOn(N.marketing.label)).toBe(true);
    expect(mockApi.updateAccount).toHaveBeenCalledWith({ marketingConsent: true });
    await waitFor(() => expect(isOn(N.marketing.label)).toBe(true));
  });

  it('푸시를 끄면 오늘의 하늘 묶음이 흐려지고(누를 수 없음) 아래에 안내 한 줄 — 값은 서버가 준 그대로 그린다(16-2-2)', async () => {
    // 직접 정한 적 없는 오늘의 하늘은 서버가 푸시 동의를 따라 끈 값으로 준다
    mockApi.updateAccount.mockResolvedValue({ ok: true, data: { ...full, pushConsent: false, todaySkyPush: false } });
    await render(<NotificationsScreen />);
    await screen.findByText(N.push.label);
    await fireEvent.press(sw(N.push.label));
    expect(mockApi.updateAccount).toHaveBeenCalledWith({ pushConsent: false });
    expect(await screen.findByText(N.pushOff)).toBeTruthy();
    await waitFor(() => expect(isOn(N.todaySky.label)).toBe(false));
    expect(screen.getByTestId('today-sky').props.accessibilityState).toEqual({ disabled: true });
    expect(screen.getByTestId('today-sky').props.pointerEvents).toBe('none');
    // 웹 키보드 · 화면 낭독기에도 누를 수 없다고 알린다(줄 자체가 disabled, #59 리뷰)
    expect(sw(N.todaySky.label).props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByRole('button', { name: N.time }).props.accessibilityState).toMatchObject({ disabled: true });
    // 흐린 동안 눌러도 보내지 않는다
    await fireEvent.press(sw(N.todaySky.label));
    await fireEvent.press(screen.getByRole('button', { name: N.time }));
    expect(mockApi.updateAccount).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('time-body')).toBeNull();
  });

  it('직접 켜 둔 오늘의 하늘은 푸시를 꺼도 서버가 켠 값 그대로 준다 — 흐리게 켠 채로 그린다', async () => {
    mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { ...full, pushConsent: false } });
    await render(<NotificationsScreen />);
    await screen.findByText(N.pushOff);
    expect(isOn(N.todaySky.label)).toBe(true);
    expect(screen.getByTestId('today-sky').props.accessibilityState).toEqual({ disabled: true });
  });

  it('못 바꾸면 서버가 마지막으로 준 값으로 되돌리고 짧은 알림을 띄운다', async () => {
    mockApi.updateAccount.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<NotificationsScreen />);
    await screen.findByText(N.push.label);
    await fireEvent.press(sw(N.push.label));
    expect(await screen.findByText(N.saveFailed)).toBeTruthy();
    expect(isOn(N.push.label)).toBe(true);
    expect(screen.queryByText(N.pushOff)).toBeNull();
  });

  it('빨리 두 번 바꾸면 마지막 요청의 답만 쓴다 — 늦게 온 앞 요청의 답이 덮지 않는다', async () => {
    let first: (r: ApiResult<MyAccount>) => void = () => {};
    mockApi.updateAccount
      .mockReturnValueOnce(new Promise((resolve) => (first = resolve)))
      .mockResolvedValueOnce({ ok: true, data: { ...full, marketingConsent: false } });
    await render(<NotificationsScreen />);
    await screen.findByText(N.marketing.label);
    await fireEvent.press(sw(N.marketing.label));
    await fireEvent.press(sw(N.marketing.label));
    await waitFor(() => expect(mockApi.updateAccount).toHaveBeenCalledTimes(2));
    await act(async () => first({ ok: true, data: { ...full, marketingConsent: true } }));
    expect(isOn(N.marketing.label)).toBe(false);
  });

  it('서로 다른 칸을 빨리 바꿨는데 뒤 요청이 먼저 실패해도, 앞 요청의 성공이 화면에 남는다(모두 답이 온 뒤 서버 값으로, #59 리뷰)', async () => {
    let pushDone: (r: ApiResult<MyAccount>) => void = () => {};
    mockApi.updateAccount
      .mockReturnValueOnce(new Promise((resolve) => (pushDone = resolve)))
      .mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<NotificationsScreen />);
    await screen.findByText(N.marketing.label);
    await fireEvent.press(sw(N.push.label));
    await fireEvent.press(sw(N.marketing.label));
    // 뒤 요청(마케팅)이 먼저 실패 — 앞 요청이 아직이라 화면은 그대로 둔다
    expect(await screen.findByText(N.saveFailed)).toBeTruthy();
    expect(isOn(N.push.label)).toBe(false);
    await act(async () => pushDone({ ok: true, data: { ...full, pushConsent: false, todaySkyPush: false } }));
    // 서버: 푸시 끔(성공) · 마케팅 그대로 끔(실패)
    expect(isOn(N.push.label)).toBe(false);
    expect(isOn(N.marketing.label)).toBe(false);
  });

  it('받는 시간을 누르면 시각 시트(분은 5분 단위) — 확인하면 "HH:mm" 으로 그 칸만 저장하고 줄에 새 시각', async () => {
    mockApi.updateAccount.mockResolvedValue({ ok: true, data: { ...full, todaySkyTime: '21:05' } });
    await render(<NotificationsScreen />);
    await screen.findByText(N.time);
    await fireEvent.press(screen.getByRole('button', { name: N.time }));
    expect(screen.getByTestId('time-minute-5')).toBeTruthy();
    expect(screen.queryByTestId('time-minute-3')).toBeNull();
    await fireEvent.press(screen.getByTestId('time-period-PM'));
    await fireEvent.press(screen.getByTestId('time-hour-9'));
    await fireEvent.press(screen.getByTestId('time-minute-5'));
    await fireEvent.press(screen.getByText(strings.home.timeConfirm));
    expect(mockApi.updateAccount).toHaveBeenCalledWith({ todaySkyTime: '21:05' });
    await waitFor(() => expect(within(screen.getByRole('button', { name: N.time })).getByText('오후 9:05')).toBeTruthy());
  });

  it('시트에서 그대로 확인하면 보내지 않는다', async () => {
    await render(<NotificationsScreen />);
    await screen.findByText(N.time);
    await fireEvent.press(screen.getByRole('button', { name: N.time }));
    await fireEvent.press(screen.getByText(strings.home.timeConfirm));
    expect(mockApi.updateAccount).not.toHaveBeenCalled();
  });

  it('오늘의 하늘 칸이 없는 서버(S10-2 전)면 그 묶음 없이 푸시 · 이벤트 두 줄만', async () => {
    mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { ...base, pushConsent: false } });
    await render(<NotificationsScreen />);
    await screen.findByText(N.push.label);
    expect(screen.getByText(N.marketing.label)).toBeTruthy();
    expect(screen.queryByText(N.todaySky.label)).toBeNull();
    expect(screen.queryByText(N.time)).toBeNull();
    expect(screen.queryByText(N.pushOff)).toBeNull();
  });

  it('푸시 동의 칸도 없는 옛 서버면 불러오지 못한 화면(바꿀 수 없다)', async () => {
    mockApi.getMyAccount.mockResolvedValue({ ok: true, data: base });
    await render(<NotificationsScreen />);
    expect(await screen.findByText(N.loadFail)).toBeTruthy();
    expect(screen.queryByRole('switch')).toBeNull();
  });

  it('못 받으면 실패 화면 → "다시 보기" 로 다시 묻는다', async () => {
    mockApi.getMyAccount.mockResolvedValueOnce({ ok: false, error: 'SERVER' });
    await render(<NotificationsScreen />);
    await fireEvent.press(await screen.findByText(strings.states.loadFail.retry));
    expect(await screen.findByText(N.push.label)).toBeTruthy();
    expect(mockApi.getMyAccount).toHaveBeenCalledTimes(2);
  });

  it('0.3초가 넘게 걸리면 다 그려진 화면과 같은 카드 셋 · 같은 줄 수의 뼈대(결정 065)', async () => {
    jest.useFakeTimers();
    try {
      mockApi.getMyAccount.mockReturnValue(new Promise(() => {}));
      await render(<NotificationsScreen />);
      await act(async () => jest.advanceTimersByTime(400));
      const skeleton = screen.getByLabelText(strings.states.loading);
      // 카드 셋, 줄은 1 · 2 · 1
      expect(skeleton.children).toHaveLength(3);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('휴대폰 설정에서 꺼졌을 때(보드 16-2-1, 결정 066 의 3)', () => {
  const N2 = Notifications as jest.Mocked<typeof Notifications>;
  const O = N.osOff;
  const ios = (status: number) => ({ granted: status === IosAuthorizationStatus.AUTHORIZED, status: 'denied', canAskAgain: false, expires: 'never', ios: { status } }) as never;
  afterEach(() => N2.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'undetermined', canAskAgain: true, expires: 'never' } as never));

  it('맨 위에 "휴대폰 알림이 꺼져 있어요 · 설정 열기" 줄, 아래 설정은 흐리게(값은 그대로) — 누르면 휴대폰 설정으로', async () => {
    N2.getPermissionsAsync.mockResolvedValue(ios(IosAuthorizationStatus.DENIED));
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await render(<NotificationsScreen />);
    expect(await screen.findByText(O.title)).toBeTruthy();
    expect(screen.getByText(O.description)).toBeTruthy();
    expect(screen.getByText(O.action)).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('settings').props.style).opacity).toBe(0.4);
    expect(isOn(N.push.label)).toBe(true);
    // 줄 순서: 꺼짐 줄이 푸시 카드보다 위
    const shown = JSON.stringify(screen.toJSON());
    expect(shown.indexOf(`"${O.title}"`)).toBeLessThan(shown.indexOf(`"${N.push.label}"`));
    await fireEvent.press(screen.getByRole('button', { name: `${O.title}. ${O.action}` }));
    expect(open).toHaveBeenCalled();
    open.mockRestore();
  });

  it('허용돼 있으면 그 줄은 없고 흐리지 않다', async () => {
    N2.getPermissionsAsync.mockResolvedValue(ios(IosAuthorizationStatus.AUTHORIZED));
    await render(<NotificationsScreen />);
    await screen.findByText(N.push.label);
    await act(async () => {});
    expect(screen.queryByText(O.title)).toBeNull();
    expect(StyleSheet.flatten(screen.getByTestId('settings').props.style).opacity).toBeUndefined();
  });

  it('끌 때 · 저장하지 못했을 때는 묻지 않는다', async () => {
    N2.getPermissionsAsync.mockResolvedValue(ios(IosAuthorizationStatus.NOT_DETERMINED));
    mockApi.updateAccount.mockResolvedValueOnce({ ok: true, data: { ...full, pushConsent: false } });
    await render(<NotificationsScreen />);
    await screen.findByText(N.push.label);
    await act(async () => {});
    await fireEvent.press(sw(N.push.label));
    await act(async () => {});
    expect(N2.requestPermissionsAsync).not.toHaveBeenCalled();
    mockApi.updateAccount.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await fireEvent.press(sw(N.push.label));
    expect(await screen.findByText(N.saveFailed)).toBeTruthy();
    expect(N2.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('안드로이드 13+ 에서 아직 묻지 않은 사람(denied · 다시 물을 수 있음)은 꺼짐 줄이 없고, 켤 때 묻는다(#65 리뷰)', async () => {
    const os = Platform.OS;
    Platform.OS = 'android';
    try {
      N2.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied', canAskAgain: true, expires: 'never' } as never);
      mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { ...full, pushConsent: false } });
      mockApi.updateAccount.mockResolvedValue({ ok: true, data: full });
      await render(<NotificationsScreen />);
      await screen.findByText(N.push.label);
      await act(async () => {});
      expect(screen.queryByText(O.title)).toBeNull();
      await fireEvent.press(sw(N.push.label));
      await waitFor(() => expect(N2.requestPermissionsAsync).toHaveBeenCalled());
    } finally {
      Platform.OS = os;
    }
  });

  it('꺼짐 흐림과 푸시 끔(16-2-2)이 겹쳐도 오늘의 하늘은 한 번만 흐리다(0.16 이 되지 않게)', async () => {
    N2.getPermissionsAsync.mockResolvedValue(ios(IosAuthorizationStatus.DENIED));
    mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { ...full, pushConsent: false } });
    await render(<NotificationsScreen />);
    await screen.findByText(O.title);
    expect(StyleSheet.flatten(screen.getByTestId('settings').props.style).opacity).toBe(0.4);
    expect(StyleSheet.flatten(screen.getByTestId('today-sky').props.style)?.opacity).toBeUndefined();
    // 누름은 여전히 막는다
    expect(screen.getByTestId('today-sky').props.pointerEvents).toBe('none');
  });

  it('휴대폰 권한을 아직 묻지 않았으면(홈 권유에서 "나중에") 푸시를 켤 때 묻는다', async () => {
    N2.getPermissionsAsync.mockResolvedValue(ios(IosAuthorizationStatus.NOT_DETERMINED));
    mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { ...full, pushConsent: false } });
    mockApi.updateAccount.mockResolvedValue({ ok: true, data: full });
    await render(<NotificationsScreen />);
    await screen.findByText(N.push.label);
    await act(async () => {});
    await fireEvent.press(sw(N.push.label));
    await waitFor(() => expect(N2.requestPermissionsAsync).toHaveBeenCalled());
    expect(mockApi.updateAccount).toHaveBeenCalledWith({ pushConsent: true });
  });
});

