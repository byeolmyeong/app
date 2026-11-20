import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';

import { strings } from '@/content/strings';
import { PUSH_ASK_KEY, PushAskSheet } from '@/features/push/push-ask-sheet';
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

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  N.getPermissionsAsync.mockResolvedValue(perm(S.NOT_DETERMINED));
  mockApi.updateAccount.mockResolvedValue({ ok: true, data: { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } });
  mockApi.registerPushDevice.mockResolvedValue({ ok: true, data: null });
});

const shown = async () => {
  await render(<PushAskSheet />);
  await act(async () => {});
};

describe('알림 받기 권유(보드 11-10, 결정 066 의 2)', () => {
  it('휴대폰 권한을 아직 묻지 않았으면 처음 한 번: 제목 · 설명 · 받는 시간(오전 8:00) · 나중에 · 알림 받기', async () => {
    await shown();
    expect(screen.getByText(A.title)).toBeTruthy();
    expect(screen.getByText(A.body)).toBeTruthy();
    expect(within(screen.getByRole('button', { name: `${A.time} 오전 8:00` })).getByText('오전 8:00')).toBeTruthy();
    expect(screen.getByText(A.later)).toBeTruthy();
    expect(screen.getByText(A.accept)).toBeTruthy();
  });

  it('"나중에" → 닫고 다시 묻지 않는다(휴대폰 창도 띄우지 않는다)', async () => {
    await shown();
    await fireEvent.press(screen.getByText(A.later));
    expect(screen.queryByTestId('push-ask')).toBeNull();
    expect(await AsyncStorage.getItem(PUSH_ASK_KEY)).toBe('1');
    expect(N.requestPermissionsAsync).not.toHaveBeenCalled();
    await render(<PushAskSheet />);
    await act(async () => {});
    expect(screen.queryByText(A.title)).toBeNull();
  });

  it('"알림 받기" → 휴대폰 권한 창, 허용이면 푸시 동의 · 오늘의 하늘 · 받는 시간을 한 번에 저장', async () => {
    N.requestPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    await shown();
    N.getPermissionsAsync.mockResolvedValueOnce(perm(S.NOT_DETERMINED)).mockResolvedValue(perm(S.AUTHORIZED));
    await fireEvent.press(screen.getByText(A.accept));
    await act(async () => {});
    expect(N.requestPermissionsAsync).toHaveBeenCalled();
    expect(mockApi.updateAccount).toHaveBeenCalledWith({ pushConsent: true, todaySkyPush: true, todaySkyTime: '08:00' });
    expect(await AsyncStorage.getItem(PUSH_ASK_KEY)).toBe('1');
  });

  it('휴대폰 창에서 거절하면 고른 시각만 저장한다(켜지 않는다)', async () => {
    N.requestPermissionsAsync.mockResolvedValue(perm(S.DENIED));
    await shown();
    await fireEvent.press(screen.getByText(A.accept));
    await act(async () => {});
    expect(mockApi.updateAccount).toHaveBeenCalledWith({ todaySkyTime: '08:00' });
  });

  it('받는 시간을 누르면 시각 시트(5분 단위) — 고른 시각이 줄에 바로 보이고 그 시각으로 저장한다', async () => {
    N.requestPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
    await shown();
    await fireEvent.press(screen.getByRole('button', { name: `${A.time} 오전 8:00` }));
    expect(screen.queryByTestId('time-minute-3')).toBeNull();
    await fireEvent.press(screen.getByTestId('time-period-PM'));
    await fireEvent.press(screen.getByTestId('time-hour-9'));
    await fireEvent.press(screen.getByTestId('time-minute-5'));
    await fireEvent.press(screen.getByText(strings.home.timeConfirm));
    expect(screen.getByRole('button', { name: `${A.time} 오후 9:05` })).toBeTruthy();
    N.getPermissionsAsync.mockResolvedValueOnce(perm(S.NOT_DETERMINED)).mockResolvedValue(perm(S.AUTHORIZED));
    await fireEvent.press(screen.getByText(A.accept));
    await act(async () => {});
    expect(mockApi.updateAccount).toHaveBeenCalledWith({ pushConsent: true, todaySkyPush: true, todaySkyTime: '21:05' });
  });

  it.each([
    ['이미 물었음', async () => AsyncStorage.setItem(PUSH_ASK_KEY, '1')],
    ['휴대폰에서 이미 허용', async () => N.getPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED))],
    ['휴대폰에서 이미 거절', async () => N.getPermissionsAsync.mockResolvedValue(perm(S.DENIED))],
  ])('%s 이면 띄우지 않는다', async (_, given) => {
    await given();
    await shown();
    expect(screen.queryByText(A.title)).toBeNull();
  });
});
