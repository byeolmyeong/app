import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ChartDetailScreen from '@/app/chart/detail';
import ChartScreen from '@/app/chart/index';
import HomeScreen from '@/app/index';
import { strings } from '@/content/strings';
import { loadBirth, saveBirth } from '@/features/chart/use-birth-profile';
import { api } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { listPlaces: jest.fn(), createChart: jest.fn() },
}));

const mockApi = api as jest.Mocked<typeof api>;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const H = strings.home;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chart });
});

/** 치지 않고 고른다: 시·도 → 시·군·구 */
async function fillPlace() {
  await fireEvent.press(await screen.findByText('서울특별시'));
  await fireEvent.press(await screen.findByText('마포구'));
}

const next = () => fireEvent.press(screen.getByText(H.next));

/** 1단계 생년월일 → 2단계 시각(null 이면 "모름") → 3단계 출생지 화면까지 간다 */
async function fillDateAndTime(date: string, time: string | null) {
  await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), date);
  await next();
  if (time === null) await fireEvent.press(screen.getByText(H.timeUnknown));
  else await fireEvent.changeText(screen.getByPlaceholderText(H.timePlaceholder), time);
  await next();
}

describe('출생 정보 입력(홈)', () => {
  it('한 화면에 하나씩 묻는다: 생년월일 → 태어난 시각 → 태어난 곳', async () => {
    await render(<HomeScreen />);
    expect(screen.getByText(H.steps[0])).toBeTruthy();
    expect(screen.queryByPlaceholderText(H.timePlaceholder)).toBeNull();
    expect(screen.queryByText('서울특별시')).toBeNull();
    await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), '20000615');
    expect(screen.getByDisplayValue('2000-06-15')).toBeTruthy();
    await next();
    expect(screen.getByText(H.steps[1])).toBeTruthy();
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    // "모름" 은 시각을 묻는 화면에 있다
    expect(screen.getByText(H.timeUnknown)).toBeTruthy();
    await fireEvent.changeText(screen.getByPlaceholderText(H.timePlaceholder), '2100');
    expect(screen.getByDisplayValue('21:00')).toBeTruthy();
    await next();
    expect(screen.getByText(H.steps[2])).toBeTruthy();
    expect(await screen.findByText('서울특별시')).toBeTruthy();
    // 이전으로 돌아가도 넣은 값이 남아 있다
    await fireEvent.press(screen.getByText(H.back));
    expect(screen.getByDisplayValue('21:00')).toBeTruthy();
  });

  it('날짜·시각·출생지를 넣고 누르면 차트를 받아 보관하고 /chart 로 간다', async () => {
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', '21:00');
    await fillPlace();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/chart'));
    expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: '21:00', placeId: 1841277 });
    expect(await loadBirth()).toEqual({ profile, chart: fixtures.chart });
  });

  it('"모름" 을 고르면 time 을 null 로 보낸다', async () => {
    mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', null);
    await fillPlace();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/chart'));
    expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: null, placeId: 1841277 });
  });

  it('1900년 이전 날짜는 오류를 보여 주고 다음으로 넘어가지 않는다', async () => {
    await render(<HomeScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), '1899-12-31');
    await next();
    expect(await screen.findByText(H.errors.dateTooEarly)).toBeTruthy();
    expect(screen.getByText(H.steps[0])).toBeTruthy();
    // 칸을 고치면 그 칸의 오류 문구는 사라진다
    await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), '1999-12-31');
    expect(screen.queryByText(H.errors.dateTooEarly)).toBeNull();
  });

  it('틀린 시각은 오류를 보여 주고 다음으로 넘어가지 않는다', async () => {
    await render(<HomeScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), '2000-06-15');
    await next();
    await fireEvent.changeText(screen.getByPlaceholderText(H.timePlaceholder), '2561');
    await next();
    expect(await screen.findByText(H.errors.timeFormat)).toBeTruthy();
    expect(screen.getByText(H.steps[1])).toBeTruthy();
  });

  it('출생지를 목록에서 고르지 않으면 오류를 보여 준다', async () => {
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', '21:00');
    await fireEvent.press(screen.getByText(H.submit));
    expect(await screen.findByText(H.errors.placeRequired)).toBeTruthy();
    expect(mockApi.createChart).not.toHaveBeenCalled();
  });

  it('출생지는 시·도를 고르면 그 안의 시·군·구를 보여 주고, 치는 칸이 없다', async () => {
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', '21:00');
    expect(await screen.findByText('경기도')).toBeTruthy();
    expect(screen.getAllByTestId('place-option')).toHaveLength(17);
    expect(screen.queryByText('마포구')).toBeNull();
    await fireEvent.press(screen.getByText('서울특별시'));
    expect(screen.getAllByTestId('place-option')).toHaveLength(25);
    await fireEvent.press(screen.getByText('마포구'));
    expect(screen.getByText('서울특별시 마포구')).toBeTruthy();
    // 시·도를 다시 고를 수 있다
    await fireEvent.press(screen.getByText(H.regionBack));
    expect(screen.getAllByTestId('place-option')).toHaveLength(17);
    // 하위 시·군·구가 없는 세종은 누르면 바로 정해진다
    await fireEvent.press(screen.getByText('세종특별자치시'));
    expect(screen.getAllByText('세종특별자치시').length).toBeGreaterThan(1);
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: '21:00', placeId: 8394437 }));
  });

  it('목록을 불러오지 못하면 안내를 보여 주고 다시 불러올 수 있다', async () => {
    mockApi.listPlaces.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', '21:00');
    expect(await screen.findByText(H.placeLoadFailed)).toBeTruthy();
    mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
    await fireEvent.press(screen.getByText(H.placeRetry));
    expect(await screen.findByText('서울특별시')).toBeTruthy();
    expect(screen.queryByText(H.placeLoadFailed)).toBeNull();
  });

  it('서버 호출이 실패하면 안내를 보여 주고 이동하지 않는다', async () => {
    mockApi.createChart.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', '21:00');
    await fillPlace();
    await fireEvent.press(screen.getByText(H.submit));
    expect(await screen.findByText(H.requestErrors.NETWORK)).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
    expect(await loadBirth()).toBeNull();
  });

  it('보관된 입력값을 복원하고, 바꾸지 않고 누르면 서버를 다시 부르지 않는다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<HomeScreen />);
    expect(await screen.findByDisplayValue('2000-06-15')).toBeTruthy();
    await next();
    expect(screen.getByDisplayValue('21:00')).toBeTruthy();
    await next();
    expect(await screen.findByText('서울특별시 마포구')).toBeTruthy();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/chart'));
    expect(mockApi.createChart).not.toHaveBeenCalled();
  });
});

