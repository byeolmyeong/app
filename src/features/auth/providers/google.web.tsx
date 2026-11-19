/**
 * 웹의 구글 로그인: 구글 공식 웹 버튼(Google Identity Services, 결정 034). 버튼은 구글이 그린다(구글 브랜드 규칙).
 * 누르면 구글이 ID 토큰(credential)을 콜백으로 준다. 클라이언트 ID(`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)가 없으면 그리지 않는다.
 */
import { useEffect, useEffectEvent, useRef, type ComponentRef } from 'react';
import { View } from 'react-native';

import type { LoginButtonProps } from '@/features/auth/providers/types';
import { loadScript } from '@/features/auth/providers/load-script';

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
const BUTTON_WIDTH = 320;

type GoogleIdentity = {
  initialize(options: { client_id: string; callback: (response: { credential?: string }) => void }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
};

const googleIdentity = () => (window as unknown as { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id;

export function GoogleLoginButton({ onCredential, onError }: LoginButtonProps) {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const container = useRef<ComponentRef<typeof View>>(null);
  // 구글 콜백은 처음 한 번만 등록되므로 언제나 마지막에 받은 함수를 부른다.
  const credentialed = useEffectEvent((credential: string | undefined) =>
    credential ? onCredential({ provider: 'GOOGLE', idToken: credential }) : onError(),
  );
  const failed = useEffectEvent(() => onError());

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadScript(GIS_SCRIPT)
      .then(() => {
        const id = googleIdentity();
        // 웹에서 View 는 DOM 요소다.
        const parent = container.current as unknown as HTMLElement | null;
        if (cancelled || !id || !parent) return;
        id.initialize({
          client_id: clientId,
          callback: ({ credential }) => credentialed(credential),
        });
        id.renderButton(parent, { type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'rectangular', width: BUTTON_WIDTH, locale: 'ko' });
      })
      .catch(() => {
        if (!cancelled) failed();
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;
  return <View ref={container} style={{ minHeight: 44, alignItems: 'center' }} />;
}
