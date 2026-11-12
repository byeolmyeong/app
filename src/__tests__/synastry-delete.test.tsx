import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import SynastryResultScreen from '@/app/synastry/[id]/index';
import SynastryEntryScreen from '@/app/synastry/index';
import SynastryRankingScreen from '@/app/synastry/ranking';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { forgetFresh, freshOf, rememberFresh } from '@/features/synastry/fresh-synastry';
import { api, type ApiResult, type SynastryRankingEntry } from '@/lib/api';
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
    getSynastry: jest.fn(),
    listSynastries: jest.fn(),
    getSynastryRanking: jest.fn(),
    deleteSynastry: jest.fn(),
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ token: 'dev-token', ready: true })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockParams = useLocalSearchParams as jest.Mock;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const D = strings.synastry.delete;
const made = fixtures.synastry;
const { overlay: _overlay, ...stored } = made;
const partner = { date: '1999-03-02', time: null, placeId: null };
const deleted: ApiResult<null> = { ok: true, data: null };
const rowNames = () => screen.queryAllByTestId('synastry-row').map((r) => r.props.accessibilityLabel);

/** 결과 화면에서 "이 궁합 지우기" 를 눌러 확인 시트를 연다 */
async function openSheet() {
  await fireEvent.press(await screen.findByText(D.entry));
  return screen.findByText(D.title);
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  forgetFresh();
  mockParams.mockReturnValue({ id: made.id });
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  mockApi.getSynastry.mockResolvedValue({ ok: true, data: stored });
  mockApi.listSynastries.mockResolvedValue({ ok: true, data: [stored] });
  mockApi.getSynastryRanking.mockResolvedValue({ ok: true, data: [] });
  mockApi.deleteSynastry.mockResolvedValue(deleted);
  await saveBirth({ profile, chart: fixtures.chart });
});

