import NetInfo from '@react-native-community/netinfo';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useOnReconnect, useOnline } from '@/components/use-online';
import { api } from '@/lib/api';

// 연결 끊김 띠가 연결돼 있는데도 남는 버그(계획 2026-11-27-1.1.0 의 A②-1, 1.0.1 핫픽스)를 진짜 NetInfo JS 로 재현한다.
// 가짜는 네이티브 한 겹뿐 — iOS 의 RNCConnectionStateWatcher 처럼 ① 값이 바뀔 때만 알리고 ② getCurrentState 는 마지막으로 알던 값을
// 그대로 돌려주며(다시 읽지 않는다) ③ isInternetReachable 을 주지 않는다(그래서 JS 가 구글 generate_204 로 확인한다).
jest.unmock('@react-native-community/netinfo');

type NativeState = { type: 'wifi' | 'none'; isConnected: boolean; details: null };
const WIFI: NativeState = { type: 'wifi', isConnected: true, details: null };
const NONE: NativeState = { type: 'none', isConnected: false, details: null };

const mockNative: { state: NativeState; handler: ((s: NativeState) => void) | null } = { state: WIFI, handler: null };
function nativeChange(next: NativeState) {
  if (mockNative.state.type === next.type && mockNative.state.isConnected === next.isConnected) return;
  mockNative.state = next;
  mockNative.handler?.(next);
}

jest.mock('@react-native-community/netinfo/lib/commonjs/internal/nativeInterface', () => ({
  __esModule: true,
  default: {
    getCurrentState: jest.fn(async () => mockNative.state),
    configure: jest.fn(),
    eventEmitter: {
      addListener: jest.fn((_event: string, handler: (s: NativeState) => void) => {
        mockNative.handler = handler;
        return { remove: () => (mockNative.handler = null) };
      }),
    },
  },
}));

// 구글 확인(generate_204)과 우리 서버를 한 fetch 로 흉내 낸다.
let googleUp = true;
let serverUp = true;
// 켜 두면 서버 응답을 붙잡아 두었다가 시험이 정한 순서로 끝낸다(true = 응답, false = 연결 오류)
let holdServer = false;
let held: ((reached: boolean) => void)[] = [];
const serverResponse = { status: 200, ok: true, json: async () => ({}) } as unknown as Response;
const fakeFetch = jest.fn(async (url: string) => {
  if (url.includes('generate_204')) {
    if (!googleUp) throw new TypeError('Network request failed');
    return { status: 204, ok: true, json: async () => null } as unknown as Response;
  }
  if (holdServer)
    return new Promise<Response>((resolve, reject) =>
      held.push((reached) => (reached ? resolve(serverResponse) : reject(new TypeError('Network request failed')))),
    );
  if (!serverUp) throw new TypeError('Network request failed');
  return serverResponse;
});

// NetInfo 의 구글 확인과 api 가 모두 전역 fetch 를 쓴다
let fetchSpy: jest.SpyInstance;
beforeAll(() => {
  fetchSpy = jest.spyOn(globalThis, 'fetch').mockImplementation(fakeFetch as unknown as typeof fetch);
});
afterAll(() => {
  fetchSpy.mockRestore();
});

beforeEach(async () => {
  jest.useFakeTimers();
  googleUp = true;
  serverUp = true;
  holdServer = false;
  held = [];
  mockNative.state = WIFI;
  // 앞 시험의 NetInfo 상태를 버리고 새로 만든다(configure 는 있던 상태를 걷고 다시 만든다).
  NetInfo.configure({});
});
afterEach(() => {
  jest.useRealTimers();
});

function Probe({ name = '' }: { name?: string }) {
  return <Text>{`${name}${useOnline() ? '연결됨' : '끊김'}`}</Text>;
}

/** 탭 화면처럼 useOnline · useOnReconnect 를 함께 쓴다 */
function Screen({ name, onBack }: { name: string; onBack: () => void }) {
  const online = useOnline();
  useOnReconnect(online, onBack);
  return <Text>{`${name}${online ? '연결됨' : '끊김'}`}</Text>;
}

async function passes(ms: number) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

