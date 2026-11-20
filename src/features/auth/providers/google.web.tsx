/**
 * 웹의 구글 로그인: 구글 공식 웹 버튼(Google Identity Services, 결정 034). 버튼은 구글이 그린다(구글 브랜드 규칙).
 * 시안(결정 042)의 다크 버튼(`filled_black`) · 로고 왼쪽 · 칸 폭에 맞추고, 글자는 "로그인" 쪽 문구(`signin_with`, 결정 044)다. GIS 는 높이(최대 40)와 글자를 바꿀 수 없어
 * 웹에서만 다른 공급자 버튼(48 · 16px)보다 조금 작다(계획 "내 결정").
 * 누르면 구글이 ID 토큰(credential)을 콜백으로 준다. 클라이언트 ID(`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)가 없으면 그리지 않는다.
 * 이 기기에서 마지막에 쓴 공급자면 GIS 버튼을 감싼 칸(구글이 그린 버튼 폭) 위에 "최근 로그인" 배지를 얹는다(결정 044).
 */
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { RecentBadge } from '@/features/auth/providers/social-button';
import type { LoginButtonProps } from '@/features/auth/providers/types';
import { loadScript } from '@/features/auth/providers/load-script';

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
/** GIS 가 받는 버튼 폭의 범위(px). 칸 폭을 이 안으로 맞춘다 */
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;

type GoogleIdentity = {
  initialize(options: { client_id: string; callback: (response: { credential?: string }) => void }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
};

const googleIdentity = () => (window as unknown as { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id;

export function GoogleLoginButton({ onCredential, onError, recent }: LoginButtonProps) {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const container = useRef<ComponentRef<typeof View>>(null);
  /** 구글이 그린 버튼의 폭. 배지를 그 버튼의 오른쪽 위에 맞춘다(칸이 400 보다 넓으면 버튼은 가운데 400) */
  const [buttonWidth, setButtonWidth] = useState<number | null>(null);
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
        const width = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(parent.offsetWidth)));
        id.renderButton(parent, {
          type: 'standard',
          theme: 'filled_black',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width,
          locale: 'ko',
        });
        setButtonWidth(width);
      })
      .catch(() => {
        if (!cancelled) failed();
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  if (!clientId) return null;
  return (
    <View style={styles.row}>
      <View style={[styles.frame, buttonWidth !== null && { width: buttonWidth }]}>
        <View ref={container} style={styles.gis} />
        {recent ? <RecentBadge /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { width: '100%', alignItems: 'center' },
  frame: { width: '100%' },
  gis: { width: '100%', minHeight: 44, alignItems: 'center' },
});
