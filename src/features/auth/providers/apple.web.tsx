/**
 * 웹의 애플 로그인: Apple JS 팝업(결정 034). ID 토큰과 authorization code(서버가 탈퇴 때 철회용으로 바꾼다)를 받는다.
 * 버튼은 Apple JS 버튼 모양을 공급자 버튼 규칙(`SocialButton`, 결정 042)으로 직접 그린다.
 * 이메일만 묻는다(`scope: 'email'`, 결정 039) — 서버가 ID 토큰에서 읽는다.
 * Services ID(`EXPO_PUBLIC_APPLE_SERVICES_ID`)가 없거나 https 가 아니면 그리지 않는다(애플은 localhost 를 받지 않는다).
 * 웹 정적 출력은 화면을 브라우저 밖에서 미리 그린다(window 가 없다) — 그때와 하이드레이션 첫 그림은 주소를 '' 로 보고 그리지 않는다.
 */
import { useState, useSyncExternalStore } from 'react';

import { strings } from '@/content/strings';
import { SocialButton } from '@/features/auth/providers/social-button';
import type { LoginButtonProps } from '@/features/auth/providers/types';
import { APPLE_RETURN_PATH, appleWebAvailable, webOrigin } from '@/features/auth/providers/web-redirect';
import { loadScript } from '@/features/auth/providers/load-script';

const APPLE_SCRIPT = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/ko_KR/appleid.auth.js';

type AppleAuth = {
  init(options: { clientId: string; scope: string; redirectURI: string; usePopup: boolean }): void;
  signIn(): Promise<{ authorization?: { id_token?: string; code?: string } }>;
};

const appleAuth = () => (window as unknown as { AppleID?: { auth?: AppleAuth } }).AppleID?.auth;

const neverChanges = () => () => {};
const browserProtocol = () => (typeof window !== 'undefined' && window.location ? window.location.protocol : '');
const noProtocol = () => '';

export function AppleLoginButton({ onCredential, onError, disabled }: LoginButtonProps) {
  const servicesId = process.env.EXPO_PUBLIC_APPLE_SERVICES_ID?.trim();
  const [busy, setBusy] = useState(false);
  const protocol = useSyncExternalStore(neverChanges, browserProtocol, noProtocol);
  if (!servicesId || !appleWebAvailable(servicesId, protocol)) return null;

  async function press() {
    setBusy(true);
    try {
      await loadScript(APPLE_SCRIPT);
      const auth = appleAuth();
      if (!auth || !servicesId) throw new Error('apple');
      const redirectUri = webOrigin() + APPLE_RETURN_PATH;
      auth.init({ clientId: servicesId, scope: 'email', redirectURI: redirectUri, usePopup: true });
      const { authorization } = await auth.signIn();
      if (!authorization?.id_token) throw new Error('apple');
      onCredential({ provider: 'APPLE', idToken: authorization.id_token, authorizationCode: authorization.code, redirectUri });
    } catch (e) {
      // 사용자가 팝업을 닫으면 { error: 'popup_closed_by_user' } 가 온다. 오류로 알리지 않는다.
      const closed = typeof e === 'object' && e !== null && (e as { error?: unknown }).error === 'popup_closed_by_user';
      if (!closed) onError();
    } finally {
      setBusy(false);
    }
  }

  return <SocialButton provider="APPLE" label={strings.login.apple} onPress={() => void press()} disabled={disabled || busy} />;
}
