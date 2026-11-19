/**
 * 앱(iOS · Android)의 구글 로그인: `@react-native-google-signin/google-signin`(결정 034). 웹은 `google.web.tsx`.
 * 웹 클라이언트 ID 로 설정해야 ID 토큰이 온다(그 토큰의 대상이 서버의 `GOOGLE_CLIENT_IDS`). iOS 는 iOS 클라이언트 ID 도 필요하다.
 * 값이 없으면 그리지 않는다. 사용자가 닫은 것은 오류가 아니다.
 */
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { useState } from 'react';
import { Platform } from 'react-native';

import { Button } from '@/components/button';
import { strings } from '@/content/strings';
import type { LoginButtonProps } from '@/features/auth/providers/types';

export function GoogleLoginButton({ onCredential, onError, disabled }: LoginButtonProps) {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  const [busy, setBusy] = useState(false);
  if (!webClientId || (Platform.OS === 'ios' && !iosClientId)) return null;

  async function press() {
    setBusy(true);
    try {
      GoogleSignin.configure({ webClientId, iosClientId });
      if (Platform.OS === 'android') await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (!isSuccessResponse(response)) return; // 사용자가 닫았다
      const idToken = response.data.idToken;
      if (idToken) onCredential({ provider: 'GOOGLE', idToken });
      else onError();
    } catch (e) {
      if (!(isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED)) onError();
    } finally {
      setBusy(false);
    }
  }

  return <Button label={strings.login.google} variant="line" onPress={() => void press()} disabled={disabled || busy} />;
}
