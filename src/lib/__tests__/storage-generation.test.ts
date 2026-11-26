import AsyncStorage from '@react-native-async-storage/async-storage';

import { isSameGeneration, storageGeneration } from '@/lib/storage-generation';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

// 기기 보관의 세대 표식: 요청을 시작할 때 읽고 끝났을 때 같을 때만 둔다 — 그 사이 로그아웃 · 탈퇴로 기기를 지웠으면 앞사람의 것을 다시 쓰지 않는다
describe('storageGeneration · isSameGeneration', () => {
  const KEY = 'byeolmyeong.testGen.v1';
  beforeEach(() => AsyncStorage.clear());

  it('없으면 만들어 두고, 있으면 그것을 준다', async () => {
    const gen = await storageGeneration(KEY);
    expect(gen).toMatch(/\S+/);
    expect(await AsyncStorage.getItem(KEY)).toBe(gen);
    expect(await storageGeneration(KEY)).toBe(gen);
    expect(await isSameGeneration(KEY, gen)).toBe(true);
  });

  it('처음 동시에 불러도 같은 세대를 쓴다', async () => {
    const [a, b] = await Promise.all([storageGeneration(KEY), storageGeneration(KEY)]);
    expect(a).toBe(b);
  });

  it('기기를 지운 뒤(표식도 지워진다)에는 앞 세대와 같지 않고, 새로 만든 세대는 다르다', async () => {
    const old = await storageGeneration(KEY);
    await AsyncStorage.removeItem(KEY);
    expect(await isSameGeneration(KEY, old)).toBe(false);
    const next = await storageGeneration(KEY);
    expect(next).not.toBe(old);
    expect(await isSameGeneration(KEY, old)).toBe(false);
  });
});
