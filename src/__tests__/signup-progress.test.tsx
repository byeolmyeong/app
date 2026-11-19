import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, StyleSheet, Text } from 'react-native';

import { SignupStep } from '@/features/auth/signup-step';

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void) => jest.requireActual('react').useEffect(effect, [effect]),
}));

// 막대는 마지막으로 보인 단계를 기억한다 — 시험마다 먼저 한 단계를 그렸다 치워 시작점을 정한다
beforeEach(() => {
  jest.restoreAllMocks();
});

const step = (n: 1 | 2 | 3) => (
  <SignupStep step={n} onBack={() => {}} title="제목" footer={<Text>버튼</Text>}>
    <Text>내용</Text>
  </SignupStep>
);

/** 다 찬 칸 수(채움 폭이 100% 인 칸) */
const filled = () =>
  [0, 1, 2].filter((i) => StyleSheet.flatten(screen.getByTestId(`progress-fill-${i}`, { includeHiddenElements: true }).props.style).width === '100%').length;

// 진행 막대(소유자 2026-11-19): 다음 단계로 가면 다음 칸이 왼쪽에서 오른쪽으로 차오르고(약 300ms), 뒤로 가면 줄어든다
describe('가입 진행 막대', () => {
  it('단계마다 켜진 칸 수: 약관 1 · 닉네임 2 · 출생 정보 3', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    for (const n of [1, 2, 3] as const) {
      const view = await render(step(n));
      await act(async () => {});
      expect(filled()).toBe(n);
      await view.unmount();
    }
  });

  it('다음 단계로 가면 다음 칸만 300ms 동안 차오른다', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const first = await render(step(1));
    await act(async () => {});
    await first.unmount();
    const timing = jest.spyOn(Animated, 'timing');
    await render(step(2));
    await act(async () => {});
    const growing = timing.mock.calls.filter(([, config]) => config.toValue === 1 && config.duration === 300);
    expect(growing).toHaveLength(1);
    expect(filled()).toBe(2);
  });

  it('뒤로 가면 그 칸이 줄어든다', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const second = await render(step(2));
    await act(async () => {});
    await second.unmount();
    const timing = jest.spyOn(Animated, 'timing');
    await render(step(1));
    await act(async () => {});
    const shrinking = timing.mock.calls.filter(([, config]) => config.toValue === 0 && config.duration === 300);
    expect(shrinking).toHaveLength(1);
    expect(filled()).toBe(1);
  });

  it('동작 줄이기가 켜져 있으면 움직임 없이 바로 바뀐다', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    const first = await render(step(1));
    await act(async () => {});
    await first.unmount();
    const timing = jest.spyOn(Animated, 'timing');
    await render(step(2));
    await act(async () => {});
    expect(timing).not.toHaveBeenCalled();
    expect(filled()).toBe(2);
  });
});
