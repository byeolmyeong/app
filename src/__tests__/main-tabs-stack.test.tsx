import { act, fireEvent } from '@testing-library/react-native';
import { router } from 'expo-router';
import { renderRouter, screen } from 'expo-router/testing-library';
import { Text, View } from 'react-native';

import { MainTabs, type MainTab } from '@/features/home/main-tabs';

const page = (name: string, active: MainTab, nested = false) =>
  function Page() {
    return (
      <View>
        <Text>{name}</Text>
        <MainTabs active={active} nested={nested} />
      </View>
    );
  };

const routes = {
  _layout: {
    default: function Layout() {
      const { Stack } = jest.requireActual('expo-router');
      return <Stack />;
    },
  },
  index: page('home', 'home'),
  me: page('me', 'me'),
  reading: page('reading', 'me', true),
  timing: page('timing', 'timing'),
  my: page('my', 'my'),
  birth: () => <Text>birth</Text>,
};

// 결정 046 의 2: 탭을 누르면 그 화면으로 바꾸고 뒤로 가기에 쌓지 않는다 — push 로 들어온 화면(/reading)에서 눌러도(리뷰 PR #41)
describe('아래 탭과 뒤로 가기', () => {
  it('마이 → 출생 정보 → 글(push) 에서 홈 탭을 누르면 홈 하나만 남는다', async () => {
    await renderRouter(routes, { initialUrl: '/my' });
    await act(async () => router.push('/birth'));
    await act(async () => router.push('/reading'));
    await fireEvent.press(screen.getByLabelText('홈'));
    expect(screen).toHavePathname('/');
    expect(router.canGoBack()).toBe(false);
  });

  it('나 탭은 /me(결정 048 의 1) — 나 → 내 별명(push) 에서 나 탭을 누르면 /me 하나만 남는다', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(screen.getByLabelText('나'));
    expect(screen).toHavePathname('/me');
    await act(async () => router.push('/reading'));
    await fireEvent.press(screen.getByLabelText('나'));
    expect(screen).toHavePathname('/me');
    expect(router.canGoBack()).toBe(false);
  });

  it('홈 → 카드로 글(push) → 홈 탭이면 홈이 둘 쌓이지 않는다', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await act(async () => router.push('/reading'));
    await fireEvent.press(screen.getByLabelText('홈'));
    expect(screen).toHavePathname('/');
    expect(router.canGoBack()).toBe(false);
  });
});
