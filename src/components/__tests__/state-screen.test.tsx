import { fireEvent, render, screen, within } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { OfflineBanner } from '@/components/offline-banner';
import { StateScreen } from '@/components/state-screen';
import { strings } from '@/content/strings';

// 실패 화면 한 틀(결정 061 의 1 · 5, 보드 19 · 20-1 · 17-1 · 점검): 별이 그림 · 제목 · 두 줄 설명 · 맨 아래 주 버튼 · 그 위 "나중에 하기"
describe('StateScreen', () => {
  it('그림 · 제목 · 두 줄 설명을 그리고, 버튼이 없으면 누를 것이 없다(점검)', async () => {
    await render(<StateScreen title="지금 별명을 손보고 있어요" body={'첫째 줄\n둘째 줄'} />);
    expect(screen.getByTestId('state-art', { includeHiddenElements: true })).toBeTruthy();
    expect(screen.getByRole('header', { name: '지금 별명을 손보고 있어요' })).toBeTruthy();
    expect(screen.getByText('첫째 줄\n둘째 줄')).toBeTruthy();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('주 버튼은 맨 아래, "나중에 하기" 는 그 위 — 주 버튼 아래에는 아무것도 없다(결정 061 의 5)', async () => {
    const primary = jest.fn();
    const later = jest.fn();
    await render(
      <StateScreen title="t" body="b" primary={{ label: '다시 쓰기', onPress: primary }} later={{ label: '나중에 하기', onPress: later }} />,
    );
    const actions = screen.getByTestId('state-actions');
    const labels = within(actions).getAllByText(/다시 쓰기|나중에 하기/).map((t) => t.props.children);
    expect(labels).toEqual(['나중에 하기', '다시 쓰기']);
    await fireEvent.press(screen.getByText('다시 쓰기'));
    await fireEvent.press(screen.getByText('나중에 하기'));
    expect(primary).toHaveBeenCalledTimes(1);
    expect(later).toHaveBeenCalledTimes(1);
  });

  it('아래 탭이 없으면 주 버튼은 아래에서 34, 있으면 탭 바로 위 16(보드 20-1 · 19)', async () => {
    const view = await render(<StateScreen title="t" body="b" primary={{ label: '다시 시도', onPress: jest.fn() }} />);
    expect(StyleSheet.flatten(screen.getByTestId('state-actions').props.style).paddingBottom).toBe(34);
    await view.rerender(
      <StateScreen title="t" body="b" primary={{ label: '다시 보기', onPress: jest.fn() }} tabs={<Text>아래 탭</Text>} />,
    );
    expect(screen.getByText('아래 탭')).toBeTruthy();
    expect(StyleSheet.flatten(screen.getByTestId('state-actions').props.style).paddingBottom).toBe(16);
  });

  it('버튼이 없어도(점검) 그림 · 글 자리는 버튼이 있을 때와 같다 — 맨 아래 주 버튼 자리(높이 56)를 비워 둔다(보드 18 · 17-1)', async () => {
    const view = await render(<StateScreen title="t" body="b" />);
    expect(StyleSheet.flatten(screen.getByTestId('state-primary-space').props.style).height).toBe(56);
    await view.rerender(<StateScreen title="t" body="b" primary={{ label: '업데이트', onPress: jest.fn() }} />);
    expect(screen.queryByTestId('state-primary-space')).toBeNull();
  });
});

// 연결 끊김 띠(결정 061 의 4, 보드 20): 받아 둔 것은 그대로 두고 머리 아래에 한 줄
describe('OfflineBanner', () => {
  it('"인터넷 연결이 끊겼어요 · 연결되면 새로 불러올게요" 를 한 덩이로 읽힌다', async () => {
    await render(<OfflineBanner />);
    const S = strings.states.offline;
    const banner = screen.getByTestId('offline-banner');
    expect(within(banner).getByText(S.title)).toBeTruthy();
    expect(within(banner).getByText(S.body)).toBeTruthy();
    expect(banner.props.accessibilityLabel).toBe(`${S.title}. ${S.body}`);
    expect(banner.props.accessibilityLiveRegion).toBe('polite');
  });
});
