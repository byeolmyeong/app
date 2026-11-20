import { renderRouter, screen } from 'expo-router/testing-library';
import { Text } from 'react-native';

import SynastryLayout from '@/app/synastry/_layout';

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

// 1.0.0 에는 궁합으로 가는 길이 없다 — 딥 링크로 /synastry/** 를 열어도 홈으로(결정 055 의 1, 계획 리뷰 초점 5)
describe.each(['/synastry', '/synastry/ranking', '/synastry/abc', '/synastry/abc/direction', '/synastry/abc/report'])('궁합 주소 %s', (url) => {
  it('열면 홈으로 간다', async () => {
    await renderRouter(routes, { initialUrl: url });
    expect(await screen.findByText('home')).toBeTruthy();
    expect(screen.queryByText(/^syn-/)).toBeNull();
    expect(screen).toHavePathname('/');
  });
});
