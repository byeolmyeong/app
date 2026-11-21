import { useState, type ReactNode } from 'react';
import { Animated, Easing, type ViewProps } from 'react-native';

import { Motion } from '@/constants/theme';
import { RevealShape } from '@/features/reason/reason-reveal-shape';

/**
 * 이유 상자 펼침의 움직임 — 웹. 앱 파일(reason-reveal.tsx, Reanimated)과 같은 이름 · 같은 모양을 RN Animated 로 한다.
 * 웹에는 화면 스레드가 따로 없어 Reanimated 가 얻는 것이 없고, 웹 번들에서 Reanimated(672KB) · worklets 를 뺀다(성능 계획).
 * 진행 값 하나(접힘 0 → 펼침 1)가 꺾쇠 회전 · 높이 · 보임을 같은 길이 · 같은 곡선으로 그린다 — 모양은 reason-reveal-shape.ts.
 */
export type Reveal = {
  /** 꺾쇠 회전 · 높이 · 보임을 함께 움직이는 진행 값(접힘 0 → 펼침 1) */
  progress: Animated.Value;
  /** 펼친 내용의 실제 높이 — 0 에서 이 높이까지 늘인다 */
  height: Animated.Value;
};

export function useReveal(): Reveal {
  const [reveal] = useState<Reveal>(() => ({ progress: new Animated.Value(0), height: new Animated.Value(0) }));
  return reveal;
}

/** 진행 값을 to 로 옮긴다. 끊기지 않고 끝까지 가면 done 을 부른다(새로 누르면 앞 움직임은 끊겨 부르지 않는다) */
export function runReveal(reveal: Reveal, to: 0 | 1, duration: number, done?: () => void) {
  Animated.timing(reveal.progress, { toValue: to, duration, easing: Easing.bezier(...Motion.openCurve), useNativeDriver: false }).start(
    ({ finished }) => {
      if (finished && done) done();
    },
  );
}

/** 펼친 내용의 높이를 잰 값으로 둔다 */
export function measureReveal(reveal: Reveal, height: number) {
  reveal.height.setValue(height);
}

/** 진행 값으로 도는 칸(꺾쇠) */
export function RevealTurn({ reveal, testID, children }: { reveal: Reveal; testID?: string; children: ReactNode }) {
  const [rotate] = useState(() => reveal.progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${RevealShape.turnDeg}deg`] }));
  return (
    <Animated.View testID={testID} style={{ transform: [{ rotate }] }}>
      {children}
    </Animated.View>
  );
}

/** 진행 값으로 높이가 늘고 내용이 나타나는 칸 */
export function RevealBody({ reveal, style, children, ...rest }: ViewProps & { reveal: Reveal }) {
  const [grow] = useState(() => ({
    height: Animated.multiply(reveal.progress, reveal.height),
    opacity: reveal.progress.interpolate({ inputRange: [0, RevealShape.fadeUntil], outputRange: [0, 1], extrapolate: 'clamp' }),
  }));
  return (
    <Animated.View {...rest} style={[style, grow]}>
      {children}
    </Animated.View>
  );
}
