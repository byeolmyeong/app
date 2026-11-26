import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';

import { Motion } from '@/constants/theme';
import { FaqList } from '@/features/support/faq-list';
import type { Faq } from '@/lib/api';

// jest 는 ios 로 돌아 faq-list 가 앱 파일(reason-reveal.tsx, Reanimated)을 본다 — 이 시험은 웹 파일(RN Animated)로 바꿔 끼워 같은 규칙을 본다
jest.mock('@/features/reason/reason-reveal', () => jest.requireActual('@/features/reason/reason-reveal.web'));

const items: Faq[] = [
  { id: 'faq-1', question: '요금이 있나요?', answer: '지금은 모두 무료예요.' },
  { id: 'faq-2', question: '계정을 지우면 어떻게 되나요?', answer: '모두 지워져요.\n되돌릴 수 없어요.' },
];
const HEIGHT = 60;
const HIDDEN = { includeHiddenElements: true };

// RN 은 시험 중(Platform.isTesting)에는 움직임을 바로 끝내는 가짜 Animated 를 고른다 — 움직임 중간을 보려고 진짜 timing 으로 돌린다
const realTiming = jest.requireActual<{ default: { timing: typeof Animated.timing } }>('react-native/Libraries/Animated/AnimatedImplementation').default.timing;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Animated, 'timing').mockImplementation(realTiming);
});
afterEach(() => jest.useRealTimers());

/** 첫 질문의 꺾쇠 회전(도) · 답 칸의 높이 · 보임 — RN Animated 가 지금 그리는 값 */
const now = () => {
  const turn = StyleSheet.flatten(screen.getAllByTestId('faq-chevron', HIDDEN)[0].props.style) as { transform: { rotate: string }[] };
  const body = StyleSheet.flatten(screen.getAllByTestId('faq-answer', HIDDEN)[0].props.style) as { height: number; opacity: number };
  return { deg: parseFloat(turn.transform[0].rotate), height: body.height, opacity: body.opacity };
};
const overflow = () => StyleSheet.flatten(screen.getAllByTestId('faq-answer', HIDDEN)[0].props.style).overflow;
const press = () => fireEvent.press(screen.getByRole('button', { name: items[0].question }));

/** 답은 처음부터 그려져 있고(숨김), 칸의 높이와 상관없이 제 높이로 놓여 잰다 */
async function renderMeasured(reduce = false) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduce);
  jest.useFakeTimers();
  await render(<FaqList items={items} />);
  await act(async () => {});
  const measure = screen.getAllByTestId('faq-measure', HIDDEN)[0];
  expect(StyleSheet.flatten(measure.props.style)).toMatchObject({ position: 'absolute' });
  await fireEvent(measure, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: HEIGHT } } });
}

describe('FaqList 웹(reason-reveal.web.tsx — 웹 번들에 Reanimated 를 싣지 않는다): 앱과 같은 펼침 규칙', () => {
  it('꺾쇠 회전 · 높이 · 보임이 진행 값 하나로 같은 길이 · 같은 곡선 — 펼치고 접는 동안 잘라내고, 다 펼치면 그대로 둔다', async () => {
    await renderMeasured();
    expect(now()).toEqual({ deg: 0, height: 0, opacity: 0 });

    await press();
    await act(async () => jest.advanceTimersByTime(32));
    const early = now();
    expect(early.deg).toBeGreaterThan(0);
    expect(early.deg).toBeLessThan(180);
    expect(early.height / HEIGHT).toBeCloseTo(early.deg / 180, 5);
    expect(early.opacity).toBeCloseTo(Math.min(1, (early.deg / 180) * 3), 5);
    expect(overflow()).toBe('hidden');
    await act(async () => jest.advanceTimersByTime(Motion.openMs));
    expect(now()).toEqual({ deg: 180, height: HEIGHT, opacity: 1 });
    expect(overflow()).toBe('visible');
    expect(screen.getAllByTestId('faq-answer')[0].props.accessibilityElementsHidden).toBe(false);

    await press();
    await act(async () => jest.advanceTimersByTime(32));
    const closing = now();
    expect(closing.deg).toBeLessThan(180);
    expect(closing.height / HEIGHT).toBeCloseTo(closing.deg / 180, 5);
    expect(overflow()).toBe('hidden');
    await act(async () => jest.advanceTimersByTime(Motion.closeMs));
    expect(now()).toEqual({ deg: 0, height: 0, opacity: 0 });
    expect(screen.getAllByTestId('faq-answer', HIDDEN)[0].props.accessibilityElementsHidden).toBe(true);
  });

  it('늦게 온 "펼침 끝" 알림은 그 뒤에 시작한 접기를 "다 펼침" 으로 덮지 않는다(누를 때 번호)', async () => {
    // 움직임이 끝났다는 알림을 붙잡아 두었다가 원하는 때에 보낸다
    const ends: ((result: { finished: boolean }) => void)[] = [];
    jest.spyOn(Animated, 'timing').mockImplementation((value, config) => {
      const animation = realTiming(value, config);
      const start = animation.start.bind(animation);
      animation.start = (end) => {
        ends.push((result) => end?.(result));
        start();
      };
      return animation;
    });
    await renderMeasured();
    await press();
    await act(async () => jest.advanceTimersByTime(Motion.openMs + 32));
    expect(now()).toEqual({ deg: 180, height: HEIGHT, opacity: 1 });
    // 펼침이 끝난 바로 그때 접는다 — 펼침의 끝 알림은 아직 오지 않았다
    await press();
    await act(async () => ends[0]({ finished: true }));
    expect(overflow()).toBe('hidden');
    await act(async () => jest.advanceTimersByTime(Motion.closeMs + 32));
    expect(now()).toEqual({ deg: 0, height: 0, opacity: 0 });
    expect(overflow()).toBe('hidden');

    // 같은 번호의 알림이면 다 펼친다
    await press();
    await act(async () => jest.advanceTimersByTime(Motion.openMs + 32));
    await act(async () => ends[ends.length - 1]({ finished: true }));
    expect(overflow()).toBe('visible');
  });

  it('기기의 동작 줄이기가 켜져 있으면 바로 바뀐다(움직이지 않는다)', async () => {
    await renderMeasured(true);
    await press();
    await act(async () => jest.advanceTimersByTime(16));
    expect(now()).toEqual({ deg: 180, height: HEIGHT, opacity: 1 });
    expect(overflow()).toBe('visible');
  });

  it('웹이 받는 자주 묻는 질문 파일은 Reanimated · worklets 를 들여오지 않는다(움직임은 reason-reveal 이 플랫폼별로)', () => {
    const fs = jest.requireActual<{ readFileSync: (path: string, encoding: 'utf8') => string }>('fs');
    const source = fs.readFileSync('src/features/support/faq-list.tsx', 'utf8');
    expect(/from 'react-native-(reanimated|worklets)'/.test(source)).toBe(false);
    expect(source).toContain("from '@/features/reason/reason-reveal'");
  });
});
