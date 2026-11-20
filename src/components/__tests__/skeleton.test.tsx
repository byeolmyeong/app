import { act, render, screen } from '@testing-library/react-native';
import { Animated, StyleSheet, Text } from 'react-native';

import { Skeleton, SkeletonGroup, SkeletonStill, SkeletonText } from '@/components/skeleton';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { Colors, Typography } from '@/constants/theme';
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
});

describe('멈춘 막대 SkeletonStill', () => {
  it('불러오는 중이 아닌 자리(잠긴 칩의 흐린 미리보기)에서는 빛을 돌리지 않는다 — 감싸지 않은 막대만 빛이 오간다(리뷰 #63)', async () => {
    const loop = jest.spyOn(Animated, 'loop');
    await render(
      <SkeletonStill>
        <Skeleton width={40} height={12} />
        <SkeletonText variant="body" widths={['50%', '30%']} />
      </SkeletonStill>,
    );
    expect(loop).not.toHaveBeenCalled();
    await render(<Skeleton width={40} height={12} />);
    expect(loop).toHaveBeenCalledTimes(1);
    loop.mockRestore();
  });
});

// 뼈대는 그 화면이 다 그려졌을 때의 배치 그대로(결정 071): 글 한 줄은 그 글자 단계의 줄 높이 칸에 글자 크기 막대 하나
describe('글 줄 자리 SkeletonText', () => {
  const lines = () => screen.queryAllByTestId('skeleton-line', { includeHiddenElements: true });
  const bars = () => screen.getAllByTestId('skeleton', { includeHiddenElements: true });

  it('widths 의 길이가 줄 수 — 줄마다 줄 높이 칸(본문 26)에 글자 크기(16) 막대, 폭은 widths 그대로', async () => {
    await render(<SkeletonText variant="paragraph" widths={['100%', '64%']} />);
    expect(lines()).toHaveLength(2);
    for (const line of lines()) expect(StyleSheet.flatten(line.props.style)).toMatchObject({ height: Typography.paragraph.lineHeight, justifyContent: 'center' });
    expect(bars().map((b) => StyleSheet.flatten(b.props.style))).toEqual([
      expect.objectContaining({ width: '100%', height: Typography.paragraph.fontSize }),
      expect.objectContaining({ width: '64%', height: Typography.paragraph.fontSize }),
    ]);
  });

  it('글자 단계가 다르면 칸 · 막대도 그 단계대로(한 줄 별명 36 칸 · 26 막대)', async () => {
    await render(<SkeletonText variant="hero" widths={[120]} />);
    expect(StyleSheet.flatten(lines()[0].props.style)).toMatchObject({ height: 36 });
    expect(StyleSheet.flatten(bars()[0].props.style)).toMatchObject({ width: 120, height: 26 });
  });

  it('줄이 없으면 아무것도 그리지 않는다', async () => {
    const view = await render(<SkeletonText variant="paragraph" widths={[]} />);
    expect(lines()).toHaveLength(0);
    expect(view.toJSON()).toBeNull();
  });

  it('가운데 맞춘 글의 자리는 막대도 가운데, 감싼 칸이 가운데 맞춤이어도 폭을 다 쓴다(퍼센트 폭이 0 이 되지 않게)', async () => {
    const view = await render(<SkeletonText variant="caption" widths={['50%']} />);
    expect(StyleSheet.flatten(lines()[0].props.style).alignItems).toBeUndefined();
    await view.rerender(<SkeletonText variant="caption" widths={['50%']} center />);
    expect(StyleSheet.flatten(lines()[0].props.style)).toMatchObject({ alignItems: 'center' });
    expect(StyleSheet.flatten(lines()[0].parent?.props.style)).toMatchObject({ alignSelf: 'stretch' });
  });
});

describe('뼈대 묶음 SkeletonGroup', () => {
  it('화면 하나의 뼈대를 묶어 화면 읽기에는 "불러오는 중이에요" 를 한 번 읽는다', async () => {
    await render(
      <SkeletonGroup testID="x-skeleton">
        <SkeletonText variant="paragraph" widths={['100%']} />
      </SkeletonGroup>,
    );
    expect(screen.getAllByLabelText(strings.states.loading)).toHaveLength(1);
    expect(screen.getByLabelText(strings.states.loading).props.testID).toBe('x-skeleton');
  });
});
