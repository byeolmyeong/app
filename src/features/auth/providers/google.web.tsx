/**
 * 웹의 구글 로그인(결정 034 · 067 의 4). 버튼은 카카오 · 애플과 같은 우리 모양(`SocialButtonFace`, 시안 5 — "Google로 로그인")으로 그리고,
 * 로그인은 구글 공식 웹 버튼(Google Identity Services)으로 받는다: GIS 버튼을 우리 버튼 위에 보이지 않게(투명하게) 겹쳐 누름을 GIS 가 받고,
 * 구글이 ID 토큰(credential)을 콜백으로 준다 — 서버 계약(`POST /auth/login` 의 구글 ID 토큰)은 그대로다.
 * GIS 버튼은 높이(40) · 폭(200~400)이 정해져 있어 우리 버튼(48 · 꽉 찬 폭)을 빈틈 없이 덮도록 늘린다. 개인 맞춤 버튼의 프로필 · 이름 · 이메일은 보이지 않는다.
 * 키보드 포커스 · 화면 읽기는 겹친 GIS 버튼이 받는다(이름은 구글의 문구). 포커스가 있으면 우리 버튼에 주색 테두리.
 * 클라이언트 ID(`EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)가 없거나 GIS 를 불러오지 못하면 그리지 않는다(최근 로그인 배지도 없다, 결정 044).
 */
import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { SocialButtonStyle } from '@/constants/theme';
import { strings } from '@/content/strings';
import { SocialButtonFace } from '@/features/auth/providers/social-button';
import type { LoginButtonProps } from '@/features/auth/providers/types';
import { loadScript } from '@/features/auth/providers/load-script';

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';
/** GIS 가 받는 버튼 폭의 범위(px)와 `size: 'large'` 의 높이 */
const MIN_WIDTH = 200;
const MAX_WIDTH = 400;
const GIS_HEIGHT = 40;

type GoogleIdentity = {
  initialize(options: { client_id: string; callback: (response: { credential?: string }) => void }): void;
  renderButton(parent: HTMLElement, options: Record<string, string | number>): void;
};

const googleIdentity = () => (window as unknown as { google?: { accounts?: { id?: GoogleIdentity } } }).google?.accounts?.id;

/** GIS 버튼을 그릴 폭: 우리 버튼의 폭을 GIS 가 받는 범위로 */
const gisWidthFor = (width: number) => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(width)));

/** GIS 버튼(drawn × 40)을 우리 버튼(width × 48) 가운데에 두고 늘려 빈틈 없이 덮는다 */
const coverStyle = (width: number, drawn: number) => ({
  width: drawn,
  height: GIS_HEIGHT,
  left: (width - drawn) / 2,
  top: (SocialButtonStyle.height - GIS_HEIGHT) / 2,
  transform: [{ scaleX: width / drawn }, { scaleY: SocialButtonStyle.height / GIS_HEIGHT }],
});

export function GoogleLoginButton({ onCredential, onError, disabled = false, loading = false, recent = false }: LoginButtonProps) {
  const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.trim();
  const container = useRef<ComponentRef<typeof View>>(null);
  const overlay = useRef<ComponentRef<typeof View>>(null);
  /** 우리 버튼의 폭(그린 뒤에 잰다) */
  const [width, setWidth] = useState<number | null>(null);
  /** GIS 버튼을 그린 폭. 처음 잰 폭으로 한 번 그리고, 폭이 바뀌면 늘리는 비율만 바꾼다 */
  const [gisWidth, setGisWidth] = useState<number | null>(null);
  /** GIS 스크립트: 불러오는 중 · 다 옴 · 쓸 수 없음(못 불러왔거나 GIS 가 없다 — 로그인할 수 없으니 버튼을 거둔다) */
  const [script, setScript] = useState<'loading' | 'ready' | 'unavailable'>('loading');
  const [focused, setFocused] = useState(false);
  const blocked = disabled || loading;
  // 구글 콜백은 처음 한 번만 등록되므로 언제나 마지막에 받은 함수를 부른다.
  const credentialed = useEffectEvent((credential: string | undefined) =>
    credential ? onCredential({ provider: 'GOOGLE', idToken: credential }) : onError(),
  );
  const failed = useEffectEvent(() => onError());

  // 스크립트는 그리자마자 불러온다
  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    loadScript(GIS_SCRIPT)
      .then(() => {
        if (!cancelled) setScript(googleIdentity() ? 'ready' : 'unavailable');
      })
      .catch(() => {
        if (cancelled) return;
        setScript('unavailable');
        failed();
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  // 스크립트가 오고 우리 버튼의 폭을 재면 GIS 버튼을 한 번 그린다(폭이 바뀌면 늘리는 비율만 바꾼다)
  const measured = width !== null;
  useEffect(() => {
    const id = googleIdentity();
    // 웹에서 View 는 DOM 요소다.
    const parent = container.current as unknown as HTMLElement | null;
    if (!clientId || script !== 'ready' || !measured || !id || !parent || gisWidth !== null) return;
    id.initialize({ client_id: clientId, callback: ({ credential }) => credentialed(credential) });
    const drawn = gisWidthFor(width);
    id.renderButton(parent, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: drawn,
      locale: 'ko',
    });
    setGisWidth(drawn);
    // 처음 잰 폭으로 한 번만 그린다(measured 가 처음 true 가 될 때).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientId, script, measured]);

  // 기다리는 중 · 막힘이면 겹친 GIS 버튼을 키보드로도 누를 수 없게 한다(웹에서 View 는 DOM 요소다)
  useEffect(() => {
    const el = overlay.current as unknown as HTMLElement | null;
    if (el) el.inert = blocked;
  }, [blocked]);

  if (!clientId || script === 'unavailable') return null;
  const cover = width === null ? null : coverStyle(width, gisWidth ?? gisWidthFor(width));
  return (
    <View
      testID="google-login"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}>
      <SocialButtonFace provider="GOOGLE" label={strings.login.google} disabled={disabled} loading={loading} recent={recent} focused={focused} />
      <View ref={overlay} testID="google-gis-overlay" pointerEvents={blocked ? 'none' : 'auto'} style={styles.overlay}>
        <View ref={container} testID="google-gis" style={[styles.gis, cover]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /** 우리 버튼과 같은 칸. 보이지 않지만 누름은 받는다 */
  overlay: { ...StyleSheet.absoluteFill, opacity: 0, overflow: 'hidden', borderRadius: SocialButtonStyle.radius },
  gis: { position: 'absolute' },
});
