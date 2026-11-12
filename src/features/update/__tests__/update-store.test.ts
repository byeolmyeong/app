import { createUpdateStore } from '@/features/update/update-store';
import type { ApiResult, AppConfig, PlatformConfig } from '@/lib/api';
import type { AppClient } from '@/lib/app-client';

const STORE_URL = 'https://store.example.test/app';
const open: PlatformConfig = { minVersion: null, storeUrl: null, message: null, blockNow: false };
const ios: AppClient = { platform: 'ios', version: '1.0.0' };

const configOf = (mine: Partial<PlatformConfig>, other: Partial<PlatformConfig> = {}): ApiResult<AppConfig> => ({
  ok: true,
  data: { ios: { ...open, ...mine }, android: { ...open, ...other } },
});

function setup(client: AppClient | null, ...results: ApiResult<AppConfig>[]) {
  const getAppConfig = jest.fn<Promise<ApiResult<AppConfig>>, []>();
  for (const r of results) getAppConfig.mockResolvedValueOnce(r);
  getAppConfig.mockResolvedValue(results[results.length - 1] ?? { ok: false, error: 'NETWORK' });
  const store = createUpdateStore({ client, getAppConfig });
  return { store, getAppConfig };
}

describe('강제 업데이트 판정(결정 027)', () => {
  it('처음에는 막지 않는다', () => {
    const { store, getAppConfig } = setup(ios);
    expect(store.getSnapshot()).toEqual({ blocked: false, message: null, storeUrl: null });
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
    expect(store.getSnapshot()).toEqual({ blocked: true, message: '꼭 업데이트해 주세요', storeUrl: STORE_URL });
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

  it('웹(client 가 없다)에서는 확인하지 않고, 426 알림도 막지 않는다', async () => {
    const { store, getAppConfig } = setup(null, configOf({ minVersion: '9.0.0' }, { minVersion: '9.0.0' }));
    await store.check();
    store.force();
    expect(getAppConfig).not.toHaveBeenCalled();
    expect(store.getSnapshot().blocked).toBe(false);
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
    expect(store.getSnapshot()).toEqual({ blocked: true, message: null, storeUrl: null });
    await store.check();
    expect(getAppConfig).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot()).toEqual({ blocked: true, message: null, storeUrl: STORE_URL });
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
    const store = createUpdateStore({ client: ios, getAppConfig });
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
    expect(store.getSnapshot()).toEqual({ blocked: true, message: null, storeUrl: STORE_URL });
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
