import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';

import ChartDetailScreen from '@/app/chart/detail';
import ChartScreen from '@/app/chart/index';
import BirthScreen from '@/app/birth';
import HomeScreen from '@/app/index';
import { strings } from '@/content/strings';
import { getSession } from '@/features/auth/use-session';
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
  api: { listPlaces: jest.fn(), createChart: jest.fn(), saveProfile: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  getSession: jest.fn(() => ({ status: 'signedOut' as const, token: null, ready: true, lastError: null })),
  // 홈은 세션이 없으면 서버에 저장된 출생 정보를 묻지 않고 입력부터 받는다(결정 029).
  useSession: jest.fn(() => ({ status: 'signedOut' as const, token: null, ready: true, lastError: null })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const H = strings.home;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chart });
  mockApi.saveProfile.mockImplementation(async (input) => ({ ok: true, data: input }));
  mockGetSession.mockReturnValue({ status: 'signedOut' as const, token: null, ready: true, lastError: null });
});

/** 시트가 닫혀 화면에서 사라질 때까지 기다린다(닫히는 움직임이 끝나야 사라진다) */
const sheetClosed = () => waitFor(() => expect(screen.queryByTestId('sheet-dim')).toBeNull());

/** 고르기 화면이 닫혀 사라질 때까지 기다린다 */
const pickerClosed = () => waitFor(() => expect(screen.queryByTestId('place-picker')).toBeNull());

/** 치지 않고 고른다: 태어난 곳 칸을 누르면 고르기 화면이 가득 차고, 시·도 → 시·군·구 를 고르면 닫힌다 */
async function fillPlace() {
  await fireEvent.press(screen.getByTestId('place-field'));
  await fireEvent.press(await screen.findByText('서울'));
  await fireEvent.press(await screen.findByText('마포구'));
  await pickerClosed();
}

/** 시각 칸을 누르면 올라오는 드럼롤 시트에서 오전/오후 · 시 · 분을 고르고 확인을 누른다 */
async function fillTime(period: 'AM' | 'PM', hour: number, minute: number) {
  await fireEvent.press(screen.getByTestId('time-field'));
  await fireEvent.press(await screen.findByTestId(`time-period-${period}`));
  await fireEvent.press(screen.getByTestId(`time-hour-${hour}`));
  await fireEvent.press(screen.getByTestId(`time-minute-${minute}`));
  await fireEvent.press(screen.getByText(H.timeConfirm));
  await sheetClosed();
}

/** 생년월일을 치고, 시각은 오후 9:00(21:00)을 고르거나 null 이면 "모름" 을 누른다 */
async function fillDateAndTime(date: string, time: '21:00' | null) {
  await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), date);
  if (time === null) await fireEvent.press(screen.getByText(H.timeUnknown));
  else await fillTime('PM', 9, 0);
}

