import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

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
  // 홈의 종이 화면이 보일 때마다 알림함을 다시 묻는다(useNotifications)
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    listPlaces: jest.fn(),
    createChart: jest.fn(),
    saveProfile: jest.fn(),
    getMyAccount: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    getNotifications: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    // 서버에 저장된 출생 정보가 없다 — 되살리지 못해 입력부터 받는다(결정 029)
    getProfile: jest.fn(async () => ({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' })),
    // 입력을 마친 뒤 로그인한 홈 · 나 · 시기가 미리 묻는 것 — 이 시험은 입력만 본다
    getTimingReport: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    getMeReport: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    getMonth: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
    postDaySky: jest.fn(async () => ({ ok: false, error: 'NETWORK' })),
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  getSession: jest.fn(() => ({ status: 'signedOut' as const, token: null, ready: true, lastError: null })),
  // 홈의 입력은 로그인한 사람이 서버에서 되살리지 못했을 때 보인다(결정 029) — 로그인 전이면 가드가 보내는 동안 그리지 않는다(성능 계획 4)
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockGetSession = getSession as jest.MockedFunction<typeof getSession>;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const H = strings.home;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chart });
  mockApi.saveProfile.mockImplementation(async (input) => ({ ok: true, data: input }));
  mockGetSession.mockReturnValue({ status: 'signedOut' as const, token: null, ready: true, lastError: null });
});

/** 시트가 닫혀 화면에서 사라질 때까지 기다린다(닫히는 움직임이 끝나야 사라진다) */
const sheetClosed = () => waitFor(() => expect(screen.queryByTestId('sheet-dim')).toBeNull());

/** 고르기 화면이 닫혀 사라질 때까지 기다린다 */
const pickerClosed = () => waitFor(() => expect(screen.queryByTestId('place-picker')).toBeNull());

/** 치지 않고 고른다: 태어난 곳 칸을 누르면 시트가 올라오고, 시·도 칩 → 시·군·구 를 고르면 닫힌다(결정 042) */
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

/** 시각 칸 이름 줄 오른쪽의 "모름" 체크(결정 042) */
const pressUnknown = () => fireEvent.press(screen.getByRole('checkbox', { name: H.timeUnknown }));

/** 생년월일을 치고, 시각은 오후 9:00(21:00)을 고르거나 null 이면 "모름" 을 누른다 */
async function fillDateAndTime(date: string, time: '21:00' | null) {
  await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), date);
  if (time === null) await pressUnknown();
  else await fillTime('PM', 9, 0);
}

