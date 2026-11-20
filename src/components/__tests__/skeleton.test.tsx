import { act, render, screen } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';

import { Skeleton, SkeletonCard } from '@/components/skeleton';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { Colors } from '@/constants/theme';
import { strings } from '@/content/strings';

function Phase({ loading }: { loading: boolean }) {
  return <Text testID="phase">{useLoadingPhase(loading)}</Text>;
}

const phase = () => screen.getByTestId('phase').props.children;
const advance = (ms: number) =>
  act(async () => {
    jest.advanceTimersByTime(ms);
  });

// 처음 불러올 때(보드 24 · 24-1, 결정 065): 처음 0.3초는 아무것도 · 넘으면 뼈대 · 10초 넘으면 실패 화면으로
describe('useLoadingPhase', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('불러오는 동안: 0.3초 전에는 blank, 0.3초부터 skeleton, 10초부터 timeout', async () => {
    await render(<Phase loading />);
    expect(phase()).toBe('blank');
    await advance(299);
    expect(phase()).toBe('blank');
    await advance(1);
    expect(phase()).toBe('skeleton');
    await advance(10_000 - 300 - 1);
    expect(phase()).toBe('skeleton');
    await advance(1);
    expect(phase()).toBe('timeout');
  });

  it('불러오지 않으면 done 이고, 다 불러오면 그때 done — 그 뒤로는 바뀌지 않는다', async () => {
    const view = await render(<Phase loading={false} />);
    expect(phase()).toBe('done');
    await view.rerender(<Phase loading />);
    await advance(500);
    expect(phase()).toBe('skeleton');
    await view.rerender(<Phase loading={false} />);
    expect(phase()).toBe('done');
    await advance(20_000);
    expect(phase()).toBe('done');
  });

  it('다시 불러오면(실패 화면의 다시 보기) 처음부터 다시 센다', async () => {
    const view = await render(<Phase loading />);
    await advance(10_000);
    expect(phase()).toBe('timeout');
    await view.rerender(<Phase loading={false} />);
    await view.rerender(<Phase loading />);
    expect(phase()).toBe('blank');
    await advance(300);
    expect(phase()).toBe('skeleton');
  });
});

describe('뼈대 조각', () => {
  it('막대: 너비 · 높이 그대로, 모서리는 8(낮으면 높이의 반), pill 이면 높이의 반 — 화면 읽기에는 숨긴다', async () => {
    await render(
      <>
        <Skeleton width="40%" height={16} />
        <Skeleton width={70} height={14} />
        <Skeleton width={44} height={44} pill />
      </>,
    );
    const [line, short, circle] = screen.getAllByTestId('skeleton', { includeHiddenElements: true });
    expect(StyleSheet.flatten(line.props.style)).toMatchObject({ width: '40%', height: 16, borderRadius: 8, backgroundColor: Colors.skeleton });
    expect(StyleSheet.flatten(short.props.style)).toMatchObject({ width: 70, height: 14, borderRadius: 7 });
    expect(StyleSheet.flatten(circle.props.style)).toMatchObject({ width: 44, height: 44, borderRadius: 22 });
    expect(screen.queryAllByTestId('skeleton')).toHaveLength(0);
  });

  it('카드: 떠 있는 면 · 테두리 · 모서리 20(큰 카드 24) · 안 여백 20 · 사이 12, 화면 읽기에는 "불러오는 중이에요" 한 번', async () => {
    const view = await render(
      <SkeletonCard>
        <Skeleton width="44%" height={13} />
      </SkeletonCard>,
    );
    const card = screen.getByLabelText(strings.states.loading);
    expect(StyleSheet.flatten(card.props.style)).toMatchObject({
      backgroundColor: Colors.raised,
      borderColor: Colors.hair,
      borderWidth: 1,
      borderRadius: 20,
      padding: 20,
      gap: 12,
    });
    await view.rerender(
      <SkeletonCard big>
        <Skeleton width="44%" height={13} />
      </SkeletonCard>,
    );
    expect(StyleSheet.flatten(screen.getByLabelText(strings.states.loading).props.style)).toMatchObject({ borderRadius: 24 });
  });
});
