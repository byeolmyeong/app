import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import SynastryResultScreen from '@/app/synastry/[id]/index';
import SynastryEntryScreen from '@/app/synastry/index';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { BIRTH_STORAGE_KEY, saveBirth } from '@/features/chart/use-birth-profile';
import { forgetFresh, freshOf, rememberFresh } from '@/features/synastry/fresh-synastry';
import { api, type ApiResult, type Synastry } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    listPlaces: jest.fn(),
    saveProfile: jest.fn(),
    createDirectSynastry: jest.fn(),
    getSynastry: jest.fn(),
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ token: 'dev-token', ready: true })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockParams = useLocalSearchParams as jest.Mock;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const mine = { date: '2000-06-15', time: '21:00', placeId: 1841277 };
const H = strings.home;
const S = strings.synastry;
const made = fixtures.synastry;
const { overlay: _overlay, ...stored } = made;
const partner = { date: '1999-03-02', time: null, placeId: null };

const sheetClosed = () => waitFor(() => expect(screen.queryByTestId('sheet-dim')).toBeNull());
const pickerClosed = () => waitFor(() => expect(screen.queryByTestId('place-picker')).toBeNull());

/** 관계 · 이름 · 생년월일을 넣는다. 시각은 건드리지 않는다 */
async function fillBasics(relation = '연애', name = '지우', date = '19990302') {
  await fireEvent.press(await screen.findByText(relation));
  await fireEvent.changeText(screen.getByPlaceholderText(S.entry.namePlaceholder), name);
  await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), date);
}

async function fillTimeAndPlace() {
  await fireEvent.press(screen.getByTestId('time-field'));
  await fireEvent.press(await screen.findByTestId('time-period-AM'));
  await fireEvent.press(screen.getByTestId('time-hour-8'));
  await fireEvent.press(screen.getByTestId('time-minute-30'));
  await fireEvent.press(screen.getByText(H.timeConfirm));
  await sheetClosed();
  await fireEvent.press(screen.getByTestId('place-field'));
  await fireEvent.press(await screen.findByText('서울'));
  await fireEvent.press(await screen.findByText('마포구'));
  await pickerClosed();
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  forgetFresh();
  mockUseSession.mockReturnValue({ token: 'dev-token', ready: true });
  mockParams.mockReturnValue({});
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  mockApi.saveProfile.mockImplementation(async (input) => ({ ok: true, data: input }));
  mockApi.createDirectSynastry.mockResolvedValue({ ok: true, data: made });
  mockApi.getSynastry.mockResolvedValue({ ok: true, data: stored });
  await saveBirth({ profile, chart: fixtures.chart });
});

