/**
 * 앱의 세션(결정 034 · 017). 소셜 로그인 · 가입 · 로그아웃과 개발용 세션을 한 곳에서 다룬다.
 * 앱(iOS·Android)은 세션 토큰을 기기 보안 저장소에 두고 api 에 건네고, 웹은 서버의 쿠키가 들고 있어 토큰을 만지지 않는다.
 * 로그인 여부 · 만 14세 판정은 서버 응답만 따른다(golden rules). 토큰과 가입권은 로그에 남기지 않는다.
 */
import type { ApiResult, BirthInput, DevSession, LoginResult, ProviderCredential, SignupResult } from '@/lib/api';

/** checking 시작할 때 확인 중 · signedOut 로그인 전 · signingUp 처음 온 사람이 출생 정보를 넣는 중 · signedIn 로그인 상태 */
export type SessionStatus = 'checking' | 'signedOut' | 'signingUp' | 'signedIn';

export type Session = {
  status: SessionStatus;
  /** 앱의 세션 토큰. 웹(쿠키)과 로그인 전에는 null — 로그인 여부는 status 로 본다 */
  token: string | null;
  /** 시작할 때의 확인이 끝났는가(status 가 checking 이 아니다) */
  ready: boolean;
  /** 마지막 로그인 · 가입이 실패한 이유(서버 오류 이름 — `UNDER_AGE` · `INVALID_ID_TOKEN` 등, 없으면 결과 종류). 성공하면 null */
  lastError: string | null;
};

export type SessionStoreDeps = {
  /** 개발용 세션을 쓰는가(`EXPO_PUBLIC_DEV_SESSION=1`). 켜져 있으면 켤 때 `POST /auth/dev` 로 바로 들어간다 */
  devSession: boolean;
  /** 웹이면 true: 세션은 서버의 쿠키이고 기기에 토큰을 두지 않는다 */
  cookieSession: boolean;
  createDevSession: () => Promise<ApiResult<DevSession>>;
  login: (credential: ProviderCredential) => Promise<ApiResult<LoginResult>>;
  signup: (signupToken: string, birth: BirthInput) => Promise<ApiResult<SignupResult>>;
  getSession: () => Promise<ApiResult<null>>;
  logout: () => Promise<ApiResult<null>>;
  loadToken: () => Promise<string | null>;
  saveToken: (token: string) => Promise<void>;
  deleteToken: () => Promise<void>;
  /** 요청에 붙일 토큰을 api 에 건넨다 */
  setApiToken: (token: string | null) => void;
};

/** 로그인 한 번의 결과 */
export type SignInOutcome = 'signedIn' | 'signingUp' | 'failed';

const reasonOf = (r: { error: string; code?: string }) => r.code ?? r.error;

