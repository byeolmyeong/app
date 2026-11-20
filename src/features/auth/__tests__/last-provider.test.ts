import AsyncStorage from '@react-native-async-storage/async-storage';

import { deleteAccount } from '@/features/auth/delete-account';
import { LAST_PROVIDER_KEY, getLastProvider, setLastProvider } from '@/features/auth/last-provider';
import { signOut } from '@/features/auth/sign-out';
import { api } from '@/lib/api';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/auth/use-session', () => ({ signOutSession: jest.fn(async () => {}), clearSession: jest.fn(async () => {}) }));
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), api: { deleteAccount: jest.fn(async () => ({ ok: true, data: null })) } }));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

// 최근 로그인(결정 044): 공급자 이름만 이 기기에 둔다. 사람이 아니라 기기에 붙는 값이라 로그아웃 · 탈퇴가 지우지 않는다
describe('마지막에 쓴 공급자', () => {
  it('처음에는 없고, 적으면 그 공급자 이름만 기기 저장소(byeolmyeong-device.)에 남는다', async () => {
    expect(await getLastProvider()).toBeNull();
    await setLastProvider('KAKAO');
    expect(await getLastProvider()).toBe('KAKAO');
    expect(LAST_PROVIDER_KEY).toBe('byeolmyeong-device.lastProvider.v1');
    expect(await AsyncStorage.getItem(LAST_PROVIDER_KEY)).toBe('KAKAO');
    await setLastProvider('GOOGLE');
    expect(await getLastProvider()).toBe('GOOGLE');
  });

  it('로그아웃해도, 계정을 지워도 남는다', async () => {
    await setLastProvider('APPLE');
    await AsyncStorage.setItem('byeolmyeong.birth.v1', '{}');
    await signOut();
    expect(await AsyncStorage.getItem('byeolmyeong.birth.v1')).toBeNull();
    expect(await getLastProvider()).toBe('APPLE');

    await AsyncStorage.setItem('byeolmyeong.birth.v1', '{}');
    expect((await deleteAccount()).ok).toBe(true);
    expect(api.deleteAccount).toHaveBeenCalledTimes(1);
    expect(await AsyncStorage.getItem('byeolmyeong.birth.v1')).toBeNull();
    expect(await getLastProvider()).toBe('APPLE');
  });

  it('모르는 값이 있거나 저장소를 읽지 못하면 없음, 적지 못해도 오류를 내지 않는다', async () => {
    await AsyncStorage.setItem(LAST_PROVIDER_KEY, 'NAVER');
    expect(await getLastProvider()).toBeNull();
    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('storage'));
    expect(await getLastProvider()).toBeNull();
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('storage'));
    await expect(setLastProvider('KAKAO')).resolves.toBeUndefined();
  });
});
