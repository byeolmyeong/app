import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';

import MeScreen from '@/app/me';
import { Colors, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSoundtrack } from '@/features/audio/use-soundtrack';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { ME_REPORT_POLL_MS, ME_REPORT_STORAGE_KEY } from '@/features/me/use-me-report';
import { READING_STORAGE_KEY } from '@/features/reading/use-reading';
import { api, type ApiResult, type MeReportState, type Reading } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), canDismiss: jest.fn(() => false), dismissAll: jest.fn(), setParams: jest.fn() },
  useLocalSearchParams: jest.fn(() => ({})),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: {
    createReading: jest.fn(),
    saveProfile: jest.fn(),
    requestMeReport: jest.fn(),
    getMeReport: jest.fn(),
    getMyAccount: jest.fn(),
    createShare: jest.fn(() => new Promise(() => {})),
  },
}));
jest.mock('@/features/audio/use-soundtrack', () => ({ useSoundtrack: jest.fn() }));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const birthKey = JSON.stringify([profile.date, profile.time, profile.place.id]);
const M = strings.me;
const ST = strings.states;
const reading = fixtures.reading;
const report = fixtures.meReport;
const got = (status: 'NONE' | 'WRITING' | 'FAILED'): ApiResult<MeReportState> => ({ ok: true, data: { status } });
const done: ApiResult<MeReportState> = { ok: true, data: { status: 'DONE', report } };
type NetListener = (state: { isConnected: boolean; isInternetReachable: boolean }) => void;
let netListener: NetListener | null = null;

const storeReading = (r: Reading = reading) => AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ key: birthKey, reading: r }));
const storeReport = () => AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, report }));
const tabs = () => screen.queryAllByRole('tab').filter((t) => !t.props.testID?.startsWith('me-chip-'));
const chip = (area: string) => screen.getByTestId(`me-chip-${area}`);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  (useLocalSearchParams as jest.Mock).mockReturnValue({});
  mockApi.createReading.mockResolvedValue({ ok: true, data: reading });
  mockApi.getMeReport.mockResolvedValue(got('NONE'));
  mockApi.requestMeReport.mockResolvedValue({ ok: true, data: { status: 'WRITING' } });
  mockApi.getMyAccount.mockResolvedValue({ ok: true, data: { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } });
  await saveBirth({ profile, chart: fixtures.chart });
  netListener = null;
  (NetInfo.addEventListener as jest.Mock).mockImplementation((cb: NetListener) => {
    netListener = cb;
    return () => {};
  });
});

afterEach(() => jest.useRealTimers());

