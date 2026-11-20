/**
 * 구글 웹 로그인에서 돌아오는 화면(결정 070). 구글은 ID 토큰을 주소 조각(#)에 실어 보낸다 — 조각은 서버로 가지 않고, 읽은 뒤 바로 기록에서 지운다.
 * 보낸 state 와 맞고 ID 토큰 안의 nonce 가 보낸 것과 같을 때만 서버에 한 번 보내고(서명은 서버가 확인한다),
 * 계정이 있으면 홈, 처음 온 사람이면 가입, 거부했으면 로그인 화면, 그 밖에는 실패 안내와 함께 로그인 화면으로 간다. 기다리는 동안은 스플래시 모양이다.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { SplashView } from '@/components/splash-view';
import { strings } from '@/content/strings';
import { clearUrlFragment, readGoogleReturn, takeGoogleRequest, urlFragment } from '@/features/auth/providers/web-redirect';
import { useAuth } from '@/features/auth/use-session';

/** 로그인 화면이 실패 안내를 띄우는 주소(로그인 화면의 `failed`) */
const FAILED = '/login?failed=1';

/** 같은 돌아옴을 두 번 처리하지 않는다(요청은 한 번만 쓸 수 있다. 개발 모드는 효과를 두 번 돌린다) */
let handled: string | null = null;

export default function GoogleReturnScreen() {
  const { signIn } = useAuth();
  // 처음 그릴 때 읽는다(라우터가 주소를 다시 쓰기 전에)
  const [fragment] = useState(urlFragment);

  useEffect(() => {
    if (handled === fragment) return;
    handled = fragment;
    clearUrlFragment();
    const result = readGoogleReturn(fragment, takeGoogleRequest());
    if (result.kind === 'cancelled') {
      router.replace('/login');
      return;
    }
    if (result.kind === 'failed') {
      router.replace(FAILED);
      return;
    }
    void signIn({ provider: 'GOOGLE', idToken: result.idToken }).then((outcome) =>
      router.replace(outcome === 'signedIn' ? '/' : outcome === 'signingUp' ? '/signup/terms' : FAILED),
    );
    // 조각은 처음 그릴 때 한 번 읽은 값이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragment]);

  // 서버를 기다리는 동안은 스플래시 모양(결정 067 의 2 · 3). 화면 읽기에는 기다리는 중임을 알린다
  return <SplashView busyLabel={strings.login.signingIn} />;
}
