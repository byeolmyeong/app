/**
 * 앱의 세션(결정 034 · 017). 소셜 로그인 · 가입 · 로그아웃과 개발용 세션을 한 곳에서 다룬다.
 * 앱(iOS·Android)은 세션 토큰을 기기 보안 저장소에 두고 api 에 건네고, 웹은 서버의 쿠키가 들고 있어 토큰을 만지지 않는다.
 * 로그인 여부 · 만 14세 판정은 서버 응답만 따른다(golden rules). 토큰과 가입권은 로그에 남기지 않는다.
 */
import type {
  ApiResult,
  BirthInput,
  DevSession,
  LoginResult,
  NicknameAvailability,
  ProviderCredential,
  SignupExtra,
  SignupResult,
} from '@/lib/api';

/**
 * checking 시작할 때 확인 중 · signedOut 로그인 전 · signingUp 처음 온 사람이 가입 단계(약관 · 닉네임 · 출생 정보)를 밟는 중 · signedIn 로그인 상태 ·
 * offline 웹이 시작할 때 서버에 닿지 못해 확인하지 못함(결정 068 의 4 — 로그인했다고도 안 했다고도 정하지 않는다. 다시 확인이 정한다)
 */
export type SessionStatus = 'checking' | 'signedOut' | 'signingUp' | 'signedIn' | 'offline';

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
  signup: (signupToken: string, birth: BirthInput, extra: SignupExtra) => Promise<ApiResult<SignupResult>>;
  checkNickname: (signupToken: string, nickname: string) => Promise<ApiResult<NicknameAvailability>>;
  getSession: () => Promise<ApiResult<null>>;
  logout: () => Promise<ApiResult<null>>;
  loadToken: () => Promise<string | null>;
  saveToken: (token: string) => Promise<void>;
  deleteToken: () => Promise<void>;
  /** 요청에 붙일 토큰을 api 에 건넨다 */
  setApiToken: (token: string | null) => void;
  /** 로그인에 성공한(처음 온 사람은 가입을 마친) 공급자를 기기에 적는다 — 로그인 화면의 "최근 로그인"(결정 044) */
  saveLastProvider: (provider: ProviderCredential['provider']) => Promise<void>;
  /** 가입 이어 하기(결정 068 의 1): 기기에 둔 가입권(수명 안의 것만, 가입 초안도 되돌린다) · 두기 · 지우기 */
  loadSignup: () => Promise<{ signupToken: string; provider: ProviderCredential['provider'] } | null>;
  saveSignup: (signupToken: string, provider: ProviderCredential['provider'], expiresAt?: number) => Promise<void>;
  clearSignup: () => Promise<void>;
  /**
   * 이 앱이 기기에 둔 사람의 것(출생 정보 · 차트 · 받은 글, `byeolmyeong.` 머리)과 이번 실행의 메모리 층(lib/device-memory · 계정 기억 lib/account-store)을
   * 비운다 — 기기 설정(최근 로그인 · 소개 봄)은 남는다.
   * 새 로그인(로그인 · 가입 완료)이 로그인 상태가 되기 전에, 401 로 로그인 전이 될 때 부른다. 같은 기기의 다음 사람이 앞사람의 것을 보지 않게
   */
  clearDeviceData: () => Promise<void>;
  /**
   * 로그인(계정이 있다) · 가입을 마친 순간(제품 분석, 결정 040 · 081). 출생 정보는 넘기지 않는다 — 가입은 시각을 아는지만.
   * 실패 · 가입 중이 됨 · 개발용 세션은 부르지 않는다
   */
  onSignedIn?: (done: { kind: 'login'; provider: ProviderCredential['provider'] } | { kind: 'signup'; provider: ProviderCredential['provider']; timeKnown: boolean }) => void;
};

/** 로그인 한 번의 결과 */
export type SignInOutcome = 'signedIn' | 'signingUp' | 'failed';

/** 가입을 마칠 때 보내는 것 전부: 출생 정보 + 가입 단계의 값(결정 042) */
export type SignupInput = { birth: BirthInput } & SignupExtra;

const reasonOf = (r: { error: string; code?: string }) => r.code ?? r.error;

