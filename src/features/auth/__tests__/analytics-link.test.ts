import { linkAnalytics, type AnalyticsLinkDeps } from '@/features/auth/analytics-link';
import type { SessionStatus } from '@/features/auth/session-store';
import type { ApiResult, AnalyticsIdResult } from '@/lib/api';

const A = '0123456789abcdef0123456789abcdef';
const B = 'fedcba9876543210fedcba9876543210';

function fakeStore(initial: SessionStatus = 'checking') {
  let status = initial;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => ({ status }),
    set(next: SessionStatus) {
      status = next;
      listeners.forEach((l) => l());
    },
  };
}

function setup({ enabled = true, ids = [A] }: { enabled?: boolean; ids?: string[] } = {}) {
  const queue = [...ids];
  const deps = {
    enabled: () => enabled,
    fetchId: jest.fn(async (): Promise<ApiResult<AnalyticsIdResult>> => ({ ok: true, data: { analyticsId: queue.shift() ?? A } })),
    identify: jest.fn(),
    reset: jest.fn(),
  } satisfies AnalyticsLinkDeps;
  return deps;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('세션과 제품 분석 잇기(결정 081)', () => {
  it('로그인 상태가 되면 분석용 id 를 한 번 받아 identify 한다 — 같은 세션에서 다시 부르지 않는다', async () => {
    const store = fakeStore();
    const deps = setup();
    linkAnalytics(store, deps);
    store.set('signedIn');
    await flush();
    store.set('signedIn');
    await flush();
    expect(deps.fetchId).toHaveBeenCalledTimes(1);
    expect(deps.identify).toHaveBeenCalledWith(A);
  });

  it('키가 없으면(테스트앱 · 스테이징 · 로컬) 서버를 부르지 않는다', async () => {
    const store = fakeStore();
    const deps = setup({ enabled: false });
    linkAnalytics(store, deps);
    store.set('signedIn');
    await flush();
    expect(deps.fetchId).not.toHaveBeenCalled();
    expect(deps.identify).not.toHaveBeenCalled();
  });

  it('로그아웃하면 초기화하고, 다른 계정으로 로그인하면 새 값으로 identify 한다', async () => {
    const store = fakeStore();
    const deps = setup({ ids: [A, B] });
    linkAnalytics(store, deps);
    store.set('signedIn');
    await flush();
    store.set('signedOut');
    expect(deps.reset).toHaveBeenCalledTimes(1);
    store.set('signedIn');
    await flush();
    expect(deps.identify.mock.calls).toEqual([[A], [B]]);
  });

  it('켰는데 로그인 전이면 초기화하지 않는다 — 가입 전 기기 id 를 이어 간다', () => {
    const store = fakeStore();
    const deps = setup();
    linkAnalytics(store, deps);
    store.set('signedOut');
    store.set('signingUp');
    expect(deps.reset).not.toHaveBeenCalled();
  });

  it('받는 중에 로그아웃하면 늦게 온 값으로 identify 하지 않는다', async () => {
    const store = fakeStore();
    const deps = setup();
    let answer: (r: ApiResult<AnalyticsIdResult>) => void = () => {};
    deps.fetchId.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
    linkAnalytics(store, deps);
    store.set('signedIn');
    store.set('signedOut');
    answer({ ok: true, data: { analyticsId: A } });
    await flush();
    expect(deps.identify).not.toHaveBeenCalled();
    expect(deps.reset).toHaveBeenCalledTimes(1);
  });

  it('잇기 전에 이미 로그인 상태면 바로 받는다', async () => {
    const store = fakeStore('signedIn');
    const deps = setup();
    linkAnalytics(store, deps);
    await flush();
    expect(deps.identify).toHaveBeenCalledWith(A);
  });

  it('받지 못하면(서버 오류) identify 하지 않고 다음 로그인 상태 알림에 다시 받는다', async () => {
    const store = fakeStore();
    const deps = setup();
    deps.fetchId.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    linkAnalytics(store, deps);
    store.set('signedIn');
    await flush();
    expect(deps.identify).not.toHaveBeenCalled();
    store.set('signedIn');
    await flush();
    expect(deps.identify).toHaveBeenCalledWith(A);
  });
});