export function createSessionStore(deps: SessionStoreDeps) {
  let state: Session = { status: 'checking', token: null, ready: false, lastError: null };
  const listeners = new Set<() => void>();
  let starting: Promise<void> | null = null;
  let fetching: Promise<boolean> | null = null;
  /** 가입권. 메모리에만 둔다(30분 · 1회용) */
  let signupToken: string | null = null;

  function set(status: SessionStatus, token: string | null, lastError: string | null = null) {
    state = { status, token, ready: status !== 'checking', lastError };
    deps.setApiToken(token);
    listeners.forEach((listener) => listener());
  }

  /** 서버가 준 세션으로 로그인 상태가 된다. 앱은 토큰을 보관한다(웹은 토큰이 없다) */
  async function signedIn(token: string | null) {
    signupToken = null;
    if (token && !deps.cookieSession) await deps.saveToken(token);
    set('signedIn', deps.cookieSession ? null : token);
  }

  async function signedOut(lastError: string | null = null) {
    signupToken = null;
    if (!deps.cookieSession) await deps.deleteToken();
    set('signedOut', null, lastError);
  }

  /** 개발용 세션을 새로 받는다. 동시에 여러 번 불려도 서버는 한 번만 부른다 */
  function fetchDevSession(): Promise<boolean> {
    fetching ??= (async () => {
      const r = await deps.createDevSession();
      if (r.ok) await signedIn(r.data.token);
      else await signedOut();
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

    /**
     * 앱이 켜질 때 한 번. 개발용이면 보관된 토큰을 쓰거나 새로 받는다.
     * 앱은 보관된 토큰을 서버에 확인하고(401 이면 지운다, 닿지 못하면 믿는다), 웹은 쿠키 세션을 서버에 확인한다.
     */
    start(): Promise<void> {
      starting ??= (async () => {
        if (deps.devSession) {
          const kept = deps.cookieSession ? null : await deps.loadToken();
          if (kept) set('signedIn', kept);
          else await fetchDevSession();
          return;
        }
        if (deps.cookieSession) {
          const r = await deps.getSession();
          return r.ok ? set('signedIn', null) : set('signedOut', null);
        }
        const kept = await deps.loadToken();
        if (!kept) return set('signedOut', null);
        deps.setApiToken(kept);
        const r = await deps.getSession();
        if (!r.ok && r.error === 'LOGIN_REQUIRED') return signedOut();
        set('signedIn', kept);
      })();
      return starting;
    },

    /** 공급자 자격 증명으로 로그인한다. 처음 온 사람은 가입권을 메모리에 두고 가입 중이 된다 */
    async signIn(credential: ProviderCredential): Promise<SignInOutcome> {
      const r = await deps.login(credential);
      if (!r.ok) {
        await signedOut(reasonOf(r));
        return 'failed';
      }
      if (r.data.status === 'SIGNUP_REQUIRED') {
        signupToken = r.data.signupToken;
        set('signingUp', null);
        return 'signingUp';
      }
      await signedIn(r.data.token);
      return 'signedIn';
    },

    /**
     * 가입을 마친다(출생 정보와 함께). 만 14세 미만(`UNDER_AGE`)이나 가입권 만료(`SIGNUP_EXPIRED`)면 가입권을 버리고 로그인 전으로,
     * 출생 정보가 틀렸거나 서버에 닿지 못했으면 가입 중에 머문다(다시 보낼 수 있다). 결과를 그대로 돌려준다.
     */
    async completeSignup(birth: BirthInput): Promise<ApiResult<SignupResult>> {
      if (!signupToken) return { ok: false, error: 'LOGIN_REQUIRED', code: 'SIGNUP_EXPIRED' };
      const r = await deps.signup(signupToken, birth);
      if (r.ok) {
        await signedIn(r.data.token);
        return r;
      }
      if (r.code === 'UNDER_AGE' || r.error === 'LOGIN_REQUIRED') await signedOut(reasonOf(r));
      else set('signingUp', null, reasonOf(r));
      return r;
    },

    /** 개발용 세션을 쓰는 빌드인가(로그인 화면의 "개발용으로 들어가기") */
    devSessionEnabled: () => deps.devSession,

    /** 개발용 세션으로 들어간다(계정을 지운 뒤 등). 꺼진 빌드에서는 아무것도 하지 않고 false */
    devSignIn(): Promise<boolean> {
      return deps.devSession ? fetchDevSession() : Promise.resolve(false);
    },

    /** 로그아웃. 서버 세션을 지우고(실패해도) 기기의 토큰을 지운다 */
    async signOut(): Promise<void> {
      await deps.logout();
      await signedOut();
    },

    /** 서버가 401 을 주었을 때. 개발용이면 새로 받고(새 세션이 생겼으면 true), 아니면 로그인 전이 된다(false) */
    async refresh(): Promise<boolean> {
      if (deps.devSession) return fetchDevSession();
      await signedOut();
      return false;
    },

    /** 계정을 지웠을 때. 보관된 토큰을 버리고 로그인 전이 된다 */
    async clear(): Promise<void> {
      await signedOut();
    },
  };
}
