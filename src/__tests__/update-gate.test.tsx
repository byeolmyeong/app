import { act, fireEvent, render, screen } from '@testing-library/react-native';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { AppState, Pressable, Text, type AppStateStatus } from 'react-native';

import RootLayout from '@/app/_layout';
import { strings } from '@/content/strings';
import { UpdateGate, useGenerationBusy, useUpdateBusy } from '@/features/update/update-gate';
import {
  api,
  createApi,
  setUpdateRequiredHandler,
  type ApiResult,
  type AppConfig,
  type PlatformConfig,
} from '@/lib/api';
import type { AppClient } from '@/lib/app-client';

const mockClient: { current: AppClient | null } = { current: null };

// 모듈을 읽는 동안(mockClient 가 아직 없다)에는 null 이고, 화면을 그릴 때는 테스트가 정한 값이다.
jest.mock('@/lib/app-client', () => ({
  get appClient() {
    return mockClient?.current ?? null;
  },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getAppConfig: jest.fn() },
  setUpdateRequiredHandler: jest.fn(),
}));
jest.mock('expo-linking', () => ({ openURL: jest.fn(async () => true) }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('expo-router', () => {
  const { Text: T } = jest.requireActual('react-native');
  // 세션이 없으면 로그인 전 가드가 로그인 화면으로 보낸다(결정 034) — 여기서는 보내는 것만 받아 둔다.
  return { Stack: () => <T>앱의 화면들</T>, useSegments: () => [], router: { replace: jest.fn() } };
});
jest.mock('@/features/auth/use-session', () => ({ useSession: jest.fn(() => ({ status: 'signedOut' as const, token: null, ready: true, lastError: null })) }));
// 소개는 이미 본 기기로 둔다(결정 042 — 로그인 전이면 로그인 화면으로)
jest.mock('@/features/onboarding/intro-seen', () => ({ useIntroSeen: () => true }));

const mockApi = api as jest.Mocked<typeof api>;
const mockSetHandler = setUpdateRequiredHandler as jest.Mock;
const mockOpenURL = Linking.openURL as jest.Mock;
const U = strings.update;
const STORE_URL = 'https://store.example.test/app';
const open: PlatformConfig = { minVersion: null, latestVersion: null, storeUrl: null, message: null, blockNow: false };

const configOf = (ios: Partial<PlatformConfig>): ApiResult<AppConfig> => ({
  ok: true,
  data: { ios: { ...open, ...ios }, android: open },
});
const required = configOf({ minVersion: '1.2.0', storeUrl: STORE_URL });

/** 누르면 바쁨을 끄는(= 그 화면에서 나오는) 화면 */
function BusyScreen() {
  const [busy, setBusy] = useState(true);
  useUpdateBusy(busy);
  return (
    <Pressable onPress={() => setBusy(false)}>
      <Text>{busy ? '글을 짓는 중' : '홈'}</Text>
    </Pressable>
  );
}

/** 만드는 중 → 결과 → 나감 을 차례로 지나는 화면 */
function GeneratingScreen({ stored = false }: { stored?: boolean }) {
  const [step, setStep] = useState<'generating' | 'done'>(stored ? 'done' : 'generating');
  useGenerationBusy(step === 'generating', step === 'done');
  return (
    <Pressable onPress={() => setStep('done')}>
      <Text>{step === 'generating' ? '글을 짓는 중' : '받은 글'}</Text>
    </Pressable>
  );
}

const app = <Text>앱의 화면들</Text>;

/** 앱이 앞 · 뒤로 갈 때의 알림을 흉내 낸다 */
function spyAppState() {
  const handlers: ((next: AppStateStatus) => void)[] = [];
  const remove = jest.fn();
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    handlers.push(handler as (next: AppStateStatus) => void);
    return { remove } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  return { remove, emit: (next: AppStateStatus) => act(async () => handlers.forEach((h) => h(next))) };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  mockClient.current = { platform: 'ios', version: '1.0.0' };
  mockApi.getAppConfig.mockResolvedValue(configOf({}));
});

describe('강제 업데이트(결정 027)', () => {
  it('켜질 때 설정을 한 번 묻고, 최소 버전이 없으면 앱을 그대로 보여 준다', async () => {
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(mockApi.getAppConfig).toHaveBeenCalledTimes(1);
    expect(screen.getByText('앱의 화면들')).toBeTruthy();
    expect(screen.queryByText(U.title)).toBeNull();
  });

  it('내 버전이 최소 버전보다 낮으면 막는 화면만 보인다: 제목 · 기본 문구 · 스토어 버튼, 뒤로 가기는 없다', async () => {
    mockApi.getAppConfig.mockResolvedValue(required);
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText(U.title)).toBe(screen.getByText('업데이트가 필요해요'));
    expect(screen.getByText(U.body)).toBeTruthy();
    expect(screen.queryByText('앱의 화면들')).toBeNull();
    expect(screen.queryByLabelText(strings.common.backLabel)).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.queryByText(U.noStore)).toBeNull();
  });

  it('버튼을 누르면 설정의 storeUrl 을 연다', async () => {
    mockApi.getAppConfig.mockResolvedValue(required);
    await render(<UpdateGate>{app}</UpdateGate>);
    await fireEvent.press(screen.getByRole('button', { name: U.open }));
    expect(mockOpenURL).toHaveBeenCalledTimes(1);
    expect(mockOpenURL).toHaveBeenCalledWith(STORE_URL);
  });

  it('스토어를 열지 못하면 안내 한 줄을 보여 준다', async () => {
    mockApi.getAppConfig.mockResolvedValue(required);
    mockOpenURL.mockRejectedValueOnce(new Error('no handler'));
    await render(<UpdateGate>{app}</UpdateGate>);
    await fireEvent.press(screen.getByRole('button', { name: U.open }));
    expect(screen.getByText(U.openFailed)).toBeTruthy();
  });

  it('storeUrl 이 null 이면 버튼을 숨기고 안내 한 줄을 보여 준다', async () => {
    mockApi.getAppConfig.mockResolvedValue(configOf({ minVersion: '1.2.0', storeUrl: null }));
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText(U.title)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.getByText(U.noStore)).toBeTruthy();
  });

  it('관리자가 적은 안내가 있으면 기본 문구 대신 그대로(줄바꿈 · 기호도 글자로) 보여 준다', async () => {
    const message = '결제 오류를 고쳤어요.\n<b>꼭</b> 업데이트해 주세요.';
    mockApi.getAppConfig.mockResolvedValue(configOf({ minVersion: '1.2.0', storeUrl: STORE_URL, message }));
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText(U.body)).toBeNull();
  });

  it('안내가 빈 글이면 기본 문구를 보여 준다', async () => {
    mockApi.getAppConfig.mockResolvedValue(configOf({ minVersion: '1.2.0', message: '  ' }));
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText(U.body)).toBeTruthy();
  });

  it.each([
    ['같은 버전', configOf({ minVersion: '1.0.0', storeUrl: STORE_URL, blockNow: true })],
    ['더 높은 내 버전', configOf({ minVersion: '0.9.0', storeUrl: STORE_URL })],
    ['설정 실패(네트워크)', { ok: false, error: 'NETWORK' }],
    ['설정 실패(서버)', { ok: false, error: 'SERVER', status: 500 }],
    ['설정 실패(모양이 다름)', { ok: false, error: 'INVALID', status: 200 }],
  ] as [string, ApiResult<AppConfig>][])('막지 않는다: %s', async (_name, result) => {
    mockApi.getAppConfig.mockResolvedValue(result);
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText('앱의 화면들')).toBeTruthy();
    expect(screen.queryByText(U.title)).toBeNull();
  });

  it('웹에서는 버전으로 막지 않는다(설정은 점검 때문에 받는다. 결정 030)', async () => {
    mockClient.current = null;
    mockApi.getAppConfig.mockResolvedValue(required);
    const appState = spyAppState();
    await render(<UpdateGate>{app}</UpdateGate>);
    await appState.emit('active');
    expect(mockApi.getAppConfig).toHaveBeenCalledTimes(2);
    expect(screen.getByText('앱의 화면들')).toBeTruthy();
    expect(screen.queryByText(U.title)).toBeNull();
  });

  it('가짜 서버에서는 막지 않는다', async () => {
    const fixtureApi = createApi({ baseUrl: '', getToken: () => null, useFixtures: true });
    mockApi.getAppConfig.mockImplementation(() => fixtureApi.getAppConfig());
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(mockApi.getAppConfig).toHaveBeenCalledTimes(1);
    expect(screen.getByText('앱의 화면들')).toBeTruthy();
  });

  it('앞으로 돌아올 때(active)마다 다시 묻고, 뒤로 갈 때는 묻지 않는다. 시간 간격으로는 묻지 않는다', async () => {
    jest.useFakeTimers();
    try {
      const appState = spyAppState();
      const view = await render(<UpdateGate>{app}</UpdateGate>);
      expect(mockApi.getAppConfig).toHaveBeenCalledTimes(1);

      await appState.emit('background');
      await appState.emit('inactive');
      expect(mockApi.getAppConfig).toHaveBeenCalledTimes(1);
      await act(async () => {
        jest.advanceTimersByTime(60 * 60 * 1000);
      });
      expect(mockApi.getAppConfig).toHaveBeenCalledTimes(1);

      mockApi.getAppConfig.mockResolvedValue(required);
      await appState.emit('active');
      expect(mockApi.getAppConfig).toHaveBeenCalledTimes(2);
      expect(screen.getByText(U.title)).toBeTruthy();

      await view.unmount();
      expect(appState.remove).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('바쁜 화면이 떠 있으면 미루고, 그 화면에서 나오면 막는다', async () => {
    const appState = spyAppState();
    await render(
      <UpdateGate>
        <BusyScreen />
      </UpdateGate>,
    );
    mockApi.getAppConfig.mockResolvedValue(required);
    await appState.emit('active');
    expect(screen.getByText('글을 짓는 중')).toBeTruthy();
    expect(screen.queryByText(U.title)).toBeNull();

    await fireEvent.press(screen.getByText('글을 짓는 중'));
    expect(screen.getByText(U.title)).toBeTruthy();
    expect(screen.queryByText('홈')).toBeNull();
  });

  it('만드는 중과 방금 받은 결과는 바쁨이다. 화면이 사라지면 막는다', async () => {
    const appState = spyAppState();
    const view = await render(
      <UpdateGate>
        <GeneratingScreen />
      </UpdateGate>,
    );
    mockApi.getAppConfig.mockResolvedValue(required);
    await appState.emit('active');
    expect(screen.getByText('글을 짓는 중')).toBeTruthy();

    await fireEvent.press(screen.getByText('글을 짓는 중'));
    expect(screen.getByText('받은 글')).toBeTruthy();
    expect(screen.queryByText(U.title)).toBeNull();

    await view.rerender(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText(U.title)).toBeTruthy();
  });

  it('받아 둔 결과를 다시 연 화면은 바쁨이 아니다', async () => {
    mockApi.getAppConfig.mockResolvedValue(required);
    await render(
      <UpdateGate>
        <GeneratingScreen stored />
      </UpdateGate>,
    );
    expect(screen.getByText(U.title)).toBeTruthy();
  });

  it('426 UPDATE_REQUIRED 알림은 바쁜 화면이 있어도 바로 막는다', async () => {
    const view = await render(
      <UpdateGate>
        <BusyScreen />
      </UpdateGate>,
    );
    expect(screen.getByText('글을 짓는 중')).toBeTruthy();
    const onUpdateRequired = mockSetHandler.mock.calls[0][0] as () => void;
    mockApi.getAppConfig.mockResolvedValue(required);
    await act(async () => onUpdateRequired());
    expect(screen.getByText(U.title)).toBeTruthy();
    expect(screen.queryByText('글을 짓는 중')).toBeNull();
    // 스토어 주소는 알림 뒤에 받은 설정의 것이다.
    await fireEvent.press(screen.getByRole('button', { name: U.open }));
    expect(mockOpenURL).toHaveBeenCalledWith(STORE_URL);

    await view.unmount();
    expect(mockSetHandler).toHaveBeenLastCalledWith(null);
  });

  it('426 알림은 설정을 받지 못해도 막는다(버튼 없이 기본 문구로)', async () => {
    mockApi.getAppConfig.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<UpdateGate>{app}</UpdateGate>);
    await act(async () => (mockSetHandler.mock.calls[0][0] as () => void)());
    expect(screen.getByText(U.title)).toBeTruthy();
    expect(screen.getByText(U.body)).toBeTruthy();
    expect(screen.getByText(U.noStore)).toBeTruthy();
  });

  it('바쁨 등록은 UpdateGate 밖(화면만 따로 그릴 때)에서도 아무 일 없이 지나간다', async () => {
    await render(<BusyScreen />);
    expect(screen.getByText('글을 짓는 중')).toBeTruthy();
  });

  it('루트 레이아웃: 막지 않으면 스택을, 막으면 세션이 없어도 스택 대신 막는 화면을 보여 준다', async () => {
    const first = await render(<RootLayout />);
    expect(screen.getByText('앱의 화면들')).toBeTruthy();
    await first.unmount();

    mockApi.getAppConfig.mockResolvedValue(required);
    await render(<RootLayout />);
    expect(screen.getByText(U.title)).toBeTruthy();
    expect(screen.queryByText('앱의 화면들')).toBeNull();
  });
});
