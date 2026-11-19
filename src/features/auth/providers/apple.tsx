/**
 * 안드로이드에는 애플 로그인을 두지 않는다(결정 034 — 심사 지침 4.8 은 iOS 앱에만 걸린다).
 * iOS 는 `apple.ios.tsx`, 웹은 `apple.web.tsx` 가 같은 이름으로 그린다.
 */
import type { LoginButtonProps } from '@/features/auth/providers/types';

export function AppleLoginButton(_props: LoginButtonProps) {
  return null;
}
