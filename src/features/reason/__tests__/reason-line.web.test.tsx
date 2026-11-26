import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, StyleSheet } from 'react-native';

import { Motion } from '@/constants/theme';
import { ReasonLine } from '@/features/reason/reason-line';
import { RevealShape } from '@/features/reason/reason-reveal-shape';
import type { Reason } from '@/lib/api';
import { fixtures } from '@/lib/fixtures';

// jest 는 ios 로 돌아 reason-line 이 앱 파일(reason-reveal.tsx, Reanimated)을 본다 — 이 시험은 웹 파일(RN Animated)로 바꿔 끼워 같은 규칙을 본다
jest.mock('@/features/reason/reason-reveal', () => jest.requireActual('@/features/reason/reason-reveal.web'));
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

const sun: Reason = { when: 'BIRTH', items: [{ kind: 'PLACEMENT', body: 'SUN', sign: 'GEMINI', house: 6 }] };
const HIDDEN = { includeHiddenElements: true };

// RN 은 시험 중(Platform.isTesting)에는 움직임을 바로 끝내는 가짜 Animated 를 고른다 — 움직임 중간을 보려고 진짜 timing 으로 돌린다
const realTiming = jest.requireActual<{ default: { timing: typeof Animated.timing } }>('react-native/Libraries/Animated/AnimatedImplementation').default.timing;
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Animated, 'timing').mockImplementation(realTiming);
});
afterEach(() => jest.useRealTimers());

/** 꺾쇠의 회전(도) · 칸의 높이 · 보임 — RN Animated 가 지금 그리는 값 */
const now = () => {
  const turn = StyleSheet.flatten(screen.getByTestId('reason-chevron', HIDDEN).props.style) as { transform: { rotate: string }[] };
  const body = StyleSheet.flatten(screen.getByTestId('reason-body', HIDDEN).props.style) as { height: number; opacity: number };
  return { deg: parseFloat(turn.transform[0].rotate), height: body.height, opacity: body.opacity };
};
const overflow = () => StyleSheet.flatten(screen.getByTestId('reason-body', HIDDEN).props.style).overflow;
const press = () => fireEvent.press(screen.getByRole('button', { name: /이렇게 풀이한 이유/ }));

/** 펼친 내용은 처음부터 그려져 있고(숨김), 칸의 높이와 상관없이 제 높이로 놓여 잰다 */
async function renderMeasured(reduce = false) {
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(reduce);
  jest.useFakeTimers();
  await render(<ReasonLine reason={sun} chart={fixtures.chart} />);
  await act(async () => {});
  const measure = screen.getByTestId('reason-measure', HIDDEN);
  expect(StyleSheet.flatten(measure.props.style)).toMatchObject({ position: 'absolute' });
  await fireEvent(measure, 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 240 } } });
}