describe('나 탭 · 받기 전(보드 12 받기 전, 결정 048 의 1)', () => {
  it('내 별명 내용(한 줄 별명 · 별자리 카드 · 문단과 이유 줄 · 강점 · 보완점) + 맨 아래 "자세한 풀이" 카드, 아래 탭은 나', async () => {
    await storeReading();
    await render(<MeScreen />);
    expect(await screen.findByTestId('me-detail-card')).toBeTruthy();
    expect(screen.getByText(strings.reading.title)).toBeTruthy();
    expect(screen.getByText(reading.headline)).toBeTruthy();
    expect(screen.getAllByTestId('sign-card-cell')).toHaveLength(3);
    expect(screen.getAllByText(strings.reason.label)).toHaveLength(reading.sections.length);
    for (const item of [...reading.strengths, ...reading.cautions]) expect(screen.getByText(item)).toBeTruthy();
    expect(screen.getByText(M.detail.title)).toBeTruthy();
    for (const area of Object.values(M.areas)) expect(screen.getByText(area)).toBeTruthy();
    expect(tabs().map((t) => t.props.accessibilityState.selected)).toEqual([false, true, false, false]);
    // 나 탭의 첫 화면이라 뒤로 가기가 없고, 면책 문구도 없다(결정 046 의 2 · 064)
    expect(screen.queryByRole('button', { name: strings.common.backLabel })).toBeNull();
    expect(screen.queryByText(strings.reading.disclaimer)).toBeNull();
  });

  it('"자세한 풀이 받기" 를 누르면 POST /me-report → 쓰는 중(11-8: 아래 탭 없이 별명 짓는 중과 같은 그림 · 나 탭 문구)', async () => {
    await storeReading();
    await render(<MeScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: M.detail.request }));
    expect(mockApi.requestMeReport).toHaveBeenCalledTimes(1);
    expect(await screen.findByText(M.making.title)).toBeTruthy();
    expect(screen.getByTestId('making-art', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByText(M.making.lines[0], { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByText(/알림으로/)).toBeNull();
    expect(tabs()).toHaveLength(0);
    // 쓰는 중에만 기다릴 때 음악(결정 062 의 1)
    expect(useSoundtrack).toHaveBeenLastCalledWith('waiting', true);
  });

  it('내 별명의 "자세한 풀이 받기" 로 오면(`/me?request=1`) 받기 전인 것을 확인한 뒤 한 번만 POST → 쓰는 중, 주소의 표시는 지운다(결정 082)', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ request: '1' });
    await storeReading();
    const view = await render(<MeScreen />);
    expect(await screen.findByText(M.making.title)).toBeTruthy();
    expect(mockApi.requestMeReport).toHaveBeenCalledTimes(1);
    expect(router.setParams).toHaveBeenCalledWith({ request: undefined });
    // 다시 그려져도(주소의 표시가 아직 남아 있어도) 또 만들지 않는다
    await view.rerender(<MeScreen />);
    expect(mockApi.requestMeReport).toHaveBeenCalledTimes(1);
  });

  it('`/me?request=1` 이어도 이미 받았으면 만들지 않고 받은 풀이(칩)를 보인다', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ request: '1' });
    mockApi.getMeReport.mockResolvedValue(done);
    await storeReading();
    await render(<MeScreen />);
    expect(await screen.findByTestId('me-chips')).toBeTruthy();
    expect(mockApi.requestMeReport).not.toHaveBeenCalled();
  });

  it('다 쓰면 나 탭의 성격 칩으로 간다(5초마다 확인)', async () => {
    jest.useFakeTimers();
    await storeReading();
    mockApi.getMeReport.mockResolvedValueOnce(got('NONE')).mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce(done);
    await render(<MeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(0)));
    await fireEvent.press(await screen.findByRole('button', { name: M.detail.request }));
    await act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_POLL_MS)));
    expect(screen.getByText(M.making.title)).toBeTruthy();
    await act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_POLL_MS)));
    expect(await screen.findByTestId('me-nickname-card')).toBeTruthy();
    expect(chip('PERSONALITY').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText(report.areas[0].title)).toBeTruthy();
  });

  it('서버가 지금은 받을 수 없다고 하면(402 PURCHASE_REQUIRED) 버튼 위에 한 줄만(결정 050 의 4)', async () => {
    await storeReading();
    mockApi.requestMeReport.mockResolvedValue({ ok: false, error: 'SERVER', status: 402, code: 'PURCHASE_REQUIRED' });
    await render(<MeScreen />);
    await fireEvent.press(await screen.findByRole('button', { name: M.detail.request }));
    expect(await screen.findByText(M.detail.blocked)).toBeTruthy();
    expect(screen.getByTestId('me-detail-card')).toBeTruthy();
  });

  it('상태를 묻지 못하면 "자세한 풀이" 카드 자리에 작은 안내(19-1), 다시 보기는 상태만 다시 묻는다', async () => {
    await storeReading();
    mockApi.getMeReport.mockResolvedValueOnce({ ok: false, error: 'SERVER', status: 500 });
    await render(<MeScreen />);
    expect(await screen.findByTestId('card-fail')).toBeTruthy();
    expect(screen.getByText(M.loadFail.title)).toBeTruthy();
    expect(screen.queryByTestId('me-detail-card')).toBeNull();
    expect(screen.getByText(reading.headline)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ST.loadFail.retry }));
    await waitFor(() => expect(mockApi.getMeReport).toHaveBeenCalledTimes(2));
    expect(mockApi.requestMeReport).not.toHaveBeenCalled();
    expect(await screen.findByTestId('me-detail-card')).toBeTruthy();
  });

  it('내 별명은 있는데 상태를 10초 넘게 묻지 못하면 빈 화면이 아니라 카드 자리 안내(19-1, 결정 065 의 2 — 리뷰)', async () => {
    jest.useFakeTimers();
    await storeReading();
    mockApi.getMeReport.mockReturnValueOnce(new Promise(() => {}));
    await render(<MeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(500)));
    expect(screen.getByTestId('me-skeleton')).toBeTruthy();
    await act(async () => void (await jest.advanceTimersByTimeAsync(10_000)));
    expect(screen.getByTestId('card-fail')).toBeTruthy();
    expect(screen.getByText(reading.headline)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ST.loadFail.retry }));
    await act(async () => void (await jest.advanceTimersByTimeAsync(0)));
    expect(screen.getByTestId('me-detail-card')).toBeTruthy();
  });

  it('받기 전을 기억하면(앱을 켤 때 받아 둔 것) 뼈대 없이 첫 그림부터 내 별명 + "자세한 풀이" 카드 — 서버 답을 기다리지 않는다(결정 075)', async () => {
    jest.useFakeTimers();
    await storeReading();
    await AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, status: 'NONE' }));
    mockApi.getMeReport.mockReturnValue(new Promise(() => {}));
    await render(<MeScreen />);
    await act(async () => {});
    expect(screen.getByTestId('me-detail-card')).toBeTruthy();
    await act(async () => void (await jest.advanceTimersByTimeAsync(400)));
    expect(screen.queryByTestId('me-skeleton')).toBeNull();
    jest.useRealTimers();
  });

  it('쓰는 중을 기억하면 뼈대 없이 곧바로 쓰는 중(결정 075)', async () => {
    await storeReading();
    await AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key: birthKey, status: 'WRITING' }));
    mockApi.getMeReport.mockReturnValue(new Promise(() => {}));
    await render(<MeScreen />);
    expect(await screen.findByText(M.making.title)).toBeTruthy();
    expect(screen.queryByTestId('me-skeleton')).toBeNull();
  });

  it('처음 불러올 때 0.3초가 넘으면 뼈대(받기 전 배치, 결정 071), 머리 · 아래 탭은 그대로 보인다', async () => {
    jest.useFakeTimers();
    mockApi.createReading.mockReturnValue(new Promise(() => {}));
    await render(<MeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(100)));
    expect(screen.queryByTestId('me-skeleton')).toBeNull();
    // 0.3초 전 빈 단계에도 뼈대와 같은 머리(받기 전 "내 별명") · 아래 탭 — 중간에 바뀌지 않게(결정 071 의 6)
    expect(screen.getByText(strings.reading.title)).toBeTruthy();
    expect(tabs()).toHaveLength(4);
    await act(async () => void (await jest.advanceTimersByTimeAsync(300)));
    expect(screen.getByTestId('me-skeleton')).toBeTruthy();
    expect(screen.getByText(strings.reading.title)).toBeTruthy();
    expect(screen.getAllByLabelText(strings.states.loading).length).toBeGreaterThan(0);
    expect(tabs()).toHaveLength(4);
  });
});

