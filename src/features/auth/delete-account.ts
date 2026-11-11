/**
 * 계정 삭제. 서버가 지운 뒤에만 이 앱이 기기에 둔 것(출생 정보 · 차트 · 받은 글 · 세션 토큰)을 비운다.
 * 서버가 지우지 못했으면 기기의 것은 건드리지 않는다. 지운 값과 토큰은 로그에 남기지 않는다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearSession } from '@/features/auth/use-session';
import { api, type ApiResult } from '@/lib/api';

/** 이 앱이 기기 저장소에 두는 모든 키의 머리. 기능마다 `byeolmyeong.<이름>.v<판>` 으로 둔다 */
export const DEVICE_STORAGE_PREFIX = 'byeolmyeong.';

export async function deleteAccount(): Promise<ApiResult<null>> {
  const r = await api.deleteAccount();
  if (!r.ok) return r;
  // 키를 하나씩 적지 않고 머리로 찾아 지운다. 기능이 새 키를 더해도 빠지지 않는다.
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(DEVICE_STORAGE_PREFIX)));
  await clearSession();
  return r;
}
