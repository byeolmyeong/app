import type { ReactNode } from 'react';
import type { ViewProps } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Motion } from '@/constants/theme';
import { RevealShape } from '@/features/reason/reason-reveal-shape';

/**
 * 이유 상자 펼침의 움직임 — 앱(iOS · Android). 진행 값은 Reanimated 로 화면 스레드에서 돈다.
 * 웹은 reason-reveal.web.tsx(RN Animated)가 같은 이름 · 같은 모양으로 대신한다 — 웹 번들에 Reanimated(672KB)를 싣지 않으려고.
 */
export type Reveal = {
  /** 꺾쇠 회전 · 높이 · 보임을 함께 움직이는 진행 값(접힘 0 → 펼침 1) */
  progress: SharedValue<number>;
  /** 펼친 내용의 실제 높이 — 0 에서 이 높이까지 늘인다 */
  height: SharedValue<number>;
};

export function useReveal(): Reveal {
  return { progress: useSharedValue(0), height: useSharedValue(0) };
}

/** 진행 값을 to 로 옮긴다. 끊기지 않고 끝까지 가면 done 을 JS 쪽에서 부른다(화면 스레드의 알림이라 늦게 온다) */
export function runReveal(reveal: Reveal, to: 0 | 1, duration: number, done?: () => void) {
  reveal.progress.set(
    withTiming(to, { duration, easing: Easing.bezier(...Motion.openCurve) }, (finished) => {
      if (finished && done) scheduleOnRN(done);
    }),
  );
}

/** 펼친 내용의 높이를 잰 값으로 둔다 */
export function measureReveal(reveal: Reveal, height: number) {
  reveal.height.set(height);
}

/** 진행 값으로 도는 칸(꺾쇠) */
export function RevealTurn({ reveal, testID, children }: { reveal: Reveal; testID?: string; children: ReactNode }) {
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${reveal.progress.value * RevealShape.turnDeg}deg` }] }));
  return (
    <Animated.View testID={testID} style={turn}>
      {children}
    </Animated.View>
  );
}

/** 진행 값으로 높이가 늘고 내용이 나타나는 칸 */
export function RevealBody({ reveal, style, children, ...rest }: ViewProps & { reveal: Reveal }) {
  const grow = useAnimatedStyle(() => ({
    height: reveal.progress.value * reveal.height.value,
    opacity: interpolate(reveal.progress.value, [0, RevealShape.fadeUntil], [0, 1], 'clamp'),
  }));
  return (
    <Animated.View {...rest} style={[style, grow]}>
      {children}
    </Animated.View>
  );
}
