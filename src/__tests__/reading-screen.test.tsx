import { CONSTELLATIONS } from '@/features/chart/constellations';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import ReadingScreen from '@/app/reading';
import { strings } from '@/content/strings';
import { clearDraft, finishDraft, setDraft, signedUpNickname } from '@/features/auth/signup-draft';
import { pendingReveal, revealNextReading } from '@/features/reading/reveal-once';
import { useSoundtrack } from '@/features/audio/use-soundtrack';
import { useSession } from '@/features/auth/use-session';
import { keyThree } from '@/features/chart/chart-rows';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { READING_STORAGE_KEY } from '@/features/reading/use-reading';
import { api, type ApiResult, type Reading } from '@/lib/api';
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
  // 공유는 시트를 열 때 만든다 — 이 화면의 시험에서는 끝나지 않는 요청으로 둔다
  api: { createReading: jest.fn(), saveProfile: jest.fn(), createShare: jest.fn(() => new Promise(() => {})) },
}));
jest.mock('@/features/audio/use-soundtrack', () => ({ useSoundtrack: jest.fn() }));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const R = strings.reading;
const ST = strings.states;
type NetListener = (state: { isConnected: boolean; isInternetReachable: boolean }) => void;
let netListener: NetListener | null = null;
const goOffline = () => act(async () => netListener?.({ isConnected: false, isInternetReachable: false }));
const goOnline = () => act(async () => netListener?.({ isConnected: true, isInternetReachable: true }));

const reading = fixtures.reading;

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  clearDraft();
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  mockUseSession.mockReturnValue({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null });
  mockApi.createReading.mockResolvedValue({ ok: true, data: reading });
  await saveBirth({ profile, chart: fixtures.chart });
  netListener = null;
  (NetInfo.addEventListener as jest.Mock).mockImplementation((cb: NetListener) => {
    netListener = cb;
    return () => {};
  });
});

afterEach(() => jest.useRealTimers());

