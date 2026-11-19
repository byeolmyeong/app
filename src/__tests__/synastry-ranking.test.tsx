import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';

import SynastryResultScreen from '@/app/synastry/[id]/index';
import SynastryEntryScreen from '@/app/synastry/index';
import SynastryRankingScreen from '@/app/synastry/ranking';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { api, type SynastryRankingEntry } from '@/lib/api';
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
  api: { listPlaces: jest.fn(), getSynastry: jest.fn(), listSynastries: jest.fn(), getSynastryRanking: jest.fn() },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null })),
}));

const mockApi = api as jest.Mocked<typeof api>;
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockParams = useLocalSearchParams as jest.Mock;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const S = strings.synastry;
const keywords: [string, string, string] = ['하나', '둘', '셋'];
// 서버가 준 순서를 그대로 그리는지 보려고 일부러 점수순이 아니게 둔다
const love: SynastryRankingEntry[] = [
  { id: 'b', name: '하준', score: 55, scoreLabel: '다른 결의 사이', keywords },
  { id: 'a', name: '지우', score: 82, keywords: ['편안한 대화', '닮은 취향', '다른 쉬는 법'] },
  { id: 'c', name: '도윤', score: 48, keywords },
];
const friends: SynastryRankingEntry[] = [{ id: 'f', name: '민서', score: 91, keywords }];
const rowNames = () => screen.getAllByTestId('synastry-row').map((r) => r.props.accessibilityLabel);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockUseSession.mockReturnValue({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null });
  mockParams.mockReturnValue({});
  mockApi.listPlaces.mockResolvedValue({ ok: true, data: fixtures.places });
  mockApi.listSynastries.mockResolvedValue({ ok: true, data: fixtures.synastryList });
  mockApi.getSynastryRanking.mockImplementation(async (relation) => ({
    ok: true,
    data: relation === 'LOVE' ? love : relation === 'FRIEND' ? friends : [],
  }));
  await saveBirth({ profile, chart: fixtures.chart });
});

describe('궁합 랭킹(/synastry/ranking)', () => {
  it('관계 탭 넷이 있고 처음에는 연애의 랭킹을 서버가 준 순서 그대로 보여 준다(앱이 다시 줄 세우지 않는다)', async () => {
    await render(<SynastryRankingScreen />);
    await screen.findAllByTestId('synastry-row');
    const tabs = screen.getAllByRole('tab');
    ['연애', '친구', '일', '가족'].forEach((label, i) => expect(within(tabs[i]).getByText(label)).toBeTruthy());
    expect(tabs.map((t) => t.props.accessibilityState.selected)).toEqual([true, false, false, false]);
    expect(mockApi.getSynastryRanking).toHaveBeenCalledWith('LOVE');
    expect(rowNames()).toEqual(['하준', '지우', '도윤']);
    const rows = screen.getAllByTestId('synastry-row');
    // 순위는 받은 차례이고, 점수와 키워드는 받은 그대로다
    rows.forEach((row, i) => expect(within(row).getByText(String(i + 1))).toBeTruthy());
    expect(within(rows[0]).getByText(`55${S.result.scoreUnit}`)).toBeTruthy();
    expect(within(rows[1]).getByText(`82${S.result.scoreUnit}`)).toBeTruthy();
    expect(within(rows[1]).getByText('편안한 대화 · 닮은 취향 · 다른 쉬는 법')).toBeTruthy();
  });

  it('점수 옆의 말은 서버가 준 줄에만 붙인다(60 미만이어도 서버가 주지 않았으면 없다)', async () => {
    await render(<SynastryRankingScreen />);
    const rows = await screen.findAllByTestId('synastry-row');
    expect(within(rows[0]).getByText('다른 결의 사이')).toBeTruthy();
    expect(within(rows[1]).queryByText('다른 결의 사이')).toBeNull();
    expect(within(rows[2]).queryByText('다른 결의 사이')).toBeNull();
  });

  it('탭을 누르면 그 관계의 랭킹을 받아 보여 준다', async () => {
    await render(<SynastryRankingScreen />);
    await screen.findAllByTestId('synastry-row');
    await fireEvent.press(screen.getByText('친구'));
    await waitFor(() => expect(rowNames()).toEqual(['민서']));
    expect(mockApi.getSynastryRanking).toHaveBeenLastCalledWith('FRIEND');
  });

  it('줄을 누르면 그 궁합의 결과로 간다', async () => {
    await render(<SynastryRankingScreen />);
    await fireEvent.press((await screen.findAllByTestId('synastry-row'))[1]);
    expect(router.push).toHaveBeenCalledWith('/synastry/a');
  });

  it('그 관계로 본 궁합이 없으면 안내와 궁합 보러 가는 버튼을 보여 준다', async () => {
    await render(<SynastryRankingScreen />);
    await screen.findAllByTestId('synastry-row');
    await fireEvent.press(screen.getByText('가족'));
    expect(await screen.findByText(S.ranking.empty)).toBeTruthy();
    expect(screen.queryByTestId('synastry-row')).toBeNull();
    await fireEvent.press(screen.getByText(S.result.goEntry));
    expect(router.push).toHaveBeenCalledWith('/synastry');
  });

  it('받지 못하면 안내와 "다시 시도" 를 보여 준다', async () => {
    mockApi.getSynastryRanking.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<SynastryRankingScreen />);
    expect(await screen.findByText(S.ranking.failed.NETWORK)).toBeTruthy();
    await fireEvent.press(screen.getByText(S.result.retry));
    await waitFor(() => expect(rowNames()).toEqual(['하준', '지우', '도윤']));
  });

  it('세션 확인이 끝나기 전에는 서버를 부르지 않는다', async () => {
    mockUseSession.mockReturnValue({ status: 'checking' as const, token: null, ready: false, lastError: null });
    await render(<SynastryRankingScreen />);
    await act(async () => {});
    expect(mockApi.getSynastryRanking).not.toHaveBeenCalled();
  });
});

