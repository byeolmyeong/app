/**
 * 로그인 화면(결정 009 · 034). 그 플랫폼 · 설정에서 쓸 수 있는 공급자 버튼만 보인다.
 * 로그인하면 어디로 갈지는 루트 레이아웃의 가드가 정한다(계정이 있으면 홈, 처음 온 사람은 가입). 화면 디자인은 디자이너가 다시 그린다.
 */
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { AppleLoginButton } from '@/features/auth/providers/apple';
import { GoogleLoginButton } from '@/features/auth/providers/google';
import { KakaoLoginButton } from '@/features/auth/providers/kakao';
import { useAuth } from '@/features/auth/use-session';
import type { ProviderCredential } from '@/lib/api';

const S = strings.login;

/** 지난 로그인 · 가입이 끝나지 않은 이유(서버 판정)의 안내 */
const reasonMessage = (lastError: string | null) =>
  lastError === 'UNDER_AGE' ? S.underAge : lastError === 'SIGNUP_EXPIRED' ? S.expired : null;

export default function LoginScreen() {
  const { lastError, signIn, devSessionEnabled, devSignIn } = useAuth();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function handle(credential: ProviderCredential) {
    setBusy(true);
    setFailed(false);
    const outcome = await signIn(credential);
    setBusy(false);
    if (outcome === 'failed') setFailed(true);
  }

  const message = failed ? S.failed : reasonMessage(lastError);
  const buttonProps = { onCredential: (c: ProviderCredential) => void handle(c), onError: () => setFailed(true), disabled: busy };

  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.head}>
          <Txt variant="title">{S.title}</Txt>
          <Txt color="gray">{S.subtitle}</Txt>
        </View>
        <View style={styles.buttons}>
          {message ? (
            <Txt variant="table" color="danger">
              {message}
            </Txt>
          ) : null}
          <KakaoLoginButton {...buttonProps} />
          <AppleLoginButton {...buttonProps} />
          <GoogleLoginButton {...buttonProps} />
          {devSessionEnabled ? <Button label={S.dev} variant="line" onPress={() => void devSignIn()} disabled={busy} /> : null}
          <Txt variant="label" color="hint">
            {S.ageNotice}
          </Txt>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, gap: Spacing.xl },
  head: { gap: Spacing.xs, paddingTop: Spacing.xl },
  buttons: { marginTop: 'auto', gap: Spacing.sm },
});
