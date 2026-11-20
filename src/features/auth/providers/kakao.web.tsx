/**
 * 웹의 카카오 로그인: 카카오 인가 주소로 이동하고 `/auth/kakao` 로 돌아온 코드를 서버가 ID 토큰으로 바꾼다(결정 034).
 * REST API 키(`EXPO_PUBLIC_KAKAO_REST_API_KEY`)가 없으면 그리지 않는다. 자격 증명은 돌아오는 화면이 서버에 보낸다.
 */
import { strings } from '@/content/strings';
import { SocialButton } from '@/features/auth/providers/social-button';
import type { LoginButtonProps } from '@/features/auth/providers/types';
import { KAKAO_RETURN_PATH, kakaoAuthorizeUrl, newKakaoState, webOrigin } from '@/features/auth/providers/web-redirect';

export function KakaoLoginButton({ disabled, loading, recent }: LoginButtonProps) {
  const restApiKey = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY?.trim();
  if (!restApiKey) return null;
  const press = () => window.location.assign(kakaoAuthorizeUrl(restApiKey, webOrigin() + KAKAO_RETURN_PATH, newKakaoState()));
  return <SocialButton provider="KAKAO" label={strings.login.kakao} onPress={press} disabled={disabled} loading={loading} recent={recent} />;
}
