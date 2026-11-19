/**
 * 로그인 화면(결정 009 · 034 · 041, 시안 보드 5 · 5-1). 위는 로고와 한 줄, 아래는 그 플랫폼 · 설정에서 쓸 수 있는 공급자 버튼만
 * 카카오 · 애플 · 구글 순서로(안드로이드는 애플 없음). 아래 안내 문구는 없다.
 * 로그인하면 어디로 갈지는 루트 레이아웃의 가드가 정한다(계정이 있으면 홈, 처음 온 사람은 가입). 로그인 여부는 서버 응답만 따른다.
 */
import { useEffect, useRef, useState } from 'react';
import { Alert, Image, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { GlowBackdrop } from '@/components/glow';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { BrandColors, ScreenPaddingX, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { AppleLoginButton } from '@/features/auth/providers/apple';
import { GoogleLoginButton } from '@/features/auth/providers/google';
import { KakaoLoginButton } from '@/features/auth/providers/kakao';
import { getSession, useAuth } from '@/features/auth/use-session';
import type { ProviderCredential } from '@/lib/api';

const S = strings.login;
/** 스플래시와 같은 로고 그림(`assets/brand/splash.svg` → PNG, 결정 035) */
const LOGO = require('@/assets/images/splash-icon.png');
/** 시안의 로고 크기 · 바탕 빛(가운데 46% 높이에서 60% 에 사라진다) · 바닥 여백 */
const LOGO_SIZE = 260;
const GLOW = { extent: 0.6, centerY: 0.46 };
const BOTTOM = Spacing.xxl;
/** 서버가 새 사람의 이메일을 받지 못했다(결정 039). 공급자 이름 없이 시스템 알림 창 한 번 */
const EMAIL_REQUIRED = 'EMAIL_REQUIRED';

/** 지난 로그인 · 가입이 끝나지 않은 이유(서버 판정)의 안내 */
const reasonMessage = (lastError: string | null) =>
  lastError === 'UNDER_AGE' ? S.underAge : lastError === 'SIGNUP_EXPIRED' ? S.expired : null;

/** 웹(react-native-web)의 Alert 는 아무것도 띄우지 않아 브라우저 알림 창을 쓴다 */
function alertEmailRequired() {
  if (Platform.OS === 'web') window.alert(`${S.emailRequired.title}\n\n${S.emailRequired.body}`);
  else Alert.alert(S.emailRequired.title, S.emailRequired.body);
}

export default function LoginScreen() {
  const { lastError, signIn, devSessionEnabled, devSignIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const alerted = useRef(false);

  // 카카오 웹은 다른 화면(/auth/kakao)에서 로그인하고 여기로 돌아온다 — 그 실패도 뜰 때 한 번 알린다.
  useEffect(() => {
    if (lastError === EMAIL_REQUIRED && !alerted.current) {
      alerted.current = true;
      alertEmailRequired();
    }
    // 뜰 때 한 번만 본다. 이 화면에서 누른 로그인의 실패는 handle 이 알린다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handle(credential: ProviderCredential) {
    setBusy(true);
    setFailed(false);
    const outcome = await signIn(credential);
    setBusy(false);
    if (outcome !== 'failed') return;
    if (getSession().lastError === EMAIL_REQUIRED) alertEmailRequired();
    else setFailed(true);
  }

  const message = failed ? S.failed : reasonMessage(lastError);
  const buttonProps = { onCredential: (c: ProviderCredential) => void handle(c), onError: () => setFailed(true), disabled: busy };

  return (
    <Screen scroll={false} bottomInset={BOTTOM}>
      <View style={styles.head}>
        <GlowBackdrop color={BrandColors.backdropDim} extent={GLOW.extent} centerY={GLOW.centerY} />
        <Image source={LOGO} accessibilityLabel={strings.appName} style={styles.logo} />
        <Txt variant="lead" color="gray">
          {S.tagline}
        </Txt>
      </View>
      <View testID="login-buttons" style={styles.buttons}>
        {message ? (
          <Txt variant="table" color="danger">
            {message}
          </Txt>
        ) : null}
        <KakaoLoginButton {...buttonProps} />
        <AppleLoginButton {...buttonProps} />
        <GoogleLoginButton {...buttonProps} />
        {devSessionEnabled ? <Button label={S.dev} variant="line" onPress={() => void devSignIn()} disabled={busy} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, marginHorizontal: ScreenPaddingX },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE },
  buttons: { gap: Spacing.sm, paddingHorizontal: ScreenPaddingX },
});
