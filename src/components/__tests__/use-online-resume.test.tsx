import NetInfo from '@react-native-community/netinfo';
import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { useOnline } from '@/components/use-online';
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
const fakeFetch = jest.fn(async (url: string) => {
  if (url.includes('generate_204')) {
    if (!googleUp) throw new TypeError('Network request failed');
    return { status: 204, ok: true, json: async () => null } as unknown as Response;
  }
  if (!serverUp) throw new TypeError('Network request failed');
  return { status: 200, ok: true, json: async () => ({}) } as unknown as Response;
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
  mockNative.state = WIFI;
  // 앞 시험의 NetInfo 상태를 버리고 새로 만든다(configure 는 있던 상태를 걷고 다시 만든다).
  NetInfo.configure({});
});
afterEach(() => {
  jest.useRealTimers();
});

function Probe() {
  return <Text>{useOnline() ? '연결됨' : '끊김'}</Text>;
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
    // 돌아와서: NetInfo.refresh() 는 네이티브의 캐시를 그대로 돌려받고, 업데이트 문(UpdateGate)이 /app-config 를 부른다 — 서버는 답한다.
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
});
