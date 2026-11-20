import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';

import MeScreen from '@/app/me';
import ReadingScreen from '@/app/reading';
import SynastryResultScreen from '@/app/synastry/[id]/index';
import SynastryRankingScreen from '@/app/synastry/ranking';
import { strings } from '@/content/strings';
import { saveBirth } from '@/features/chart/use-birth-profile';
import { api, type MeReportState } from '@/lib/api';
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
    saveProfile: jest.fn(),
    getSynastry: jest.fn(),
    getSynastryRanking: jest.fn(),
    getMeReport: jest.fn(),
    requestMeReport: jest.fn(),
    getAccount: jest.fn(),
  },
}));
jest.mock('@/features/auth/use-session', () => ({
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 'dev-token', ready: true, lastError: null })),
}));
jest.mock('@/features/share/share-actions', () => ({ saveImage: jest.fn(), shareStory: jest.fn() }));

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
        request.kind === 'NICKNAME'
          ? C.nickname
          : request.kind === 'ME_AREA'
            ? { ...C.meArea, area: request.area }
            : request.kind === 'SCORE'
              ? C.score
              : C.ranking,
    },
  }));
  mockApi.createReading.mockResolvedValue({ ok: true, data: fixtures.reading });
  mockApi.getMeReport.mockResolvedValue({ ok: true, data: { status: 'NONE' } as MeReportState });
  mockApi.getAccount.mockResolvedValue({ ok: true, data: { nickname: '새벽별', avatar: 3 } });
  mockApi.getSynastry.mockResolvedValue({ ok: true, data: fixtures.synastryList[0] });
  mockApi.getSynastryRanking.mockImplementation(async (relation) => ({
    ok: true,
    data: fixtures.synastryList.filter((s) => s.relation === relation),
  }));
  await saveBirth({ profile, chart: fixtures.chart });
});

describe('공유로 들어가는 곳', () => {
  it('내 별명(/reading): 머리의 공유 아이콘을 누르면 내 별명 카드(NICKNAME)를 만든다(화면을 여는 것만으로는 만들지 않는다)', async () => {
    await render(<ReadingScreen />);
    const entry = await shareButton();
    expect(mockApi.createShare).not.toHaveBeenCalled();
    await fireEvent.press(entry);
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenCalledTimes(1);
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'NICKNAME' });
  });

  it('나 탭 받기 전: 머리의 공유 아이콘은 내 별명 카드(NICKNAME)다(결정 053 의 2)', async () => {
    await render(<MeScreen />);
    await screen.findByTestId('me-detail-card');
    await fireEvent.press(await shareButton());
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenCalledWith({ kind: 'NICKNAME' });
  });

  it('나 탭 받은 뒤: 머리의 공유 아이콘은 지금 고른 칩의 영역 카드(ME_AREA)다(보드 12-13)', async () => {
    mockApi.getMeReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report: fixtures.meReport } });
    const view = await render(<MeScreen />);
    await screen.findByTestId('me-chip-LOVE');
    await fireEvent.press(await shareButton());
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenLastCalledWith({ kind: 'ME_AREA', area: 'PERSONALITY' });
    await view.unmount();

    await render(<MeScreen />);
    await fireEvent.press(await screen.findByTestId('me-chip-LOVE'));
    await fireEvent.press(await shareButton());
    expect(await screen.findByTestId('share-card')).toBeTruthy();
    expect(mockApi.createShare).toHaveBeenLastCalledWith({ kind: 'ME_AREA', area: 'LOVE' });
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

  it('공유 시트가 뜨는 모든 자리에서 시트 맨 위에 "공유하기" 제목이 없다(같은 ShareEntry · 시트 — 결정 061 의 6 · 계획 A7-5)', async () => {
    mockApi.getMeReport.mockResolvedValue({ ok: true, data: { status: 'DONE', report: fixtures.meReport } });
    const [first] = fixtures.synastryList;
    mockParams.mockReturnValue({ id: first.id });
    const entries: [string, () => React.ReactElement, () => Promise<unknown>][] = [
      ['내 별명', () => <ReadingScreen />, () => screen.findByText(fixtures.reading.headline)],
      ['나 탭(받은 뒤)', () => <MeScreen />, () => screen.findByTestId('me-chip-LOVE')],
      ['궁합 결과(1.1.0 코드)', () => <SynastryResultScreen />, () => screen.findByRole('button', { name: S.open })],
      ['궁합 랭킹(1.1.0 코드)', () => <SynastryRankingScreen />, () => screen.findAllByTestId('synastry-row')],
    ];
    for (const [name, Screen, ready] of entries) {
      const view = await render(<Screen />);
      await ready();
      await fireEvent.press(await shareButton());
      const panel = await screen.findByTestId('sheet-panel');
      expect([name, within(panel).queryByText(S.open)]).toEqual([name, null]);
      await view.unmount();
    }
  });
});