describe('ReasonLine 웹(reason-reveal.web.tsx — 웹 번들에 Reanimated 를 싣지 않는다): 앱과 같은 펼침 규칙', () => {
  it('꺾쇠 회전 · 높이 · 보임이 진행 값 하나로 같은 길이 · 같은 곡선 — 내용은 앞 1/3 에서 나타나고 접을 때 1/3 아래에서 흐려진다', async () => {
    await renderMeasured();
    expect(now()).toEqual({ deg: 0, height: 0, opacity: 0 });

    await press();
    await act(async () => jest.advanceTimersByTime(32));
    const early = now();
    // 첫 프레임부터 셋이 같은 진행 값으로 움직인다
    expect(early.deg).toBeGreaterThan(0);
    expect(early.deg).toBeLessThan(180);
    expect(early.height / 240).toBeCloseTo(early.deg / 180, 5);
    expect(early.opacity).toBeCloseTo(Math.min(1, (early.deg / 180) * 3), 5);
    await act(async () => jest.advanceTimersByTime(Motion.openMs / 3));
    const third = now();
    expect(third.height / 240).toBeCloseTo(third.deg / 180, 5);
    expect(third.opacity).toBe(1);
    // 다 펼치기 전에는 잘라낸다
    expect(overflow()).toBe('hidden');
    await act(async () => jest.advanceTimersByTime(Motion.openMs));
    expect(now()).toEqual({ deg: 180, height: 240, opacity: 1 });
    // 다 펼치면 잘라내지 않는다(용어 말풍선이 칸 밖으로)
    expect(overflow()).toBe('visible');
    expect(screen.getByTestId('reason-body').props.accessibilityElementsHidden).toBe(false);

    await press();
    await act(async () => jest.advanceTimersByTime(32));
    const closing = now();
    expect(closing.deg).toBeLessThan(180);
    expect(closing.height / 240).toBeCloseTo(closing.deg / 180, 5);
    expect(closing.opacity).toBeCloseTo(Math.min(1, (closing.deg / 180) * 3), 5);
    expect(overflow()).toBe('hidden');
    await act(async () => jest.advanceTimersByTime(Motion.closeMs));
    expect(now()).toEqual({ deg: 0, height: 0, opacity: 0 });
    expect(screen.getByTestId('reason-body', HIDDEN).props.accessibilityElementsHidden).toBe(true);
  });

  it('빌드 15 의 길이(0.3초)로는 아직 펼치는 중 — 조금 느리게 펼친다(소유자 빌드 15 "너무 빠른데 조금만 느리게")', async () => {
    await renderMeasured();
    await press();
    await act(async () => jest.advanceTimersByTime(300));
    expect(now().height).toBeLessThan(240);
    await act(async () => jest.advanceTimersByTime(Motion.openMs - 300 + 32));
    expect(now()).toEqual({ deg: 180, height: 240, opacity: 1 });
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
    expect(now()).toEqual({ deg: 180, height: 240, opacity: 1 });
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

  it('처음부터 펼친 상자를 닫았다 다시 열면 바탕과 함께 0 에서 잰 높이까지 늘고, 다 열리면 묶음을 풀어 제 높이로 — 접힌 동안 잰 값은 받지 않는다(소유자 빌드 14)', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.useFakeTimers();
    await render(<ReasonLine reason={sun} chart={fixtures.chart} defaultOpen />);
    await act(async () => {});
    await fireEvent(screen.getByTestId('reason-measure'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 240 } } });
    const body = () => StyleSheet.flatten(screen.getByTestId('reason-body', HIDDEN).props.style) as { height?: number; maxHeight?: number; opacity: number };
    expect(body().maxHeight).toBe(RevealShape.freeMaxHeight);
    expect(body()).not.toHaveProperty('height');
    await press();
    await act(async () => jest.advanceTimersByTime(Motion.closeMs + 32));
    expect(body().maxHeight).toBe(0);
    await fireEvent(screen.getByTestId('reason-measure', HIDDEN), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 0 } } });
    await press();
    await act(async () => jest.advanceTimersByTime(48));
    const mid = body();
    expect(mid.maxHeight).toBeGreaterThan(0);
    expect(mid.maxHeight).toBeLessThan(240);
    expect(overflow()).toBe('hidden');
    await act(async () => jest.advanceTimersByTime(Motion.openMs + 32));
    expect(body().maxHeight).toBe(RevealShape.freeMaxHeight);
    expect(overflow()).toBe('visible');
  });

  it('처음부터 펼친 상자(화면의 첫 이유, 결정 083)는 첫 그림부터 펼친 높이 — 재기 전에도 높이를 묶지 않고, 첫 누름부터 다른 상자처럼 접고 편다', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    jest.useFakeTimers();
    await render(<ReasonLine reason={sun} chart={fixtures.chart} defaultOpen />);
    // 첫 그림: 꺾쇠는 펼침 · 내용은 보이고 · 높이 키가 없어 내용이 제 높이를 낸다
    const first = StyleSheet.flatten(screen.getByTestId('reason-body').props.style) as { height?: number; opacity: number };
    expect(first).not.toHaveProperty('height');
    expect(first.opacity).toBe(1);
    expect(now().deg).toBe(180);
    expect(overflow()).toBe('visible');
    expect(screen.getByRole('button', { name: /이렇게 풀이한 이유/ }).props.accessibilityState).toMatchObject({ expanded: true });
    expect(screen.getByTestId('reason-wheel')).toBeTruthy();
    // 내용은 흐름 안에 둔다(절대 위치로 재면 묶지 않은 칸의 높이가 0)
    expect(StyleSheet.flatten(screen.getByTestId('reason-measure').props.style)?.position).toBeUndefined();
    await act(async () => {});
    await fireEvent(screen.getByTestId('reason-measure'), 'layout', { nativeEvent: { layout: { x: 0, y: 0, width: 300, height: 240 } } });
    expect(StyleSheet.flatten(screen.getByTestId('reason-body').props.style)).not.toHaveProperty('height');

    // 첫 누름: 그때부터 높이를 진행 값에 묶어 펼친 높이(240)에서 줄어든다
    await press();
    await act(async () => jest.advanceTimersByTime(32));
    // 흐름 안 상자라 높이 상한(maxHeight)을 묶는다(결정 088)
    const cap = () => (StyleSheet.flatten(screen.getByTestId('reason-body', HIDDEN).props.style) as { maxHeight: number }).maxHeight;
    const closing = now();
    expect(closing.deg).toBeLessThan(180);
    expect(cap() / 240).toBeCloseTo(closing.deg / 180, 5);
    expect(overflow()).toBe('hidden');
    await act(async () => jest.advanceTimersByTime(Motion.closeMs));
    expect(now()).toMatchObject({ deg: 0, opacity: 0 });
    expect(cap()).toBe(0);
    expect(screen.getByTestId('reason-body', HIDDEN).props.accessibilityElementsHidden).toBe(true);

    // 다시 누르면 다른 상자처럼 펼치고, 다 펼치면 묶음을 푼다(결정 088)
    await press();
    await act(async () => jest.advanceTimersByTime(Motion.openMs + 32));
    expect(now()).toMatchObject({ deg: 180, opacity: 1 });
    expect(cap()).toBe(RevealShape.freeMaxHeight);
    expect(overflow()).toBe('visible');
  });

  it('기기의 동작 줄이기가 켜져 있으면 바로 바뀐다(움직이지 않는다)', async () => {
    await renderMeasured(true);
    await press();
    await act(async () => jest.advanceTimersByTime(16));
    expect(now()).toEqual({ deg: 180, height: 240, opacity: 1 });
    expect(overflow()).toBe('visible');
  });

  it('웹이 받는 이유 상자 파일은 Reanimated · worklets 를 들여오지 않는다', () => {
    const fs = jest.requireActual<{ readFileSync: (path: string, encoding: 'utf8') => string }>('fs');
    for (const file of ['reason-line.tsx', 'reason-reveal.web.tsx', 'reason-reveal-shape.ts']) {
      const source = fs.readFileSync(`src/features/reason/${file}`, 'utf8');
      expect({ file, reanimated: /from 'react-native-(reanimated|worklets)'/.test(source) }).toEqual({ file, reanimated: false });
    }
  });
});
