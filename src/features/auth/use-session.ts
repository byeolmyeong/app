/**
 * 앱의 세션. 지금은 개발용 세션(`EXPO_PUBLIC_DEV_SESSION=1`, 결정 017)이고 그 밖에는 세션이 없다.
 * 다른 기능이 가져다 써도 되는 파일이다(eslint.config.js 의 SHARED_FEATURE_FILES).
 */
import { useEffect, useSyncExternalStore } from 'react';

import { createSessionStore, type Session } from '@/features/auth/session-store';
import { deleteToken, loadToken, saveToken } from '@/features/auth/token-storage';
import { api, setSessionRefresher, setSessionToken } from '@/lib/api';

const store = createSessionStore({
  enabled: process.env.EXPO_PUBLIC_DEV_SESSION === '1',
  createDevSession: () => api.createDevSession(),
  loadToken,
  saveToken,
  deleteToken,
  setApiToken: setSessionToken,
});

// 서버가 401 을 주면 api 가 이 방법으로 세션을 한 번 다시 받는다.
setSessionRefresher(() => store.refresh());

/** 훅 밖에서 지금의 세션을 본다(요청 직전에 세션이 있는지 확인할 때) */
export const getSession = (): Session => store.getSnapshot();

/** 세션을 비운다(계정을 지웠을 때). 보관된 토큰도 지운다 */
export const clearSession = (): Promise<void> => store.clear();

/** 세션 토큰과 준비 여부. 처음 쓰일 때(앱이 켜질 때) 세션을 시작한다 */
export function useSession(): Session {
  useEffect(() => {
    void store.start();
  }, []);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