describe('요약 해석 화면', () => {
  it('홈 · 나 탭에서 들어와 기기에 글이 없으면 0.3초 뒤 뼈대(머리 뒤로 가기 · 아래 탭은 진짜), 10초가 넘으면 별명 짓는 중(결정 071 · 065 의 2)', async () => {
    jest.useFakeTimers();
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    await render(<ReadingScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(100)));
    expect(screen.queryByTestId('reading-skeleton')).toBeNull();
    expect(screen.queryByText(R.generating)).toBeNull();
    await act(async () => void (await jest.advanceTimersByTimeAsync(300)));
    expect(screen.getByTestId('reading-skeleton')).toBeTruthy();
    expect(screen.getByLabelText(ST.loading)).toBeTruthy();
    expect(screen.getByRole('button', { name: strings.common.backLabel })).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityState.selected)).toEqual([false, true, false, false]);
    expect(screen.queryByText(R.generating)).toBeNull();
    // 10초가 넘도록 오지 않으면 서버가 새로 짓는 중이다(옛 요약 해석만 있던 계정 — 나 탭과 같다, 리뷰 #49)
    await act(async () => void (await jest.advanceTimersByTimeAsync(10_000)));
    expect(screen.getByText(R.generating)).toBeTruthy();
    expect(screen.queryByTestId('reading-skeleton')).toBeNull();
    expect(screen.getByRole('button', { name: strings.common.backLabel })).toBeTruthy();
    // 아래 탭도 그대로 — 그동안 다른 탭으로 갈 수 있다(나 탭과 같다, 결정 061 · 065 의 2)
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityState.selected)).toEqual([false, true, false, false]);
    await act(async () => resolve({ ok: true, data: reading }));
    expect(screen.getByText(reading.headline)).toBeTruthy();
    jest.useRealTimers();
  });

  it('가입 직후 · 출생 정보를 바꾼 직후는 서버가 새로 짓는 중이라 뼈대 없이 바로 별명 짓는 중 — 가입 직후에만 머리 없이(보드 9, 리뷰 A6)', async () => {
    // 끝나지 않는 요청을 남기면 같은 출생 정보의 다음 시험이 그 요청을 함께 기다린다(use-reading 의 inflight) — 끝에 답한다
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    const view = await render(<ReadingScreen />);
    expect(await screen.findByText(R.generating)).toBeTruthy();
    expect(screen.queryByTestId('reading-skeleton')).toBeNull();
    expect(screen.queryByRole('button', { name: strings.common.backLabel })).toBeNull();
    await view.unmount();

    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'birth' });
    await render(<ReadingScreen />);
    expect(await screen.findByText(R.generating)).toBeTruthy();
    expect(screen.queryByTestId('reading-skeleton')).toBeNull();
    expect(screen.getByRole('button', { name: strings.common.backLabel })).toBeTruthy();
    await act(async () => resolve({ ok: true, data: reading }));
  });

  it('짓는 동안(별명 짓는 중이 보일 때)만 기다릴 때 음악을 청한다(결정 062 의 1) — 뼈대일 때는 아니고, 글이 오면 내려놓는다', async () => {
    jest.useFakeTimers();
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    await render(<ReadingScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(400)));
    expect(screen.getByTestId('reading-skeleton')).toBeTruthy();
    expect(useSoundtrack).toHaveBeenLastCalledWith('waiting', false);
    await act(async () => void (await jest.advanceTimersByTimeAsync(10_000)));
    expect(screen.getByText(R.generating)).toBeTruthy();
    expect(useSoundtrack).toHaveBeenLastCalledWith('waiting', true);
    await act(async () => resolve({ ok: true, data: reading }));
    expect(screen.getByText(reading.headline)).toBeTruthy();
    expect(useSoundtrack).toHaveBeenLastCalledWith('waiting', false);
    jest.useRealTimers();
  });

  it('생성 중에는 진행 상태를 보여 주고, 받으면 서버가 준 글을 그대로 보여 준다', async () => {
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    // 가입 직후(새로 짓는 중) — 방금 가입한 닉네임이 없어 별명 공개 없이 글로 간다
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    await render(<ReadingScreen />);
    expect(await screen.findByText(R.generating)).toBeTruthy();
    // 기다리는 동안 "별명 짓는 중"(결정 042 보드 9): 움직이는 그림과 안내 문구, "길면 1분쯤" 은 없다
    expect(screen.getByTestId('making-art', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText(strings.making.lines[0], { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(/1분/)).toBeNull();
    expect(screen.queryByText(reading.headline)).toBeNull();
    await act(async () => resolve({ ok: true, data: reading }));

    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(screen.queryByText(R.generating)).toBeNull();
    for (const section of reading.sections) {
      expect(screen.getByText(section.title)).toBeTruthy();
      expect(screen.getByText(section.body)).toBeTruthy();
    }
    // 문단마다 접힌 "이렇게 풀이한 이유" 한 문장(결정 054) — 옛 근거 낱말 줄은 없다
    expect(screen.getAllByText(strings.reason.label)).toHaveLength(reading.sections.length);
    expect(screen.getByText('태어날 때 나의 중심(해)이 호기심 많은 쌍둥이자리, 일상의 자리(6하우스)에 있었어요')).toBeTruthy();
    expect(screen.getByText('태어날 때 마음(달)이 멀리 내다보는 사수자리, 친구와 모임의 자리(11하우스)에 있었어요')).toBeTruthy();
    expect(screen.queryByText(/^근거 · /)).toBeNull();
    expect(screen.getByText(R.strengths)).toBeTruthy();
    expect(screen.getByText(R.cautions)).toBeTruthy();
    for (const item of [...reading.strengths, ...reading.cautions]) expect(screen.getByText(item)).toBeTruthy();
    // 화면 아래 면책 문구는 두지 않는다(결정 064)
    expect(screen.queryByText(R.disclaimer)).toBeNull();
    // 서버에는 본문 없이 요청한다(출생 정보는 서버에 저장된 것을 쓴다)
    expect(mockApi.createReading).toHaveBeenCalledWith();
  });

  it('문장을 만들 수 없는 근거(모르는 kind)면 그 이유 줄만 숨기고 글은 그대로 보인다(결정 054 의 7)', async () => {
    const section = { title: '제목', body: '본문', reason: { when: 'BIRTH' as const, items: [{ kind: 'MIDPOINT' }] } };
    mockApi.createReading.mockResolvedValue({ ok: true, data: { ...reading, sections: [section] } });
    await render(<ReadingScreen />);
    expect(await screen.findByText('본문')).toBeTruthy();
    expect(screen.queryByText(strings.reason.label)).toBeNull();
  });

  it('이유 줄을 누르면 그 자리에서 펼쳐 작은 지도 · 용어 줄 · 하늘 지도에서 보기가 보인다(보드 12-1)', async () => {
    await render(<ReadingScreen />);
    const text = '태어날 때 나의 중심(해)이 호기심 많은 쌍둥이자리, 일상의 자리(6하우스)에 있었어요';
    await fireEvent.press(await screen.findByRole('button', { name: `${strings.reason.label}, ${text}` }));
    expect(screen.getByTestId('reason-wheel')).toBeTruthy();
    expect(screen.getAllByTestId('reason-term')).toHaveLength(3);
    await fireEvent.press(screen.getByText(strings.reason.seeOnMap));
    expect(router.push).toHaveBeenCalledWith('/chart?selected=SUN');
  });

  it('글이 보이면 아래 탭 넷이 있고 나가 골라져 있다 — 방금 받은 글도, 기기에 받아 둔 글도(결정 046 의 4 · 055 의 2)', async () => {
    const view = await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    const tabs = () => screen.getAllByRole('tab');
    expect(tabs().map((t) => t.props.accessibilityLabel)).toEqual(['홈', '나', '시기', '마이']);
    expect(tabs().map((t) => t.props.accessibilityState.selected)).toEqual([false, true, false, false]);
    await view.unmount();
    // 웹 화면 비교에서 찾음: 받아 둔 글을 그리는 갈래에는 탭이 없었다
    await AsyncStorage.setItem(
      READING_STORAGE_KEY,
      JSON.stringify({ key: JSON.stringify([profile.date, profile.time, profile.place.id]), reading }),
    );
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(tabs().map((t) => t.props.accessibilityState.selected)).toEqual([false, true, false, false]);
  });

  it('글을 받지 못한 화면에도 아래 탭이 있다(리뷰 PR #41)', async () => {
    mockApi.createReading.mockResolvedValue({ ok: false, error: 'SERVER', status: 502 });
    await render(<ReadingScreen />);
    expect(await screen.findByText(ST.loadFail.retry)).toBeTruthy();
    expect(screen.getAllByRole('tab').map((t) => t.props.accessibilityState.selected)).toEqual([false, true, false, false]);
  });

  it('"내 하늘 지도 보기" 는 /chart 로 간다', async () => {
    await render(<ReadingScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: R.seeSkyMap }));
    expect(router.push).toHaveBeenCalledWith('/chart');
  });

  it('"연애에서 해 볼 만한 것" 줄은 없다 — 연애의 실천은 나 탭 연애 칩이 맡는다(결정 048 의 5)', async () => {
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(screen.queryByText('연애에서 해 볼 만한 것 보기')).toBeNull();
  });

  it('누를 수 있는 것은 뒤로 가기 · 머리의 공유하기 · 내 하늘 지도 보기 · 문단마다의 이유 줄뿐이다(다시 생성 · 리포트 없음, 보드 12)', async () => {
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(3 + reading.sections.length);
    expect(screen.getByRole('button', { name: strings.share.open })).toBeTruthy();
    expect(screen.getByLabelText(strings.common.backLabel)).toBeTruthy();
    expect(screen.getByRole('button', { name: R.seeSkyMap })).toBeTruthy();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    // 머리의 공유하기는 지금의 공유 시트(요약 해석 카드)를 연다
    await fireEvent.press(screen.getByRole('button', { name: strings.share.open }));
    expect(await screen.findByTestId('sheet-dim')).toBeTruthy();
  });

  it('못 받으면 실패 화면(보드 19: "내 별명을 불러오지 못했어요" · 다시 보기)을 보여 주고, 누르면 한 번 더 요청한다(결정 061 의 1 · 3)', async () => {
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 502 });
    await render(<ReadingScreen />);
    expect(await screen.findByText(ST.loadFail.title.reading)).toBeTruthy();
    expect(screen.getByText(ST.loadFail.body)).toBeTruthy();
    expect(screen.getByTestId('state-art', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(reading.headline)).toBeNull();
    expect(mockApi.createReading).toHaveBeenCalledTimes(1);
    await fireEvent.press(screen.getByText(ST.loadFail.retry));
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(mockApi.createReading).toHaveBeenCalledTimes(2);
  });

  it('끊겨서 못 받으면 보드 20-1("인터넷에 연결되어 있지 않아요" · 다시 시도), 요청이 많으면 그 안내(결정 061 의 4)', async () => {
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const first = await render(<ReadingScreen />);
    await goOffline();
    expect(await screen.findByText(ST.offlineEmpty.title)).toBeTruthy();
    expect(screen.getByText(ST.offlineEmpty.retry)).toBeTruthy();
    await first.unmount();
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<ReadingScreen />);
    expect(await screen.findByText(R.failed.LIMIT)).toBeTruthy();
  });

  it('가입 직후(from=signup) 별명을 짓지 못하면 보드 9-1: "별명을 짓지 못했어요" · 다시 짓기 하나, 머리 · 아래 탭 · 나중에 하기는 없다 — 누르면 처음부터 다시 짓는다', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 502 });
    await render(<ReadingScreen />);
    expect(await screen.findByRole('header', { name: '별명을 짓지 못했어요' })).toBeTruthy();
    expect(screen.getByText('잠깐 문제가 생겼어요.\n다시 짓기를 누르면 처음부터 다시 지어요.')).toBeTruthy();
    expect(screen.getByTestId('state-art', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(ST.loadFail.title.reading)).toBeNull();
    expect(screen.queryByRole('button', { name: strings.common.backLabel })).toBeNull();
    expect(screen.queryByTestId('bottom-tabs')).toBeNull();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
    expect(screen.getAllByRole('button')).toHaveLength(1);

    await fireEvent.press(screen.getByRole('button', { name: '다시 짓기' }));
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(mockApi.createReading).toHaveBeenCalledTimes(2);
  });

  it('가입 직후여도 끊겨서 못 받으면 보드 20-1 그대로(연결은 됐는데 서버에 닿지 못하면 9-1), 요청이 많으면 9-1 에 그 안내', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    const first = await render(<ReadingScreen />);
    expect(await screen.findByText('별명을 짓지 못했어요')).toBeTruthy();
    await goOffline();
    expect(await screen.findByText(ST.offlineEmpty.title)).toBeTruthy();
    expect(screen.queryByText('별명을 짓지 못했어요')).toBeNull();
    await first.unmount();

    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'LIMIT', status: 429 });
    await render(<ReadingScreen />);
    expect(await screen.findByText(R.failed.LIMIT)).toBeTruthy();
    expect(screen.getByText('별명을 짓지 못했어요')).toBeTruthy();
    expect(screen.getByRole('button', { name: '다시 짓기' })).toBeTruthy();
  });

  it('끊겨서 못 받았으면 연결이 돌아올 때 저절로 다시 부른다(결정 061 의 4)', async () => {
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<ReadingScreen />);
    await goOffline();
    expect(await screen.findByText(ST.offlineEmpty.title)).toBeTruthy();
    await goOnline();
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(mockApi.createReading).toHaveBeenCalledTimes(2);
  });

  it('받아 둔 글이 있는데 끊기면 글은 그대로 두고 위에 띠, 돌아오면 띠가 사라진다(보드 20)', async () => {
    await AsyncStorage.setItem(
      READING_STORAGE_KEY,
      JSON.stringify({ key: JSON.stringify([profile.date, profile.time, profile.place.id]), reading }),
    );
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(screen.queryByTestId('offline-banner')).toBeNull();
    await goOffline();
    expect(screen.getByTestId('offline-banner')).toBeTruthy();
    expect(screen.getByText(reading.headline)).toBeTruthy();
    await goOnline();
    expect(screen.queryByTestId('offline-banner')).toBeNull();
  });

  it('가입 직후(from=signup) 끊겨서 못 지으면 20-1 도 머리 · 아래 탭 없이 — 별명 공개를 놓치지 않게(결정 065 의 4, 리뷰 PR #44)', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<ReadingScreen />);
    await goOffline();
    expect(await screen.findByText(ST.offlineEmpty.title)).toBeTruthy();
    expect(screen.queryByLabelText(strings.common.backLabel)).toBeNull();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('"다시 시도" 를 연달아 눌러도 요청은 하나다', async () => {
    mockApi.createReading.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<ReadingScreen />);
    await goOffline();
    const retry = await screen.findByText(ST.offlineEmpty.retry);
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    await fireEvent.press(retry);
    // 생성 중에는 "다시 시도" 가 사라져 또 누를 수 없다
    expect(screen.queryByText(ST.offlineEmpty.retry)).toBeNull();
    expect(screen.queryByText(reading.headline)).toBeNull();
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
    mockUseSession.mockReturnValue({ status: 'checking' as const, token: null, ready: false, lastError: null });
    await render(<ReadingScreen />);
    expect(await screen.findByTestId('reading-skeleton')).toBeTruthy();
    await act(async () => {});
    expect(mockApi.createReading).not.toHaveBeenCalled();
  });

  it('출생 정보가 없으면 입력으로 가는 안내를 보여 주고 서버를 부르지 않는다', async () => {
    await AsyncStorage.clear();
    await render(<ReadingScreen />);
    expect(await screen.findByText(strings.chart.empty)).toBeTruthy();
    expect(screen.getByTestId('byeoli-face-empty', { includeHiddenElements: true })).toBeTruthy();
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
    mockUseSession.mockReturnValue({ status: 'checking' as const, token: null, ready: false, lastError: null });
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(screen.queryByText(R.generating)).toBeNull();
    expect(mockApi.createReading).not.toHaveBeenCalled();
  });

  it('기기에서 글을 찾는 동안에는 "짓는 중" 을 보여 주지 않는다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    mockUseSession.mockReturnValue({ status: 'checking' as const, token: null, ready: false, lastError: null });
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    const view = await render(<ReadingScreen />);
    // 받아 둔 글이 없다는 것을 확인한 뒤에야 "짓는 중" 이 나온다
    expect(await screen.findByText(R.generating)).toBeTruthy();
    await view.unmount();
  });
  it('글 위에 내 별자리의 별 모양을 보여 준다', async () => {
    await saveBirth({ profile, chart: fixtures.chart });
    mockApi.createReading.mockResolvedValue({ ok: true, data: reading });
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(screen.getByTestId('chart-picture')).toBeTruthy();
    // 그림은 내 별자리(태양 자리)의 별 모양이고, 그 아래에 이름을 적는다(보드 12)
    expect(screen.getAllByTestId('picture-star')).toHaveLength(CONSTELLATIONS.GEMINI.stars.length);
    expect(screen.getAllByTestId('picture-star-line')).toHaveLength(CONSTELLATIONS.GEMINI.lines.length);
    expect(screen.getByTestId('sign-card-name').props.children).toBe(strings.signs.GEMINI + strings.chart.signSuffix);
    expect(screen.getByTestId('chart-picture').props.accessibilityLabel).toBe(
      strings.signs.GEMINI + strings.chart.signSuffix,
    );
    // 차트의 번호나 천체 이름 같은 글자는 없다
    expect(screen.queryAllByTestId('wheel-house-number')).toHaveLength(0);
    expect(screen.queryByText(strings.bodiesShort.SUN)).toBeNull();
    // 그림 아래에는 중심 · 마음 · 첫인상 셋을 글로 적는다(시각을 알 때)
    const cells = screen.getAllByTestId('sign-card-cell');
    expect(cells).toHaveLength(3);
    expect(within(cells[0]).getByText(strings.chart.keySun)).toBeTruthy();
    expect(within(cells[2]).getByText(strings.chart.keyAsc)).toBeTruthy();
  });

  it('시각 "모름" 이면 첫인상 칸이 없다(셋 → 둘)', async () => {
    await saveBirth({ profile: { date: '2000-06-15', time: null, place: null }, chart: fixtures.chartTimeUnknown });
    mockApi.createReading.mockResolvedValue({ ok: true, data: reading });
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.headline)).toBeTruthy();
    expect(screen.getAllByTestId('sign-card-cell')).toHaveLength(2);
    expect(screen.queryByText(strings.chart.keyAsc)).toBeNull();
    // 이유 줄도 하우스 부분 없이
    expect(screen.getByText('태어날 때 나의 중심(해)이 호기심 많은 쌍둥이자리에 있었어요')).toBeTruthy();
  });
});