describe('나 탭 · 옛 보관본(업데이트 직후, 리뷰 #49)', () => {
  const old = {
    headline: '옛 요약 해석의 한 줄 별명',
    sections: [{ title: '옛 문단', body: '옛 본문', basis: ['태양', '쌍둥이', '6하우스'] }],
    strengths: ['하나', '둘', '셋'],
    cautions: ['하나', '둘', '셋'],
  };

  it('기기의 요약 해석이 옛 모양이면 다시 받아(POST /readings) 새 모양으로 그린다', async () => {
    // 요청 중복 막기(use-reading 의 inflight)는 모듈에 남아, 끝나지 않는 요청을 둔 앞 시험과 다른 출생 정보로 연다
    const other = { ...profile, date: '1999-03-08' };
    await saveBirth({ profile: other, chart: fixtures.chart });
    await AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ key: JSON.stringify([other.date, other.time, other.place.id]), reading: old }));
    await render(<MeScreen />);
    expect(await screen.findByTestId('me-detail-card')).toBeTruthy();
    expect(mockApi.createReading).toHaveBeenCalledTimes(1);
    expect(screen.getByText(reading.headline)).toBeTruthy();
    expect(screen.queryByText(old.headline)).toBeNull();
  });

  it('서버가 내 별명을 새로 짓느라 10초가 넘으면 별명 짓는 중 — 아래 탭이 있어 다른 탭으로 갈 수 있고 머리는 없다(결정 065 의 2 · 061, 소유자 빌드 13)', async () => {
    jest.useFakeTimers();
    await storeReading(old as unknown as Reading);
    mockApi.createReading.mockReturnValue(new Promise(() => {}));
    await render(<MeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(10_500)));
    expect(screen.getByTestId('making-art', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.queryByTestId('nav-bar')).toBeNull();
    expect(tabs()).toHaveLength(4);
    expect(useSoundtrack).toHaveBeenLastCalledWith('waiting', true);
  });
});

