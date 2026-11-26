/** 결정 040 · 계획 docs/plans/2026-11-19-product-analytics.md 태스크 3 */
jest.mock('@amplitude/analytics-react-native', () => ({
  init: jest.fn(() => ({ promise: Promise.resolve() })),
  track: jest.fn(() => ({ promise: Promise.resolve() })),
  setUserId: jest.fn(),
  reset: jest.fn(),
  Types: { LogLevel: { None: 0, Error: 1, Warn: 2, Verbose: 3, Debug: 4 } },
}));

// jest 는 동적 import 를 돌리지 못한다 — 불러오기를 위 가짜 SDK 로 바꾼다(부를 때 바깥 가짜를 본다)
jest.mock('@/lib/analytics/sdk', () => ({
  loadSdk: () => Promise.resolve(jest.requireMock('@amplitude/analytics-react-native')),
}));

type Amplitude = {
  init: jest.Mock;
  track: jest.Mock;
  setUserId: jest.Mock;
  reset: jest.Mock;
};
type AnalyticsModule = typeof import('@/lib/analytics');

/** 모듈 상태(초기화 여부)를 테스트마다 새로 시작한다 */
function load(apiKey?: string): { analytics: AnalyticsModule; amplitude: Amplitude } {
  if (apiKey === undefined) delete process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY;
  else process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY = apiKey;
  let analytics!: AnalyticsModule;
  jest.isolateModules(() => {
    analytics = jest.requireActual<AnalyticsModule>('@/lib/analytics');
  });
  // SDK 는 초기화 때 동적 import 로 불러온다 — 그때는 격리 밖이라 바깥 가짜를 본다
  return { analytics, amplitude: jest.requireMock<Amplitude>('@amplitude/analytics-react-native') };
}

/** 동적 import(SDK 불러오기)가 끝나기를 기다린다 */
const loaded = () => new Promise((resolve) => setTimeout(resolve, 0));

const ANALYTICS_ID = '0123456789abcdef0123456789abcdef';

afterEach(() => {
  delete process.env.EXPO_PUBLIC_AMPLITUDE_API_KEY;
  jest.restoreAllMocks();
  // 가짜 SDK 는 테스트끼리 같은 객체라 호출 기록·바꾼 동작을 비운다
  jest.resetAllMocks();
});

describe('키가 없으면', () => {
  it('SDK 를 한 번도 부르지 않는다(로컬 개발은 아무것도 보내지 않는다)', () => {
    const { analytics, amplitude } = load();
    analytics.initAnalytics();
    analytics.track('login_started', { provider: 'kakao' });
    analytics.identify(ANALYTICS_ID);
    analytics.resetAnalytics();
    expect(amplitude.init).not.toHaveBeenCalled();
    expect(amplitude.track).not.toHaveBeenCalled();
    expect(amplitude.setUserId).not.toHaveBeenCalled();
    expect(amplitude.reset).not.toHaveBeenCalled();
  });

  it('공백뿐인 키도 없는 것으로 본다', () => {
    const { analytics, amplitude } = load('   ');
    analytics.initAnalytics();
    expect(amplitude.init).not.toHaveBeenCalled();
  });
});

describe('웹 서버 렌더링(Node — 정적 내보내기 · 개발 서버)', () => {
  it('window 가 없으면 키가 있어도 SDK 를 불러오지 않는다 — 빌드 기계에서 세션 이벤트가 나가지 않게', async () => {
    const { analytics, amplitude } = load('amp-key');
    const g = globalThis as { window?: unknown };
    const saved = g.window;
    // 모듈을 읽은 뒤에 없앤다(읽는 동안은 다른 라이브러리가 window 를 본다) — 초기화하는 순간만 Node 와 같게
    delete g.window;
    try {
      analytics.initAnalytics();
      await loaded();
      expect(analytics.isAnalyticsEnabled()).toBe(false);
      expect(amplitude.init).not.toHaveBeenCalled();
    } finally {
      g.window = saved;
    }
  });
});

