import { act, render, screen } from '@testing-library/react-native';
import { AccessibilityInfo, Animated, Keyboard, StyleSheet, Text } from 'react-native';

import { SignupStep } from '@/features/auth/signup-step';

jest.mock('expo-router', () => ({
  // 가입 단계는 웹에서 오른쪽에서 밀려 들어온다 — 이 시험들은 앱(움직이지 않음)
  useCanGoBack: () => false,
  useIsFocused: () => true,
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

/** 칸의 채움(scaleX, 0~1) */
const scaleOf = (i: number): unknown => {
  const style = StyleSheet.flatten(screen.getByTestId(`progress-fill-${i}`, { includeHiddenElements: true }).props.style);
  return (style.transform as Record<string, unknown>[] | undefined)?.find((t) => 'scaleX' in t)?.scaleX;
};
/** 다 찬 칸 수(채움이 1 인 칸) */
const filled = () => [0, 1, 2].filter((i) => scaleOf(i) === 1).length;

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

// 소유자(빌드 7): 닉네임 · 출생 정보 단계에서 칸을 눌러 키보드가 올라오면 채워진 칸이 사라졌다. 막대는 단계 값에서 바로 —
// 움직임이 끝나면 단계 값 그대로의 숫자로 그리고(움직임 값이 기기 쪽에서 0 으로 돌아가도 상관없다), 폭이 아니라 scaleX 라 크기가 바뀌어도 그대로다
describe('가입 진행 막대: 단계 값대로 남는다', () => {
  /** 키보드 알림을 흉내 낸다(iOS) */
  function keyboard() {
    const handlers: Record<string, () => void> = {};
    jest.spyOn(Keyboard, 'addListener').mockImplementation((type, handler) => {
      handlers[type] = handler as () => void;
      return { remove: () => {} } as unknown as ReturnType<typeof Keyboard.addListener>;
    });
    return { show: () => act(async () => handlers.keyboardWillShow?.()), hide: () => act(async () => handlers.keyboardWillHide?.()) };
  }

  // [앞 단계, 이번 단계]: 같은 단계(처음 들어옴과 같다) · 다음으로 · 뒤로
  it.each([
    [1, 1],
    [1, 2],
    [2, 3],
    [3, 2],
    [2, 1],
  ] as const)('%s → %s 단계: 들어올 때 · 키보드가 올라올 때 · 시트가 열릴 때 · 키보드가 내려갈 때 단계 값대로 채워져 있다', async (from, to) => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const kb = keyboard();
    const before = await render(step(from));
    await act(async () => {});
    await before.unmount();
    const timing = jest.spyOn(Animated, 'timing');
    const view = await render(step(to));
    await act(async () => {});
    expect(filled()).toBe(to);

    // 움직임이 끝난 뒤 움직임 값이 0 으로 돌아가도(기기에서 다시 그리거나 레이아웃이 바뀔 때) 막대는 단계 값을 따른다
    for (const [value] of timing.mock.calls) (value as Animated.Value).setValue(0);
    await kb.show();
    expect(filled()).toBe(to);
    // 시트가 열리는 것처럼 화면이 안의 내용을 바꿔 다시 그린다
    await view.rerender(
      <SignupStep step={to} onBack={() => {}} title="제목" footer={<Text>버튼</Text>}>
        <Text>시트 열림</Text>
      </SignupStep>,
    );
    expect(filled()).toBe(to);
    await kb.hide();
    expect(filled()).toBe(to);
  });

  it('칸은 폭이 아니라 scaleX(왼쪽 기준)로 채운다 — 키보드 · 시트로 폭이 바뀌어도 비율 그대로', async () => {
    await render(step(2));
    await act(async () => {});
    const style = StyleSheet.flatten(screen.getByTestId('progress-fill-0', { includeHiddenElements: true }).props.style);
    expect(style.width).toBe('100%');
    expect(style.transformOrigin).toBe('left');
  });

  it('차오르는 움직임은 네이티브 드라이버로', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    const first = await render(step(1));
    await act(async () => {});
    await first.unmount();
    const timing = jest.spyOn(Animated, 'timing');
    await render(step(2));
    await act(async () => {});
    expect(timing).toHaveBeenCalledTimes(1);
    expect(timing.mock.calls[0][1].useNativeDriver).toBe(true);
  });
});
