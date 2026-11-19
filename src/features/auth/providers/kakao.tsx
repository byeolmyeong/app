/**
 * 앱(iOS · Android)의 카카오 로그인: 카카오 네이티브 SDK(`@react-native-seoul/kakao-login`, 결정 034). 웹은 `kakao.web.tsx`.
 * 카카오톡이 있으면 카카오톡으로, 없으면 카카오계정으로 로그인한다. ID 토큰은 카카오 콘솔에서 OpenID Connect 를 켜야 온다.
 * 네이티브 앱 키(`EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY`)가 없으면 그리지 않는다.
 */
import { login } from '@react-native-seoul/kakao-login';
import { useState } from 'react';

import { Button } from '@/components/button';
import { strings } from '@/content/strings';
import type { LoginButtonProps } from '@/features/auth/providers/types';

/** 라이브러리는 모든 실패를 같은 코드로 준다. 사용자가 닫은 것은 메시지로만 가린다 */
const isCancel = (e: unknown) => e instanceof Error && /cancel/i.test(e.message);

export function KakaoLoginButton({ onCredential, onError, disabled }: LoginButtonProps) {
  const nativeAppKey = process.env.EXPO_PUBLIC_KAKAO_NATIVE_APP_KEY?.trim();
  const [busy, setBusy] = useState(false);
  if (!nativeAppKey) return null;

  async function press() {
    setBusy(true);
    try {
      const token = await login();
      if (token.idToken) onCredential({ provider: 'KAKAO', idToken: token.idToken });
      else onError();
    } catch (e) {
      if (!isCancel(e)) onError();
    } finally {
      setBusy(false);
    }
  }

  return <Button label={strings.login.kakao} variant="line" onPress={() => void press()} disabled={disabled || busy} />;
}
