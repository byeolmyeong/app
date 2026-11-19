import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { AppState, Pressable, Text, type AppStateStatus } from 'react-native';

import RootLayout from '@/app/_layout';
import SharedCardScreen from '@/app/s/[shareId]';
import { strings } from '@/content/strings';
import { UpdateGate, useUpdateBusy } from '@/features/update/update-gate';
import { api, setMaintenanceHandler, type ApiResult, type AppConfig, type PlatformConfig } from '@/lib/api';
import type { AppClient } from '@/lib/app-client';
import { fixtures } from '@/lib/fixtures';

const mockClient: { current: AppClient | null } = { current: null };

jest.mock('@/lib/app-client', () => ({
  get appClient() {
    return mockClient?.current ?? null;
  },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getAppConfig: jest.fn(), getSharedCard: jest.fn() },
  setUpdateRequiredHandler: jest.fn(),
  setMaintenanceHandler: jest.fn(),
}));
jest.mock('expo-linking', () => ({ openURL: jest.fn(async () => true) }));
jest.mock('expo-font', () => ({ useFonts: () => [true, null] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('expo-router', () => {
  const { Text: T } = jest.requireActual('react-native');
  return {
    Stack: () => <T>앱의 화면들</T>,
    useSegments: () => [],
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => false) },
    useLocalSearchParams: jest.fn(() => ({ shareId: 'AbCdEfGhIjKlMnOpQrStUv' })),
  };
});
jest.mock('@/features/auth/use-session', () => ({ useSession: jest.fn(() => ({ status: 'signedOut' as const, token: null, ready: true, lastError: null })) }));
// 소개는 이미 본 기기로 둔다(결정 042 — 로그인 전이면 로그인 화면으로)
jest.mock('@/features/onboarding/intro-seen', () => ({ useIntroSeen: () => true }));

const mockApi = api as jest.Mocked<typeof api>;
const mockSetHandler = setMaintenanceHandler as jest.Mock;
const M = strings.maintenance;
const U = strings.update;
const open: PlatformConfig = { minVersion: null, storeUrl: null, message: null, blockNow: false };

const configOf = (maintenance: AppConfig['maintenance'], ios: Partial<PlatformConfig> = {}): ApiResult<AppConfig> => ({
  ok: true,
  data: { ios: { ...open, ...ios }, android: open, ...(maintenance ? { maintenance } : {}) },
});
const calm = configOf({ active: false, message: null });
const down = configOf({ active: true, message: null });
const app = <Text>앱의 화면들</Text>;
/** 서버가 503 MAINTENANCE 로 답했을 때 api 가 부르는 처리기(문이 등록한 것) */
const onMaintenance = () => (mockSetHandler.mock.calls[0][0] as () => void)();

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

function spyAppState() {
  const handlers: ((next: AppStateStatus) => void)[] = [];
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    handlers.push(handler as (next: AppStateStatus) => void);
    return { remove: jest.fn() } as unknown as ReturnType<typeof AppState.addEventListener>;
  });
  return { emit: (next: AppStateStatus) => act(async () => handlers.forEach((h) => h(next))) };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  mockClient.current = { platform: 'ios', version: '1.0.0' };
  mockApi.getAppConfig.mockResolvedValue(calm);
});

