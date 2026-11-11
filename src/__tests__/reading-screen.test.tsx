import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ReadingScreen from '@/app/reading';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { READING_STORAGE_KEY } from '@/features/reading/use-reading';
import { api, type ApiResult, type Reading } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { createReading: jest.fn(), saveProfile: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ token: 'dev-token', ready: true })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const R = strings.reading;
const reading = fixtures.reading;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockUseSession.mockReturnValue({ token: 'dev-token', ready: true });
  mockApi.createReading.mockResolvedValue({ ok: true, data: reading });
  await saveBirth({ profile, chart: fixtures.chart });
});

describe('요약 해석 화면', () => {
  it('생성 중에는 진행 상태를 보여 주고, 받으면 서버가 준 글을 그대로 보여 준다', async () => {
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    await render(<ReadingScreen />);
    expect(await screen.findByText(R.generating)).toBeTruthy();
    expect(screen.queryByText(reading.headline)).toBeNull();
    await act(async () => resolve({ ok: true, data: reading }));

    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(screen.queryByText(R.generating)).toBeNull();
    for (const section of reading.sections) {
      expect(screen.getByText(section.title)).toBeTruthy();
      expect(screen.getByText(section.body)).toBeTruthy();
    }
    // 문단마다 근거가 된 차트 요소를 작게 적는다
    expect(screen.getByText('근거 · 태양 · 쌍둥이 · 6하우스')).toBeTruthy();
    expect(screen.getByText('근거 · 달 · 사수 · 11하우스')).toBeTruthy();
    expect(screen.getByText(R.strengths)).toBeTruthy();
    expect(screen.getByText(R.cautions)).toBeTruthy();
    for (const item of [...reading.strengths, ...reading.cautions]) expect(screen.getByText(item)).toBeTruthy();
    expect(screen.getByText(R.disclaimer)).toBeTruthy();
    // 서버에는 본문 없이 요청한다(출생 정보는 서버에 저장된 것을 쓴다)
    expect(mockApi.createReading).toHaveBeenCalledWith();
  });

  it('근거가 없는 문단에는 근거 줄을 그리지 않는다', async () => {
    const section = { title: '제목', body: '본문', basis: [] };
    mockApi.createReading.mockResolvedValue({ ok: true, data: { ...reading, sections: [section] } });
    await render(<ReadingScreen />);
    expect(await screen.findByText('본문')).toBeTruthy();
    expect(screen.queryByText(new RegExp(`^${R.basisLabel}`))).toBeNull();
  });

  it('"내 차트 보기" 는 /chart 로 간다', async () => {
    await render(<ReadingScreen />);
    await fireEvent.press(await screen.findByText(R.seeChart));
    expect(router.push).toHaveBeenCalledWith('/chart');
  });

  it('누를 수 있는 것은 뒤로 가기와 "내 차트 보기" 뿐이다(다시 생성·공유·리포트 없음)', async () => {
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(1);
    expect(screen.getByLabelText(strings.common.backLabel)).toBeTruthy();
    expect(screen.queryAllByRole('link')).toHaveLength(1);
  });

  it('실패하면 안내와 "다시 시도" 를 보여 주고, 누르면 한 번 더 요청한다', async () => {
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 502 });
    await render(<ReadingScreen />);
    expect(await screen.findByText(R.failed.OTHER)).toBeTruthy();
    expect(screen.queryByText(reading.headline)).toBeNull();
    expect(mockApi.createReading).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText(R.retry));
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(mockApi.createReading).toHaveBeenCalledTimes(2);
  });

  it('인터넷이 끊겼을 때와 요청이 많을 때는 그에 맞는 안내를 보여 준다', async () => {
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const first = await render(<ReadingScreen />);
    expect(await screen.findByText(R.failed.NETWORK)).toBeTruthy();
    await first.unmount();
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<ReadingScreen />);
    expect(await screen.findByText(R.failed.LIMIT)).toBeTruthy();
  });

  it('"다시 시도" 를 연달아 눌러도 요청은 하나다', async () => {
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<ReadingScreen />);
    const retry = await screen.findByText(R.retry);
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    await fireEvent.press(retry);
    // 생성 중에는 "다시 시도" 가 사라져 또 누를 수 없다
    expect(screen.queryByText(R.retry)).toBeNull();
    expect(screen.getByText(R.generating)).toBeTruthy();
    await act(async () => resolve({ ok: true, data: reading }));
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(mockApi.createReading).toHaveBeenCalledTimes(2);
  });

  it('다시 열면 보관된 글을 보여 주고 서버를 부르지 않는다', async () => {
    const first = await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    await first.unmount();
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(mockApi.createReading).toHaveBeenCalledTimes(1);
  });

  it('세션 확인이 끝나기 전에는 요청하지 않는다', async () => {
    mockUseSession.mockReturnValue({ token: null, ready: false });
    await render(<ReadingScreen />);
    expect(await screen.findByText(R.generating)).toBeTruthy();
    await act(async () => {});
    expect(mockApi.createReading).not.toHaveBeenCalled();
  });

  it('출생 정보가 없으면 입력으로 가는 안내를 보여 주고 서버를 부르지 않는다', async () => {
    await AsyncStorage.clear();
    await render(<ReadingScreen />);
    expect(await screen.findByText(strings.chart.empty)).toBeTruthy();
    await waitFor(() => expect(mockApi.createReading).not.toHaveBeenCalled());
    await fireEvent.press(screen.getByText(strings.chart.goHome));
    expect(router.replace).toHaveBeenCalledWith('/');
  });
  it('받아 둔 글이 있으면 세션을 기다리지 않고 바로 보여 준다("짓는 중" 이 뜨지 않는다)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await AsyncStorage.setItem(
      READING_STORAGE_KEY,
      JSON.stringify({ key: JSON.stringify([profile.date, profile.time, profile.place.id]), reading }),
    );
    // 세션을 아직 받는 중이다
    mockUseSession.mockReturnValue({ token: null, ready: false });
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(screen.queryByText(R.generating)).toBeNull();
    expect(mockApi.createReading).not.toHaveBeenCalled();
  });

  it('기기에서 글을 찾는 동안에는 "짓는 중" 을 보여 주지 않는다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    mockUseSession.mockReturnValue({ token: null, ready: false });
    const view = await render(<ReadingScreen />);
    // 받아 둔 글이 없다는 것을 확인한 뒤에야 "짓는 중" 이 나온다
    expect(await screen.findByText(R.generating)).toBeTruthy();
    await view.unmount();
  });
});
