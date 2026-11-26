/**
 * 웹의 구글 로그인(결정 070): 다른 공급자와 같은 우리 버튼(`SocialButton`, 시안 5 — "Google로 로그인")을 누르면 구글 OpenID Connect 인가 주소로 이동하고,
 * 구글이 ID 토큰을 `/auth/google` 의 주소 조각으로 돌려준다 — 그 화면이 state · nonce 를 확인해 서버에 보낸다(서버 계약 `POST /auth/login` 의 구글 ID 토큰은 그대로).
 * 클라이언트 ID(`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)가 없으면 그리지 않는다.
 */
import { strings } from '@/content/strings';
import { SocialButton } from '@/features/auth/providers/social-button';
import type { LoginButtonProps } from '@/features/auth/providers/types';
import { GOOGLE_RETURN_PATH, googleAuthorizeUrl, newGoogleRequest, webOrigin } from '@/features/auth/providers/web-redirect';

export function GoogleLoginButton({ disabled, loading, recent }: LoginButtonProps) {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  if (!clientId) return null;
  const press = () => window.location.assign(googleAuthorizeUrl(clientId, webOrigin() + GOOGLE_RETURN_PATH, newGoogleRequest()));
  return <SocialButton provider="GOOGLE" label={strings.login.google} onPress={press} disabled={disabled} loading={loading} recent={recent} />;
}
