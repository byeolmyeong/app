/**
 * 세션 토큰의 기기 보관. 기기 보안 저장소(expo-secure-store)에만 둔다.
 * 웹에는 보안 저장소가 없으니 어디에도 두지 않는다(메모리에만 있고, 새로 열면 다시 받는다).
 * 토큰은 로그에 남기지 않는다.
 */
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'byeolmyeong.session.v1';

/** 보관된 토큰이 없거나 읽지 못하면 null */
export async function loadToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

/** 보관하지 못해도 던지지 않는다. 그때는 메모리의 토큰으로 쓰고 다음에 열 때 다시 받는다 */
export async function saveToken(token: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // 메모리의 토큰으로 계속 쓴다.
  }
}