describe('출생 정보 입력(홈)', () => {
  it('한 화면에 생년월일 · 태어난 시각 · 태어난 곳이 모두 보인다', async () => {
    await render(<HomeScreen />);
    expect(screen.getByPlaceholderText(H.datePlaceholder)).toBeTruthy();
    expect(screen.getByText(H.timePlaceholder)).toBeTruthy();
    expect(screen.getByText(H.timeUnknown)).toBeTruthy();
    expect(screen.getByText(H.placePlaceholder)).toBeTruthy();
    // 숫자만 쳐도 꼴이 맞춰진다
    await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), '20000615');
    expect(screen.getByDisplayValue('2000-06-15')).toBeTruthy();
  });

  it('태어난 시각은 아래에서 올라오는 시트의 드럼롤에서 고르고, 확인을 눌러야 정해진다', async () => {
    await render(<HomeScreen />);
    expect(screen.getByTestId('time-field').props.accessibilityState.expanded).toBe(false);
    await fireEvent.press(screen.getByTestId('time-field'));
    expect(await screen.findByText(H.timeConfirm)).toBeTruthy();
    // 시트가 열려 있는 동안 칸의 화살표는 위를 향한다
    expect(screen.getByTestId('time-field').props.accessibilityState.expanded).toBe(true);
    await fireEvent.press(screen.getByTestId('time-period-AM'));
    await fireEvent.press(screen.getByTestId('time-hour-7'));
    await fireEvent.press(screen.getByTestId('time-minute-5'));
    // 바깥을 눌러 닫으면 정해지지 않는다
    await fireEvent.press(screen.getByTestId('sheet-dim'));
    await sheetClosed();
    expect(screen.getByText(H.timePlaceholder)).toBeTruthy();
    await fillTime('AM', 7, 5);
    expect(screen.getByText('오전 7:05')).toBeTruthy();
    // 다시 열면 고른 값에서 시작한다
    await fireEvent.press(screen.getByTestId('time-field'));
    expect((await screen.findByTestId('time-hour-7')).props.accessibilityState.selected).toBe(true);
  });

  it('"모름" 을 고르면 시각 칸은 누를 수 없고 "모름" 이라고 적힌다', async () => {
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByText(H.timeUnknown));
    expect(screen.getByText(H.timeUnknownValue)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('time-field'));
    expect(screen.queryByText(H.timeConfirm)).toBeNull();
  });

  it('태어난 곳은 화면을 가득 채우는 고르기 화면에서 고른다: 왼쪽 시·도, 오른쪽 그 시·도의 시·군·구', async () => {
    await render(<HomeScreen />);
    // 열기 전에는 고르는 줄이 화면에 없다
    expect(screen.queryByTestId('place-option')).toBeNull();
    await fireEvent.press(screen.getByTestId('place-field'));
    // 열자마자 시·도 17개와 첫 시·도(서울)의 구 25개가 함께 보인다
    expect(await screen.findByText('경기')).toBeTruthy();
    expect(screen.getAllByTestId('place-region')).toHaveLength(17);
    expect(screen.getAllByTestId('place-option')).toHaveLength(25);
    // 다른 시·도를 누르면 오른쪽만 바뀐다
    await fireEvent.press(screen.getByText('부산'));
    expect(screen.getAllByTestId('place-option')).toHaveLength(16);
    await fireEvent.press(screen.getByText('서울'));
    await fireEvent.press(screen.getByText('마포구'));
    // 고르면 닫히고 고른 곳이 칸에 적힌다
    await pickerClosed();
    expect(screen.getByText('서울특별시 마포구')).toBeTruthy();
    // 다시 열면 고른 시·도의 목록부터 보인다
    await fireEvent.press(screen.getByTestId('place-field'));
    expect(await screen.findByText('마포구')).toBeTruthy();
    // 하위 시·군·구가 없는 세종은 오른쪽에 한 줄만 있다
    await fireEvent.press(screen.getByText('세종'));
    expect(screen.getAllByTestId('place-option')).toHaveLength(1);
    await fireEvent.press(screen.getByText('세종특별자치시'));
    await pickerClosed();
    await fillDateAndTime('2000-06-15', '21:00');
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() =>
      expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: '21:00', placeId: 8394437 }),
    );
  });

  it('고르기 화면에서 뒤로 가면 고르지 않고 닫힌다', async () => {
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByTestId('place-field'));
    expect(await screen.findByText('경기')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText(strings.common.backLabel));
    await pickerClosed();
    expect(screen.getByText(H.placePlaceholder)).toBeTruthy();
  });

  it('날짜·시각·출생지를 넣고 누르면 차트를 받아 보관하고 풀이 글(/reading)로 간다', async () => {
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', '21:00');
    await fillPlace();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: '21:00', placeId: 1841277 });
    expect(await loadBirth()).toEqual({ profile, chart: fixtures.chart });
    // 세션이 없으면 서버에 출생 정보를 저장하지 않는다
    expect(mockApi.saveProfile).not.toHaveBeenCalled();
  });

  it('세션이 있으면 차트를 받은 뒤 출생 정보를 서버에도 저장한다(PUT /profile)', async () => {
    mockGetSession.mockReturnValue({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null });
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', '21:00');
    await fillPlace();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
    expect(mockApi.saveProfile).toHaveBeenCalledWith({ date: '2000-06-15', time: '21:00', placeId: 1841277 });
    expect(await loadBirth()).toEqual({ profile, chart: fixtures.chart });
  });

  it('서버에 출생 정보를 저장하지 못하면 안내를 보여 주고 보관도 이동도 하지 않는다', async () => {
    mockGetSession.mockReturnValue({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null });
    mockApi.saveProfile.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', '21:00');
    await fillPlace();
    await fireEvent.press(screen.getByText(H.submit));
    expect(await screen.findByText(H.requestErrors.NETWORK)).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
    expect(await loadBirth()).toBeNull();
  });

  it('"모름" 을 고르면 태어난 곳 칸이 사라지고, 날짜만으로 time · placeId 를 null 로 보낸다(결정 020)', async () => {
    mockGetSession.mockReturnValue({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null });
    mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
    await render(<HomeScreen />);
    expect(screen.getByTestId('place-field')).toBeTruthy();
    await fillDateAndTime('2000-06-15', null);
    expect(screen.queryByTestId('place-field')).toBeNull();
    expect(screen.queryByText(H.placeLabel)).toBeNull();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: null, placeId: null });
    expect(mockApi.saveProfile).toHaveBeenCalledWith({ date: '2000-06-15', time: null, placeId: null });
    expect(await loadBirth()).toEqual({
      profile: { date: '2000-06-15', time: null, place: null },
      chart: fixtures.chartTimeUnknown,
    });
  });

  it('곳을 고른 뒤 "모름" 을 고르면 골라 둔 곳을 보내지 않는다', async () => {
    mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
    await render(<HomeScreen />);
    await fillPlace();
    await fillDateAndTime('2000-06-15', null);
    expect(screen.queryByTestId('place-field')).toBeNull();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: null, placeId: null });
    expect((await loadBirth())?.profile.place).toBeNull();
  });

  it('"모름" 을 풀고 시각을 다시 넣으면 태어난 곳 칸이 나타나고, 곳을 고를 때까지 넘어가지 않는다', async () => {
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', null);
    expect(screen.queryByTestId('place-field')).toBeNull();
    await fireEvent.press(screen.getByText(H.timeUnknown));
    expect(screen.getByTestId('place-field')).toBeTruthy();
    await fillTime('PM', 9, 0);
    await fireEvent.press(screen.getByText(H.submit));
    expect(await screen.findByText(H.errors.placeRequired)).toBeTruthy();
    expect(mockApi.createChart).not.toHaveBeenCalled();
    await fillPlace();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: '21:00', placeId: 1841277 });
  });

  it('곳이 비었다는 오류가 떠 있어도 "모름" 을 고르면 그대로 넘어간다', async () => {
    mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', '21:00');
    await fireEvent.press(screen.getByText(H.submit));
    expect(await screen.findByText(H.errors.placeRequired)).toBeTruthy();
    await fireEvent.press(screen.getByText(H.timeUnknown));
    expect(screen.queryByText(H.errors.placeRequired)).toBeNull();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
  });

  it('1900년 이전 날짜는 다 치자마자 오류를 보여 준다', async () => {
    await render(<HomeScreen />);
    await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), '1899-12-31');
    expect(screen.getByText(H.errors.dateTooEarly)).toBeTruthy();
    // 칸을 고치면 그 칸의 오류 문구는 사라진다
    await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), '1999-12-31');
    expect(screen.queryByText(H.errors.dateTooEarly)).toBeNull();
  });

  it('다 채우지 않고 누르면 빈 칸의 오류를 보여 주고 서버를 부르지 않는다', async () => {
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByText(H.submit));
    expect(await screen.findByText(H.errors.dateFormat)).toBeTruthy();
    expect(screen.getByText(H.errors.timeRequired)).toBeTruthy();
    expect(screen.getByText(H.errors.placeRequired)).toBeTruthy();
    await fillDateAndTime('2000-06-15', '21:00');
    await fireEvent.press(screen.getByText(H.submit));
    expect(await screen.findByText(H.errors.placeRequired)).toBeTruthy();
    expect(mockApi.createChart).not.toHaveBeenCalled();
  });

  it('목록을 불러오지 못하면 안내를 보여 주고 다시 불러올 수 있다', async () => {
    mockApi.listPlaces.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByTestId('place-field'));
    expect(await screen.findByText(H.placeLoadFailed)).toBeTruthy();
    mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
    await fireEvent.press(screen.getByText(H.placeRetry));
    expect(await screen.findByText('서울')).toBeTruthy();
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
    // 출생 정보가 있으면 홈은 카테고리 화면이다. 넣어 둔 값을 고치는 곳은 /birth 다(결정 019).
    await render(<BirthScreen />);
    expect(await screen.findByDisplayValue('2000-06-15')).toBeTruthy();
    expect(screen.getByText('오후 9:00')).toBeTruthy();
    expect(await screen.findByText('서울특별시 마포구')).toBeTruthy();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).not.toHaveBeenCalled();
  });

  it('시각 "모름" 으로 보관된 값은 곳 칸 없이 복원하고, 바꾸지 않고 누르면 서버를 다시 부르지 않는다', async () => {
    await saveBirth({ profile: { date: '2000-06-15', time: null, place: null }, chart: fixtures.chartTimeUnknown });
    await render(<BirthScreen />);
    expect(await screen.findByDisplayValue('2000-06-15')).toBeTruthy();
    expect(screen.getByText(H.timeUnknownValue)).toBeTruthy();
    expect(screen.queryByTestId('place-field')).toBeNull();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).not.toHaveBeenCalled();
    // "모름" 을 풀면 곳 칸이 비어 나타난다
    await fireEvent.press(screen.getByText(H.timeUnknown));
    expect(screen.getByTestId('place-field')).toBeTruthy();
    expect(screen.getByText(H.placePlaceholder)).toBeTruthy();
  });
});

