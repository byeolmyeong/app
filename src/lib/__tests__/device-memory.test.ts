import AsyncStorage from '@react-native-async-storage/async-storage';

import { forgetMemory, getStored, peekStored, setMemoryOnly, setStored } from '@/lib/device-memory';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const KEY = 'byeolmyeong.birth.v1';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('이번 실행 메모리(lib/device-memory)', () => {
  it('읽기 전에는 모름(undefined), 기기에서 읽으면 그 값(없으면 null)을 메모리에', async () => {
    expect(peekStored(KEY)).toBeUndefined();
    expect(await getStored(KEY)).toBeNull();
    expect(peekStored(KEY)).toBeNull();
    await AsyncStorage.setItem(KEY, 'a');
    expect(await getStored(KEY)).toBe('a');
    expect(peekStored(KEY)).toBe('a');
  });

  it('setStored 는 메모리와 기기에, setMemoryOnly 는 메모리에만', async () => {
    await setStored(KEY, 'b');
    expect(peekStored(KEY)).toBe('b');
    expect(await AsyncStorage.getItem(KEY)).toBe('b');
    setMemoryOnly('byeolmyeong.notifications.memory', '[]');
    expect(peekStored('byeolmyeong.notifications.memory')).toBe('[]');
    expect(await AsyncStorage.getItem('byeolmyeong.notifications.memory')).toBeNull();
  });

  it('기기를 못 읽으면 메모리의 값(없으면 null)', async () => {
    setMemoryOnly(KEY, 'm');
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('io'));
    expect(await getStored(KEY)).toBe('m');
  });

  it('forgetMemory 는 모두 비운다', async () => {
    await setStored(KEY, 'c');
    setMemoryOnly('byeolmyeong.notifications.memory', '[]');
    forgetMemory();
    expect(peekStored(KEY)).toBeUndefined();
    expect(peekStored('byeolmyeong.notifications.memory')).toBeUndefined();
  });

  it('비우기 전에 시작한 읽기가 비운 뒤에 끝나면 메모리에 두지 않는다(앞사람 값이 돌아오지 않게) — 읽은 값은 그대로 돌려준다', async () => {
    let answer: (v: string | null) => void = () => {};
    (AsyncStorage.getItem as jest.Mock).mockReturnValueOnce(new Promise<string | null>((r) => (answer = r)));
    const reading = getStored(KEY);
    forgetMemory();
    answer('앞사람');
    expect(await reading).toBe('앞사람');
    expect(peekStored(KEY)).toBeUndefined();
  });
});