describe('출생 정보 입력(홈)', () => {
  it('한 화면에 생년월일 · 태어난 시각 · 태어난 곳이 모두 보인다', async () => {
    await render(<HomeScreen />);
    expect(screen.getByPlaceholderText(H.datePlaceholder)).toBeTruthy();
    expect(screen.getByText(H.timePlaceholder)).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: H.timeUnknown })).toBeTruthy();
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

  it('"모름" 을 고르면 시각 칸은 누를 수 없고 "모름" 이라고 적히며 안내가 붙는다', async () => {
    await render(<HomeScreen />);
    await pressUnknown();
    // 체크 옆 글자와 칸의 값 둘 다 "모름"
    expect(screen.getAllByText(H.timeUnknownValue)).toHaveLength(2);
    expect(screen.getByText(H.timeUnknownNote)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('time-field'));
    expect(screen.queryByText(H.timeConfirm)).toBeNull();
  });

  it('태어난 곳은 아래에서 올라오는 시트에서 고른다: 시·도 칩 → 그 시·도의 시·군·구(결정 042)', async () => {
    await render(<HomeScreen />);
    // 열기 전에는 고르는 줄이 화면에 없다
    expect(screen.queryByTestId('place-option')).toBeNull();
    await fireEvent.press(screen.getByTestId('place-field'));
    // 열면 시·도 칩 17개만 보인다
    expect(await screen.findByText('경기')).toBeTruthy();
    expect(screen.getAllByTestId('place-region')).toHaveLength(17);
    expect(screen.queryAllByTestId('place-option')).toHaveLength(0);
    // 시·도를 누르면 그 시·군·구 목록, 뒤로 가면 다시 칩
    await fireEvent.press(screen.getByText('부산'));
    expect(screen.getAllByTestId('place-option')).toHaveLength(16);
    await fireEvent.press(screen.getByRole('button', { name: strings.common.backLabel }));
    await fireEvent.press(screen.getByText('서울'));
    await fireEvent.press(screen.getByText('마포구'));
    // 고르면 닫히고 고른 곳이 칸에 짧은 이름으로 적힌다
    await pickerClosed();
    expect(screen.getByText('서울 마포구')).toBeTruthy();
    // 하위 시·군·구가 없는 세종은 칩을 누르면 바로 정해진다
    await fireEvent.press(screen.getByTestId('place-field'));
    await fireEvent.press(await screen.findByText('세종'));
    await pickerClosed();
    expect(screen.getByText('세종')).toBeTruthy();
    await fillDateAndTime('2000-06-15', '21:00');
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() =>
      expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: '21:00', placeId: 8394437 }),
    );
  });

  it('시트 바깥을 누르면 고르지 않고 닫힌다', async () => {
    await render(<HomeScreen />);
    await fireEvent.press(screen.getByTestId('place-field'));
    expect(await screen.findByText('경기')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('sheet-dim'));
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

  it('만 14세 미만 날짜로 고치려 하면 서버가 거절하고(403 UNDER_AGE) 그 이유를 보여 주며 보관하지 않는다', async () => {
    mockGetSession.mockReturnValue({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null });
    mockApi.saveProfile.mockResolvedValue({ ok: false, error: 'SERVER', status: 403, code: 'UNDER_AGE' });
    await render(<HomeScreen />);
    await fillDateAndTime('2020-06-15', null);
    await fireEvent.press(screen.getByText(H.submit));
    expect(await screen.findByText(H.requestErrors.UNDER_AGE)).toBeTruthy();
    expect(router.push).not.toHaveBeenCalled();
    expect(await loadBirth()).toBeNull();
  });

  it('"모름" 을 고르면 태어난 곳 칸은 그대로 있되 없어도 되고, 날짜만으로 time · placeId 를 null 로 보낸다(결정 042)', async () => {
    mockGetSession.mockReturnValue({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null });
    mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
    await render(<HomeScreen />);
    expect(screen.getByTestId('place-field')).toBeTruthy();
    await fillDateAndTime('2000-06-15', null);
    expect(screen.getByTestId('place-field')).toBeTruthy();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: null, placeId: null });
    expect(mockApi.saveProfile).toHaveBeenCalledWith({ date: '2000-06-15', time: null, placeId: null });
    expect(await loadBirth()).toEqual({
      profile: { date: '2000-06-15', time: null, place: null },
      chart: fixtures.chartTimeUnknown,
    });
  });

  it('곳을 고른 뒤 "모름" 을 고르면 골라 둔 곳을 서버에 보내지 않는다(기기에는 남는다, 결정 042)', async () => {
    mockApi.createChart.mockResolvedValue({ ok: true, data: fixtures.chartTimeUnknown });
    await render(<HomeScreen />);
    await fillPlace();
    await fillDateAndTime('2000-06-15', null);
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).toHaveBeenCalledWith({ date: '2000-06-15', time: null, placeId: null });
    expect((await loadBirth())?.profile.place).toEqual(profile.place);
  });

  it('"모름" 을 풀고 시각을 다시 넣으면 곳을 고를 때까지 넘어가지 않는다', async () => {
    await render(<HomeScreen />);
    await fillDateAndTime('2000-06-15', null);
    await pressUnknown();
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
    await pressUnknown();
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
    expect(await screen.findByText('서울 마포구')).toBeTruthy();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).not.toHaveBeenCalled();
  });

  it('시각 "모름" 으로 보관된 값은 빈 곳 칸으로 복원하고, 바꾸지 않고 누르면 서버를 다시 부르지 않는다', async () => {
    await saveBirth({ profile: { date: '2000-06-15', time: null, place: null }, chart: fixtures.chartTimeUnknown });
    await render(<BirthScreen />);
    expect(await screen.findByDisplayValue('2000-06-15')).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: H.timeUnknown }).props.accessibilityState).toMatchObject({ checked: true });
    expect(screen.getByText(H.placePlaceholder)).toBeTruthy();
    await fireEvent.press(screen.getByText(H.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/reading'));
    expect(mockApi.createChart).not.toHaveBeenCalled();
  });
});

