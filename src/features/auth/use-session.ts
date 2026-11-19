/**
 * 앱의 세션(결정 034 · 017). 소셜 로그인 · 가입 · 로그아웃과 개발용 세션(`EXPO_PUBLIC_DEV_SESSION=1`).
 * 다른 기능이 가져다 써도 되는 파일이다(eslint.config.js 의 SHARED_FEATURE_FILES).
 */
import { useEffect, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

import { createSessionStore, type Session } from '@/features/auth/session-store';
import { deleteToken, loadToken, saveToken } from '@/features/auth/token-storage';
import { api, setSessionRefresher, setSessionToken } from '@/lib/api';

const store = createSessionStore({
  devSession: process.env.EXPO_PUBLIC_DEV_SESSION === '1',
  cookieSession: Platform.OS === 'web',
  createDevSession: () => api.createDevSession(),
  login: (credential) => api.login(credential),
  signup: (signupToken, birth) => api.signup(signupToken, birth),
  getSession: () => api.getSession(),
  logout: () => api.logout(),
  loadToken,
  saveToken,
  deleteToken,
  setApiToken: setSessionToken,
});

// 서버가 401 을 주면 api 가 이 방법을 부른다. 개발용이면 세션을 한 번 다시 받고, 아니면 로그인 전이 된다.
setSessionRefresher(() => store.refresh());

/** 훅 밖에서 지금의 세션을 본다(요청 직전에 로그인 상태인지 확인할 때) */
export const getSession = (): Session => store.getSnapshot();

/** 세션을 비운다(계정을 지웠을 때). 보관된 토큰도 지운다 */
export const clearSession = (): Promise<void> => store.clear();

/** 로그아웃(서버 세션 · 보관된 토큰). 기기에 둔 출생 정보 · 글은 `sign-out.ts` 가 함께 비운다 */
export const signOutSession = (): Promise<void> => store.signOut();

/**
 * 세션 상태. 처음 쓰일 때(앱이 켜질 때) 세션을 시작한다.
 * start 가 false 인 동안에는 시작하지 않는다(세션 없이 열리는 공유 페이지. 결정 025).
 */
export function useSession(start = true): Session {
  useEffect(() => {
    if (start) void store.start();
  }, [start]);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}

/** 로그인 화면 · 가입 화면 · 설정이 쓰는 세션과 동작(결정 034). 로그인 여부와 만 14세 판정은 서버 응답만 따른다 */
export function useAuth() {
  const session = useSession();
  return {
    status: session.status,
    lastError: session.lastError,
    signIn: store.signIn,
    completeSignup: store.completeSignup,
    devSessionEnabled: store.devSessionEnabled(),
    devSignIn: store.devSignIn,
  };
}