describe('차트', () => {
  it('시각을 알면 휠의 하우스 선 12개와 핵심 3요소를 보여 준다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartScreen />);
    expect(await screen.findByText(strings.chart.keyAsc)).toBeTruthy();
    expect(screen.getByText(strings.chart.keySun)).toBeTruthy();
    expect(screen.getByText(strings.chart.keyMoon)).toBeTruthy();
    expect(screen.getByText(strings.signs.CAPRICORN)).toBeTruthy();
    expect(screen.getAllByTestId('wheel-house-line')).toHaveLength(12);
    expect(screen.getAllByTestId('wheel-body-dot')).toHaveLength(10);
    expect(screen.getAllByTestId('data-table-row')).toHaveLength(2);
    expect(screen.getByText('24°40′')).toBeTruthy();
  });

  it('시각 "모름" 이면 하우스 선 0개이고 상승궁·하우스 번호를 보여 주지 않는다', async () => {
    await saveBirth({ profile: { ...profile, time: null }, chart: fixtures.chartTimeUnknown });
    await render(<ChartScreen />);
    expect(await screen.findByText(strings.chart.keySun)).toBeTruthy();
    expect(screen.queryByText(strings.chart.keyAsc)).toBeNull();
    expect(screen.queryAllByTestId('wheel-house-line')).toHaveLength(0);
    expect(screen.queryAllByTestId('wheel-house-number')).toHaveLength(0);
    expect(screen.getAllByTestId('wheel-body-dot')).toHaveLength(10);
    expect(screen.getByText(strings.chart.timeUnknownNote)).toBeTruthy();
  });

  it('서버가 실수로 하우스를 실어 보내도 timeKnown 이 false 면 보여 주지 않는다', async () => {
    await saveBirth({ profile: { ...profile, time: null }, chart: { ...fixtures.chart, timeKnown: false } });
    await render(<ChartScreen />);
    expect(await screen.findByText(strings.chart.keySun)).toBeTruthy();
    expect(screen.queryByText(strings.chart.keyAsc)).toBeNull();
    expect(screen.queryAllByTestId('wheel-house-line')).toHaveLength(0);
  });

  it('보관된 차트가 없으면 입력으로 가는 안내를 보여 준다', async () => {
    await render(<ChartScreen />);
    expect(await screen.findByText(strings.chart.empty)).toBeTruthy();
    await fireEvent.press(screen.getByText(strings.chart.goHome));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('"전체 수치 보기" 는 /chart/detail 로 간다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartScreen />);
    await fireEvent.press(await screen.findByText(strings.chart.seeAll));
    expect(router.push).toHaveBeenCalledWith('/chart/detail');
  });
});