describe('나 탭 · 쓰는 중 · 실패(11-8 · 11-9, 결정 061)', () => {
  it('끝까지 못 썼으면 11-9: 아래 탭 없이 "다시 쓰기"(새로 요청) · 그 위 "나중에 하기"(받기 전으로)', async () => {
    jest.useFakeTimers();
    await storeReading();
    mockApi.getMeReport.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce(got('FAILED'));
    await render(<MeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(0)));
    expect(screen.getByText(M.making.title)).toBeTruthy();
    await act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_POLL_MS)));
    expect(screen.getByText(M.writeFail)).toBeTruthy();
    expect(screen.getByText(ST.writeFail.body)).toBeTruthy();
    expect(tabs()).toHaveLength(0);
    await fireEvent.press(screen.getByText(M.later));
    expect(screen.getByTestId('me-detail-card')).toBeTruthy();
    // 다시 받기
    await fireEvent.press(screen.getByRole('button', { name: M.detail.request }));
    expect(mockApi.requestMeReport).toHaveBeenCalledTimes(1);
  });

  it('11-9 의 "다시 쓰기" 는 POST /me-report 를 한 번 더 한다', async () => {
    jest.useFakeTimers();
    await storeReading();
    mockApi.requestMeReport.mockResolvedValueOnce({ ok: true, data: { status: 'FAILED' } });
    await render(<MeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(0)));
    await fireEvent.press(screen.getByRole('button', { name: M.detail.request }));
    expect(await screen.findByText(M.writeFail)).toBeTruthy();
    await fireEvent.press(screen.getByRole('button', { name: ST.writeFail.retry }));
    expect(mockApi.requestMeReport).toHaveBeenCalledTimes(2);
  });

  it('쓰는 중에 끊기면 20-1(아래 탭 · 다시 시도), 연결이 돌아오면 상태만 다시 묻는다', async () => {
    jest.useFakeTimers();
    await storeReading();
    mockApi.getMeReport.mockResolvedValueOnce(got('WRITING')).mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<MeScreen />);
    await act(async () => void (await jest.advanceTimersByTimeAsync(0)));
    await act(async () => netListener?.({ isConnected: false, isInternetReachable: false }));
    await act(async () => void (await jest.advanceTimersByTimeAsync(ME_REPORT_POLL_MS)));
    expect(screen.getByText(ST.offlineEmpty.title)).toBeTruthy();
    expect(tabs()).toHaveLength(4);
    mockApi.getMeReport.mockResolvedValueOnce(done);
    await act(async () => netListener?.({ isConnected: true, isInternetReachable: true }));
    await act(async () => void (await jest.advanceTimersByTimeAsync(0)));
    expect(await screen.findByTestId('me-nickname-card')).toBeTruthy();
    expect(mockApi.requestMeReport).not.toHaveBeenCalled();
  });
});

