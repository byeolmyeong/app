/**
 * iOS 의 애플 로그인: `expo-apple-authentication`(결정 034). 버튼은 시스템 버튼 대신 공급자 버튼 모양(`SocialButton`)으로 직접 그린다 —
 * 세 공급자의 글자를 16px 로 맞추려고(결정 042, HIG 의 "높이의 43%" 만 소유자 예외). 누르면 `signInAsync` 를 부른다.
 * 이메일만 묻는다(이름은 묻지 않는다, 결정 039). 이메일은 서버가 ID 토큰에서 읽는다 — 앱이 따로 보내지 않는다. authorization code 는 서버가 탈퇴 때 철회용으로 바꾼다.
 * 이 기기에서 쓸 수 없으면 그리지 않는다. 사용자가 닫은 것(`ERR_REQUEST_CANCELED`)은 오류가 아니다.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';

import { strings } from '@/content/strings';
import { SocialButton } from '@/features/auth/providers/social-button';
import type { LoginButtonProps } from '@/features/auth/providers/types';

export function AppleLoginButton({ onCredential, onError, disabled, loading, recent }: LoginButtonProps) {
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);
  if (!available) return null;

  async function press() {
    setBusy(true);
    try {
      const credential = await AppleAuthentication.signInAsync({ requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL] });
      if (!credential.identityToken) return onError();
      onCredential({
        provider: 'APPLE',
        idToken: credential.identityToken,
        ...(credential.authorizationCode ? { authorizationCode: credential.authorizationCode } : {}),
      });
    } catch (e) {
      const canceled = typeof e === 'object' && e !== null && (e as { code?: unknown }).code === 'ERR_REQUEST_CANCELED';
      if (!canceled) onError();
    } finally {
      setBusy(false);
    }
  }

  return <SocialButton provider="APPLE" label={strings.login.apple} onPress={() => void press()} disabled={disabled || busy} loading={loading} recent={recent} />;
}
