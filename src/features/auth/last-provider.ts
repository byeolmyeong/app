/**
 * 이 기기에서 마지막에 로그인한 공급자(결정 044). 로그인 화면이 그 버튼에 "최근 로그인" 배지를 얹는다.
 * 공급자 이름(`KAKAO` · `APPLE` · `GOOGLE`)만 둔다 — 이메일 · 닉네임 · 식별자 같은 계정 정보는 두지 않는다.
 * 사람이 아니라 기기에 붙는 값이라 로그아웃 · 탈퇴가 지우는 머리(`byeolmyeong.`)를 피한 키를 쓴다(소개를 봤는지와 같은 규칙, 결정 042).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ProviderCredential } from '@/lib/api';

export type LoginProvider = ProviderCredential['provider'];

/** 로그아웃 · 탈퇴의 `clearDeviceData` 가 지우지 않게 `byeolmyeong.` 으로 시작하지 않는다 */
export const LAST_PROVIDER_KEY = 'byeolmyeong-device.lastProvider.v1';

const PROVIDERS: readonly string[] = ['KAKAO', 'APPLE', 'GOOGLE'] satisfies LoginProvider[];
const isProvider = (v: string | null): v is LoginProvider => v !== null && PROVIDERS.includes(v);

/** 마지막에 쓴 공급자. 없거나 모르는 값이거나 저장소를 읽지 못하면 null(배지를 두지 않는다) */
export async function getLastProvider(): Promise<LoginProvider | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_PROVIDER_KEY);
    return isProvider(value) ? value : null;
  } catch {
    return null;
  }
}

/** 로그인에 성공했을 때(처음 온 사람은 가입을 마쳤을 때) 세션이 부른다. 적지 못해도 로그인은 막지 않는다 */
export async function setLastProvider(provider: LoginProvider): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_PROVIDER_KEY, provider);
  } catch {
    // 다음 로그인 화면에 배지가 없을 뿐이다.
  }
}
