import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/components/byeoli';
import { Colors, LineWidth, SkeletonLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';

const useNativeDriver = Platform.OS !== 'web';

export type SkeletonProps = {
  width: DimensionValue;
  height: number;
  /** 동그라미 · 칩처럼 모서리가 높이의 반 */
  pill?: boolean;
  /** 사이를 더 띄울 때(margin) */
  style?: StyleProp<ViewStyle>;
};

/**
 * 뼈대 막대 하나(보드 24 · 24-1): 회색 바탕 위로 옅은 빛이 1.4초에 한 번 오간다(동작 줄이기면 멈춘다).
 * 모서리는 8(높이가 낮으면 높이의 반). 화면 읽기에는 숨긴다 — 카드가 "불러오는 중이에요" 를 한 번 읽는다.
 * 언제 그릴지는 useLoadingPhase 가 정한다(0.3초가 넘었을 때만).
 */
export function Skeleton({ width, height, pill = false, style }: SkeletonProps) {
  const reduce = useReduceMotion();
  const [shine] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (reduce) return;
    const half = L.shimmerMs / 2;
    const ease = Easing.inOut(Easing.ease);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shine, { toValue: 1, duration: half, easing: ease, useNativeDriver }),
        Animated.timing(shine, { toValue: 0, duration: half, easing: ease, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => {
      loop.stop();
      shine.setValue(0);
    };
  }, [reduce, shine]);
  const borderRadius = pill ? height / 2 : Math.min(L.radius, height / 2);
  return (
    <View
      testID="skeleton"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.bar, { width, height, borderRadius }, style]}>
      <Animated.View style={[styles.shine, { opacity: shine }]} />
    </View>
  );
}

/** 뼈대 카드(보드 24 · 24-1): 홈 · 나의 카드와 같은 떠 있는 면 · 테두리. 큰 카드(별명 카드)는 모서리 24 */
export function SkeletonCard({ big = false, children }: { big?: boolean; children: ReactNode }) {
  return (
    <View accessible accessibilityLabel={strings.states.loading} style={[styles.card, big && styles.big]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { overflow: 'hidden', backgroundColor: Colors.skeleton },
  shine: { ...StyleSheet.absoluteFill, backgroundColor: Colors.skeletonShine },
  card: {
    padding: L.cardPadding,
    gap: L.gap,
    borderRadius: L.cardRadius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  big: { borderRadius: L.bigCardRadius },
});