describe('나 탭 · 받은 뒤(보드 12-8~12-12, 결정 048 의 3)', () => {
  beforeEach(async () => {
    await storeReading();
    await storeReport();
  });

  it('맨 위 별명 카드("새벽별 님의 별명" · 한 줄 별명 · 풀이 읽기 → 내 별명) + 칩 다섯, 처음 고른 칩은 성격', async () => {
    await render(<MeScreen />);
    expect(await screen.findByTestId('me-nickname-card')).toBeTruthy();
    expect(screen.getByText(`새벽별${M.card.suffix}`)).toBeTruthy();
    expect(screen.getByText(reading.headline)).toBeTruthy();
    expect(within(screen.getByTestId('nav-bar')).getByText(M.title)).toBeTruthy();
    expect(['PERSONALITY', 'LOVE', 'RELATIONSHIP', 'WORK', 'EMOTION'].map((a) => chip(a).props.accessibilityLabel)).toEqual(
      Object.values(M.areas),
    );
    expect(chip('PERSONALITY').props.accessibilityState).toMatchObject({ selected: true });
    expect(tabs().map((t) => t.props.accessibilityState.selected)).toEqual([false, true, false, false]);
    await fireEvent.press(screen.getByTestId('me-nickname-card'));
    expect(router.push).toHaveBeenCalledWith('/reading');
  });

  it('맨 위 별명 카드의 오른쪽은 꺾쇠 › 만(카드 오른쪽 세로 가운데) — "풀이 읽기" 글자는 없고 화면 읽기 이름에 남는다(소유자, 빌드 11 · 결정 078 정정)', async () => {
    await render(<MeScreen />);
    const card = await screen.findByTestId('me-nickname-card');
    expect(within(card).queryByText(M.card.read)).toBeNull();
    // 꺾쇠는 가로 줄의 맨 끝(한 줄 별명 칸이 남은 폭을 다 씀)이고, 줄은 세로 가운데 맞춤
    expect(within(card).getByTestId('me-nickname-card-chevron')).toBeTruthy();
    // 꺾쇠 › 는 22(소유자 2026-11-23, 빌드 13)
    expect(within(card).getByTestId('me-nickname-card-chevron').props.width).toBe(22);
    const last = card.children[card.children.length - 1];
    expect(typeof last === 'string' ? last : last.props.testID).toBe('me-nickname-card-chevron');
    expect(StyleSheet.flatten(card.props.style)).toMatchObject({ flexDirection: 'row', alignItems: 'center' });
    expect(screen.getByRole('button', { name: [`새벽별${M.card.suffix}`, reading.headline, M.card.read].join(', ') })).toBe(card);
    await fireEvent.press(card);
    expect(router.push).toHaveBeenCalledWith('/reading');
  });

  it('성격: "새벽별 님의 성격" · 제목 · 키워드 셋 · 쓰인 별 · 한눈에 보기 · 문단 01~04(이유 줄)', async () => {
    const p = report.areas[0];
    await render(<MeScreen />);
    expect(await screen.findByText(`새벽별${M.areaOf}${M.areas.PERSONALITY}`)).toBeTruthy();
    expect(screen.getByText(p.title)).toBeTruthy();
    expect(screen.getAllByTestId('me-keyword')).toHaveLength(3);
    expect(screen.getAllByTestId('me-star')).toHaveLength(3);
    expect(screen.getByText(M.glance.title)).toBeTruthy();
    for (const t of [...(p.glance?.shining ?? []), ...(p.glance?.tiring ?? [])]) expect(screen.getByText(t)).toBeTruthy();
    expect(screen.getAllByTestId('me-paragraph')).toHaveLength(4);
    expect(screen.getByText('01')).toBeTruthy();
    expect(screen.getByText('04')).toBeTruthy();
    expect(screen.getAllByText(strings.reason.label)).toHaveLength(4);
    expect(screen.queryByText(strings.reading.disclaimer)).toBeNull();
  });

  it('글자 단계 v2: 제목 · 소제목은 흰색, 긴 글과 한눈에 보기 문장은 본문 회색(결정 080 — 외부 피드백 "다 흰 톤이라 읽기 힘들다")', async () => {
    const p = report.areas[0];
    await render(<MeScreen />);
    await screen.findByText(p.title);
    const style = (text: string) => StyleSheet.flatten(screen.getByText(text).props.style);
    expect(style(p.title)).toMatchObject({ ...Typography.title, color: Colors.ink });
    expect(style(`새벽별${M.areaOf}${M.areas.PERSONALITY}`)).toMatchObject({ ...Typography.kicker, color: Colors.accentText });
    const first = p.paragraphs[0];
    expect(style(first.title)).toMatchObject({ ...Typography.section, color: Colors.ink });
    expect(style(first.body)).toMatchObject({ ...Typography.reading, color: Colors.body });
    expect(style(p.glance!.shining[0])).toMatchObject({ ...Typography.small, color: Colors.body });
  });

  it('연애: 작은 실천 셋 + 이유 하나, 문단은 없다', async () => {
    const l = report.areas[1];
    await render(<MeScreen />);
    await fireEvent.press(await screen.findByTestId('me-chip-LOVE'));
    expect(chip('LOVE').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getByText(M.practices)).toBeTruthy();
    expect(screen.getAllByTestId('me-practice')).toHaveLength(3);
    for (const pr of l.practices ?? []) expect(screen.getByText(pr.title)).toBeTruthy();
    expect(screen.queryAllByTestId('me-paragraph')).toHaveLength(0);
    expect(screen.getAllByText(strings.reason.label)).toHaveLength(1);
  });

  it('관계: 가까워지는 모습(처음 만날 때 · 친해지면 · 오래된 사이) + 문단', async () => {
    const r = report.areas[2];
    await render(<MeScreen />);
    await fireEvent.press(await screen.findByTestId('me-chip-RELATIONSHIP'));
    expect(screen.getAllByTestId('me-closer')).toHaveLength(3);
    for (const t of [r.closer?.first, r.closer?.close, r.closer?.longtime]) expect(screen.getByText(t ?? '')).toBeTruthy();
    expect(screen.getAllByTestId('me-paragraph')).toHaveLength(4);
  });

  it('일: 막대 셋은 서버 값의 자리에 점만 찍고 숫자는 적지 않는다(결정 048 의 3)', async () => {
    const w = report.areas[3].workStyle;
    await render(<MeScreen />);
    await fireEvent.press(await screen.findByTestId('me-chip-WORK'));
    const rows = screen.getAllByTestId('me-work-row');
    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.props.accessibilityLabel)).toEqual([
      `${M.workStyle.together[0]}${M.workStyle.between}${M.workStyle.together[1]}${M.workStyle.betweenSuffix}`,
      `${M.workStyle.flexible[0]}${M.workStyle.between}${M.workStyle.flexible[1]}${M.workStyle.betweenSuffix}`,
      `${M.workStyle.fast[0]}${M.workStyle.between}${M.workStyle.fast[1]}${M.workStyle.betweenSuffix}`,
    ]);
    for (const row of rows) expect(within(row).queryByText(/\d/)).toBeNull();
    expect(screen.getAllByTestId('me-work-dot').map((d) => d.props.style.find((s: { left?: string }) => s?.left)?.left)).toEqual([
      `${w?.together}%`,
      `${w?.flexible}%`,
      `${w?.fast}%`,
    ]);
  });

  it('감정: 마음이 흔들릴 때(흔들릴 때 → 다시 편해지는 곳) + 문단', async () => {
    const e = report.areas[4];
    await render(<MeScreen />);
    await fireEvent.press(await screen.findByTestId('me-chip-EMOTION'));
    expect(screen.getByText(M.shaken.title)).toBeTruthy();
    expect(screen.getByText(e.shaken?.when ?? '')).toBeTruthy();
    expect(screen.getByText(e.shaken?.comfort ?? '')).toBeTruthy();
    expect(screen.getAllByTestId('me-paragraph')).toHaveLength(4);
  });

  it('다 받은 풀이를 보던 중 끊겼다가 연결이 돌아와도, 새로 받지 못하면 풀이는 그대로(결정 061 의 4, 리뷰 #49)', async () => {
    await render(<MeScreen />);
    expect(await screen.findByTestId('me-nickname-card')).toBeTruthy();
    await waitFor(() => expect(mockApi.getMeReport).toHaveBeenCalledTimes(1));
    await act(async () => netListener?.({ isConnected: false, isInternetReachable: false }));
    mockApi.getMeReport.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await act(async () => netListener?.({ isConnected: true, isInternetReachable: true }));
    await waitFor(() => expect(mockApi.getMeReport).toHaveBeenCalledTimes(2));
    expect(screen.getByTestId('me-nickname-card')).toBeTruthy();
    expect(screen.queryByTestId('card-fail')).toBeNull();
    expect(mockApi.requestMeReport).not.toHaveBeenCalled();
  });

  it('/me?area=WORK 처럼 칩을 골라 열 수 있다', async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ area: 'WORK' });
    await render(<MeScreen />);
    expect(await screen.findByTestId('me-nickname-card')).toBeTruthy();
    expect(chip('WORK').props.accessibilityState).toMatchObject({ selected: true });
    expect(screen.getAllByTestId('me-work-row')).toHaveLength(3);
  });

  it('한 번 받은 풀이는 기기에서 바로 보이고(뼈대 없음) 뒤에서 새로 묻는다', async () => {
    await render(<MeScreen />);
    expect(await screen.findByTestId('me-nickname-card')).toBeTruthy();
    expect(screen.queryByTestId('me-skeleton')).toBeNull();
    await waitFor(() => expect(mockApi.getMeReport).toHaveBeenCalledTimes(1));
  });
});