describe('차트 자세히', () => {
  const D = strings.detail;

  it('행성 탭: 행성 10개 + 추가 지점 4개 + 상승점·중천', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartDetailScreen />);
    expect(await screen.findByText(strings.bodies.SUN)).toBeTruthy();
    expect(screen.getAllByTestId('data-table-row')).toHaveLength(16);
    expect(screen.getByText(strings.bodies.ASC)).toBeTruthy();
    expect(screen.getByText(strings.bodies.MC)).toBeTruthy();
    expect(screen.getByText(strings.bodies.FORTUNE)).toBeTruthy();
    expect(screen.getAllByText(D.retrograde).length).toBeGreaterThanOrEqual(3);
    expect(screen.getByText('2000. 6. 15. 오후 9:00 · 서울특별시 마포구')).toBeTruthy();
  });

  it('하우스 탭은 경계 12줄, 각도 탭은 서버가 준 각도 수만큼의 줄', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartDetailScreen />);
    await fireEvent.press(await screen.findByRole('tab', { name: D.tabs.houses }));
    expect(screen.getAllByTestId('data-table-row')).toHaveLength(12);
    await fireEvent.press(screen.getByRole('tab', { name: D.tabs.aspects }));
    expect(screen.getAllByTestId('data-table-row')).toHaveLength(fixtures.chart.aspects.length);
    expect(screen.getAllByText(strings.aspects.CONJUNCTION).length).toBeGreaterThan(0);
  });

  it('시각 "모름" 이면 하우스 탭·하우스 칸·상승점·중천·행운점이 없다', async () => {
    await saveBirth({ profile: { ...profile, time: null }, chart: fixtures.chartTimeUnknown });
    await render(<ChartDetailScreen />);
    expect(await screen.findByText(strings.bodies.SUN)).toBeTruthy();
    expect(screen.queryAllByText(D.tabs.houses)).toHaveLength(0);
    expect(screen.queryAllByRole('tab')).toHaveLength(2);
    expect(screen.queryByText(strings.bodies.ASC)).toBeNull();
    expect(screen.queryByText(strings.bodies.MC)).toBeNull();
    expect(screen.queryByText(strings.bodies.FORTUNE)).toBeNull();
    expect(screen.getAllByTestId('data-table-row')).toHaveLength(12);
    expect(screen.getByText(strings.chart.timeUnknownNote)).toBeTruthy();
  });

  it('서버가 실수로 하우스를 실어 보내도 timeKnown 이 false 면 보여 주지 않는다', async () => {
    await saveBirth({ profile: { ...profile, time: null }, chart: { ...fixtures.chart, timeKnown: false } });
    await render(<ChartDetailScreen />);
    expect(await screen.findByText(strings.bodies.SUN)).toBeTruthy();
    expect(screen.queryAllByText(D.tabs.houses)).toHaveLength(0);
    expect(screen.queryAllByRole('tab')).toHaveLength(2);
    expect(screen.queryByText(strings.bodies.ASC)).toBeNull();
    expect(screen.queryByText(strings.bodies.FORTUNE)).toBeNull();
  });
});
