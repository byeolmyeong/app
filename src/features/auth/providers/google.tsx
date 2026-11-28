/**
 * 앱(iOS · Android)의 구글 로그인: `@react-native-google-signin/google-signin`(결정 034). 웹은 `google.web.tsx`.
 * 웹 클라이언트 ID 로 설정해야 ID 토큰이 온다(그 토큰의 대상이 서버의 `GOOGLE_CLIENT_IDS`). iOS 는 iOS 클라이언트 ID 도 필요하다.
 * 기본 범위의 ID 토큰에 이메일이 들어 있어 범위를 더하지 않는다(결정 039).
 * 값이 없으면 그리지 않는다. 사용자가 닫은 것은 오류가 아니다.
 * 로그아웃 · 탈퇴 때 SDK 의 로그인도 끊는다(signOutGoogle) — 안드로이드는 끊지 않으면 다음 로그인이 계정 고르기 없이 앞 계정으로 바로 들어간다.
 */
import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import { useState } from 'react';
import { Platform } from 'react-native';

import { strings } from '@/content/strings';
import { SocialButton } from '@/features/auth/providers/social-button';
import type { LoginButtonProps } from '@/features/auth/providers/types';

/** 이 기기의 구글 로그인을 끊는다(로그아웃 · 탈퇴). 이번 실행에 설정하지 않았을 수 있어 설정부터 한다(버튼과 같은 값). 실패는 삼킨다 — 로그아웃 · 탈퇴를 막지 않는다 */
export async function signOutGoogle(): Promise<void> {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.trim();
  if (!webClientId || (Platform.OS === 'ios' && !iosClientId)) return;
  try {
    GoogleSignin.configure({ webClientId, iosClientId });
    await GoogleSignin.signOut();
  } catch {
    // 끊지 못해도 기기의 로그아웃은 그대로
  }
}

export function GoogleLoginButton({ onCredential, onError, disabled, loading, recent }: LoginButtonProps) {
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

  return <SocialButton provider="GOOGLE" label={strings.login.google} onPress={() => void press()} disabled={disabled || busy} loading={loading} recent={recent} />;
}
