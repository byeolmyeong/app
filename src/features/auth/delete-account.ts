/**
 * 계정 삭제. 서버가 지운 뒤에만 이 앱이 기기에 둔 것(출생 정보 · 차트 · 받은 글)을 비운다.
 * 서버가 지우지 못했으면 기기의 것은 건드리지 않는다. 지운 값과 토큰은 로그에 남기지 않는다.
 * 세션(토큰)은 "계정을 지웠어요"(보드 16-10)의 확인을 누를 때 화면이 `clearSession` 으로 비운다 — 여기서 비우면 루트 가드가 그 화면을
 * 곧바로 로그인으로 바꾼다. 그 사이 서버의 세션은 이미 없어서 무엇을 불러도 401 이다.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearResume } from '@/features/auth/signup-resume';
import { forgetAccount } from '@/lib/account-store';
import { api, type ApiResult } from '@/lib/api';

/**
 * 이 앱이 기기 저장소에 두는 사람의 키의 머리. 기능마다 `byeolmyeong.<이름>.v<판>` 으로 둔다.
 * 예외: 사람이 아니라 기기에 붙는 값(소개를 봤는지)은 `byeolmyeong-device.` 로 지어 여기서 지우지 않는다(결정 042).
 */
export const DEVICE_STORAGE_PREFIX = 'byeolmyeong.';

/** 이 앱이 기기에 둔 사람의 것(출생 정보 · 차트 · 받은 글)을 모두 지운다. 기기에 붙는 값(`byeolmyeong-device.`)은 남긴다. 계정 삭제 · 로그아웃(`sign-out.ts`) · 출생 정보 바꾸기(`/my/birth` — 옛 출생 정보로 만든 보관을 지우고 새 것만 둔다)가 쓴다. 그래서 출생 정보와 상관없이 남아야 할 사람 값은 이 머리에 두지 않는다 */
export async function clearDeviceData(): Promise<void> {
  // 키를 하나씩 적지 않고 머리로 찾아 지운다. 기능이 새 키를 더해도 빠지지 않는다.
  const keys = await AsyncStorage.getAllKeys();
  await AsyncStorage.multiRemove(keys.filter((key) => key.startsWith(DEVICE_STORAGE_PREFIX)));
  // 이번 실행의 메모리에 둔 계정도 잊는다(다음 사람 · 바뀐 출생 정보의 화면에 앞의 것이 비치지 않게)
  await forgetAccount();
  // 가입 이어 하기의 보관(보안 저장소 · sessionStorage, 결정 068)은 이 머리 밖이라 따로 지운다
  await clearResume();
}

export async function deleteAccount(): Promise<ApiResult<null>> {
  const r = await api.deleteAccount();
  if (!r.ok) return r;
  await clearDeviceData();
  return r;
}
