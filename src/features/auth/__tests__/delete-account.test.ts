import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import { clearDeviceData, deleteAccount } from '@/features/auth/delete-account';
import { clearResume } from '@/features/auth/signup-resume';
import { clearSession } from '@/features/auth/use-session';
import { setAccountLocal, useStoredAccount } from '@/lib/account-store';
import { api, type MyAccount } from '@/lib/api';
import { getStored, peekStored, setMemoryOnly, setStored } from '@/lib/device-memory';

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

describe('기기를 지우면 이번 실행의 메모리도(개인정보 경계 — 다음 사람의 첫 그림에 앞사람 것이 없게)', () => {
  const A: MyAccount = { nickname: '앞사람', avatar: 3, email: 'a@x.com', provider: 'KAKAO', marketingConsent: false, suspended: false };

  it('메모리 층(출생 정보 · 메모리에만 둔 것)과 계정 기억이 모두 빈다', async () => {
    await setStored('byeolmyeong.birth.v1', JSON.stringify({ profile: { date: '1990-01-01' } }));
    setMemoryOnly('byeolmyeong.notifications.memory', '[]');
    await setAccountLocal(A);
    expect(peekStored('byeolmyeong.birth.v1')).toContain('1990-01-01');

    await clearDeviceData();

    expect(peekStored('byeolmyeong.birth.v1')).toBeUndefined();
    expect(peekStored('byeolmyeong.notifications.memory')).toBeUndefined();
    const { result } = await renderHook(() => useStoredAccount());
    await act(async () => {});
    expect(result.current).toBeUndefined();
    expect(await AsyncStorage.getItem('byeolmyeong.account.v1')).toBeNull();
  });

  it('지우는 도중 시작한 읽기가 끝나도 앞사람 값을 메모리에 다시 두지 않는다(#96 리뷰 R3)', async () => {
    await setStored('byeolmyeong.birth.v1', '앞사람 출생');
    const clearing = clearDeviceData();
    const reading = getStored('byeolmyeong.birth.v1');
    await clearing;
    await reading;
    expect(await AsyncStorage.getItem('byeolmyeong.birth.v1')).toBeNull();
    expect(peekStored('byeolmyeong.birth.v1')).toBeUndefined();
  });

  it('기기 저장소가 실패해도 메모리 층과 계정 기억은 먼저 빈다(새 세션 · 만료는 실패를 삼키고 로그인을 막지 않는다)', async () => {
    await setStored('byeolmyeong.birth.v1', '앞사람 출생');
    await setAccountLocal(A);
    (AsyncStorage.getAllKeys as jest.Mock).mockRejectedValueOnce(new Error('io'));
    await expect(clearDeviceData()).rejects.toThrow('io');
    expect(peekStored('byeolmyeong.birth.v1')).toBeUndefined();
    const { result } = await renderHook(() => useStoredAccount());
    expect(result.current).toBeUndefined();
  });

  it('지우기를 시작하면 곧바로(기기를 다 지우기 전에도) 메모리로는 앞사람 값을 그리지 않는다', async () => {
    await setStored('byeolmyeong.birth.v1', '앞사람 출생');
    const clearing = clearDeviceData();
    expect(peekStored('byeolmyeong.birth.v1')).toBeUndefined();
    await clearing;
  });
});
