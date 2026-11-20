import { createUpdateStore } from '@/features/update/update-store';
import type { ApiResult, AppConfig, PlatformConfig } from '@/lib/api';
import type { AppClient } from '@/lib/app-client';

const STORE_URL = 'https://store.example.test/app';
const open: PlatformConfig = { minVersion: null, latestVersion: null, storeUrl: null, message: null, blockNow: false };
const ios: AppClient = { platform: 'ios', version: '1.0.0' };

const configOf = (mine: Partial<PlatformConfig>, other: Partial<PlatformConfig> = {}): ApiResult<AppConfig> => ({
  ok: true,
  data: { ios: { ...open, ...mine }, android: { ...open, ...other } },
});

/** 기기에 적어 둔 "물은 최신 버전"(결정 059). 처음에는 아무것도 묻지 않았다 */
function askedStorage(initial: string | null = null) {
  return {
    loadAsked: jest.fn<Promise<string | null>, []>(async () => initial),
    saveAsked: jest.fn<Promise<void>, [string]>(async () => {}),
  };
}

function setup(client: AppClient | null, ...results: ApiResult<AppConfig>[]) {
  const getAppConfig = jest.fn<Promise<ApiResult<AppConfig>>, []>();
  for (const r of results) getAppConfig.mockResolvedValueOnce(r);
  getAppConfig.mockResolvedValue(results[results.length - 1] ?? { ok: false, error: 'NETWORK' });
  const store = createUpdateStore({ client, getAppConfig, ...askedStorage() });
  return { store, getAppConfig };
}

