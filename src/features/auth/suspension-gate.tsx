import { router, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { Colors } from '@/constants/theme';
import { clearSuspended, markSuspended, suspensionRedirect, useSuspended } from '@/features/auth/suspension';
import { getSession, useSession } from '@/features/auth/use-session';
import { api, setSuspendedHandler } from '@/lib/api';

/** 로그인 직후 정지인지 묻는 동안 화면을 가리는 최대 시간. 답이 늦으면 가림을 걷고(정지가 아닌 것으로 보고) 나중에 온 403 · 답으로 보낸다 */
const CHECK_COVER_MAX_MS = 3000;

/**
 * 이용 정지 문(앱 결정 065 의 5). 루트 레이아웃에서 UpdateGate 안 Stack 옆에 하나 둔다.
 * - 정지 신호(어느 요청이든 403 `ACCOUNT_SUSPENDED` · `GET /account` 의 `suspended: true`)는 로그인 상태일 때만 받는다 —
 *   로그아웃 뒤 늦게 온 403 이 다음 사람에게 남지 않게.
 * - 로그인이 확인되면(앱을 열 때 · 로그인할 때) 표시를 지우고 계정을 물어 그 답으로 다시 맞춘다. 답이 오기 전에는 화면을 가리고 보내지 않는다
 *   ("로그인하면 이 화면만" — 홈이 잠깐 비치지 않게). 답이 3초 넘게 늦으면 가림만 걷는다.
 * - 정지 중이면 쌓인 화면을 걷고 `/suspended`(보드 22)로. 정지 화면 · 문의 · 공유 페이지 말고는 갈 수 없다 — 다른 문(로그인 가드)이 뒤이어
 *   다른 곳으로 보내도 경로가 바뀌면 다시 보낸다.
 * - 정지 중에 앱이 앞으로 돌아오면 다시 물어, 풀렸으면 표시를 끄고 홈으로. 로그인 전이 되면(로그아웃 · 탈퇴) 표시를 끈다.
 */
export function SuspensionGate() {
  const signedIn = useSession(false).status === 'signedIn';
  const suspended = useSuspended();
  const segments = useSegments() as string[];
  /** 이번 로그인에서 정지인지 답을 받았는가(받기 전에는 가리고 보내지 않는다). 로그인 상태가 바뀌면 다시 받는다 */
  const [checked, setChecked] = useState(false);
  const [seenSignedIn, setSeenSignedIn] = useState(signedIn);
  if (seenSignedIn !== signedIn) {
    setSeenSignedIn(signedIn);
    setChecked(false);
  }

  useEffect(() => {
    setSuspendedHandler(() => {
      if (getSession().status === 'signedIn') markSuspended();
    });
    return () => setSuspendedHandler(null);
  }, []);

  useEffect(() => {
    clearSuspended();
    if (!signedIn) return;
    let alive = true;
    const cap = setTimeout(() => alive && setChecked(true), CHECK_COVER_MAX_MS);
    // 정지면 getMyAccount 가 알림으로 표시를 켠다. 그 밖(정지 아님 · 받지 못함)은 꺼 둔 채로 둔다
    void api.getMyAccount().finally(() => {
      if (!alive) return;
      clearTimeout(cap);
      setChecked(true);
    });
    return () => {
      alive = false;
      clearTimeout(cap);
    };
  }, [signedIn]);

  useEffect(() => {
    if (!signedIn || !suspended) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void api.getMyAccount().then((res) => {
        if (res.ok && !res.data.suspended) clearSuspended();
      });
    });
    return () => sub.remove();
  }, [signedIn, suspended]);

  const target = checked ? suspensionRedirect(signedIn, suspended, segments) : null;
  const route = segments.join('/');
  useEffect(() => {
    if (!target) return;
    if (router.canDismiss()) router.dismissAll();
    router.replace(target);
    // 경로가 바뀌면(다른 문이 뒤이어 보냈다) 다시 본다
  }, [target, route]);

  return signedIn && !checked ? <View testID="suspension-cover" style={styles.cover} /> : null;
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, backgroundColor: Colors.paper },
});