describe('나 탭 · 시각 "모름"(결정 048 의 7)', () => {
  it('쓰인 별 · 이유 줄에 하우스 · 상승점 · 중천이 없다', async () => {
    const unknown = { date: '2000-06-15', time: null, place: null };
    await saveBirth({ profile: unknown, chart: fixtures.chartTimeUnknown });
    const key = JSON.stringify([unknown.date, null, null]);
    await AsyncStorage.setItem(READING_STORAGE_KEY, JSON.stringify({ key, reading }));
    await AsyncStorage.setItem(ME_REPORT_STORAGE_KEY, JSON.stringify({ key, report }));
    await render(<MeScreen />);
    expect(await screen.findByTestId('me-nickname-card')).toBeTruthy();
    // 성격의 쓰인 별: 나의 중심만(첫인상 · 6하우스 모임은 뺀다)
    expect(screen.getAllByTestId('me-star')).toHaveLength(1);
    expect(screen.queryByText(/하우스/)).toBeNull();
    // 상승점 · 하우스 모임만으로 된 이유 줄은 숨기고 나머지는 하우스 부분 없이
    expect(screen.getAllByText(strings.reason.label)).toHaveLength(2);
    expect(screen.getByText('태어날 때 나의 중심(해)이 호기심 많은 쌍둥이자리에 있었어요')).toBeTruthy();
  });
});

