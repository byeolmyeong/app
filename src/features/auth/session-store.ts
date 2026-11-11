/**
 * 개발용 세션(결정 017). 켜져 있을 때만 `POST /auth/dev` 로 토큰을 받아 보관하고 api 에 건넨다.
 * 소셜 로그인을 붙일 때 이 자리에서 바꾼다. 토큰은 로그에 남기지 않는다.
 */
import type { ApiResult, DevSession } from '@/lib/api';

export type Session = {
  /** 세션 토큰. 없으면 null */
  token: string | null;
  /** 시작할 때의 세션 확인이 끝났는가. 꺼져 있거나 받지 못해도 끝나면 true 다 */
  ready: boolean;
};

export type SessionStoreDeps = {
  /** 개발용 세션을 쓰는가(`EXPO_PUBLIC_DEV_SESSION=1`). false 면 서버를 부르지 않는다 */
  enabled: boolean;
  createDevSession: () => Promise<ApiResult<DevSession>>;
  loadToken: () => Promise<string | null>;
  saveToken: (token: string) => Promise<void>;
  /** 요청에 붙일 토큰을 api 에 건넨다 */
  setApiToken: (token: string | null) => void;
};

export function createSessionStore(deps: SessionStoreDeps) {
  let state: Session = { token: null, ready: false };
  const listeners = new Set<() => void>();
  let starting: Promise<void> | null = null;
  let fetching: Promise<boolean> | null = null;

  function set(token: string | null) {
    state = { token, ready: true };
    deps.setApiToken(token);
    listeners.forEach((listener) => listener());
  }

  /** 새 토큰을 받는다. 동시에 여러 번 불려도 서버는 한 번만 부른다 */
  function fetchToken(): Promise<boolean> {
    fetching ??= (async () => {
      const r = await deps.createDevSession();
      if (r.ok) await deps.saveToken(r.data.token);
      set(r.ok ? r.data.token : null);
      return r.ok;
    })().finally(() => {
      fetching = null;
    });
    return fetching;
  }

  return {
    getSnapshot: () => state,

    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    /** 앱이 켜질 때 한 번. 보관된 토큰이 있으면 그것을 쓰고, 없으면 새로 받는다 */
    start(): Promise<void> {
      starting ??= (async () => {
        if (!deps.enabled) return set(null);
        const kept = await deps.loadToken();
        if (kept) set(kept);
        else await fetchToken();
      })();
      return starting;
    },

    /** 서버가 401 을 주었을 때. 보관된 토큰을 버리고 새로 받는다. 새 세션이 생겼으면 true */
    refresh(): Promise<boolean> {
      return deps.enabled ? fetchToken() : Promise.resolve(false);
    },
  };
}
