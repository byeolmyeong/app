import { createSessionStore, type SessionStoreDeps } from '@/features/auth/session-store';

type Overrides = Partial<SessionStoreDeps> & { stored?: string | null };

function setup({ stored = null, ...overrides }: Overrides = {}) {
  let kept: string | null = stored;
  const deps = {
    enabled: true,
    createDevSession: jest.fn(async () => ({ ok: true as const, data: { token: 'dev-token' } })),
    loadToken: jest.fn(async () => kept),
    saveToken: jest.fn(async (token: string) => {
      kept = token;
    }),
    deleteToken: jest.fn(async () => {
      kept = null;
    }),
    setApiToken: jest.fn(),
    ...overrides,
  } satisfies SessionStoreDeps;
  return { deps, store: createSessionStore(deps), kept: () => kept };
}

describe('개발용 세션', () => {
  it('환경 변수가 꺼져 있으면 /auth/dev 를 부르지 않고 보관된 토큰도 읽지 않는다', async () => {
    const { deps, store } = setup({ enabled: false });
    await store.start();
    expect(store.getSnapshot()).toEqual({ token: null, ready: true });
    expect(deps.createDevSession).not.toHaveBeenCalled();
    expect(deps.loadToken).not.toHaveBeenCalled();
    expect(await store.refresh()).toBe(false);
    expect(deps.createDevSession).not.toHaveBeenCalled();
  });

  it('켜져 있으면 시작할 때 토큰을 받아 보안 저장소에 두고 api 에 건넨다', async () => {
    const { deps, store, kept } = setup();
    expect(store.getSnapshot()).toEqual({ token: null, ready: false });
    await store.start();
    expect(store.getSnapshot()).toEqual({ token: 'dev-token', ready: true });
    expect(deps.createDevSession).toHaveBeenCalledTimes(1);
    expect(kept()).toBe('dev-token');
    expect(deps.setApiToken).toHaveBeenLastCalledWith('dev-token');
  });

  it('보관된 토큰이 있으면 그것을 쓰고 새로 받지 않는다', async () => {
    const { deps, store } = setup({ stored: 'kept-token' });
    await store.start();
    expect(store.getSnapshot()).toEqual({ token: 'kept-token', ready: true });
    expect(deps.createDevSession).not.toHaveBeenCalled();
    expect(deps.setApiToken).toHaveBeenLastCalledWith('kept-token');
  });

  it('여러 번 시작해도 한 번만 받는다', async () => {
    const { deps, store } = setup();
    await Promise.all([store.start(), store.start()]);
    await store.start();
    expect(deps.createDevSession).toHaveBeenCalledTimes(1);
  });

  it('받지 못하면 토큰 없이 준비가 끝난다', async () => {
    const { deps, store } = setup({
      createDevSession: jest.fn(async () => ({ ok: false as const, error: 'SERVER' as const, status: 404 })),
    });
    await store.start();
    expect(store.getSnapshot()).toEqual({ token: null, ready: true });
    expect(deps.saveToken).not.toHaveBeenCalled();
  });

  it('다시 받기는 보관된 토큰을 쓰지 않고 새로 받아 바꿔 둔다', async () => {
    const { deps, store, kept } = setup({ stored: 'expired-token' });
    await store.start();
    expect(await store.refresh()).toBe(true);
    expect(deps.createDevSession).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({ token: 'dev-token', ready: true });
    expect(kept()).toBe('dev-token');
    expect(deps.setApiToken).toHaveBeenLastCalledWith('dev-token');
  });

  it('동시에 다시 받기를 여러 번 불러도 한 번만 받는다', async () => {
    const { deps, store } = setup({ stored: 'expired-token' });
    await store.start();
    expect(await Promise.all([store.refresh(), store.refresh()])).toEqual([true, true]);
    expect(deps.createDevSession).toHaveBeenCalledTimes(1);
  });

  it('다시 받지 못하면 false 이고 토큰을 비운다', async () => {
    const { deps, store } = setup({
      stored: 'expired-token',
      createDevSession: jest.fn(async () => ({ ok: false as const, error: 'NETWORK' as const })),
    });
    await store.start();
    expect(await store.refresh()).toBe(false);
    expect(store.getSnapshot()).toEqual({ token: null, ready: true });
    expect(deps.setApiToken).toHaveBeenLastCalledWith(null);
  });

  it('비우면 보관된 토큰을 지우고 토큰 없이 남는다. 새로 받는 것은 다음 401 이나 다음에 켤 때다', async () => {
    const { deps, store, kept } = setup({ stored: 'kept-token' });
    await store.start();
    const listener = jest.fn();
    store.subscribe(listener);
    await store.clear();
    expect(kept()).toBeNull();
    expect(store.getSnapshot()).toEqual({ token: null, ready: true });
    expect(deps.setApiToken).toHaveBeenLastCalledWith(null);
    expect(listener).toHaveBeenCalled();
    expect(deps.createDevSession).not.toHaveBeenCalled();
    // 그 뒤 서버가 401 을 주면 새로 받는다
    expect(await store.refresh()).toBe(true);
    expect(store.getSnapshot()).toEqual({ token: 'dev-token', ready: true });
  });

  it('바뀌면 듣는 쪽에 알린다', async () => {
    const { store } = setup();
    const listener = jest.fn();
    const off = store.subscribe(listener);
    await store.start();
    expect(listener).toHaveBeenCalled();
    off();
    listener.mockClear();
    await store.refresh();
    expect(listener).not.toHaveBeenCalled();
  });
});