describe('강제 업데이트 판정(결정 027)', () => {
  it('처음에는 막지 않는다', () => {
    const { store, getAppConfig } = setup(ios);
    expect(store.getSnapshot()).toEqual({ blocked: false, message: null, storeUrl: null, maintenance: null });
    expect(getAppConfig).not.toHaveBeenCalled();
  });

  it('내 버전이 내 플랫폼의 최소 버전보다 낮으면 막고, 안내와 스토어 주소를 함께 둔다', async () => {
    const { store } = setup(
      ios,
      configOf({ minVersion: '1.0.1', storeUrl: STORE_URL, message: '꼭 업데이트해 주세요' }),
    );
    const listener = jest.fn();
    store.subscribe(listener);
    await store.check();
    expect(store.getSnapshot()).toEqual({
      blocked: true,
      message: '꼭 업데이트해 주세요',
      storeUrl: STORE_URL,
      maintenance: null,
    });
    expect(listener).toHaveBeenCalled();
  });

  it('다른 플랫폼의 최소 버전은 보지 않는다', async () => {
    const { store } = setup(ios, configOf({}, { minVersion: '9.0.0' }));
    await store.check();
    expect(store.getSnapshot().blocked).toBe(false);

    const android = setup({ platform: 'android', version: '1.0.0' }, configOf({}, { minVersion: '9.0.0' }));
    await android.store.check();
    expect(android.store.getSnapshot().blocked).toBe(true);
  });

  it.each([
    ['같은 버전', '1.0.0'],
    ['더 낮은 최소 버전', '0.9.9'],
    ['없음(null)', null],
    ['읽을 수 없는 값', 'latest'],
  ])('최소 버전이 %s 이면 막지 않는다', async (_name, minVersion) => {
    const { store } = setup(ios, configOf({ minVersion, blockNow: true }));
    await store.check();
    expect(store.getSnapshot().blocked).toBe(false);
  });

  it.each([
    ['네트워크', { ok: false, error: 'NETWORK' }],
    ['서버 오류', { ok: false, error: 'SERVER', status: 503 }],
    ['모양이 다름', { ok: false, error: 'INVALID', status: 200 }],
    ['한도', { ok: false, error: 'LIMIT', status: 429 }],
  ] as [string, ApiResult<AppConfig>][])(
    '설정을 받지 못하면(%s) 막지 않고, 스스로 다시 부르지 않는다',
    async (_name, failure) => {
      const { store, getAppConfig } = setup(ios, failure);
      await store.check();
      expect(store.getSnapshot().blocked).toBe(false);
      expect(getAppConfig).toHaveBeenCalledTimes(1);
    },
  );

  it('웹(client 가 없다)에서는 버전으로 막지 않고, 426 알림도 막지 않는다(설정은 점검 때문에 받는다. 결정 030)', async () => {
    const { store, getAppConfig } = setup(null, configOf({ minVersion: '9.0.0' }, { minVersion: '9.0.0' }));
    await store.check();
    store.force();
    expect(getAppConfig).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({ blocked: false, message: null, storeUrl: null, maintenance: null });
  });

  it('바쁜 화면이 있으면 막는 것을 미루고, 모두 나오면 막는다', async () => {
    const { store } = setup(ios, configOf({ minVersion: '2.0.0' }));
    const leaveFirst = store.enterBusy();
    const leaveSecond = store.enterBusy();
    await store.check();
    expect(store.getSnapshot().blocked).toBe(false);

    leaveFirst();
    expect(store.getSnapshot().blocked).toBe(false);
    // 같은 화면이 두 번 나와도 한 번만 센다.
    leaveFirst();
    expect(store.getSnapshot().blocked).toBe(false);

    const listener = jest.fn();
    store.subscribe(listener);
    leaveSecond();
    expect(store.getSnapshot().blocked).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('이미 막힌 뒤에 바쁨이 등록돼도 풀리지 않는다', async () => {
    const { store } = setup(ios, configOf({ minVersion: '2.0.0' }));
    await store.check();
    store.enterBusy();
    expect(store.getSnapshot().blocked).toBe(true);
  });

  it('426 알림은 바쁜 화면이 있어도 바로 막고, 스토어 주소를 받으러 설정을 한 번 묻는다', async () => {
    const { store, getAppConfig } = setup(ios, configOf({ minVersion: '2.0.0', storeUrl: STORE_URL }));
    store.enterBusy();
    store.force();
    expect(store.getSnapshot()).toEqual({ blocked: true, message: null, storeUrl: null, maintenance: null });
    await store.check();
    expect(getAppConfig).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({ blocked: true, message: null, storeUrl: STORE_URL, maintenance: null });
  });

  it('426 으로 막힌 것은 설정을 받지 못하거나 설정이 괜찮다고 해도 풀리지 않는다', async () => {
    const { store } = setup(ios, { ok: false, error: 'NETWORK' }, configOf({ minVersion: null }));
    store.force();
    await store.check();
    expect(store.getSnapshot().blocked).toBe(true);
    await store.check();
    expect(store.getSnapshot().blocked).toBe(true);
  });

  it('설정 요청이 426 을 받아 알림이 또 와도 다시 묻지 않는다(되풀이하지 않는다)', async () => {
    const getAppConfig = jest.fn<Promise<ApiResult<AppConfig>>, []>();
    const store = createUpdateStore({ client: ios, getAppConfig, ...askedStorage() });
    getAppConfig.mockImplementation(async () => {
      store.force();
      return { ok: false, error: 'SERVER', status: 426, code: 'UPDATE_REQUIRED' };
    });
    store.force();
    await store.check();
    await Promise.resolve();
    expect(getAppConfig).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().blocked).toBe(true);
  });

  it('다시 확인이 실패하면 앞의 판정을 그대로 두고, 성공하면 새 판정을 따른다', async () => {
    const { store } = setup(
      ios,
      configOf({ minVersion: '2.0.0', storeUrl: STORE_URL }),
      { ok: false, error: 'NETWORK' },
      configOf({ minVersion: '1.0.0' }),
    );
    await store.check();
    expect(store.getSnapshot().blocked).toBe(true);
    await store.check();
    expect(store.getSnapshot()).toEqual({ blocked: true, message: null, storeUrl: STORE_URL, maintenance: null });
    await store.check();
    expect(store.getSnapshot().blocked).toBe(false);
  });

  it('확인이 겹치면 서버는 한 번만 부른다', async () => {
    const { store, getAppConfig } = setup(ios, configOf({}));
    await Promise.all([store.check(), store.check()]);
    expect(getAppConfig).toHaveBeenCalledTimes(1);
    await store.check();
    expect(getAppConfig).toHaveBeenCalledTimes(2);
  });

  it('판정이 바뀌지 않으면 같은 스냅숏을 준다', async () => {
    const { store } = setup(ios, configOf({}));
    const before = store.getSnapshot();
    await store.check();
    expect(store.getSnapshot()).toBe(before);
  });
});

describe('점검 판정(결정 030)', () => {
  const calm = configOf({});
  /** 503 알림이 스스로 부른 확인이 끝나기를 기다린다 */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));
  const maintenanceOf = (active: boolean, message: string | null = null, mine: Partial<PlatformConfig> = {}) => {
    const config = configOf(mine);
    return config.ok ? { ...config, data: { ...config.data, maintenance: { active, message } } } : config;
  };

  it('설정이 점검 중이면 점검을 알리고 안내를 함께 둔다. 버전 판정과는 따로다', async () => {
    const { store } = setup(ios, maintenanceOf(true, '새벽 2시까지 점검해요'));
    const listener = jest.fn();
    store.subscribe(listener);
    await store.check();
    expect(store.getSnapshot()).toEqual({
      blocked: false,
      message: null,
      storeUrl: null,
      maintenance: { message: '새벽 2시까지 점검해요' },
    });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('점검 중이 아니거나(active: false) maintenance 키가 없으면 알리지 않는다', async () => {
    for (const config of [maintenanceOf(false, '끝났어요'), calm]) {
      const { store } = setup(ios, config);
      await store.check();
      expect(store.getSnapshot().maintenance).toBeNull();
    }
  });

  it('웹(client 가 없다)에서도 점검을 알린다', async () => {
    const { store, getAppConfig } = setup(null, maintenanceOf(true, null, { minVersion: '9.0.0' }));
    await store.check();
    expect(getAppConfig).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({
      blocked: false,
      message: null,
      storeUrl: null,
      maintenance: { message: null },
    });
  });

  it('다음에 성공한 확인이 점검이 끝났다고 하면 스스로 풀린다. 확인이 실패하면 그대로 둔다', async () => {
    const { store } = setup(ios, maintenanceOf(true), { ok: false, error: 'NETWORK' }, maintenanceOf(false));
    await store.check();
    expect(store.getSnapshot().maintenance).not.toBeNull();
    await store.check();
    expect(store.getSnapshot().maintenance).not.toBeNull();
    await store.check();
    expect(store.getSnapshot().maintenance).toBeNull();
  });

  it('점검과 업데이트가 함께면 둘 다 판정해 둔다(점검이 풀리면 업데이트가 남는다)', async () => {
    const { store } = setup(
      ios,
      maintenanceOf(true, null, { minVersion: '2.0.0', storeUrl: STORE_URL }),
      maintenanceOf(false, null, { minVersion: '2.0.0', storeUrl: STORE_URL }),
    );
    await store.check();
    expect(store.getSnapshot()).toEqual({
      blocked: true,
      message: null,
      storeUrl: STORE_URL,
      maintenance: { message: null },
    });
    await store.check();
    expect(store.getSnapshot()).toEqual({ blocked: true, message: null, storeUrl: STORE_URL, maintenance: null });
  });

  it('설정으로 안 점검은 바쁜 화면이 있으면 미루고, 모두 나오면 알린다. 알린 뒤의 바쁨은 풀지 않는다', async () => {
    const { store } = setup(ios, maintenanceOf(true));
    const leave = store.enterBusy();
    await store.check();
    expect(store.getSnapshot().maintenance).toBeNull();
    leave();
    expect(store.getSnapshot().maintenance).toEqual({ message: null });
    store.enterBusy();
    expect(store.getSnapshot().maintenance).not.toBeNull();
  });

  it('503 알림은 바쁜 화면이 있어도 바로 알리고, 안내를 받으러 설정을 한 번 묻는다', async () => {
    const { store, getAppConfig } = setup(ios, maintenanceOf(true, '곧 돌아올게요'));
    store.enterBusy();
    store.maintain();
    expect(store.getSnapshot().maintenance).toEqual({ message: null });
    await settle();
    expect(getAppConfig).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().maintenance).toEqual({ message: '곧 돌아올게요' });
  });

  it('503 알림은 웹에서도 알린다', () => {
    const { store } = setup(null, calm);
    store.maintain();
    expect(store.getSnapshot().maintenance).toEqual({ message: null });
  });

  it('503 으로 알린 점검은 붙박이가 아니다: 그 뒤 성공한 확인이 끝났다고 하면 풀린다', async () => {
    const { store } = setup(ios, maintenanceOf(true), { ok: false, error: 'NETWORK' }, maintenanceOf(false));
    store.maintain();
    await settle();
    expect(store.getSnapshot().maintenance).not.toBeNull();
    await store.check();
    expect(store.getSnapshot().maintenance).not.toBeNull();
    await store.check();
    expect(store.getSnapshot().maintenance).toBeNull();
  });

  it('503 알림이 스스로 부른 확인은 점검을 풀지 않는다(설정이 아직 아니라고 해도. 풀렸다 막혔다 되풀이하지 않게)', async () => {
    const { store, getAppConfig } = setup(ios, maintenanceOf(false, '안내만 먼저'), maintenanceOf(false));
    store.maintain();
    await settle();
    expect(getAppConfig).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().maintenance).not.toBeNull();
    // 사용자가 다시 확인하면(또는 앞으로 돌아오면) 풀린다.
    await store.check();
    expect(store.getSnapshot().maintenance).toBeNull();
  });

  it('알림이 부른 확인이 도는 중에 다시 확인을 누르면, 그것이 끝난 뒤 새로 확인해 풀 수 있다', async () => {
    const { store, getAppConfig } = setup(ios, maintenanceOf(false));
    store.maintain();
    await store.check();
    expect(getAppConfig).toHaveBeenCalledTimes(2);
    expect(store.getSnapshot().maintenance).toBeNull();
  });

  it('확인이 도는 중에 온 503 알림은 그 확인의 답으로 풀리지 않는다(답이 알림보다 옛것이다)', async () => {
    const { store, getAppConfig } = setup(ios, maintenanceOf(false));
    const checking = store.check();
    store.maintain();
    await checking;
    expect(store.getSnapshot().maintenance).not.toBeNull();
    expect(getAppConfig).toHaveBeenCalledTimes(1);
  });

  it('설정 요청이 503 을 받아 알림이 또 와도 다시 묻지 않는다(되풀이하지 않는다)', async () => {
    const getAppConfig = jest.fn<Promise<ApiResult<AppConfig>>, []>();
    const store = createUpdateStore({ client: ios, getAppConfig, ...askedStorage() });
    getAppConfig.mockImplementation(async () => {
      store.maintain();
      return { ok: false, error: 'SERVER', status: 503, code: 'MAINTENANCE' };
    });
    store.maintain();
    await settle();
    expect(getAppConfig).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().maintenance).not.toBeNull();
  });
});