// 별명 공개(결정 044, 보드 10): 가입을 마치고(from=signup) 풀이가 다 지어지면 한 번, "풀이 읽기" 로 풀이 글
describe('별명 공개', () => {
  const V = strings.reveal;
  /** 가입 단계를 마친 것처럼: 서버가 받은 닉네임만 메모리에 남긴다 */
  function justSignedUp(nickname = '새벽별') {
    setDraft({ termsVersion: '2026-11-19', privacyVersion: '2026-11-19', pushConsent: false, marketingConsent: false, nickname, avatar: 2 });
    finishDraft();
  }
  const cellValues = () => screen.queryAllByTestId('reveal-cell').map((cell) => cell);

  it('가입 직후 풀이가 다 지어지면 닉네임 · 별명(풀이 headline) · 해 · 달 · 상승궁 별자리를 보이고, 풀이 읽기를 누르면 풀이 글', async () => {
    justSignedUp();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    await render(<ReadingScreen />);
    expect(await screen.findByText(R.generating)).toBeTruthy();
    await act(async () => resolve({ ok: true, data: reading }));

    expect(await screen.findByText(`새벽별 ${V.nicknameSuffix}`)).toBeTruthy();
    expect(screen.getByRole('header', { name: reading.headline })).toBeTruthy();
    const three = keyThree(fixtures.chart);
    expect(three.map((k) => k.label)).toEqual([strings.chart.keySun, strings.chart.keyMoon, strings.chart.keyAsc]);
    for (const k of three) expect(screen.getByText(k.value + strings.chart.signSuffix)).toBeTruthy();
    expect(cellValues()).toHaveLength(3);
    expect(screen.queryByText(reading.sections[0].title)).toBeNull();

    await fireEvent.press(screen.getByRole('button', { name: V.read }));
    expect(screen.getByText(reading.sections[0].title)).toBeTruthy();
    expect(screen.queryByText(`새벽별 ${V.nicknameSuffix}`)).toBeNull();
    // 한 번 쓰면 메모리의 닉네임을 지운다
    expect(signedUpNickname()).toBeNull();
  });

  it('출생 정보를 바꾸고 오면(from=birth) 새 풀이가 지어진 뒤 별명 공개를 한 번 보이고, 풀이 읽기로 글(소유자 2026-11-20)', async () => {
    revealNextReading('새벽별');
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'birth' });
    let resolve: (r: ApiResult<Reading>) => void = () => {};
    mockApi.createReading.mockReturnValue(new Promise((r) => (resolve = r)));
    await render(<ReadingScreen />);
    expect(await screen.findByText(R.generating)).toBeTruthy();
    await act(async () => resolve({ ok: true, data: reading }));
    expect(await screen.findByText(`새벽별 ${V.nicknameSuffix}`)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: V.read }));
    expect(screen.getByText(reading.sections[0].title)).toBeTruthy();
    // 한 번 쓰면 지운다 — 다시 열면 글로 바로 간다
    expect(pendingReveal()).toBeNull();
  });

  it('출생 정보 바꾸기에서 온 표시만 있고 넘겨받은 닉네임이 없으면(앱을 다시 켰다) 글로 바로 간다', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'birth' });
    mockApi.createReading.mockResolvedValue({ ok: true, data: reading });
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.sections[0].title)).toBeTruthy();
    expect(screen.queryByText(`새벽별 ${V.nicknameSuffix}`)).toBeNull();
  });

  it('다시 열면(가입 직후가 아니면) 풀이 글로 바로 간다', async () => {
    justSignedUp();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    const first = await render(<ReadingScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: V.read }));
    await first.unmount();

    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.sections[0].title)).toBeTruthy();
    expect(screen.queryByRole('button', { name: V.read })).toBeNull();
  });

  it('홈에서 들어오면(from 없음) 공개하지 않고, 주소만 from=signup 이고 방금 가입한 닉네임이 없어도(웹 새로 고침) 공개하지 않는다', async () => {
    justSignedUp();
    const home = await render(<ReadingScreen />);
    expect(await screen.findByText(reading.sections[0].title)).toBeTruthy();
    expect(screen.queryByRole('button', { name: V.read })).toBeNull();
    await home.unmount();

    clearDraft();
    await AsyncStorage.removeItem(READING_STORAGE_KEY);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    await render(<ReadingScreen />);
    expect(await screen.findByText(reading.sections[0].title)).toBeTruthy();
    expect(screen.queryByRole('button', { name: V.read })).toBeNull();
  });

  it('시각 "모름" 이면 첫인상 칸 없이 둘만', async () => {
    await saveBirth({ profile: { date: '1999-03-08', time: null, place: null }, chart: fixtures.chartTimeUnknown });
    justSignedUp();
    (useLocalSearchParams as jest.Mock).mockReturnValue({ from: 'signup' });
    await render(<ReadingScreen />);
    expect(await screen.findByRole('button', { name: V.read })).toBeTruthy();
    expect(cellValues()).toHaveLength(2);
    expect(screen.queryByText(strings.chart.keyAsc)).toBeNull();
    expect(screen.getByText(strings.chart.keySun)).toBeTruthy();
  });
});
