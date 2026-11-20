/**
 * 카카오 웹 로그인에서 돌아오는 화면(결정 034). 보낸 state 와 맞는 코드만 서버에 한 번 보내고,
 * 계정이 있으면 홈, 처음 온 사람이면 가입(출생 정보), 그 밖에는 로그인 화면으로 간다. 기다리는 동안은 스플래시 모양이다.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';

import { SplashView } from '@/components/splash-view';
import { KAKAO_RETURN_PATH, readKakaoReturn, takeKakaoState, webOrigin } from '@/features/auth/providers/web-redirect';
import { useAuth } from '@/features/auth/use-session';

/** 같은 돌아옴을 두 번 처리하지 않는다(코드는 한 번만 쓸 수 있다. 개발 모드는 효과를 두 번 돌린다) */
let handled: string | null = null;

export default function KakaoReturnScreen() {
  const { code, state, error } = useLocalSearchParams<{ code?: string; state?: string; error?: string }>();
  const { signIn } = useAuth();
  const key = `${state ?? ''}|${code ?? error ?? ''}`;

  useEffect(() => {
    if (handled === key) return;
    handled = key;
    const result = readKakaoReturn({ code, state, error }, takeKakaoState());
    if (result.kind !== 'code') {
      router.replace('/login');
      return;
    }
    void signIn({ provider: 'KAKAO', code: result.code, redirectUri: webOrigin() + KAKAO_RETURN_PATH }).then((outcome) =>
      router.replace(outcome === 'signedIn' ? '/' : outcome === 'signingUp' ? '/signup/terms' : '/login'),
    );
    // key 가 code · state · error 를 모두 담는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // 서버를 기다리는 동안은 스플래시 모양(결정 067 의 2 · 3)
  return <SplashView />;
}