describe('내 하늘 지도(/chart, 시안 13 · 13-1 · 13-2)', () => {
  const G = strings.glossary;
  const S = strings.skyMap;
  const signFull = (sign: keyof typeof strings.signs) => strings.signs[sign] + strings.chart.signSuffix;

  it('시각을 알면 휠(하우스 선 12 · 축 2, 각도 선 없음)과 "별마다 있던 자리" 12줄, 처음에는 해를 고른 채로 보여 준다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartScreen />);
    expect(await screen.findByText(S.title)).toBeTruthy();
    expect(screen.getAllByTestId('wheel-house-line')).toHaveLength(12);
    expect(screen.getAllByTestId('wheel-axis')).toHaveLength(2);
    expect(screen.queryAllByTestId('wheel-aspect-line')).toHaveLength(0);
    expect(screen.getByText(S.listHeading)).toBeTruthy();
    expect(screen.getAllByTestId(/^sky-row-/)).toHaveLength(12);
    // 해가 고른 별: 휠에서 빛나고 그 하우스 칸이 칠해지며 목록의 줄도 고른 상태
    expect(screen.getByTestId('wheel-selected-dot')).toBeTruthy();
    expect(screen.getAllByTestId('wheel-body-dot')).toHaveLength(9);
    expect(screen.getByTestId('wheel-house-sector')).toBeTruthy();
    expect(screen.getByTestId('sky-row-SUN').props.accessibilityState).toMatchObject({ selected: true });
    // 시트는 별을 누르기 전에는 닫혀 있고, 숫자 표는 "차트 자세히" 에 있다
    expect(screen.queryByTestId('sheet-dim')).toBeNull();
    expect(screen.queryAllByTestId('data-table-row')).toHaveLength(0);
    expect(screen.queryByText(S.timeUnknownNote)).toBeNull();
  });

  it('줄을 누르면 그 별이 휠에서 고른 별이 되고 시트가 열린다(13-1)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartScreen />);
    await fireEvent.press(await screen.findByTestId('sky-row-SATURN'));
    expect(screen.getByTestId('sky-row-SATURN').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByTestId('sky-row-SUN').props.accessibilityState).toMatchObject({ selected: false });
    expect(screen.getByLabelText(`${S.wheelLabel}. ${S.selectedPrefix}${G.bodies.SATURN.name}`)).toBeTruthy();
    // 시트: 토성 · 황소자리 · 4하우스 · 목성과 겹쳐요(합) · 천왕성과 부딪혀요(사분)
    expect(await screen.findByTestId('sheet-dim')).toBeTruthy();
    expect(screen.getByText(`${G.bodies.SATURN.topic}${S.separator}${G.bodies.SATURN.meaning}`)).toBeTruthy();
    expect(screen.getAllByText(signFull('TAURUS')).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(`4${S.houseSuffix}`)).toBeTruthy();
    expect(screen.getAllByTestId('sky-relation')).toHaveLength(2);
    expect(screen.getByText(G.aspects.CONJUNCTION.phrase)).toBeTruthy();
    expect(screen.getByText(G.aspects.SQUARE.phrase)).toBeTruthy();
    // 관계 옆 물음표를 누르면 말풍선(13-2)
    await fireEvent.press(screen.getByRole('button', { name: S.relationsQuestion }));
    expect(screen.getByText(S.relationsTip)).toBeTruthy();
    // 바깥을 누르면 시트만 닫히고 고른 별은 그대로다
    await fireEvent.press(screen.getByTestId('sheet-dim'));
    await sheetClosed();
    expect(screen.getByTestId('sky-row-SATURN').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('이유 줄의 "하늘 지도에서 보기" 로 오면(?selected=) 그 별을 고른 채로 보여 주고, 모르는 값이면 해를 고른다(결정 054 의 4)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ selected: 'MOON' });
    const view = await render(<ChartScreen />);
    expect(await screen.findByLabelText(`${S.wheelLabel}. ${S.selectedPrefix}${G.bodies.MOON.name}`)).toBeTruthy();
    expect(screen.getByTestId('sky-row-MOON').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.queryByTestId('sheet-dim')).toBeNull();
    await view.unmount();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ selected: 'ASC' });
    const asc = await render(<ChartScreen />);
    expect(await screen.findByLabelText(`${S.wheelLabel}. ${S.selectedPrefix}${G.angles.ASC.nickname}`)).toBeTruthy();
    await asc.unmount();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ selected: 'CHIRON' });
    await render(<ChartScreen />);
    expect(await screen.findByLabelText(`${S.wheelLabel}. ${S.selectedPrefix}${G.bodies.SUN.name}`)).toBeTruthy();
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
  });

  it('시각 "모름" 이면 하우스 선 · 번호 · 축이 없고, 목록은 별 10줄에 하우스 글이 없으며 안내를 적는다', async () => {
    await saveBirth({ profile: { ...profile, time: null }, chart: fixtures.chartTimeUnknown });
    await render(<ChartScreen />);
    expect(await screen.findByText(S.listHeading)).toBeTruthy();
    expect(screen.queryAllByTestId('wheel-house-line')).toHaveLength(0);
    expect(screen.queryAllByTestId(/^wheel-house-number-/)).toHaveLength(0);
    expect(screen.queryAllByTestId('wheel-axis')).toHaveLength(0);
    expect(screen.queryByTestId('wheel-house-sector')).toBeNull();
    expect(screen.getAllByTestId(/^sky-row-/)).toHaveLength(10);
    expect(screen.queryByText(G.angles.ASC.nickname)).toBeNull();
    // 줄의 "N하우스 · 주제" 가 없다(안내 글의 "하우스" 는 빼고 본다)
    expect(screen.queryByText(new RegExp(`\\d${S.houseSuffix}`))).toBeNull();
    expect(screen.getByText(S.timeUnknownNote)).toBeTruthy();
    // 시트에도 하우스 줄이 없다
    await fireEvent.press(screen.getByTestId('sky-row-SUN'));
    expect(await screen.findByTestId('sheet-dim')).toBeTruthy();
    expect(screen.queryByText(new RegExp(`\\d${S.houseSuffix}$`))).toBeNull();
  });

  it('서버가 실수로 하우스를 실어 보내도 timeKnown 이 false 면 보여 주지 않는다', async () => {
    await saveBirth({ profile: { ...profile, time: null }, chart: { ...fixtures.chart, timeKnown: false } });
    await render(<ChartScreen />);
    expect(await screen.findByText(S.listHeading)).toBeTruthy();
    expect(screen.queryAllByTestId('wheel-house-line')).toHaveLength(0);
    expect(screen.getAllByTestId(/^sky-row-/)).toHaveLength(10);
    expect(screen.queryByText(G.angles.ASC.nickname)).toBeNull();
  });

  it('보관된 차트가 없으면 입력으로 가는 안내를 보여 준다', async () => {
    await render(<ChartScreen />);
    expect(await screen.findByText(strings.chart.empty)).toBeTruthy();
    await fireEvent.press(screen.getByText(strings.chart.goHome));
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('맨 아래 "차트 자세히" 줄은 없다 — 목록의 마지막 줄(꿈의 자리)로 끝난다(소유자, 빌드 11). 차트 자세히 화면은 남는다(아래)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartScreen />);
    await screen.findByText(S.listHeading);
    expect(screen.queryByText(strings.detail.title)).toBeNull();
    expect(screen.queryByRole('button', { name: strings.detail.title })).toBeNull();
    expect(screen.getAllByTestId(/^sky-row-/).at(-1)?.props.testID).toBe('sky-row-MC');
  });

  it('지도 아래 "별을 누르면 지도에서 그 자리가 빛나요" 안내 글은 없다 — 줄을 누르면 그 별이 빛나는 동작은 그대로(소유자, 빌드 11)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartScreen />);
    await screen.findByText(S.listHeading);
    expect(screen.queryByText(/지도에서 그 자리가 빛나요/)).toBeNull();
    await fireEvent.press(screen.getByTestId('sky-row-MOON'));
    expect(screen.getByTestId('sky-row-MOON').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByLabelText(`${S.wheelLabel}. ${S.selectedPrefix}${G.bodies.MOON.name}`)).toBeTruthy();
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

  it('행성 표는 머리 줄 · 칸 · 천체 칸의 쉬운 말과 역행까지 가운데, 뒤로 가기는 다른 화면과 같은 꺾쇠(소유자 2026-11-21)', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    await render(<ChartDetailScreen />);
    await screen.findByText(strings.bodies.SUN);
    // 같은 글자가 탭 등 다른 곳에도 있어 표 안의 것(가운데 맞춘 것)이 있는지로 본다
    const centered = (text: string) => screen.getAllByText(text).some((n) => StyleSheet.flatten(n.props.style).textAlign === 'center');
    for (const title of [D.columns.body, D.columns.sign, D.columns.degree, D.columns.house]) expect(centered(title)).toBe(true);
    expect(centered(strings.bodies.SUN)).toBe(true);
    expect(centered(strings.bodyMeanings.SUN)).toBe(true);
    expect(screen.queryByText(strings.common.back)).toBeNull();
    expect(screen.getByRole('button', { name: strings.common.backLabel })).toBeTruthy();
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