describe('궁합 시작(/synastry): 한 화면에서 관계 · 이름 · 상대의 출생 정보를 넣는다', () => {
  it('관계 유형 넷(연애 · 친구 · 일 · 가족)과 이름 · 생년월일 · 시각 · 곳 칸이 한 화면에 모두 보인다', async () => {
    await render(<SynastryEntryScreen />);
    const chips = await screen.findAllByTestId('relation-chip');
    expect(chips.map((c) => c.props.accessibilityLabel)).toEqual(['연애', '친구', '일', '가족']);
    // 처음에는 아무것도 골라져 있지 않다
    expect(chips.map((c) => c.props.accessibilityState.selected)).toEqual([false, false, false, false]);
    expect(screen.getByPlaceholderText(S.entry.namePlaceholder)).toBeTruthy();
    expect(screen.getByPlaceholderText(H.datePlaceholder)).toBeTruthy();
    expect(screen.getByTestId('time-field')).toBeTruthy();
    expect(screen.getByTestId('place-field')).toBeTruthy();
    // 숫자만 쳐도 날짜 꼴이 맞춰진다
    await fireEvent.changeText(screen.getByPlaceholderText(H.datePlaceholder), '19990302');
    expect(screen.getByDisplayValue('1999-03-02')).toBeTruthy();
  });

  it('관계는 하나만 골라지고, 다른 것을 누르면 바뀐다', async () => {
    await render(<SynastryEntryScreen />);
    await fireEvent.press(await screen.findByText('친구'));
    const selected = () => screen.getAllByTestId('relation-chip').map((c) => c.props.accessibilityState.selected);
    expect(selected()).toEqual([false, true, false, false]);
    await fireEvent.press(screen.getByText('가족'));
    expect(selected()).toEqual([false, false, false, true]);
  });

  it('"태어난 시각을 몰라요" 를 고르면 태어난 곳 칸이 사라지고, 풀면 다시 나타난다', async () => {
    await render(<SynastryEntryScreen />);
    await fireEvent.press(await screen.findByText(H.timeUnknown));
    expect(screen.queryByTestId('place-field')).toBeNull();
    await fireEvent.press(screen.getByText(H.timeUnknown));
    expect(screen.getByTestId('place-field')).toBeTruthy();
  });

  it('관계 · 이름 · 날짜 · 시각 · 곳이 비어 있으면 칸마다 알리고 서버를 부르지 않는다', async () => {
    await render(<SynastryEntryScreen />);
    await fireEvent.press(await screen.findByText(S.entry.submit));
    expect(screen.getByText(S.entry.errors.relationRequired)).toBeTruthy();
    expect(screen.getByText(S.entry.errors.nameRequired)).toBeTruthy();
    expect(screen.getByText(H.errors.dateFormat)).toBeTruthy();
    expect(screen.getByText(H.errors.timeRequired)).toBeTruthy();
    expect(screen.getByText(H.errors.placeRequired)).toBeTruthy();
    expect(mockApi.createDirectSynastry).not.toHaveBeenCalled();
    // 빈칸뿐인 이름도 받지 않는다
    await fillBasics('연애', '   ');
    await fireEvent.press(screen.getByText(H.timeUnknown));
    await fireEvent.press(screen.getByText(S.entry.submit));
    expect(screen.getByText(S.entry.errors.nameRequired)).toBeTruthy();
    expect(mockApi.createDirectSynastry).not.toHaveBeenCalled();
  });

  it('시각을 알면 { name, relation, date, time, placeId } 를 보내고 결과 화면으로 간다', async () => {
    await render(<SynastryEntryScreen />);
    await fillBasics('일', '  박 팀장님 ');
    await fillTimeAndPlace();
    await fireEvent.press(screen.getByText(S.entry.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/synastry/${made.id}`));
    expect(mockApi.createDirectSynastry).toHaveBeenCalledTimes(1);
    expect(mockApi.createDirectSynastry).toHaveBeenCalledWith({
      name: '박 팀장님',
      relation: 'WORK',
      date: '1999-03-02',
      time: '08:30',
      placeId: 1841277,
    });
  });

  it('시각을 모르면 곳 없이 { time: null, placeId: null } 로 보낸다(앞서 고른 곳이 있어도)', async () => {
    await render(<SynastryEntryScreen />);
    await fillBasics('가족', '엄마');
    await fillTimeAndPlace();
    await fireEvent.press(screen.getByText(H.timeUnknown));
    await fireEvent.press(screen.getByText(S.entry.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(mockApi.createDirectSynastry).toHaveBeenCalledWith({
      name: '엄마',
      relation: 'FAMILY',
      date: '1999-03-02',
      time: null,
      placeId: null,
    });
  });

  it('계산하는 동안에는 입력 칸 대신 기다리는 화면을 보여 주고, 그동안 또 보내지 않는다', async () => {
    let finish: (r: ApiResult<Synastry>) => void = () => {};
    mockApi.createDirectSynastry.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    await render(<SynastryEntryScreen />);
    await fillBasics();
    await fireEvent.press(screen.getByText(H.timeUnknown));
    await fireEvent.press(screen.getByText(S.entry.submit));
    expect(await screen.findByText(S.entry.calculating)).toBeTruthy();
    // 길면 1분쯤 걸린다고 알린다
    expect(screen.getByText(S.entry.calculatingNote)).toBeTruthy();
    expect(S.entry.calculatingNote).toMatch(/1분/);
    expect(screen.queryByText(S.entry.submit)).toBeNull();
    expect(screen.queryByPlaceholderText(H.datePlaceholder)).toBeNull();
    expect(router.push).not.toHaveBeenCalled();
    await act(async () => finish({ ok: true, data: made }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/synastry/${made.id}`));
    expect(mockApi.createDirectSynastry).toHaveBeenCalledTimes(1);
  });

  it('실패하면 넣은 값이 그대로인 입력 화면으로 돌아와 안내를 보여 준다', async () => {
    mockApi.createDirectSynastry.mockResolvedValueOnce({
      ok: false,
      error: 'SERVER',
      status: 502,
      code: 'GENERATION_FAILED',
    });
    await render(<SynastryEntryScreen />);
    await fillBasics('친구', '민서');
    await fireEvent.press(screen.getByText(H.timeUnknown));
    await fireEvent.press(screen.getByText(S.entry.submit));
    expect(await screen.findByText(S.entry.failed.OTHER)).toBeTruthy();
    expect(screen.getByDisplayValue('민서')).toBeTruthy();
    expect(screen.getByDisplayValue('1999-03-02')).toBeTruthy();
    expect(screen.getAllByTestId('relation-chip')[1].props.accessibilityState.selected).toBe(true);
    expect(router.push).not.toHaveBeenCalled();
    // 다시 누르면 같은 값으로 다시 보낸다
    await fireEvent.press(screen.getByText(S.entry.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/synastry/${made.id}`));
    expect(mockApi.createDirectSynastry).toHaveBeenCalledTimes(2);
  });

  it('인터넷이 끊겼을 때와 요청이 많을 때는 그에 맞는 안내를 보여 준다', async () => {
    mockApi.createDirectSynastry
      .mockResolvedValueOnce({ ok: false, error: 'NETWORK' })
      .mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<SynastryEntryScreen />);
    await fillBasics();
    await fireEvent.press(screen.getByText(H.timeUnknown));
    await fireEvent.press(screen.getByText(S.entry.submit));
    expect(await screen.findByText(S.entry.failed.NETWORK)).toBeTruthy();
    await fireEvent.press(screen.getByText(S.entry.submit));
    expect(await screen.findByText(S.entry.failed.LIMIT)).toBeTruthy();
  });

  it('서버에 내 출생 정보가 없으면(404 NO_PROFILE) 기기의 내 출생 정보를 저장하고 한 번만 더 요청한다', async () => {
    mockApi.createDirectSynastry.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NO_PROFILE' });
    await render(<SynastryEntryScreen />);
    await fillBasics();
    await fireEvent.press(screen.getByText(H.timeUnknown));
    await fireEvent.press(screen.getByText(S.entry.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(`/synastry/${made.id}`));
    expect(mockApi.saveProfile).toHaveBeenCalledWith(mine);
    expect(mockApi.createDirectSynastry).toHaveBeenCalledTimes(2);
  });

  it('상대의 출생 정보와 겹친 휠은 기기에 보관하지 않고 메모리에만 둔다', async () => {
    await render(<SynastryEntryScreen />);
    await fillBasics();
    await fireEvent.press(screen.getByText(H.timeUnknown));
    await fireEvent.press(screen.getByText(S.entry.submit));
    await waitFor(() => expect(router.push).toHaveBeenCalled());
    // 방금 계산한 것은 메모리에 있다(휠과 리포트 요청에 쓴다)
    expect(freshOf(made.id)).toEqual({ synastry: made, birth: partner });
    // 기기에는 내 출생 정보뿐이다
    const keys = await AsyncStorage.getAllKeys();
    expect(keys).toEqual([BIRTH_STORAGE_KEY]);
    const everything = JSON.stringify(await AsyncStorage.multiGet(keys));
    expect(everything).not.toContain('1999-03-02');
    expect(everything).not.toContain('theirs');
  });

  it('내 출생 정보가 없으면 입력으로 가는 안내를 보여 준다', async () => {
    await AsyncStorage.clear();
    await render(<SynastryEntryScreen />);
    expect(await screen.findByText(strings.chart.empty)).toBeTruthy();
    expect(screen.queryByText(S.entry.submit)).toBeNull();
  });
});

describe('궁합 결과(/synastry/[id])', () => {
  beforeEach(() => mockParams.mockReturnValue({ id: made.id }));

  it('계산 직후: 이름 · 관계 · 점수 · 한 줄 요약 · 키워드 셋과 겹친 휠을 보여 주고 서버를 다시 부르지 않는다', async () => {
    rememberFresh({ synastry: made, birth: partner });
    await render(<SynastryResultScreen />);
    expect(await screen.findByText(`${made.score}${S.result.scoreUnit}`)).toBeTruthy();
    expect(screen.getByText(`${made.name} · 연애`)).toBeTruthy();
    expect(screen.getByText(made.headline)).toBeTruthy();
    const keywords = screen.getAllByTestId('synastry-keyword');
    expect(keywords).toHaveLength(3);
    made.keywords.forEach((k, i) => expect(within(keywords[i]).getByText(k)).toBeTruthy());
    // 겹친 휠: 내 점과 상대 점, 읽는 법 설명 버튼
    expect(screen.getByTestId('overlay-wheel')).toBeTruthy();
    expect(screen.getAllByTestId('overlay-mine-dot')).toHaveLength(10);
    expect(screen.getAllByTestId('overlay-theirs-dot')).toHaveLength(10);
    expect(screen.getByText(S.result.wheelCaption)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('info-overlay'));
    expect(await screen.findByText(strings.help.overlay.items[0].text)).toBeTruthy();
    expect(mockApi.getSynastry).not.toHaveBeenCalled();
    expect(screen.queryByText(S.result.noWheel)).toBeNull();
  });

  it('나중에 다시 열면: 서버에서 받아 이름 · 점수 · 한 줄 요약 · 키워드를 보여 주고 휠은 없다', async () => {
    await render(<SynastryResultScreen />);
    expect(await screen.findByText(`${stored.score}${S.result.scoreUnit}`)).toBeTruthy();
    expect(mockApi.getSynastry).toHaveBeenCalledWith(made.id);
    expect(screen.getByText(stored.headline)).toBeTruthy();
    expect(screen.getAllByTestId('synastry-keyword')).toHaveLength(3);
    expect(screen.queryByTestId('overlay-wheel')).toBeNull();
    expect(screen.queryByTestId('info-overlay')).toBeNull();
    // 휠이 없는 까닭을 한 줄로 알린다
    expect(screen.getByText(S.result.noWheel)).toBeTruthy();
  });

  it('다른 궁합의 메모리 자료는 쓰지 않는다', async () => {
    rememberFresh({ synastry: { ...made, id: 'other' }, birth: partner });
    await render(<SynastryResultScreen />);
    await screen.findByText(stored.headline);
    expect(mockApi.getSynastry).toHaveBeenCalledWith(made.id);
    expect(screen.queryByTestId('overlay-wheel')).toBeNull();
  });

  it('점수 옆의 말(scoreLabel)은 서버가 줄 때만 그대로 보여 준다. 앱이 점수로 판정하지 않는다', async () => {
    // 60 미만이어도 서버가 말을 주지 않았으면 붙이지 않는다
    mockApi.getSynastry.mockResolvedValueOnce({ ok: true, data: { ...stored, score: 45 } });
    const low = await render(<SynastryResultScreen />);
    expect(await screen.findByText(`45${S.result.scoreUnit}`)).toBeTruthy();
    expect(screen.queryByTestId('synastry-score-label')).toBeNull();
    expect(screen.queryByText('다른 결의 사이')).toBeNull();
    await low.unmount();
    // 점수가 높아도 서버가 말을 주면 그대로 붙인다
    mockApi.getSynastry.mockResolvedValueOnce({ ok: true, data: { ...stored, score: 93, scoreLabel: '서버가 준 말' } });
    await render(<SynastryResultScreen />);
    expect(await screen.findByText(`93${S.result.scoreUnit}`)).toBeTruthy();
    expect(within(screen.getByTestId('synastry-score-label')).getByText('서버가 준 말')).toBeTruthy();
  });

  it('"궁합 리포트 받기" 는 리포트 화면으로 가고, 이미 다 쓰였으면 "궁합 리포트 보기" 다', async () => {
    const first = await render(<SynastryResultScreen />);
    await fireEvent.press(await screen.findByText(S.result.getReport));
    expect(router.push).toHaveBeenCalledWith(`/synastry/${made.id}/report`);
    await first.unmount();
    mockApi.getSynastry.mockResolvedValueOnce({ ok: true, data: { ...stored, reportStatus: 'DONE' } });
    await render(<SynastryResultScreen />);
    expect(await screen.findByText(S.result.seeReport)).toBeTruthy();
    expect(screen.queryByText(S.result.getReport)).toBeNull();
  });

  it('없는 궁합이면 안내와 궁합 보러 가는 버튼을, 그 밖의 실패에는 "다시 시도" 를 보여 준다', async () => {
    mockApi.getSynastry.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
    const first = await render(<SynastryResultScreen />);
    expect(await screen.findByText(S.result.notFound)).toBeTruthy();
    await fireEvent.press(screen.getByText(S.result.goEntry));
    expect(router.replace).toHaveBeenCalledWith('/synastry');
    await first.unmount();
    mockApi.getSynastry.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<SynastryResultScreen />);
    expect(await screen.findByText(S.result.failed.NETWORK)).toBeTruthy();
    await fireEvent.press(screen.getByText(S.result.retry));
    expect(await screen.findByText(stored.headline)).toBeTruthy();
    // 없는 궁합 한 번, 끊긴 요청 한 번, 다시 시도 한 번
    expect(mockApi.getSynastry).toHaveBeenCalledTimes(3);
  });

  it('세션 확인이 끝나기 전에는 서버를 부르지 않는다', async () => {
    mockUseSession.mockReturnValue({ token: null, ready: false });
    await render(<SynastryResultScreen />);
    expect(await screen.findByText(S.result.loading)).toBeTruthy();
    await act(async () => {});
    expect(mockApi.getSynastry).not.toHaveBeenCalled();
  });
});
