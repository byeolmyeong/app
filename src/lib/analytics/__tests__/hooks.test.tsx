import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

import { onReadScroll, useRouteAnalytics, useTrackOnce } from '@/lib/analytics/hooks';

let mockPath = '/';
jest.mock('expo-router', () => ({ usePathname: () => mockPath }));
jest.mock('@/lib/analytics/core', () => ({ track: jest.fn() }));
const { track } = jest.requireMock('@/lib/analytics/core') as { track: jest.Mock };

function Root() {
  useRouteAnalytics();
  return <Text>root</Text>;
}

const scrolled = (y: number) =>
  ({ nativeEvent: { contentOffset: { y }, contentSize: { height: 2000 }, layoutMeasurement: { height: 800 } } }) as never;

beforeEach(() => track.mockClear());

describe('화면에서 쓰는 분석 훅(결정 040 · 081)', () => {
  it('루트: 첫 화면은 app_opened · screen_viewed, 바뀌면 screen_viewed — 공유 id 는 실리지 않는다', async () => {
    mockPath = '/s/SECRET123';
    const view = await render(<Root />);
    expect(track.mock.calls).toEqual([
      ['app_opened', { entry: 'share' }],
      ['screen_viewed', { screen: '/s/[shareId]' }],
    ]);
    track.mockClear();
    mockPath = '/login';
    await view.rerender(<Root />);
    expect(track.mock.calls).toEqual([['screen_viewed', { screen: '/login' }]]);
    expect(JSON.stringify(track.mock.calls)).not.toMatch(/SECRET/);
  });

  it('끝까지 읽음: 재는 화면에서 끝에 닿으면 한 번, 다른 화면에 갔다 오면 다시 한 번', async () => {
    mockPath = '/reading';
    const view = await render(<Root />);
    track.mockClear();
    onReadScroll(scrolled(0));
    expect(track).not.toHaveBeenCalled();
    onReadScroll(scrolled(1200));
    onReadScroll(scrolled(1200));
    expect(track.mock.calls).toEqual([['reading_read_to_end', { kind: 'summary' }]]);

    mockPath = '/my';
    await view.rerender(<Root />);
    track.mockClear();
    onReadScroll(scrolled(1200));
    expect(track).not.toHaveBeenCalled();

    mockPath = '/reading';
    await view.rerender(<Root />);
    track.mockClear();
    onReadScroll(scrolled(1200));
    expect(track.mock.calls).toEqual([['reading_read_to_end', { kind: 'summary' }]]);
  });

  it('useTrackOnce: when 이 참이 될 때 한 번 보낸다', async () => {
    function Probe({ when }: { when: boolean }) {
      useTrackOnce('reading_viewed', { kind: 'me_report' }, when);
      return null;
    }
    const view = await render(<Probe when={false} />);
    expect(track).not.toHaveBeenCalled();
    await view.rerender(<Probe when />);
    await view.rerender(<Probe when />);
    expect(track.mock.calls).toEqual([['reading_viewed', { kind: 'me_report' }]]);
  });
});