describe('탭을 바꿔 다시 붙어도 첫 그림부터(소유자 "미리 그려져 있지 않은 느낌" · "내 별명" 이 잠깐)', () => {
  it('이번 실행에 읽은 풀이 · 내 별명은 기기를 늦게 읽어도 첫 그림부터 — 머리는 처음부터 "나"', async () => {
    await storeReading();
    await storeReport();
    mockApi.getMeReport.mockResolvedValue(done);
    const first = await render(<MeScreen />);
    expect(await screen.findByTestId('me-nickname-card')).toBeTruthy();
    await first.unmount();
    // 기기 읽기가 끝나지 않는다(늦은 AsyncStorage) — 메모리만으로 그려야 한다
    const getItem = AsyncStorage.getItem as jest.Mock;
    const original = getItem.getMockImplementation();
    getItem.mockImplementation(() => new Promise(() => {}));
    try {
      await render(<MeScreen />);
      expect(screen.getByTestId('me-nickname-card')).toBeTruthy();
      expect(within(screen.getByTestId('nav-bar')).getByText(M.title)).toBeTruthy();
      expect(screen.queryByText(strings.reading.title)).toBeNull();
      expect(screen.queryByTestId('me-skeleton')).toBeNull();
    } finally {
      getItem.mockImplementation(original);
    }
  });
});