describe('앱이 뒤에 있다 돌아올 때 — 연결 끊김 띠', () => {
  it('뒤에 있는 동안 네이티브가 "연결 없음"을 알리고 돌아올 때 다시 알리지 않으면, 서버가 답해도 띠가 남는다(iOS)', async () => {
    await render(<Probe />);
    await passes(0);
    expect(screen.getByText('연결됨')).toBeTruthy();

    // 잠금 화면 동안 와이파이가 잠들었다 — 앱이 멈추기 전에 "연결 없음"을 받았다.
    await act(async () => nativeChange(NONE));
    expect(screen.getByText('끊김')).toBeTruthy();

    // 앱이 멈춰 있는 동안 와이파이가 돌아왔지만 알림은 오지 않았다(네이티브 캐시는 그대로 "연결 없음").
    // 앱은 NetInfo.refresh() 를 부르지 않는다 — 불러도 네이티브 캐시를 그대로 받아 풀리지 않는다는 것을 함께 보인다(계획의 고칠 길 ① 이 iOS 에서 듣지 않는 까닭).
    // 돌아오면 업데이트 문(UpdateGate)이 /app-config 를 부른다 — 서버는 답한다.
    await act(async () => {
      await NetInfo.refresh();
      await api.getAppConfig();
    });
    await passes(10 * 60 * 1000);

    expect(fakeFetch).toHaveBeenCalledWith(expect.stringContaining('/app-config'), expect.anything());
    expect(screen.getByText('연결됨')).toBeTruthy();
  });

  it('돌아온 순간 구글 확인이 한 번 실패해도, 서버가 답하면 띠를 바로 치운다', async () => {
    await render(<Probe />);
    await passes(0);
    expect(screen.getByText('연결됨')).toBeTruthy();

    // 60초마다 하는 구글 확인이 돌아온 순간(네트워크가 아직 덜 깼을 때) 실패한다.
    googleUp = false;
    await passes(60 * 1000);
    expect(screen.getByText('끊김')).toBeTruthy();

    googleUp = true;
    await act(async () => {
      await api.getAppConfig();
    });
    expect(screen.getByText('연결됨')).toBeTruthy();
  });

  it('정말 끊겼을 때는 띠가 남는다 — 끊기기 전에 서버가 답했던 것으로 덮지 않고, 서버 호출이 실패해도 그대로', async () => {
    await render(<Probe />);
    await act(async () => {
      await api.getAppConfig();
    });
    expect(screen.getByText('연결됨')).toBeTruthy();

    serverUp = false;
    googleUp = false;
    await act(async () => nativeChange(NONE));
    expect(screen.getByText('끊김')).toBeTruthy();

    await act(async () => {
      await api.getAppConfig();
    });
    await passes(60 * 1000);
    expect(screen.getByText('끊김')).toBeTruthy();
  });

  it('띠가 떠 있다가 서버가 답해 치웠는데 다시 서버 호출이 실패하면 띠가 돌아온다', async () => {
    await render(<Probe />);
    await passes(0);
    await act(async () => nativeChange(NONE));
    await act(async () => {
      await api.getAppConfig();
    });
    expect(screen.getByText('연결됨')).toBeTruthy();

    serverUp = false;
    await act(async () => {
      await api.getAppConfig();
    });
    expect(screen.getByText('끊김')).toBeTruthy();
  });

  it('서버가 답한 뒤에 새로 붙은 화면(탭을 바꿈)도 띠 없이 열리고, 다시 불러오기를 하지 않는다', async () => {
    const onBackA = jest.fn();
    const onBackB = jest.fn();
    const view = await render(<Screen name="A" onBack={onBackA} />);
    await passes(0);
    await act(async () => nativeChange(NONE));
    await act(async () => {
      await api.getAppConfig();
    });
    expect(screen.getByText('A연결됨')).toBeTruthy();
    expect(onBackA).toHaveBeenCalledTimes(1);

    await view.rerender(<Screen name="B" onBack={onBackB} key="B" />);
    await passes(0);
    expect(screen.getByText('B연결됨')).toBeTruthy();
    expect(onBackB).not.toHaveBeenCalled();
  });

  it('끊겼다는 알림 전에 보낸 호출이 알림 뒤에 닿아도 연결의 증거로 세지 않는다', async () => {
    await render(<Probe />);
    await passes(0);
    holdServer = true;
    let pending!: Promise<unknown>;
    await act(async () => {
      pending = api.getAppConfig();
    });
    await act(async () => nativeChange(NONE));
    expect(screen.getByText('끊김')).toBeTruthy();

    await act(async () => {
      held[0](true);
      await pending;
    });
    expect(screen.getByText('끊김')).toBeTruthy();
  });

  it('늦게 끝난 옛 호출의 실패가 더 나중에 보낸 호출의 성공을 덮지 않는다', async () => {
    await render(<Probe />);
    await passes(0);
    await act(async () => nativeChange(NONE));
    holdServer = true;
    let older!: Promise<unknown>;
    let newer!: Promise<unknown>;
    await act(async () => {
      older = api.getAppConfig();
      newer = api.getAppConfig();
    });
    await act(async () => {
      held[1](true);
      await newer;
    });
    expect(screen.getByText('연결됨')).toBeTruthy();

    await act(async () => {
      held[0](false);
      await older;
    });
    expect(screen.getByText('연결됨')).toBeTruthy();
  });
});
