import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { loadToken, saveToken } from '@/features/auth/token-storage';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => {
  const kept = new Map<string, string>();
  return {
    getItemAsync: jest.fn(async (key: string) => kept.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      kept.set(key, value);
    }),
  };
});

const mockStore = SecureStore as jest.Mocked<typeof SecureStore>;
const originalOS = Platform.OS;

afterEach(() => {
  Platform.OS = originalOS;
  jest.clearAllMocks();
});

describe('세션 토큰 보관', () => {
  it('기기에서는 보안 저장소에만 두고 일반 저장소에는 아무것도 쓰지 않는다', async () => {
    await saveToken('dev-token');
    expect(mockStore.setItemAsync).toHaveBeenCalledTimes(1);
    expect(await loadToken()).toBe('dev-token');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('웹에서는 어디에도 두지 않는다(메모리에만 있고 새로 열면 다시 받는다)', async () => {
    Platform.OS = 'web';
    await saveToken('web-token');
    expect(await loadToken()).toBeNull();
    expect(mockStore.setItemAsync).not.toHaveBeenCalled();
    expect(mockStore.getItemAsync).not.toHaveBeenCalled();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('보안 저장소가 실패해도 던지지 않는다', async () => {
    mockStore.getItemAsync.mockRejectedValueOnce(new Error('unavailable'));
    expect(await loadToken()).toBeNull();
    mockStore.setItemAsync.mockRejectedValueOnce(new Error('unavailable'));
    await expect(saveToken('x')).resolves.toBeUndefined();
  });
});
