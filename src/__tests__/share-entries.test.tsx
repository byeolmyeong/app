import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import ReadingScreen from '@/app/reading';
import ReportScreen from '@/app/report';
import SynastryResultScreen from '@/app/synastry/[id]/index';
import SynastryRankingScreen from '@/app/synastry/ranking';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { api, type Report } from '@/lib/api';
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
    createShare: jest.fn(),
    createReading: jest.fn(),
    createDirection: jest.fn(),
    getReport: jest.fn(),
    requestReport: jest.fn(),
    saveProfile: jest.fn(),
    getSynastry: jest.fn(),
    getSynastryRanking: jest.fn(),
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ token: 'dev-token', ready: true })),
}));
jest.mock('@/features/share/share-actions', () => ({ sendImage: jest.fn(), sendLink: jest.fn() }));

const mockApi = api as jest.Mocked<typeof api>;
const mockParams = useLocalSearchParams as jest.Mock;
const S = strings.share;
const C = fixtures.shareCards;
const profile = { date: '2000-06-15', time: '21:00', place: { id: 1841277, name: '서울특별시 마포구' } };
const shareButton = (label: string = S.open) => screen.findByRole('button', { name: label });

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  mockParams.mockReturnValue({});
  mockApi.createShare.mockImplementation(async (request) => ({
    ok: true,
    data: {
      shareId: 's1',
      card:
        request.kind === 'READING'
          ? C.reading
          : request.kind === 'SCORE'
            ? C.score
            : request.kind === 'RANKING'
              ? C.ranking
              : C.nextTurn,
    },
  }));
  mockApi.createReading.mockResolvedValue({ ok: true, data: fixtures.reading });
  mockApi.getReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report: fixtures.report } });
  mockApi.createDirection.mockResolvedValue({ ok: true, data: fixtures.directionFuture });
  mockApi.getSynastry.mockResolvedValue({ ok: true, data: fixtures.synastryList[0] });
  mockApi.getSynastryRanking.mockImplementation(async (relation) => ({
    ok: true,
    data: fixtures.synastryList.filter((s) => s.relation === relation),
  }));
  await saveBirth({ profile, chart: fixtures.chart });
});

describe('공유로 들어가는 곳', () => {
  it('요약 해석: "공유하기" 를 누르면 요약 해석 카드를 만든다(화면을 여는 것만으로는 만들지 않는다)', async () => {
    await render(<ReadingScreen />);
    const entry = await shareButton();
    expect(mockApi.createShare).not.toHaveBeenCalled();
    await fireEvent.press(entry);
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'READING' });
  });

  it('궁합 결과: "공유하기" 는 내 이름을 묻고, 그 궁합의 점수 카드를 만든다', async () => {
    const [first] = fixtures.synastryList;
    mockParams.mockReturnValue({ id: first.id });
    await render(<SynastryResultScreen />);
    await fireEvent.press(await shareButton());
    await fireEvent.changeText(await screen.findByPlaceholderText(S.myName.placeholder), '동환');
    expect(mockApi.createShare).not.toHaveBeenCalled();
    await fireEvent.press(screen.getByText(S.myName.submit));
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'SCORE', synastryId: first.id, myName: '동환' });
  });

  it('궁합 랭킹: 지금 고른 관계 탭의 랭킹 카드를 이니셜로 만든다', async () => {
    await render(<SynastryRankingScreen />);
    await screen.findAllByTestId('synastry-row');
    await fireEvent.press(screen.getByText('친구'));
    await waitFor(() => expect(mockApi.getSynastryRanking).toHaveBeenLastCalledWith('FRIEND'));
    await fireEvent.press(await shareButton());
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'RANKING', relation: 'FRIEND', showNames: false });
  });

  it('궁합 랭킹: 그 관계로 본 궁합이 없으면 공유 버튼이 없다', async () => {
    mockApi.getSynastryRanking.mockResolvedValue({ ok: true, data: [] });
    await render(<SynastryRankingScreen />);
    expect(await screen.findByText(strings.synastry.ranking.empty)).toBeTruthy();
    expect(screen.queryByRole('button', { name: S.open })).toBeNull();
  });

  it('리포트 시기 탭: 다음 변곡점이 있으면 "다음 변곡점 공유하기" 가 있고 그 카드를 만든다', async () => {
    mockParams.mockReturnValue({ area: 'TIMING' });
    await render(<ReportScreen />);
    await screen.findByTestId('timing-view');
    await fireEvent.press(await shareButton(S.openNextTurn));
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'NEXT_TURN' });
  });

  it('리포트: 시기가 아닌 탭에는 변곡점 공유 버튼이 없다', async () => {
    await render(<ReportScreen />);
    await screen.findAllByRole('tab');
    expect(screen.queryByRole('button', { name: S.openNextTurn })).toBeNull();
  });

  it('리포트 시기 탭: 다음 변곡점이 없으면(네 번을 모두 지났다) 공유 버튼이 없다', async () => {
    const { nextMilestone: _gone, ...current } = fixtures.report.timing.current;
    const report: Report = { ...fixtures.report, timing: { ...fixtures.report.timing, current } };
    mockApi.getReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report } });
    mockParams.mockReturnValue({ area: 'TIMING' });
    await render(<ReportScreen />);
    await screen.findByTestId('timing-view');
    expect(screen.getByText(strings.report.timing.milestonesDone)).toBeTruthy();
    await act(async () => {});
    expect(screen.queryByRole('button', { name: S.openNextTurn })).toBeNull();
  });
});