describe('지난 궁합(궁합 시작 화면 아래)', () => {
  it('지금까지 본 궁합을 서버가 준 순서(새것부터)로 보여 주고, 누르면 그 결과로 간다', async () => {
    await render(<SynastryEntryScreen />);
    expect(await screen.findByText(S.past.heading)).toBeTruthy();
    expect(rowNames()).toEqual(fixtures.synastryList.map((s) => s.name));
    const rows = screen.getAllByTestId('synastry-row');
    expect(within(rows[0]).getByText('연애')).toBeTruthy();
    expect(within(rows[0]).getByText(`82${S.result.scoreUnit}`)).toBeTruthy();
    // 순위는 랭킹에만 있다
    expect(within(rows[0]).queryByText('1')).toBeNull();
    await fireEvent.press(rows[1]);
    expect(router.push).toHaveBeenCalledWith(`/synastry/${fixtures.synastryList[1].id}`);
  });

  it('랭킹으로 가는 링크가 있다', async () => {
    await render(<SynastryEntryScreen />);
    await fireEvent.press(await screen.findByText(S.past.seeRanking));
    expect(router.push).toHaveBeenCalledWith('/synastry/ranking');
  });

  it('본 궁합이 없거나 목록을 받지 못하면 그 구역을 그리지 않는다(입력은 그대로 쓸 수 있다)', async () => {
    mockApi.listSynastries.mockResolvedValueOnce({ ok: true, data: [] });
    const first = await render(<SynastryEntryScreen />);
    expect(await screen.findByText(S.entry.submit)).toBeTruthy();
    await act(async () => {});
    expect(screen.queryByText(S.past.heading)).toBeNull();
    await first.unmount();
    mockApi.listSynastries.mockResolvedValueOnce({ ok: false, error: 'NETWORK' });
    await render(<SynastryEntryScreen />);
    expect(await screen.findByText(S.entry.submit)).toBeTruthy();
    await act(async () => {});
    expect(screen.queryByText(S.past.heading)).toBeNull();
  });
});

describe('궁합 결과에서 랭킹으로', () => {
  it('"궁합 랭킹 보기" 는 랭킹 화면으로 간다', async () => {
    const [first] = fixtures.synastryList;
    mockParams.mockReturnValue({ id: first.id });
    mockApi.getSynastry.mockResolvedValue({ ok: true, data: first });
    await render(<SynastryResultScreen />);
    await fireEvent.press(await screen.findByText(S.past.seeRanking));
    expect(router.push).toHaveBeenCalledWith('/synastry/ranking');
  });
});
