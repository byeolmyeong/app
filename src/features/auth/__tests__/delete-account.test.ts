import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearDeviceData, deleteAccount } from '@/features/auth/delete-account';
import { clearResume } from '@/features/auth/signup-resume';
import { clearSession } from '@/features/auth/use-session';
import { api } from '@/lib/api';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { deleteAccount: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({ clearSession: jest.fn(async () => {}) }));
jest.mock('@/features/auth/signup-resume', () => ({ clearResume: jest.fn(async () => {}) }));

const mockApi = api as jest.Mocked<typeof api>;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  await AsyncStorage.multiSet([
    ['byeolmyeong.birth.v1', '{}'],
    ['byeolmyeong.reading.v1', '{}'],
    ['other-app.key', 'keep'],
  ]);
});

describe('계정 삭제', () => {
  it('서버가 지우면 이 앱이 기기에 둔 것을 비운다. 세션은 "계정을 지웠어요" 의 확인 때 비우니 여기서는 둔다(보드 16-10)', async () => {
    mockApi.deleteAccount.mockResolvedValue({ ok: true, data: null });
    expect(await deleteAccount()).toEqual({ ok: true, data: null });
    expect(mockApi.deleteAccount).toHaveBeenCalledTimes(1);
    // 이 앱의 키(byeolmyeong.)만 지운다
    expect(await AsyncStorage.getAllKeys()).toEqual(['other-app.key']);
    // 세션을 바로 비우면 루트 가드가 지웠어요 화면을 로그인으로 바꿔 버린다
    expect(clearSession).not.toHaveBeenCalled();
  });

  it('서버가 지우지 못하면 기기의 것은 그대로 두고 실패를 돌려준다', async () => {
    mockApi.deleteAccount.mockResolvedValue({ ok: false, error: 'NETWORK' });
    expect(await deleteAccount()).toEqual({ ok: false, error: 'NETWORK' });
    expect((await AsyncStorage.getAllKeys()).length).toBe(3);
    expect(clearSession).not.toHaveBeenCalled();
  });
});

// 결정 068: 가입 이어 하기 보관(보안 저장소 · sessionStorage)은 기기 저장소의 머리 밖이라 따로 지운다(로그아웃 · 계정 삭제)
describe('기기 비우기', () => {
  it('이어 하던 가입의 보관도 지운다', async () => {
    await clearDeviceData();
    expect(clearResume).toHaveBeenCalledTimes(1);
  });
});