describe('점검 안내(결정 030)', () => {
  it('점검 중이면 막는 화면만 보인다: 제목 · 기본 문구 · "다시 확인" 하나, 뒤로 가기는 없다', async () => {
    mockApi.getAppConfig.mockResolvedValue(down);
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText(M.title)).toBe(screen.getByText('점검 중이에요'));
    expect(screen.getByText(M.body)).toBeTruthy();
    expect(screen.queryByText('앱의 화면들')).toBeNull();
    expect(screen.queryByLabelText(strings.common.backLabel)).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '다시 확인' })).toBeTruthy();
  });

  it('관리자가 적은 안내가 있으면 기본 문구 대신 그대로(줄바꿈 · 기호도 글자로) 보여 준다. 빈 글이면 기본 문구다', async () => {
    const message = '새벽 2시까지 점검해요.\n<b>조금만</b> 기다려 주세요.';
    mockApi.getAppConfig.mockResolvedValue(configOf({ active: true, message }));
    const first = await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText(message)).toBeTruthy();
    expect(screen.queryByText(M.body)).toBeNull();
    await first.unmount();

    mockApi.getAppConfig.mockResolvedValue(configOf({ active: true, message: '  ' }));
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText(M.body)).toBeTruthy();
  });

  it('"다시 확인" 은 설정을 다시 받고, 점검이 끝났으면 스스로 풀려 앱이 돌아온다', async () => {
    mockApi.getAppConfig.mockResolvedValue(down);
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(mockApi.getAppConfig).toHaveBeenCalledTimes(1);

    // 아직 점검 중이면 그대로이고, 아직이라는 한 줄이 보인다.
    await fireEvent.press(screen.getByRole('button', { name: M.retry }));
    expect(mockApi.getAppConfig).toHaveBeenCalledTimes(2);
    expect(screen.getByText(M.title)).toBeTruthy();
    expect(screen.getByText(M.still)).toBeTruthy();

    // 확인하지 못해도 그대로다(스스로 다시 부르지 않는다).
    mockApi.getAppConfig.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await fireEvent.press(screen.getByRole('button', { name: M.retry }));
    expect(mockApi.getAppConfig).toHaveBeenCalledTimes(3);
    expect(screen.getByText(M.title)).toBeTruthy();

    mockApi.getAppConfig.mockResolvedValue(calm);
    await fireEvent.press(screen.getByRole('button', { name: M.retry }));
    expect(mockApi.getAppConfig).toHaveBeenCalledTimes(4);
    expect(screen.queryByText(M.title)).toBeNull();
    expect(screen.getByText('앱의 화면들')).toBeTruthy();
  });

  it('확인하는 동안에는 버튼을 누를 수 없다', async () => {
    mockApi.getAppConfig.mockResolvedValue(down);
    await render(<UpdateGate>{app}</UpdateGate>);
    mockApi.getAppConfig.mockReturnValue(new Promise(() => {}));
    await fireEvent.press(screen.getByRole('button', { name: M.retry }));
    expect(screen.getByRole('button', { name: M.checking }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByRole('button', { name: M.checking }));
    expect(mockApi.getAppConfig).toHaveBeenCalledTimes(2);
  });

  it('앞으로 돌아올 때의 확인으로도 켜지고 풀린다', async () => {
    const appState = spyAppState();
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText('앱의 화면들')).toBeTruthy();

    mockApi.getAppConfig.mockResolvedValue(down);
    await appState.emit('active');
    expect(screen.getByText(M.title)).toBeTruthy();

    mockApi.getAppConfig.mockResolvedValue(calm);
    await appState.emit('active');
    expect(screen.queryByText(M.title)).toBeNull();
    expect(screen.getByText('앱의 화면들')).toBeTruthy();
  });

  it('점검이 업데이트보다 먼저다: 둘 다면 점검 화면이고, 점검이 풀리면 업데이트 화면이 보인다', async () => {
    const old = { minVersion: '1.2.0', storeUrl: 'https://store.example.test/app' };
    mockApi.getAppConfig.mockResolvedValue(configOf({ active: true, message: null }, old));
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText(M.title)).toBeTruthy();
    expect(screen.queryByText(U.title)).toBeNull();

    mockApi.getAppConfig.mockResolvedValue(configOf({ active: false, message: null }, old));
    await fireEvent.press(screen.getByRole('button', { name: M.retry }));
    expect(screen.queryByText(M.title)).toBeNull();
    expect(screen.getByText(U.title)).toBeTruthy();
    expect(screen.queryByText('앱의 화면들')).toBeNull();
  });

  it('웹에서도 점검 화면을 보여 준다(버전으로는 막지 않는다)', async () => {
    mockClient.current = null;
    mockApi.getAppConfig.mockResolvedValue(configOf({ active: true, message: null }, { minVersion: '9.0.0' }));
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText(M.title)).toBeTruthy();

    mockApi.getAppConfig.mockResolvedValue(configOf({ active: false, message: null }, { minVersion: '9.0.0' }));
    await fireEvent.press(screen.getByRole('button', { name: M.retry }));
    expect(screen.getByText('앱의 화면들')).toBeTruthy();
    expect(screen.queryByText(U.title)).toBeNull();
  });

  it('바쁜 화면이 떠 있으면 미루고, 그 화면에서 나오면 점검 화면을 보여 준다', async () => {
    const appState = spyAppState();
    await render(
      <UpdateGate>
        <BusyScreen />
      </UpdateGate>,
    );
    mockApi.getAppConfig.mockResolvedValue(down);
    await appState.emit('active');
    expect(screen.getByText('글을 짓는 중')).toBeTruthy();
    expect(screen.queryByText(M.title)).toBeNull();

    await fireEvent.press(screen.getByText('글을 짓는 중'));
    expect(screen.getByText(M.title)).toBeTruthy();
    expect(screen.queryByText('홈')).toBeNull();
  });

  it('503 MAINTENANCE 알림은 바쁜 화면이 있어도 바로 점검 화면을 보여 주고, 안내는 그 뒤에 받은 설정의 것이다', async () => {
    const view = await render(
      <UpdateGate>
        <BusyScreen />
      </UpdateGate>,
    );
    expect(screen.getByText('글을 짓는 중')).toBeTruthy();
    mockApi.getAppConfig.mockResolvedValue(configOf({ active: true, message: '곧 돌아올게요' }));
    await act(async () => onMaintenance());
    expect(screen.getByText(M.title)).toBeTruthy();
    expect(screen.getByText('곧 돌아올게요')).toBeTruthy();
    expect(screen.queryByText('글을 짓는 중')).toBeNull();

    await view.unmount();
    expect(mockSetHandler).toHaveBeenLastCalledWith(null);
  });

  it('503 으로 뜬 점검 화면은 붙박이가 아니다: 설정을 받지 못해도 뜨고, 그 뒤 성공한 확인이 끝났다고 하면 풀린다', async () => {
    const appState = spyAppState();
    mockApi.getAppConfig.mockResolvedValue(calm);
    await render(<UpdateGate>{app}</UpdateGate>);
    mockApi.getAppConfig.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await act(async () => onMaintenance());
    expect(screen.getByText(M.title)).toBeTruthy();
    expect(screen.getByText(M.body)).toBeTruthy();

    mockApi.getAppConfig.mockResolvedValue(calm);
    await appState.emit('active');
    expect(screen.queryByText(M.title)).toBeNull();
    expect(screen.getByText('앱의 화면들')).toBeTruthy();
  });

  it('maintenance 키가 없는 옛 서버의 설정은 점검 중이 아닌 것으로 읽고, 버전 판정은 그대로 한다', async () => {
    mockApi.getAppConfig.mockResolvedValue(configOf(undefined));
    const first = await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText('앱의 화면들')).toBeTruthy();
    await first.unmount();

    mockApi.getAppConfig.mockResolvedValue(configOf(undefined, { minVersion: '1.2.0' }));
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.queryByText(M.title)).toBeNull();
    expect(screen.getByText(U.title)).toBeTruthy();
  });

  it.each([
    ['네트워크', { ok: false, error: 'NETWORK' }],
    ['서버 오류', { ok: false, error: 'SERVER', status: 500 }],
    ['모양이 다름', { ok: false, error: 'INVALID', status: 200 }],
  ] as [string, ApiResult<AppConfig>][])('설정을 받지 못하면(%s) 막지 않는다', async (_name, result) => {
    mockApi.getAppConfig.mockResolvedValue(result);
    await render(<UpdateGate>{app}</UpdateGate>);
    expect(screen.getByText('앱의 화면들')).toBeTruthy();
    expect(screen.queryByText(M.title)).toBeNull();
  });

  it('루트 레이아웃: 점검 중이면 세션이 없어도 스택 대신 점검 화면을 보여 준다', async () => {
    mockApi.getAppConfig.mockResolvedValue(down);
    await render(<RootLayout />);
    expect(screen.getByText(M.title)).toBeTruthy();
    expect(screen.queryByText('앱의 화면들')).toBeNull();
  });

  it('공유 페이지: 카드를 받다가 503 MAINTENANCE 가 오면 로그인 없이 같은 점검 화면을 보여 주고, 풀리면 카드를 다시 받는다', async () => {
    // api 는 503 MAINTENANCE 를 받으면 등록된 처리기를 부르고 실패를 돌려준다(lib/api.ts).
    mockApi.getSharedCard.mockImplementation(async () => {
      // 답은 화면이 뜬 뒤에 온다.
      await Promise.resolve();
      onMaintenance();
      return { ok: false, error: 'SERVER', status: 503, code: 'MAINTENANCE' };
    });
    await render(
      <UpdateGate>
        <SharedCardScreen />
      </UpdateGate>,
    );
    expect(await screen.findByText(M.title)).toBeTruthy();
    expect(screen.queryByText(strings.share.page.cta)).toBeNull();
    expect(mockApi.getSharedCard).toHaveBeenCalledTimes(1);

    mockApi.getSharedCard.mockResolvedValue({ ok: true, data: fixtures.shareCards.reading });
    await fireEvent.press(screen.getByRole('button', { name: M.retry }));
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(screen.queryByText(M.title)).toBeNull();
  });

  it('공유 페이지: 설정이 점검 중이면 카드 대신 점검 화면을 보여 준다', async () => {
    mockApi.getAppConfig.mockResolvedValue(down);
    mockApi.getSharedCard.mockResolvedValue({ ok: true, data: fixtures.shareCards.reading });
    await render(
      <UpdateGate>
        <SharedCardScreen />
      </UpdateGate>,
    );
    expect(await screen.findByText(M.title)).toBeTruthy();
    expect(screen.queryByTestId('share-card')).toBeNull();
  });
});