export function createSessionStore(deps: SessionStoreDeps) {
  let state: Session = { status: 'checking', token: null, ready: false, lastError: null };
  const listeners = new Set<() => void>();
  let starting: Promise<void> | null = null;
  let fetching: Promise<boolean> | null = null;
  /** 가입권. 메모리에만 둔다(30분 · 1회용) */
  let signupToken: string | null = null;
  /** 가입권을 받은 로그인의 공급자. 가입을 마치면 "최근 로그인" 으로 적는다(결정 044) */
  let signupProvider: ProviderCredential['provider'] | null = null;
  /** 보내는 중인 가입. 두 번 눌러도 같은 요청을 함께 쓴다(가입권은 한 번 쓰면 끝이라 둘째 응답이 첫째의 로그인을 지우지 않게) */
  let submitting: Promise<ApiResult<SignupResult>> | null = null;

  function set(status: SessionStatus, token: string | null, lastError: string | null = null) {
    state = { status, token, ready: status !== 'checking', lastError };
    deps.setApiToken(token);
    listeners.forEach((listener) => listener());
  }

  /**
   * 가입권이 없을 때(만료 · 그만둠 · 만 14세 미만으로 서버가 지움). 로그인 전으로 돌아가고 결과는 SIGNUP_EXPIRED 다.
   * 만 14세 미만 뒤라면 로그인 화면이 그 안내를 보여 주게 이유를 그대로 남긴다.
   */
  async function noTicket(): Promise<ApiResult<never>> {
    await signedOut(state.lastError === 'UNDER_AGE' ? 'UNDER_AGE' : 'SIGNUP_EXPIRED');
    return { ok: false, error: 'LOGIN_REQUIRED', code: 'SIGNUP_EXPIRED' };
  }

  /** 서버가 준 세션으로 로그인 상태가 된다. 앱은 토큰을 보관한다(웹은 토큰이 없다). 이어 하던 가입은 지운다 */
  async function signedIn(token: string | null) {
    signupToken = null;
    signupProvider = null;
    await deps.clearSignup();
    if (token && !deps.cookieSession) await deps.saveToken(token);
    set('signedIn', deps.cookieSession ? null : token);
  }

  /**
   * 새 세션이 로그인으로 생긴다(로그인 · 가입 완료). 로그인 상태가 되기 전에 기기의 사람 것을 비운다 — 앞 세션이 만료로 끝났으면(로그아웃처럼
   * 비우지 않았다) 다른 계정이 들어와도 앞사람의 출생 정보 · 풀이가 남아 홈이 서버에서 되살리지 않고 그것을 보여 줬다. 비우면 홈이 되살린다(결정 029).
   * 기기 저장소를 비우지 못해도 로그인은 막지 않는다
   */
  async function newSession(token: string | null) {
    await deps.clearDeviceData().catch(() => {});
    await signedIn(token);
  }

  /**
   * 서버가 세션이 없다고 했다(401). 로그인 전이 되고 기기의 사람 것도 비운다 — 다음 로그인이 어차피 비우니 같은 사람이 다시 들어와도
   * 되살리기는 한 번 그대로이고, 그 사이(웹의 함께 쓰는 브라우저 등) 기기에 앞사람의 것이 남지 않는다
   */
  async function expired() {
    await signedOut();
    await deps.clearDeviceData().catch(() => {});
  }

  async function signedOut(lastError: string | null = null) {
    signupToken = null;
    signupProvider = null;
    await deps.clearSignup();
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
        // 가입 중간에 나갔다 돌아왔다(결정 068): 살아 있는 세션이 없을 때만 보관한 가입권으로 가입 중을 잇는다.
        // 살아 있는 세션(앱 토큰 · 웹 쿠키)이 먼저다 — 남은 가입권은 지운다(가입 뒤 지우지 못했거나 재설치 30분 안이어도 세션을 잃지 않게)
        const resume = async (otherwise: () => void | Promise<void>) => {
          const ticket = await deps.loadSignup();
          if (!ticket) return otherwise();
          signupToken = ticket.signupToken;
          signupProvider = ticket.provider;
          set('signingUp', null);
        };
        const alive = async (token: string | null) => {
          await deps.clearSignup();
          set('signedIn', token);
        };
        if (deps.cookieSession) {
          // 판정 순서: 살아 있음 → 로그인 · 403 ACCOUNT_SUSPENDED → 로그인(쿠키 세션은 살아 있고 정지 화면은 문이 보낸다, 서버 결정 044) ·
          // 401 → 로그인 전 · 그 밖(닿지 못함 · 5xx) → 확인하지 못함(결정 068 의 4 — 로그인 전으로 정하지 않는다). 세션이 없으면 이어 하기가 먼저
          const r = await deps.getSession();
          if (r.ok || r.code === 'ACCOUNT_SUSPENDED') return alive(null);
          if (r.error !== 'LOGIN_REQUIRED') return resume(() => set('offline', null));
          return resume(async () => {
            await deps.clearDeviceData().catch(() => {});
            set('signedOut', null);
          });
        }
        const kept = await deps.loadToken();
        if (!kept) return resume(() => set('signedOut', null));
        deps.setApiToken(kept);
        const r = await deps.getSession();
        if (!r.ok && r.error === 'LOGIN_REQUIRED') return expired();
        await alive(kept);
      })();
      return starting;
    },

    /** 확인하지 못한(offline) 세션을 다시 확인한다(연결이 돌아옴 · 다시 시도). 살아 있으면 로그인 상태, 401 이면 로그인 전, 또 닿지 못하면 그대로 */
    async recheck(): Promise<void> {
      if (state.status !== 'offline') return;
      const r = await deps.getSession();
      if (state.status !== 'offline') return;
      if (r.ok || r.code === 'ACCOUNT_SUSPENDED') set('signedIn', null);
      else if (r.error === 'LOGIN_REQUIRED') await expired();
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
        signupProvider = credential.provider;
        await deps.saveSignup(r.data.signupToken, credential.provider, r.data.expiresAt);
        set('signingUp', null);
        return 'signingUp';
      }
      await newSession(r.data.token);
      await deps.saveLastProvider(credential.provider);
      deps.onSignedIn?.({ kind: 'login', provider: credential.provider });
      return 'signedIn';
    },

    /**
     * 가입을 마친다(출생 정보 + 닉네임 · 프로필 · 약관 버전 · 동의, 결정 042). 가입권 만료(`SIGNUP_EXPIRED`)면 로그인 전으로.
     * 만 14세 미만(`UNDER_AGE`)이면 서버가 가입권을 지웠으므로 버리되, 화면이 생년월일 칸 아래에 이유를 보여 주게 가입 중에 머문다 —
     * 그다음 동작(다시 보내기 · 닉네임 확인)은 가입권이 없어 로그인 전이 되고 로그인 화면이 같은 이유를 보여 준다.
     * 닉네임 · 약관 · 프로필 · 출생 정보가 틀렸거나 서버에 닿지 못했으면 가입 중에 머문다(가입권이 남아 다시 보낼 수 있다). 결과를 그대로 돌려준다.
     */
    completeSignup({ birth, ...extra }: SignupInput): Promise<ApiResult<SignupResult>> {
      // 가입 중이 아니면(이미 가입을 마쳤거나 로그인 전) 아무것도 하지 않는다 — 남은 가입 단계에서 눌러도 세션을 건드리지 않게
      if (state.status !== 'signingUp') return Promise.resolve({ ok: false, error: 'LOGIN_REQUIRED', code: 'SIGNUP_EXPIRED' });
      submitting ??= (async (): Promise<ApiResult<SignupResult>> => {
        if (!signupToken) return noTicket();
        const r = await deps.signup(signupToken, birth, extra);
        if (r.ok) {
          const provider = signupProvider;
          // 가입 화면은 이 결과를 받은 뒤에 새 사람의 출생 정보를 기기에 둔다 — 비우기는 그보다 먼저 끝난다
          await newSession(r.data.token);
          if (provider) await deps.saveLastProvider(provider);
          if (provider) deps.onSignedIn?.({ kind: 'signup', provider, timeKnown: birth.time !== null });
          return r;
        }
        if (r.error === 'LOGIN_REQUIRED') await signedOut(reasonOf(r));
        else if (r.code === 'UNDER_AGE') {
          signupToken = null;
          await deps.clearSignup();
          set('signingUp', null, 'UNDER_AGE');
        } else set('signingUp', null, reasonOf(r));
        return r;
      })().finally(() => {
        submitting = null;
      });
      return submitting;
    },

    /**
     * 가입 중인 사람의 닉네임을 쓸 수 있는지 서버에 묻는다(결정 042). 가입권은 메모리의 것을 쓴다.
     * 가입권이 없거나 만료(`SIGNUP_EXPIRED`)면 로그인 전으로 돌아간다. 결과를 그대로 돌려준다.
     */
    async checkNickname(nickname: string): Promise<ApiResult<NicknameAvailability>> {
      // 가입 중이 아니면 아무것도 하지 않는다(가입을 마친 뒤 남은 닉네임 단계에서 눌러도 로그아웃되지 않게)
      if (state.status !== 'signingUp') return { ok: false, error: 'LOGIN_REQUIRED', code: 'SIGNUP_EXPIRED' };
      if (!signupToken) return noTicket();
      const r = await deps.checkNickname(signupToken, nickname);
      if (!r.ok && r.code === 'SIGNUP_EXPIRED') await signedOut(reasonOf(r));
      return r;
    },

    /** 가입을 그만둔다(약관 단계에서 뒤로, 결정 042). 가입권을 버리고 이유 없이 로그인 전이 된다 */
    async cancelSignup(): Promise<void> {
      // 가입 중일 때만(가입을 마친 뒤 남은 약관 단계의 뒤로가 로그아웃시키지 않게)
      if (state.status !== 'signingUp') return;
      await signedOut();
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
      // 켤 때의 확인 중(401 은 그 확인의 답)이면 start 가 판정한다 — 여기서 로그인 전으로 바꾸면 이어 할 가입권까지 지운다(결정 068)
      if (state.status === 'checking') return false;
      await expired();
      return false;
    },

    /** 계정을 지웠을 때. 보관된 토큰을 버리고 로그인 전이 된다 */
    async clear(): Promise<void> {
      await signedOut();
    },
  };
}
