import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';

import { setSplashGoneForTest } from '@/components/splash-view';
import { strings } from '@/content/strings';
import { PUSH_ASK_KEY, PUSH_ASK_PENDING_KEY, PushAskSheet } from '@/features/push/push-ask-sheet';
import { api } from '@/lib/api';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'project-1' } } }, easConfig: null } }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { updateAccount: jest.fn(), registerPushDevice: jest.fn(), deletePushDevice: jest.fn() },
}));

const N = Notifications as jest.Mocked<typeof Notifications>;
const mockApi = api as jest.Mocked<typeof api>;
const A = strings.push.ask;
const S = IosAuthorizationStatus;
const perm = (status: number) =>
  ({ granted: status === S.AUTHORIZED, status: status === S.NOT_DETERMINED ? 'undetermined' : 'denied', canAskAgain: true, expires: 'never', ios: { status } }) as never;
const ok = { ok: true as const, data: { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } };
const timeRow = (text: string) => screen.getByRole('button', { name: `${A.time} ${text}` });

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  setSplashGoneForTest(true);
  N.getPermissionsAsync.mockResolvedValue(perm(S.NOT_DETERMINED));
  mockApi.updateAccount.mockResolvedValue(ok);
  mockApi.registerPushDevice.mockResolvedValue({ ok: true, data: null });
});

const shown = async (time?: string) => {
  const view = await render(<PushAskSheet time={time} />);
  await act(async () => {});
  return view;
};

describe('알림 받기 권유(보드 11-10, 결정 066 의 2)', () => {
  it('처음 한 번: 제목 · 설명 · 받는 시간(오전 8:00) · 나중에 · 알림 받기', async () => {
    await shown();
    expect(screen.getByText(A.title)).toBeTruthy();
    expect(screen.getByText(A.body)).toBeTruthy();
    expect(within(timeRow('오전 8:00')).getByText('오전 8:00')).toBeTruthy();
    expect(screen.getByText(A.later)).toBeTruthy();
    expect(screen.getByText(A.accept)).toBeTruthy();
  });

  it('스플래시 · 정지 확인이 끝나기 전에는 띄우지 않고, 걷히면 띄운다(#67 리뷰)', async () => {
    setSplashGoneForTest(false);
    await shown();
    expect(screen.queryByText(A.title)).toBeNull();
    await act(async () => setSplashGoneForTest(true));
    expect(screen.getByText(A.title)).toBeTruthy();
  });

  it('"나중에" → 닫고 다시 묻지 않는다(휴대폰 창도 띄우지 않는다)', async () => {
    await shown();
    await fireEvent.press(screen.getByText(A.later));
    expect(screen.queryByTestId('push-ask')).toBeNull();
    expect(await AsyncStorage.getItem(PUSH_ASK_KEY)).toBe('1');
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
    await shown();
    expect(screen.queryByText(A.title)).toBeNull();
  });

  it('"알림 받기" → 휴대폰 권한 창, 허용이면 푸시 동의 · 오늘의 하늘 · 받는 시간을 한 번에 저장 — 두 번 눌러도 한 번', async () => {
    N.requestPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    await shown();
    N.getPermissionsAsync.mockResolvedValueOnce(perm(S.NOT_DETERMINED)).mockResolvedValue(perm(S.AUTHORIZED));
    const accept = screen.getByText(A.accept);
    await fireEvent.press(accept);
    await fireEvent.press(accept);
    await act(async () => {});
    expect(N.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(mockApi.updateAccount).toHaveBeenCalledTimes(1);
    expect(mockApi.updateAccount).toHaveBeenCalledWith({ pushConsent: true, todaySkyPush: true, todaySkyTime: '08:00' });
  });

  it('휴대폰에서 이미 허용(안드로이드 12 이하 등)이면 시트는 띄우고 휴대폰 창만 건너뛴다', async () => {
    N.getPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    await shown();
    await fireEvent.press(screen.getByText(A.accept));
    await act(async () => {});
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockApi.updateAccount).toHaveBeenCalledWith({ pushConsent: true, todaySkyPush: true, todaySkyTime: '08:00' });
  });

  it('거절하면 시각을 고쳤을 때만 시각을 저장한다 — 그대로면 아무것도 보내지 않는다(다른 기기에서 정한 값을 덮지 않게)', async () => {
    N.requestPermissionsAsync.mockResolvedValue(perm(S.DENIED));
    await shown();
    await fireEvent.press(screen.getByText(A.accept));
    await act(async () => {});
    expect(mockApi.updateAccount).not.toHaveBeenCalled();
  });

  it('받는 시간은 계정의 값에서 시작하고, 같은 시트 안에서 시각 드럼(5분)으로 바꾼다 — 고친 시각으로 저장', async () => {
    N.requestPermissionsAsync.mockResolvedValue(perm(S.DENIED));
    await shown('21:30');
    await fireEvent.press(timeRow('오후 9:30'));
    // 시트를 둘 잇지 않는다 — 같은 시트의 내용만 바뀐다(iOS 는 시트를 잇달아 띄우지 못한다, #67 리뷰)
    expect(screen.queryByTestId('push-ask')).toBeNull();
    expect(screen.getByTestId('time-body')).toBeTruthy();
    expect(screen.queryByTestId('time-minute-3')).toBeNull();
    await fireEvent.press(screen.getByTestId('time-hour-9'));
    await fireEvent.press(screen.getByTestId('time-minute-5'));
    await fireEvent.press(screen.getByText(strings.home.timeConfirm));
    expect(timeRow('오후 9:05')).toBeTruthy();
    await fireEvent.press(screen.getByText(A.accept));
    await act(async () => {});
    expect(mockApi.updateAccount).toHaveBeenCalledWith({ todaySkyTime: '21:05' });
  });

  it('저장하지 못하면 기기에 남겨 다음에 홈에 올 때 시트 없이 다시 보낸다(#67 리뷰)', async () => {
    N.requestPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    mockApi.updateAccount.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const view = await shown();
    N.getPermissionsAsync.mockResolvedValueOnce(perm(S.NOT_DETERMINED)).mockResolvedValue(perm(S.AUTHORIZED));
    await fireEvent.press(screen.getByText(A.accept));
    await act(async () => {});
    expect(JSON.parse((await AsyncStorage.getItem(PUSH_ASK_PENDING_KEY))!)).toEqual({ pushConsent: true, todaySkyPush: true, todaySkyTime: '08:00' });
    await view.unmount();
    await shown();
    expect(mockApi.updateAccount).toHaveBeenLastCalledWith({ pushConsent: true, todaySkyPush: true, todaySkyTime: '08:00' });
    expect(await AsyncStorage.getItem(PUSH_ASK_PENDING_KEY)).toBeNull();
    expect(screen.queryByText(A.title)).toBeNull();
  });

  it.each([
    ['이미 물었음', async () => AsyncStorage.setItem(PUSH_ASK_KEY, '1')],
    ['휴대폰에서 이미 거절', async () => N.getPermissionsAsync.mockResolvedValue({ granted: false, status: 'denied', canAskAgain: false, expires: 'never', ios: { status: S.DENIED } } as never)],
  ])('%s 이면 띄우지 않는다', async (_, given) => {
    await given();
    await shown();
    expect(screen.queryByText(A.title)).toBeNull();
  });

  it('웹은 띄우지 않는다(빈 구현의 권한은 "unsupported")', async () => {
    const web = jest.requireActual<typeof import('@/features/push/push.web')>('@/features/push/push.web');
    expect(await web.getPushPermission()).toBe('unsupported');
  });
});