describe('업데이트 권유 판정(결정 059)', () => {
  /** 내 버전 1.0.0 보다 새 최신 1.1.0 이 나왔다(최소는 없다) */
  const newer = configOf({ latestVersion: '1.1.0', storeUrl: STORE_URL });
  /** 물은 버전을 읽고 쓰는 일이 끝나기를 기다린다 */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

  function setupSuggest(client: AppClient | null, asked: string | null, ...results: ApiResult<AppConfig>[]) {
    const getAppConfig = jest.fn<Promise<ApiResult<AppConfig>>, []>();
    for (const r of results) getAppConfig.mockResolvedValueOnce(r);
    getAppConfig.mockResolvedValue(results[results.length - 1]);
    const storage = askedStorage(asked);
    const store = createUpdateStore({ client, getAppConfig, ...storage });
    return { store, ...storage };
  }

  it('최신보다 낮고 최소 이상이면 물은 버전을 읽은 뒤 그 최신 버전을 권한다. 막지는 않는다', async () => {
    const { store, loadAsked } = setupSuggest(ios, null, newer);
    expect(store.getSuggestion()).toBeNull();
    const listener = jest.fn();
    store.subscribe(listener);
    await store.check();
    await settle();
    expect(loadAsked).toHaveBeenCalledTimes(1);
    expect(store.getSuggestion()).toBe('1.1.0');
    expect(store.getSnapshot().blocked).toBe(false);
    expect(listener).toHaveBeenCalled();
  });

  it('권할 일이 없으면 기기 저장소를 읽지 않는다(최신이 없음 · 최신과 같음)', async () => {
    for (const config of [configOf({}), configOf({ latestVersion: '1.0.0' })]) {
      const { store, loadAsked } = setupSuggest(ios, null, config);
      await store.check();
      await settle();
      expect(store.getSuggestion()).toBeNull();
      expect(loadAsked).not.toHaveBeenCalled();
    }
  });

  it('같은 최신 버전을 이미 물었으면 권하지 않고, 더 새 최신이 나오면 다시 권한다', async () => {
    const { store } = setupSuggest(ios, '1.1.0', newer, configOf({ latestVersion: '1.2.0', storeUrl: STORE_URL }));
    await store.check();
    await settle();
    expect(store.getSuggestion()).toBeNull();
    await store.check();
    expect(store.getSuggestion()).toBe('1.2.0');
  });

  it('창을 닫으면(나중에 · 업데이트) 그 최신 버전을 기기에 적고 다시 권하지 않는다', async () => {
    const { store, saveAsked } = setupSuggest(ios, null, newer);
    await store.check();
    await settle();
    store.dismissSuggestion();
    expect(store.getSuggestion()).toBeNull();
    expect(saveAsked).toHaveBeenCalledWith('1.1.0');
    await store.check();
    expect(store.getSuggestion()).toBeNull();
  });

  it('권하기로 정해진 뒤에 바쁜 화면에 들어가면 권유를 거두고 알린다, 나오면 다시 권한다(리뷰 PR #44)', async () => {
    const { store } = setupSuggest(ios, null, newer);
    await store.check();
    await settle();
    expect(store.getSuggestion()).toBe('1.1.0');
    const listener = jest.fn();
    store.subscribe(listener);
    const leave = store.enterBusy();
    expect(store.getSuggestion()).toBeNull();
    expect(listener).toHaveBeenCalled();
    leave();
    expect(store.getSuggestion()).toBe('1.1.0');
  });

  it('바쁜 화면이 있으면 미루고, 모두 나오면 권한다', async () => {
    const { store } = setupSuggest(ios, null, newer);
    const leave = store.enterBusy();
    await store.check();
    await settle();
    expect(store.getSuggestion()).toBeNull();
    leave();
    expect(store.getSuggestion()).toBe('1.1.0');
  });

  it('최소보다 낮으면 권하지 않고 막는다', async () => {
    const { store, loadAsked } = setupSuggest(ios, null, configOf({ minVersion: '1.0.1', latestVersion: '1.1.0', storeUrl: STORE_URL }));
    await store.check();
    await settle();
    expect(store.getSuggestion()).toBeNull();
    expect(store.getSnapshot().blocked).toBe(true);
    expect(loadAsked).not.toHaveBeenCalled();
  });

  it('426 으로 막히거나 점검 중이면 권하지 않는다', async () => {
    const forced = setupSuggest(ios, null, newer);
    await forced.store.check();
    await settle();
    forced.store.force();
    expect(forced.store.getSuggestion()).toBeNull();

    const down = newer.ok ? { ...newer, data: { ...newer.data, maintenance: { active: true, message: null } } } : newer;
    const maintenance = setupSuggest(ios, null, down);
    await maintenance.store.check();
    await settle();
    expect(maintenance.store.getSuggestion()).toBeNull();
  });

  it('웹(client 가 없다)에서는 권하지 않는다', async () => {
    const { store, loadAsked } = setupSuggest(null, null, newer);
    await store.check();
    await settle();
    expect(store.getSuggestion()).toBeNull();
    expect(loadAsked).not.toHaveBeenCalled();
  });

  it('기기 저장소를 읽지 못하면 이번에는 권하지 않는다', async () => {
    const { store, loadAsked } = setupSuggest(ios, null, newer);
    loadAsked.mockRejectedValueOnce(new Error('storage'));
    await store.check();
    await settle();
    expect(store.getSuggestion()).toBeNull();
  });
});
