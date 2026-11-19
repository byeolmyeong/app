import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, StyleSheet } from 'react-native';

import { strings } from '@/content/strings';
import { MakingView } from '@/features/reading/making-view';

const M = strings.making;

/** 지금 보이는 안내 문구(셋 중 하나만 화면에 있다). 화면 읽기에서는 숨겨 두었다 */
const shownLines = () => M.lines.filter((line) => screen.queryByText(line, { includeHiddenElements: true }) !== null);

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// 별명 짓는 중(결정 041, 보드 9): 별이 둥실 · 뒤 빛 · 궤도 · 반짝임 · 안내 문구 셋이 2.5초마다
describe('MakingView', () => {
  it('제목과 첫 문구를 보여 주고, "길면 1분쯤 걸려요" 는 없다', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    await render(<MakingView />);
    expect(screen.getByText(M.title)).toBeTruthy();
    expect(shownLines()).toEqual([M.lines[0]]);
    expect(screen.queryByText(/1분/)).toBeNull();
  });

  it('동작 줄이기가 꺼져 있으면 문구 셋이 2.5초마다 순서대로 바뀌고 처음으로 돌아온다', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    await render(<MakingView />);
    await act(async () => {});
    expect(shownLines()).toEqual([M.lines[0]]);
    await act(async () => jest.advanceTimersByTime(2500));
    expect(shownLines()).toEqual([M.lines[1]]);
    await act(async () => jest.advanceTimersByTime(2500));
    expect(shownLines()).toEqual([M.lines[2]]);
    await act(async () => jest.advanceTimersByTime(2500));
    expect(shownLines()).toEqual([M.lines[0]]);
  });

  it('화면 읽기는 제목만 읽는다 — 바뀌는 안내 문구는 알리지 않는다(리뷰 A7)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    await render(<MakingView />);
    expect(screen.getByRole('header', { name: M.title })).toBeTruthy();
    expect(screen.queryByText(M.lines[0])).toBeNull();
    const lines = screen.getByTestId('making-lines', { includeHiddenElements: true });
    expect(lines.props['aria-live']).toBeUndefined();
    expect(lines.props.accessibilityLiveRegion).toBeUndefined();
  });

  it('동작 줄이기면 뒤 빛 · 반짝임은 투명도 1 로 멈춘다(보드 9)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(<MakingView />);
    await act(async () => {});
    for (const id of ['making-glow', 'making-twinkle-0', 'making-twinkle-1', 'making-twinkle-2']) {
      expect(StyleSheet.flatten(screen.getByTestId(id, { includeHiddenElements: true }).props.style).opacity).toBe(1);
    }
  });

  it('뒤 빛은 시안의 CSS radial-gradient(circle) 처럼 가장 먼 모서리(50√2)까지 퍼진다(비교 9 — 빛이 어둡던 것)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(<MakingView />);
    type Node = { props?: Record<string, unknown>; children?: (Node | string)[] | null };
    const radii: number[] = [];
    const walk = (node: Node | string | null) => {
      if (!node || typeof node === 'string') return;
      // react-native-svg 의 RadialGradient 는 r 을 rx · ry 로 그린다
      if (node.props?.name === 'makingGlow') radii.push(Number(node.props.rx));
      node.children?.forEach(walk);
    };
    const tree = screen.toJSON() as Node | Node[];
    (Array.isArray(tree) ? tree : [tree]).forEach(walk);
    expect(radii.some((r) => Math.abs(r - 50 * Math.SQRT2) < 0.01)).toBe(true);
  });

  it('동작 줄이기가 켜져 있으면 멈춘 첫 장면 — 첫 문구만 계속 보인다(1분이 넘어도, 리뷰 초점 3)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    await render(<MakingView />);
    await act(async () => {});
    await act(async () => jest.advanceTimersByTime(70_000));
    expect(shownLines()).toEqual([M.lines[0]]);
    expect(screen.getByText(M.title)).toBeTruthy();
  });
});
