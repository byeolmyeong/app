/**
 * 로그인 화면(결정 009 · 034 · 042, 시안 보드 5 · 5-1). 위는 로고와 한 줄, 아래는 그 플랫폼 · 설정에서 쓸 수 있는 공급자 버튼만
 * 카카오 · 애플 · 구글 순서로(안드로이드는 애플 없음). 아래 안내 문구는 없다. 이 기기에서 마지막에 쓴 공급자 버튼에 "최근 로그인" 배지(결정 044, 보드 5-2).
 * 로그인하면 어디로 갈지는 루트 레이아웃의 가드가 정한다(계정이 있으면 홈, 처음 온 사람은 가입). 로그인 여부는 서버 응답만 따른다.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Alert, Image, Platform, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { GlowBackdrop } from '@/components/glow';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { BackdropShape, BrandColors, ScreenPaddingX, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { AppleLoginButton } from '@/features/auth/providers/apple';
import { GoogleLoginButton } from '@/features/auth/providers/google';
import { KakaoLoginButton } from '@/features/auth/providers/kakao';
import { getLastProvider, type LoginProvider } from '@/features/auth/last-provider';
import { clearDraft } from '@/features/auth/signup-draft';
import { getSession, useAuth } from '@/features/auth/use-session';
import type { ProviderCredential } from '@/lib/api';

const S = strings.login;
/** 스플래시와 같은 로고 그림(`assets/brand/splash.svg` → PNG, 결정 035) */
const LOGO = require('@/assets/images/splash-icon.png');
/** 시안의 바닥 여백 */
const BOTTOM = Spacing.xxl;
const GLOW = BackdropShape.login;
/** 서버가 새 사람의 이메일을 받지 못했다(결정 039). 공급자 이름 없이 시스템 알림 창 한 번 */
const EMAIL_REQUIRED = 'EMAIL_REQUIRED';

/** 지난 로그인 · 가입이 끝나지 않은 이유(서버 판정)의 안내 */
const reasonMessage = (lastError: string | null) =>
  lastError === 'UNDER_AGE' ? S.underAge : lastError === 'SIGNUP_EXPIRED' ? S.expired : null;

const noSubscribe = () => () => {};
/** 하이드레이션 중(정적 HTML 과 같아야 한다)에는 false, 그 뒤로는 true */
const afterHydration = () => true;
const duringHydration = () => false;

/** 웹(react-native-web)의 Alert 는 아무것도 띄우지 않아 브라우저 알림 창을 쓴다 */
function alertEmailRequired() {
  if (Platform.OS === 'web') window.alert(`${S.emailRequired.title}\n\n${S.emailRequired.body}`);
  else Alert.alert(S.emailRequired.title, S.emailRequired.body);
}

export default function LoginScreen() {
  const { lastError, signIn, devSessionEnabled, devSignIn } = useAuth();
  /** 웹 구글은 돌아오는 화면(/auth/google)에서 로그인하고, 실패하면 `?failed=1` 로 여기 온다(결정 070) */
  const { failed: returnedFailed } = useLocalSearchParams<{ failed?: string }>();
  /** 자격 증명을 받아 서버를 기다리는 공급자. 그 버튼은 돌기, 나머지는 막는다(결정 067 의 2) */
  const [pending, setPending] = useState<LoginProvider | null>(null);
  const [failed, setFailed] = useState(false);
  /** 처음 열린 주소가 `?failed=1` 이었다(주소에서는 곧 지운다). 다시 누르면 거둔다 */
  const [returned, setReturned] = useState(() => returnedFailed === '1');
  const hydrated = useSyncExternalStore(noSubscribe, afterHydration, duringHydration);
  const [recent, setRecent] = useState<LoginProvider | null>(null);
  const alerted = useRef(false);

  // 로그인 화면에 왔으면 하다 만 가입은 끝났다(가입 시간이 지남 · 만 14세 미만 · 그만둠) — 초안을 지워 다음 가입은 처음부터.
  useEffect(() => clearDraft(), []);

  // 이 기기에서 마지막에 쓴 공급자(공급자 이름만, 결정 044). 읽지 못하면 배지 없이
  useEffect(() => {
    let alive = true;
    void getLastProvider().then((provider) => {
      if (alive) setRecent(provider);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 웹 구글에서 실패하고 돌아왔다 — 새로 고침에 반복되지 않게 주소에서 지운다(안내는 위 returned 가 들고 있다)
  useEffect(() => {
    if (returnedFailed === '1') router.setParams({ failed: undefined });
  }, [returnedFailed]);

  // 카카오 · 구글 웹은 다른 화면(/auth/kakao · /auth/google)에서 로그인하고 여기로 돌아온다 — 그 실패도 뜰 때 한 번 알린다.
  useEffect(() => {
    if (lastError === EMAIL_REQUIRED && !alerted.current) {
      alerted.current = true;
      alertEmailRequired();
    }
    // 뜰 때 한 번만 본다. 이 화면에서 누른 로그인의 실패는 handle 이 알린다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 기다리는 동안 따로 화면 없이 여기 머문다. 로그인되면 가드가 다음 화면으로 보낼 때까지 돌기를 둔다.
  async function handle(credential: ProviderCredential) {
    setPending(credential.provider);
    setFailed(false);
    setReturned(false);
    const outcome = await signIn(credential);
    if (outcome !== 'failed') return;
    setPending(null);
    if (getSession().lastError === EMAIL_REQUIRED) alertEmailRequired();
    else setFailed(true);
  }

  // 정적 HTML 은 주소의 검색값을 모르므로 돌아온 실패 안내는 하이드레이션 뒤에 보인다(#418). 이메일이 없어 막힌 것(EMAIL_REQUIRED)은 알림 창만
  const returnedNotice = hydrated && returned && lastError !== EMAIL_REQUIRED;
  const message = failed || returnedNotice ? S.failed : reasonMessage(lastError);
  const buttonProps = (provider: LoginProvider) => ({
    onCredential: (c: ProviderCredential) => void handle(c),
    onError: () => setFailed(true),
    loading: pending === provider,
    disabled: pending !== null && pending !== provider,
    recent: recent === provider,
  });

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
        <KakaoLoginButton {...buttonProps('KAKAO')} />
        <AppleLoginButton {...buttonProps('APPLE')} />
        <GoogleLoginButton {...buttonProps('GOOGLE')} />
        {devSessionEnabled ? <Button label={S.dev} variant="line" onPress={() => void devSignIn()} disabled={pending !== null} /> : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.xxs, marginHorizontal: ScreenPaddingX },
  logo: { width: Sizes.loginLogo, height: Sizes.loginLogo },
  buttons: { gap: Spacing.sm, paddingHorizontal: ScreenPaddingX },
});