describe('차트', () => {
  it('시각을 알면 휠의 하우스 선 12개와 핵심 3요소를 보여 준다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartScreen />);
    expect(await screen.findByText(strings.chart.keyAsc)).toBeTruthy();
    expect(screen.getByText(strings.chart.keySun)).toBeTruthy();
    expect(screen.getByText(strings.chart.keyMoon)).toBeTruthy();
    expect(screen.getByText(strings.signs.CAPRICORN + strings.chart.signSuffix)).toBeTruthy();
    expect(screen.getAllByTestId('wheel-house-line')).toHaveLength(12);
    expect(screen.getAllByTestId('wheel-body-dot')).toHaveLength(10);
    // 숫자 표는 "자세히" 로 옮기고, 이 화면에는 쉬운 말 설명을 바로 적는다
    expect(screen.queryAllByTestId('data-table-row')).toHaveLength(0);
    expect(screen.getByText(strings.chart.wheelCaption)).toBeTruthy();
    expect(screen.getByText(strings.chart.keySunCaption)).toBeTruthy();
    expect(screen.getByText(strings.chart.keyAscCaption)).toBeTruthy();
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

describe('차트에서 다음 화면으로', () => {
  it('"내 별명 읽기" 를 누르면 /reading 으로, "궁합 보기" 를 누르면 /synastry 로 간다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartScreen />);
    const read = await screen.findByRole('button', { name: strings.chart.readReading });
    expect(read.props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(read);
    expect(router.push).toHaveBeenCalledWith('/reading');
    const synastry = screen.getByRole('button', { name: strings.chart.seeSynastry });
    expect(synastry.props.accessibilityState.disabled).toBe(false);
    await fireEvent.press(synastry);
    expect(router.push).toHaveBeenCalledWith('/synastry');
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
    // 표 위에 이 표가 무엇인지 한 줄, 줄마다 그 천체가 맡은 주제를 쉬운 말로 적는다
    expect(screen.getByText(D.intro.planets)).toBeTruthy();
    expect(screen.getByText(strings.bodyMeanings.SUN)).toBeTruthy();
    expect(screen.getByText(strings.bodyMeanings.VERTEX)).toBeTruthy();
    expect(screen.getByText('2000. 6. 15. 오후 9:00 · 서울특별시 마포구')).toBeTruthy();
  });

  it('하우스 탭은 경계 12줄, 각도 탭은 서버가 준 각도 수만큼의 줄', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartDetailScreen />);
    await fireEvent.press(await screen.findByRole('tab', { name: D.tabs.houses }));
    expect(screen.getAllByTestId('data-table-row')).toHaveLength(12);
    expect(screen.getByText(D.intro.houses)).toBeTruthy();
    expect(screen.getByText(strings.houseMeanings[7])).toBeTruthy();
    await fireEvent.press(screen.getByRole('tab', { name: D.tabs.aspects }));
    expect(screen.getByText(D.intro.aspects)).toBeTruthy();
    expect(screen.getAllByText(strings.aspectMeanings.CONJUNCTION).length).toBeGreaterThan(0);
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

  it('곳 없이 보관된 시각 "모름" 출생 정보로도 표와 출생 정보 줄을 그린다', async () => {
    await saveBirth({ profile: { date: '2000-06-15', time: null, place: null }, chart: fixtures.chartTimeUnknown });
    await render(<ChartDetailScreen />);
    expect(await screen.findByText(strings.bodies.SUN)).toBeTruthy();
    expect(screen.getByText('2000. 6. 15. · 태어난 시각 모름')).toBeTruthy();
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

describe('설명 버튼', () => {
  const HELP = strings.help;

  it('차트 화면: 그림 읽는 법과 세 가지의 뜻을 물음표 버튼으로 연다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartScreen />);
    expect(await screen.findByText(strings.chart.wheelHeading)).toBeTruthy();
    expect(screen.queryByText(HELP.wheel.items[0].text)).toBeNull();
    await fireEvent.press(screen.getByTestId('info-wheel'));
    expect(await screen.findByText(HELP.wheel.title)).toBeTruthy();
    expect(screen.getByText(HELP.wheel.items[0].text)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sheet-dim'));
    await waitFor(() => expect(screen.queryByTestId('sheet-dim')).toBeNull());
    await fireEvent.press(screen.getByTestId('info-key-three'));
    expect(await screen.findByText(HELP.keyThree.title)).toBeTruthy();
  });

  it('시각 모름 차트의 설명에는 하우스와 첫인상 이야기가 없다', async () => {
    await saveBirth({ profile: { ...profile, time: null }, chart: fixtures.chartTimeUnknown });
    await render(<ChartScreen />);
    await fireEvent.press(await screen.findByTestId('info-key-three'));
    expect(await screen.findByText(HELP.keyThree.title)).toBeTruthy();
    expect(screen.queryByText(HELP.keyThree.asc.text)).toBeNull();
    expect(screen.getByText(HELP.keyThree.items[0].text)).toBeTruthy();
  });

  it('차트 자세히: 보고 있는 탭의 설명을 연다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartDetailScreen />);
    await fireEvent.press(await screen.findByTestId('info-detail'));
    expect(await screen.findByText(HELP.planets.title)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sheet-dim'));
    await waitFor(() => expect(screen.queryByTestId('sheet-dim')).toBeNull());
    await fireEvent.press(screen.getByText(strings.detail.tabs.aspects));
    await fireEvent.press(screen.getByTestId('info-detail'));
    expect(await screen.findByText(HELP.aspects.title)).toBeTruthy();
  });
});
