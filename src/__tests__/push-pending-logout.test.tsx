import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import { IosAuthorizationStatus } from 'expo-notifications';

import { setSplashGoneForTest } from '@/components/splash-view';
import { strings } from '@/content/strings';
import { clearDeviceData, DEVICE_STORAGE_PREFIX } from '@/features/auth/delete-account';
import { PUSH_ASK_PENDING_KEY, PushAskSheet } from '@/features/push/push-ask-sheet';
import { api } from '@/lib/api';

jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { extra: { eas: { projectId: 'project-1' } } }, easConfig: null } }));
jest.mock('@/features/update/update-gate', () => ({ useUpdateSuggestion: () => 'none' }));
jest.mock('@/features/auth/signup-resume', () => ({ clearResume: jest.fn(async () => {}) }));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { updateAccount: jest.fn(), registerPushDevice: jest.fn(), deletePushDevice: jest.fn(), getMyAccount: jest.fn() },
}));

const N = Notifications as jest.Mocked<typeof Notifications>;
const mockApi = api as jest.Mocked<typeof api>;
const S = IosAuthorizationStatus;
const perm = (status: number) =>
  ({ granted: status === S.AUTHORIZED, status: status === S.NOT_DETERMINED ? 'undetermined' : 'denied', canAskAgain: true, expires: 'never', ios: { status } }) as never;

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  setSplashGoneForTest(true);
  N.getPermissionsAsync.mockResolvedValue(perm(S.NOT_DETERMINED));
  N.requestPermissionsAsync.mockResolvedValue(perm(S.AUTHORIZED));
  mockApi.registerPushDevice.mockResolvedValue({ ok: true, data: null });
});

// 알림 받기 권유에서 고른 것을 못 보낸 채 로그아웃하고 같은 기기에 다음 사람이 들어온 경우(features/auth/delete-account.ts 의 기기 지우기)
describe('못 보낸 알림 동의와 기기 지우기', () => {
  it('못 보낸 것은 사람의 머리에 둔다 — 로그아웃 뒤 다음 사람의 홈에서 앞사람의 동의를 보내지 않는다', async () => {
    expect(PUSH_ASK_PENDING_KEY.startsWith(DEVICE_STORAGE_PREFIX)).toBe(true);
    mockApi.updateAccount.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const view = await render(<PushAskSheet ready />);
    await act(async () => {});
    await fireEvent.press(screen.getByText(strings.push.ask.accept));
    await act(async () => {});
    expect(await AsyncStorage.getItem(PUSH_ASK_PENDING_KEY)).not.toBeNull();
    await view.unmount();

    await clearDeviceData();
    mockApi.updateAccount.mockClear();
    await render(<PushAskSheet ready />);
    await act(async () => {});
    expect(mockApi.updateAccount).not.toHaveBeenCalled();
  });
});
