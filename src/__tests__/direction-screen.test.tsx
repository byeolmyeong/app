import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import DirectionScreen from '@/app/direction';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { DIRECTION_STORAGE_KEY } from '@/features/direction/use-direction';
import { api, type ApiResult, type Direction } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { createDirection: jest.fn(), saveProfile: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const D = strings.direction;
const direction = fixtures.direction;
const ok: ApiResult<Direction> = { ok: true, data: direction };

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockUseSession.mockReturnValue({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null });
  mockApi.createDirection.mockResolvedValue(ok);
  mockApi.saveProfile.mockImplementation(async (i) => ({ ok: true, data: i }));
  await saveBirth({ profile, chart: fixtures.chart });
});

describe('방향성 제시(이성) 화면', () => {
  it('기다리는 동안 진행 상태를 보여 주고, 받으면 한 줄 제목과 해 볼 만한 것 3개를 근거와 함께 그대로 보여 준다', async () => {
    let resolve: (r: ApiResult<Direction>) => void = () => {};
    mockApi.createDirection.mockReturnValue(new Promise((r) => (resolve = r)));
    await render(<DirectionScreen />);
    expect(await screen.findByText(D.generating)).toBeTruthy();
    // 기다리는 동안 생각하는 별이(결정 035)
    expect(screen.getByTestId('byeoli-face-think', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText(D.generatingNote)).toBeTruthy();
    expect(screen.queryByText(direction.title)).toBeNull();
    await act(async () => resolve(ok));

    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(screen.queryByText(D.generating)).toBeNull();
    expect(screen.getByText(D.title)).toBeTruthy();
    for (const item of direction.items) {
      expect(screen.getByText(item.title)).toBeTruthy();
      expect(screen.getByText(item.body)).toBeTruthy();
      // 요약 해석 · 리포트의 문단과 같은 근거 줄
      expect(screen.getByText(['근거', ...item.basis].join(' · '))).toBeTruthy();
    }
    expect(screen.getByText(strings.reading.disclaimer)).toBeTruthy();
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
    expect(mockApi.createDirection).toHaveBeenCalledWith('LOVE');
  });

  it('받아 둔 글이 있으면 세션을 기다리지 않고 바로 보여 주고 서버를 부르지 않는다', async () => {
    await AsyncStorage.setItem(
      DIRECTION_STORAGE_KEY,
      JSON.stringify({ key: JSON.stringify([profile.date, profile.time, profile.place.id]), direction }),
    );
    mockUseSession.mockReturnValue({ status: 'checking' as const, token: null, ready: false, lastError: null });
    await render(<DirectionScreen />);
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(screen.queryByText(D.generating)).toBeNull();
    expect(mockApi.createDirection).not.toHaveBeenCalled();
  });

  it('다시 열면 보관된 글을 보여 주고 서버를 부르지 않는다', async () => {
    const first = await render(<DirectionScreen />);
    expect(await screen.findByText(direction.title)).toBeTruthy();
    await first.unmount();
    await render(<DirectionScreen />);
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
  });

  it('생성에 실패하면(502) 안내와 "다시 시도" 를 보여 주고, 누르면 한 번 더 요청해 글을 보여 준다', async () => {
    mockApi.createDirection.mockResolvedValueOnce({
      ok: false,
      error: 'SERVER',
      status: 502,
      code: 'GENERATION_FAILED',
    });
    await render(<DirectionScreen />);
    expect(await screen.findByText(D.failed.OTHER)).toBeTruthy();
    expect(screen.queryByText(direction.title)).toBeNull();
    expect(mockApi.createDirection).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText(D.retry));
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(screen.queryByText(D.retry)).toBeNull();
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
  });

  it('인터넷이 끊겼을 때와 요청이 많을 때는 그에 맞는 안내를 보여 준다', async () => {
    mockApi.createDirection.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const first = await render(<DirectionScreen />);
    expect(await screen.findByText(D.failed.NETWORK)).toBeTruthy();
    await first.unmount();
    mockApi.createDirection.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<DirectionScreen />);
    expect(await screen.findByText(D.failed.LIMIT)).toBeTruthy();
  });

  it('서버에 출생 정보가 없으면(404 NO_PROFILE) 내 출생 정보를 저장하고 한 번만 다시 요청한다', async () => {
    mockApi.createDirection.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    await render(<DirectionScreen />);
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(mockApi.saveProfile).toHaveBeenCalledTimes(1);
    expect(mockApi.saveProfile).toHaveBeenCalledWith({ date: profile.date, time: profile.time, placeId: 1841277 });
    expect(mockApi.createDirection).toHaveBeenCalledTimes(2);
  });

  it('세션 확인이 끝나기 전에는 요청하지 않고 기다리는 상태를 보여 준다', async () => {
    mockUseSession.mockReturnValue({ status: 'checking' as const, token: null, ready: false, lastError: null });
    await render(<DirectionScreen />);
    expect(await screen.findByText(D.generating)).toBeTruthy();
    await act(async () => {});
    expect(mockApi.createDirection).not.toHaveBeenCalled();
  });

  it('출생 정보가 없으면 입력으로 가는 안내를 보여 주고 서버를 부르지 않는다', async () => {
    await AsyncStorage.clear();
    await render(<DirectionScreen />);
    expect(await screen.findByText(strings.chart.empty)).toBeTruthy();
    await waitFor(() => expect(mockApi.createDirection).not.toHaveBeenCalled());
    await fireEvent.press(screen.getByText(strings.chart.goHome));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('누를 수 있는 것은 뒤로 가기뿐이다(다시 생성 · 공유 없음)', async () => {
    await render(<DirectionScreen />);
    expect(await screen.findByText(direction.title)).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(1);
    expect(screen.getByLabelText(strings.common.backLabel)).toBeTruthy();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
