import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import SynastryLayout from '@/app/synastry/_layout';
import { api } from '@/lib/api';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@/features/auth/use-session', () => ({
  ...jest.requireActual('@/features/auth/use-session'),
  useSession: jest.fn(() => ({ status: 'signedIn' as const, token: 't', ready: true, lastError: null })),
}));
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  api: { getMyAccount: jest.fn() },
}));

const routes = {
  _layout: {
    default: function Layout() {
      const { Stack } = jest.requireActual('expo-router');
      return <Stack />;
    },
  },
  index: () => <Text>home</Text>,
  'synastry/_layout': SynastryLayout,
  'synastry/index': () => <Text>syn-index</Text>,
  'synastry/ranking': () => <Text>syn-ranking</Text>,
  'synastry/[id]/index': () => <Text>syn-detail</Text>,
  'synastry/[id]/direction': () => <Text>syn-direction</Text>,
  'synastry/[id]/report': () => <Text>syn-report</Text>,
};

beforeEach(() => {
  (api.getMyAccount as jest.Mock).mockResolvedValue({ ok: true, data: { nickname: '새벽별', avatar: 3, email: null, provider: 'KAKAO', marketingConsent: false, suspended: false } });
});

// 1.1.0 A①(결정 113 의 3): 궁합 탭 첫 화면(/synastry)만 연다 — 옛 1.0.0 화면 파일(직접 입력 · 결과 · 랭킹)은 그리지 않는다
describe('궁합 탭 /synastry', () => {
  it.each(['/synastry', '/synastry?relation=LOVE'])('%s 를 열면 탭 첫 화면(빈 하늘) — 옛 직접 입력 화면이 아니다', async (url) => {
    await renderRouter(routes, { initialUrl: url });
    expect(await screen.findByTestId('synastry-tab')).toBeTruthy();
    expect(screen.queryByText(/^syn-/)).toBeNull();
    expect(screen).toHavePathname('/synastry');
  });
});

// 옛 궁합 화면으로 가는 길은 A④ 가 새 흐름으로 바꿀 때까지 닫혀 있다(결정 055 의 1 · 113 의 3) — 딥 링크로 열어도 홈으로
describe.each(['/synastry/ranking', '/synastry/abc', '/synastry/abc/direction', '/synastry/abc/report'])('옛 궁합 주소 %s', (url) => {
  it('열면 홈으로 간다', async () => {
    await renderRouter(routes, { initialUrl: url });
    expect(await screen.findByText('home')).toBeTruthy();
    expect(screen.queryByText(/^syn-/)).toBeNull();
    expect(screen).toHavePathname('/');
  });
});
