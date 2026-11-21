import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';

import {
  ACCOUNT_STORAGE_KEY,
  ensureAccount,
  forgetAccount,
  refreshAccount,
  resetAccountStoreForTest,
  setAccountLocal,
  useStoredAccount,
} from '@/lib/account-store';
import { api, type MyAccount } from '@/lib/api';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), api: { getMyAccount: jest.fn() } }));

const mockApi = api as jest.Mocked<typeof api>;
const me: MyAccount = { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false };
const stored = async () => JSON.parse((await AsyncStorage.getItem(ACCOUNT_STORAGE_KEY)) ?? 'null');

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  resetAccountStoreForTest();
  mockApi.getMyAccount.mockResolvedValue({ ok: true, data: me });
});

describe('계정 보관 · 메모리(소유자 "이름이랑 프로필이 늦게 와")', () => {
  it('받은 계정을 기기에 두고, 다음 실행(메모리가 빈 때)에는 서버 답 전에 기기의 것을 바로', async () => {
    await refreshAccount();
    expect(await stored()).toMatchObject({ account: me });
    resetAccountStoreForTest();
    mockApi.getMyAccount.mockReturnValue(new Promise(() => {}));
    const { result } = await renderHook(() => useStoredAccount());
    await act(async () => {});
    expect(result.current).toEqual(me);
  });

  it('한 번 받았으면 다시 붙은 화면은 첫 그림부터 메모리의 계정(기기를 읽기 전에도)', async () => {
    await refreshAccount();
    const { result } = await renderHook(() => useStoredAccount());
    expect(result.current).toEqual(me);
  });

  it('여러 곳이 함께 물어도 /account 는 한 번(정지 문 · 홈 · 마이)', async () => {
    await Promise.all([refreshAccount(), refreshAccount(), refreshAccount()]);
    expect(mockApi.getMyAccount).toHaveBeenCalledTimes(1);
  });

  it('못 받으면 보관본 그대로, 바꾼 것(PATCH 응답)은 곧바로 메모리 · 기기에', async () => {
    await refreshAccount();
    mockApi.getMyAccount.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await refreshAccount();
    const { result } = await renderHook(() => useStoredAccount());
    expect(result.current).toEqual(me);
    await act(async () => setAccountLocal({ ...me, nickname: '노을' }));
    expect(result.current?.nickname).toBe('노을');
    expect((await stored()).account.nickname).toBe('노을');
  });

  it('로그인할 때(다른 계정일 수 있다) · 기기를 지울 때 잊는다 — 앞사람 이름이 보이지 않게', async () => {
    await refreshAccount();
    const { result } = await renderHook(() => useStoredAccount());
    await act(async () => forgetAccount());
    expect(result.current).toBeUndefined();
    expect(await stored()).toBeNull();
  });

  it('받는 사이 기기를 지웠으면(로그아웃) 늦은 답을 두지 않는다(세대 표식)', async () => {
    let answer: (v: Awaited<ReturnType<typeof api.getMyAccount>>) => void = () => {};
    mockApi.getMyAccount.mockReturnValueOnce(new Promise((r) => (answer = r)));
    const pending = refreshAccount();
    await act(async () => {});
    await act(async () => forgetAccount());
    await act(async () => {
      answer({ ok: true, data: me });
      await pending;
    });
    expect(await stored()).toBeNull();
    const { result } = await renderHook(() => useStoredAccount());
    expect(result.current).toBeUndefined();
  });

  it('처음(기기에도 없음)은 모름(자리표) — 받지 못하면 null(이름 줄 · 그림 없이), 이번 로그인에서 다시 붙은 화면은 또 묻지 않는다', async () => {
    mockApi.getMyAccount.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const { result } = await renderHook(() => useStoredAccount());
    expect(result.current).toBeUndefined();
    await act(async () => {
      await refreshAccount();
    });
    expect(result.current).toBeNull();
    await act(async () => {
      await refreshAccount();
    });
    expect(result.current).toEqual(me);
    expect(ensureAccount()).toBeNull();
    expect(mockApi.getMyAccount).toHaveBeenCalledTimes(2);
  });
});
