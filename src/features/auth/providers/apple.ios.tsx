/**
 * iOS 의 애플 로그인: `expo-apple-authentication`(결정 034). 버튼은 애플의 공식 버튼이다(심사 지침 · HIG).
 * 이메일만 묻는다(이름은 묻지 않는다, 결정 039). 이메일은 서버가 ID 토큰에서 읽는다 — 앱이 따로 보내지 않는다. authorization code 는 서버가 탈퇴 때 철회용으로 바꾼다.
 * 이 기기에서 쓸 수 없으면 그리지 않는다. 사용자가 닫은 것(`ERR_REQUEST_CANCELED`)은 오류가 아니다.
 */
import * as AppleAuthentication from 'expo-apple-authentication';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import { Radius, Sizes } from '@/constants/theme';
import type { LoginButtonProps } from '@/features/auth/providers/types';

export function AppleLoginButton({ onCredential, onError, disabled }: LoginButtonProps) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => setAvailable(false));
  }, []);
  if (!available) return null;

  async function press() {
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
    }
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={Radius}
      style={[styles.button, disabled && styles.disabled]}
      pointerEvents={disabled ? 'none' : 'auto'}
      onPress={() => void press()}
    />
  );
}

const styles = StyleSheet.create({
  button: { height: Sizes.buttonHeight, width: '100%' },
  disabled: { opacity: 0.4 },
});
