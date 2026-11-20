import { router, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { clearSuspended, markSuspended, suspensionRedirect, useSuspended } from '@/features/auth/suspension';
import { useSession } from '@/features/auth/use-session';
import { api, setSuspendedHandler } from '@/lib/api';

/**
 * 이용 정지 문(앱 결정 065 의 5). 루트 레이아웃에 하나 둔다 — 아무것도 그리지 않는다.
 * - 어떤 요청이든 403 `ACCOUNT_SUSPENDED` 를 받거나 `GET /account` 가 `suspended: true` 면 표시를 켠다(`lib/api` 의 알림).
 * - 로그인이 확인되면(앱을 열 때 · 로그인할 때) 계정을 한 번 물어 정지인지 본다 — 받아 둔 글만 보는 화면은 서버를 안 부를 수 있어서.
 * - 정지 중이면 쌓인 화면을 걷고 `/suspended`(보드 22)로 바꾼다. 정지 화면 · 문의 · 공유 페이지 말고는 갈 수 없다(아래 탭 · 뒤로 없음).
 * - 정지 중에 앱이 앞으로 돌아오면 다시 물어, 풀렸으면 표시를 끄고 홈으로. 로그인 전이 되면(로그아웃 · 탈퇴) 표시를 끈다.
 */
export function SuspensionGate() {
  const signedIn = useSession(false).status === 'signedIn';
  const suspended = useSuspended();
  const segments = useSegments() as string[];

  useEffect(() => {
    setSuspendedHandler(markSuspended);
    return () => setSuspendedHandler(null);
  }, []);

  useEffect(() => {
    if (!signedIn) return clearSuspended();
    // 정지면 getMyAccount 가 알림으로 표시를 켠다
    void api.getMyAccount();
  }, [signedIn]);

  useEffect(() => {
    if (!suspended) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void api.getMyAccount().then((res) => {
        if (res.ok && !res.data.suspended) clearSuspended();
      });
    });
    return () => sub.remove();
  }, [suspended]);

  const target = suspensionRedirect(signedIn, suspended, segments);
  useEffect(() => {
    if (!target) return;
    if (router.canDismiss()) router.dismissAll();
    router.replace(target);
  }, [target]);

  return null;
}
