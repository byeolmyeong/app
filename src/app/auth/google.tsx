/**
 * 구글 웹 로그인에서 돌아오는 화면(결정 070). 구글은 ID 토큰을 주소 조각(#)에 실어 보낸다 — 조각은 서버로 가지 않고, 처음 그릴 때 꺼내며 바로 주소에서 지운다.
 * 보낸 state 와 맞고 ID 토큰 안의 nonce 가 보낸 것과 같을 때만 서버에 한 번 보내고(서명은 서버가 확인한다),
 * 계정이 있으면 홈, 처음 온 사람이면 가입, 거부했으면 로그인 화면, 그 밖에는 실패 안내와 함께 로그인 화면으로 간다. 기다리는 동안은 스플래시 모양이다.
 */
import { router } from 'expo-router';
import { useEffect, useState } from 'react';

import { SplashView } from '@/components/splash-view';
import { strings } from '@/content/strings';
import { readGoogleReturn, takeGoogleRequest, takeUrlFragment } from '@/features/auth/providers/web-redirect';
import { useAuth, whenSessionChecked } from '@/features/auth/use-session';

/** 로그인 화면이 실패 안내를 띄우는 주소(로그인 화면의 `failed`) */
const FAILED = '/login?failed=1';

/**
 * 이 페이지에서 처리한 돌아옴(조각). 서버는 같은 구글 토큰을 한 번만 받으므로(서버 결정 047 — 두 번째는 401 이 성공한 로그인을 덮는다)
 * 같은 조각(개발 모드는 효과를 두 번 돌린다)이나, 처리한 뒤 다시 그려진 화면(다시 마운트 · 점검 화면 뒤 다시 올림 — 조각은 이미 꺼내 지워져 빈 글자)은
 * 다시 처리하지 않는다. 토큰을 보내는 길은 요청(state · nonce)을 꺼내며 지우는 takeGoogleRequest 를 지나야 해서 두 번째 화면은 보낼 수 없고,
 * 여기서 건너뛰어 그 화면이 실패 안내로 가 먼저 화면의 로그인을 가리지도 않는다.
 */
let handled: string | null = null;

export default function GoogleReturnScreen() {
  const { signIn } = useAuth();
  // 처음 그릴 때(첫 effect · 첫 칠하기보다 앞) 꺼내며 주소에서 지운다. 이 화면의 모듈은 그리기 직전에 읽혀 모듈에서 읽어도 더 이르지 않다
  const [fragment] = useState(takeUrlFragment);

  useEffect(() => {
    if (handled !== null && (fragment === handled || fragment === '')) return;
    handled = fragment;
    // 라우터도 조각을 경로 값('#')으로 들고 있다가 주소를 다시 쓰므로 그 값도 지운다
    router.setParams({ '#': undefined });
    const result = readGoogleReturn(fragment, takeGoogleRequest());
    if (result.kind === 'cancelled') {
      router.replace('/login');
      return;
    }
    if (result.kind === 'failed') {
      router.replace(FAILED);
      return;
    }
    // 켤 때의 세션 확인이 끝난 뒤에 로그인한다(그 401 이 늦게 와 로그인을 덮지 않게)
    const idToken = result.idToken;
    void whenSessionChecked()
      .then(() => signIn({ provider: 'GOOGLE', idToken }))
      .then((outcome) => router.replace(outcome === 'signedIn' ? '/' : outcome === 'signingUp' ? '/signup/terms' : FAILED));
    // 조각은 처음 그릴 때 한 번 읽은 값이다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fragment]);

  // 서버를 기다리는 동안은 스플래시 모양(결정 067 의 2 · 3). 화면 읽기에는 기다리는 중임을 알린다
  return <SplashView busyLabel={strings.login.signingIn} />;
}