describe('궁합 지우기(/synastry/[id])', () => {
  it('결과 화면에 "이 궁합 지우기" 가 있고, 누르면 확인 시트가 열린다. 누르기 전에는 지우지 않는다', async () => {
    await render(<SynastryResultScreen />);
    expect(await screen.findByText('이 궁합 지우기')).toBeTruthy();
    expect(screen.queryByText(D.title)).toBeNull();
    await openSheet();
    // 무엇이 지워지고 무엇이 남는지 알린다: 결과 · 궁합 리포트 · 조언은 지워지고 이미 만든 공유 링크는 남는다
    const body = screen.getByText(D.body);
    for (const word of ['궁합 리포트', '조언', '공유 링크', '남아요'])
      expect(String(body.props.children)).toContain(word);
    expect(screen.getByRole('button', { name: D.confirm })).toBeTruthy();
    expect(screen.getByRole('button', { name: D.cancel })).toBeTruthy();
    expect(mockApi.deleteSynastry).not.toHaveBeenCalled();
  });

  it('"취소" 를 누르면 시트만 닫히고 지우지 않는다', async () => {
    await render(<SynastryResultScreen />);
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: D.cancel }));
    await waitFor(() => expect(screen.queryByTestId('sheet-dim')).toBeNull());
    expect(mockApi.deleteSynastry).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(screen.getByText(stored.headline)).toBeTruthy();
  });

  it('"지우기" 를 누르면 서버에서 지우고, 메모리의 방금 계산한 결과를 버린 뒤 /synastry 로 바꿔 간다(뒤로 가도 지운 결과로 돌아오지 않는다)', async () => {
    rememberFresh({ synastry: made, birth: partner });
    await render(<SynastryResultScreen />);
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: D.confirm }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/synastry'));
    expect(mockApi.deleteSynastry).toHaveBeenCalledTimes(1);
    expect(mockApi.deleteSynastry).toHaveBeenCalledWith(made.id);
    expect(freshOf(made.id)).toBeNull();
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.push).not.toHaveBeenCalled();
  });

  it('다른 궁합의 메모리 자료는 버리지 않는다', async () => {
    rememberFresh({ synastry: { ...made, id: 'other' }, birth: partner });
    await render(<SynastryResultScreen />);
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: D.confirm }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/synastry'));
    expect(freshOf('other')).not.toBeNull();
  });

  it('지우는 동안에는 버튼을 누를 수 없고, 서버가 답하기 전에는 화면을 옮기지 않는다(미리 지운 것처럼 굴지 않는다)', async () => {
    let answer: (r: ApiResult<null>) => void = () => {};
    mockApi.deleteSynastry.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    rememberFresh({ synastry: made, birth: partner });
    await render(<SynastryResultScreen />);
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: D.confirm }));
    const deleting = screen.getByRole('button', { name: D.deleting });
    expect(deleting.props.accessibilityState.disabled).toBe(true);
    expect(screen.getByRole('button', { name: D.cancel }).props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(deleting);
    await fireEvent.press(screen.getByRole('button', { name: D.cancel }));
    expect(mockApi.deleteSynastry).toHaveBeenCalledTimes(1);
    expect(screen.getByText(D.title)).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
    expect(freshOf(made.id)).not.toBeNull();

    await act(async () => answer(deleted));
    expect(router.replace).toHaveBeenCalledWith('/synastry');
  });

  it.each([
    ['인터넷이 끊겼다', { ok: false, error: 'NETWORK' }, D.failed.NETWORK],
    ['서버 오류', { ok: false, error: 'SERVER', status: 500 }, D.failed.OTHER],
    ['점검 중', { ok: false, error: 'SERVER', status: 503, code: 'MAINTENANCE' }, D.failed.OTHER],
  ] as [string, ApiResult<null>, string][])(
    '지우지 못하면(%s) 안내를 보여 주고 시트와 결과 화면을 그대로 둔다. 다시 누를 때만 다시 요청한다',
    async (_name, failure, message) => {
      mockApi.deleteSynastry.mockResolvedValueOnce(failure);
      rememberFresh({ synastry: made, birth: partner });
      await render(<SynastryResultScreen />);
      await openSheet();
      await fireEvent.press(screen.getByRole('button', { name: D.confirm }));
      expect(await screen.findByText(message)).toBeTruthy();
      expect(screen.getByText(D.title)).toBeTruthy();
      expect(screen.getByText(made.headline)).toBeTruthy();
      expect(router.replace).not.toHaveBeenCalled();
      expect(freshOf(made.id)).not.toBeNull();
      expect(mockApi.deleteSynastry).toHaveBeenCalledTimes(1);

      await fireEvent.press(screen.getByRole('button', { name: D.confirm }));
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/synastry'));
      expect(mockApi.deleteSynastry).toHaveBeenCalledTimes(2);
    },
  );

  it('이미 지워진 궁합(404)은 지운 것으로 친다', async () => {
    mockApi.deleteSynastry.mockResolvedValue({ ok: false, error: 'SERVER', status: 404, code: 'NOT_FOUND' });
    rememberFresh({ synastry: made, birth: partner });
    await render(<SynastryResultScreen />);
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: D.confirm }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/synastry'));
    expect(freshOf(made.id)).toBeNull();
    expect(screen.queryByText(D.failed.OTHER)).toBeNull();
  });

  it('지운 뒤에는 아래에 깔린 지난 궁합 목록이 다시 받아져 그 궁합이 사라진다', async () => {
    await render(
      <>
        <SynastryEntryScreen />
        <SynastryResultScreen />
      </>,
    );
    await waitFor(() => expect(rowNames()).toEqual([stored.name]));
    expect(mockApi.listSynastries).toHaveBeenCalledTimes(1);

    mockApi.listSynastries.mockResolvedValue({ ok: true, data: [] });
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: D.confirm }));
    await waitFor(() => expect(rowNames()).toEqual([]));
    expect(mockApi.listSynastries).toHaveBeenCalledTimes(2);
  });

  it('지운 뒤에는 아래에 깔린 랭킹도 다시 받아져 그 궁합이 사라진다', async () => {
    const entry: SynastryRankingEntry = {
      id: stored.id,
      name: stored.name,
      score: stored.score,
      keywords: stored.keywords,
    };
    const other: SynastryRankingEntry = { ...entry, id: 'other', name: '하준' };
    mockApi.getSynastryRanking.mockResolvedValue({ ok: true, data: [entry, other] });
    await render(
      <>
        <SynastryRankingScreen />
        <SynastryResultScreen />
      </>,
    );
    await waitFor(() => expect(rowNames()).toEqual([stored.name, '하준']));

    mockApi.getSynastryRanking.mockResolvedValue({ ok: true, data: [other] });
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: D.confirm }));
    await waitFor(() => expect(rowNames()).toEqual(['하준']));
  });

  it('지우지 못했으면 목록을 다시 받지 않는다', async () => {
    mockApi.deleteSynastry.mockResolvedValue({ ok: false, error: 'NETWORK' });
    await render(
      <>
        <SynastryEntryScreen />
        <SynastryResultScreen />
      </>,
    );
    await waitFor(() => expect(rowNames()).toEqual([stored.name]));
    await openSheet();
    await fireEvent.press(screen.getByRole('button', { name: D.confirm }));
    expect(await screen.findByText(D.failed.NETWORK)).toBeTruthy();
    expect(mockApi.listSynastries).toHaveBeenCalledTimes(1);
    expect(rowNames()).toEqual([stored.name]);
  });
});