describe('키가 있으면', () => {
  it('자동 수집·광고 식별자·IP 를 끄고 세션만 켜서 한 번 초기화한다', async () => {
    const { analytics, amplitude } = load('amp-key');
    analytics.initAnalytics();
    analytics.initAnalytics();
    await loaded();
    expect(amplitude.init).toHaveBeenCalledTimes(1);
    const [key, userId, options] = amplitude.init.mock.calls[0];
    expect(key).toBe('amp-key');
    expect(userId).toBeUndefined();
    expect(options.trackingOptions).toEqual(
      expect.objectContaining({ ipAddress: false, adid: false, appSetId: false, idfv: false, carrier: false }),
    );
    expect(options.autocapture).toEqual({
      sessions: true,
      appLifecycles: false,
      screenViews: false,
      elementInteractions: false,
      frustrationInteractions: false,
      networkTracking: false,
    });
    expect(options.attribution).toEqual(expect.objectContaining({ disabled: true }));
  });

  it('표에 있는 이벤트와 값은 그대로 보낸다', async () => {
    const { analytics, amplitude } = load('amp-key');
    analytics.initAnalytics();
    await loaded();
    analytics.track('signup_completed', { provider: 'apple', time_known: false });
    expect(amplitude.track).toHaveBeenCalledWith('signup_completed', { provider: 'apple', time_known: false });
  });

  it('값 목록 밖의 값과 표에 없는 속성은 버린다 — 자유 글자가 실려 가지 않는다', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { analytics, amplitude } = load('amp-key');
    analytics.initAnalytics();
    await loaded();
    const loose = analytics.track as unknown as (event: string, props: Record<string, unknown>) => void;
    loose('signup_completed', { provider: 'apple', time_known: true, birthDate: '1990-03-15', name: '지우' });
    loose('login_started', { provider: '1990-03-15' });
    loose('chart_viewed', { time_known: 'yes' });
    expect(amplitude.track.mock.calls).toEqual([
      ['signup_completed', { provider: 'apple', time_known: true }],
      ['login_started', {}],
      ['chart_viewed', {}],
    ]);
  });

  it('표에 없는 이벤트는 보내지 않는다', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { analytics, amplitude } = load('amp-key');
    analytics.initAnalytics();
    await loaded();
    (analytics.track as unknown as (event: string, props: object) => void)('birth_saved', { date: '1990-03-15' });
    expect(amplitude.track).not.toHaveBeenCalled();
  });

  it('identify 는 서버가 준 분석용 id(32자 16진수)만 받는다', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { analytics, amplitude } = load('amp-key');
    analytics.initAnalytics();
    await loaded();
    analytics.identify('someone@example.com');
    analytics.identify('3f2a9c1e-0000-4000-8000-000000000000');
    analytics.identify(ANALYTICS_ID);
    expect(amplitude.setUserId.mock.calls).toEqual([[ANALYTICS_ID]]);
  });

  it('resetAnalytics 는 사용자 id 를 지우고 기기 id 를 새로 만든다', async () => {
    const { analytics, amplitude } = load('amp-key');
    analytics.initAnalytics();
    await loaded();
    analytics.resetAnalytics();
    expect(amplitude.reset).toHaveBeenCalledTimes(1);
  });

  it('SDK 가 오류를 던져도 앱으로 새지 않는다', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { analytics, amplitude } = load('amp-key');
    amplitude.init.mockImplementation(() => {
      throw new Error('boom');
    });
    amplitude.track.mockImplementation(() => {
      throw new Error('boom');
    });
    expect(() => analytics.initAnalytics()).not.toThrow();
    await loaded();
    expect(() => analytics.track('login_started', { provider: 'google' })).not.toThrow();
  });

  it('SDK 를 불러오기 전의 호출은 모았다가 불러온 뒤 차례로 보낸다(웹 첫 화면 묶음에 SDK 를 넣지 않는다)', async () => {
    const { analytics, amplitude } = load('amp-key');
    analytics.initAnalytics();
    analytics.track('app_opened', { entry: 'direct' });
    analytics.identify(ANALYTICS_ID);
    expect(amplitude.init).not.toHaveBeenCalled();
    expect(amplitude.track).not.toHaveBeenCalled();
    await loaded();
    expect(amplitude.init).toHaveBeenCalledTimes(1);
    expect(amplitude.track.mock.calls).toEqual([['app_opened', { entry: 'direct' }]]);
    expect(amplitude.setUserId.mock.calls).toEqual([[ANALYTICS_ID]]);
    expect(amplitude.init.mock.invocationCallOrder[0]).toBeLessThan(amplitude.track.mock.invocationCallOrder[0]);
  });
});

describe('screenNameOf', () => {
  const { screenNameOf } = jest.requireActual('@/lib/analytics') as AnalyticsModule;

  it('주소 속 식별자를 경로 패턴으로 바꾸고 쿼리·조각은 버린다', () => {
    expect(screenNameOf('/s/abc123?x=1')).toBe('/s/[shareId]');
    expect(screenNameOf('/synastry/7d9a/report')).toBe('/synastry/[id]/report');
    expect(screenNameOf('/synastry/7d9a')).toBe('/synastry/[id]');
    expect(screenNameOf('/auth/kakao?code=zzz&state=1')).toBe('/auth/kakao');
    expect(screenNameOf('/reading#top')).toBe('/reading');
  });

  it('정적 경로가 같은 자리의 동적 경로보다 먼저다', () => {
    expect(screenNameOf('/synastry/ranking')).toBe('/synastry/ranking');
    expect(screenNameOf('/synastry')).toBe('/synastry');
  });

  it('끝의 / 와 index 는 같은 화면이다', () => {
    expect(screenNameOf('/')).toBe('/');
    expect(screenNameOf('/settings/faq/')).toBe('/settings/faq');
    expect(screenNameOf('/chart')).toBe('/chart');
  });

  it('모르는 주소는 주소를 옮기지 않고 (unknown) 이다', () => {
    expect(screenNameOf('/totally/unknown/abc123')).toBe('(unknown)');
  });

  it('경로 패턴 목록이 src/app 의 화면 파일과 같다 — 화면을 더하면 목록도 더해야 한다', () => {
    // 이 저장소에는 Node 타입이 없어 필요한 모양만 적는다. jest 는 저장소 뿌리에서 돈다.
    type Entry = { name: string; isDirectory(): boolean };
    const fs = jest.requireActual<{ readdirSync(dir: string, options: { withFileTypes: true }): Entry[] }>('fs');
    const root = `${process.cwd()}/src/app`;
    const fromFiles: string[] = [];
    const walk = (dir: string, prefix: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (entry.name !== '__tests__') walk(`${dir}/${entry.name}`, `${prefix}/${entry.name}`);
        } else if (entry.name.endsWith('.tsx') && !/^[_+]/.test(entry.name)) {
          // _layout 은 틀, +html 같은 + 파일은 화면이 아니다
          const route = `${prefix}/${entry.name.replace(/\.tsx$/, '')}`.replace(/\/index$/, '');
          fromFiles.push(route === '' ? '/' : route);
        }
      }
    };
    walk(root, '');
    fromFiles.sort();
    const { ROUTE_PATTERNS } = jest.requireActual('@/lib/analytics') as AnalyticsModule;
    expect([...ROUTE_PATTERNS].sort()).toEqual(fromFiles);
  });
});
