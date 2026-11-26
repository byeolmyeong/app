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
  /**
   * 흐름 안 상자(처음부터 펼친 상자, 결정 083 · 088)를 묶지 않았다 — 높이 상한이 아주 커 내용이 제 높이를 낸다.
   * 처음과 다 펼친 뒤에 묶지 않고, 접고 펴는 동안만 진행 값 × 잰 높이로 묶는다
   */
  free: SharedValue<boolean>;
};

/** open: 처음부터 펼친 채로(진행 1 · 높이를 묶지 않음) */
export function useReveal(open = false): Reveal {
  return { progress: useSharedValue(open ? 1 : 0), height: useSharedValue(0), free: useSharedValue(open) };
}

/** 진행 값을 to 로 옮긴다. 끊기지 않고 끝까지 가면 done 을 JS 쪽에서 부른다(화면 스레드의 알림이라 늦게 온다) */
export function runReveal(reveal: Reveal, to: 0 | 1, duration: number, done?: () => void) {
  // 움직임보다 먼저 높이를 묶는다 — 진행 1 × 잰 높이가 지금 높이라 튀지 않는다
  reveal.free.set(false);
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

/** 다 펼친 흐름 안 상자의 묶음을 푼다 — 내용이 제 높이를 내고 바탕이 그만큼 덮는다(잰 값이 틀려도, 결정 088) */
export function releaseReveal(reveal: Reveal) {
  reveal.free.set(true);
}

/** 묶지 않은 채인가 — 흐름 안 상자는 이때만 잰다(접고 펴는 동안 눌린 높이를 잰 값으로 삼지 않게, 결정 088) */
export function isRevealFree(reveal: Reveal): boolean {
  return reveal.free.get();
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

/**
 * 진행 값으로 높이가 늘고 내용이 나타나는 칸. 내용을 절대 위치로 재는 상자는 높이(height)를 묶는다.
 * flow(내용이 흐름 안 — 처음부터 펼친 상자, 결정 083 · 088)면 높이 상한(maxHeight)만 묶고, 묶지 않을 때는 아주 큰 상한으로 둔다 —
 * 스타일의 키가 늘 같아 Reanimated 가 빠진 키를 남겨 두는 일이 없다
 */
export function RevealBody({ reveal, flow = false, style, children, ...rest }: ViewProps & { reveal: Reveal; flow?: boolean }) {
  const grow = useAnimatedStyle(() => {
    const opacity = interpolate(reveal.progress.value, [0, RevealShape.fadeUntil], [0, 1], 'clamp');
    const bound = reveal.progress.value * reveal.height.value;
    if (!flow) return { height: bound, opacity };
    return { maxHeight: reveal.free.value ? RevealShape.freeMaxHeight : bound, opacity };
  });
  return (
    <Animated.View {...rest} style={[style, grow]}>
      {children}
    </Animated.View>
  );
}
