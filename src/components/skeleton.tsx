import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';

import { useReduceMotion } from '@/components/byeoli';
import { Colors, SkeletonLayout as L, Typography, type TypographyName } from '@/constants/theme';
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

/** 안의 막대가 멈춰 있어야 하는가(SkeletonStill) */
const StillContext = createContext(false);

/**
 * 안의 뼈대 막대를 멈춘다(빛이 오가지 않는 회색) — 불러오는 중이 아닌 자리에 뼈대 모양만 빌릴 때(시기 탭 잠긴 칩의 흐린 미리보기, 리뷰 #63).
 * 반짝이면 "불러오는 중" 으로 읽힌다.
 */
export function SkeletonStill({ children }: { children: ReactNode }) {
  return <StillContext.Provider value>{children}</StillContext.Provider>;
}

/**
 * 뼈대 막대 하나(보드 24 · 24-1): 회색 바탕 위로 옅은 빛이 1.4초에 한 번 오간다(동작 줄이기면 멈춘다).
 * 모서리는 8(높이가 낮으면 높이의 반). 화면 읽기에는 숨긴다 — 화면의 뼈대를 묶은 SkeletonGroup 이 "불러오는 중이에요" 를 한 번 읽는다.
 * 언제 그릴지는 useLoadingPhase 가 정한다(0.3초가 넘었을 때만).
 */
export function Skeleton({ width, height, pill = false, style }: SkeletonProps) {
  const reduce = useReduceMotion();
  const still = useContext(StillContext) || reduce;
  const [shine] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (still) return;
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
  }, [still, shine]);
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

export type SkeletonTextProps = {
  /** 그 자리에 올 글의 글자 단계(theme.ts Typography) — 줄 높이가 칸, 글자 크기가 막대의 높이 */
  variant: TypographyName;
  /** 줄마다의 막대 폭. 길이가 줄 수다(비면 아무것도 그리지 않는다) */
  widths: readonly DimensionValue[];
  /** 가운데 맞춘 글의 자리 */
  center?: boolean;
  style?: StyleProp<ViewStyle>;
};

/**
 * 글 줄 자리(결정 071 — 뼈대는 다 그려진 화면과 같은 자리 · 높이 · 줄 수): 그 글자 단계의 줄 높이 칸마다 글자 크기 높이의 막대 하나.
 * 다 그려진 글과 같은 높이를 차지하므로 그 글의 여백(style)을 그대로 주면 아래 칸이 같은 자리에 온다.
 * 감싼 칸이 가운데 맞춤이어도 폭을 다 써서 퍼센트 폭이 0 이 되지 않는다.
 */
export function SkeletonText({ variant, widths, center = false, style }: SkeletonTextProps) {
  if (widths.length === 0) return null;
  const { fontSize, lineHeight } = Typography[variant];
  return (
    <View style={[styles.text, style]}>
      {widths.map((width, i) => (
        <View key={i} testID="skeleton-line" style={[styles.line, center && styles.center, { height: lineHeight }]}>
          <Skeleton width={width} height={fontSize} />
        </View>
      ))}
    </View>
  );
}

/** 화면 하나의 뼈대를 묶는다(결정 071): 화면 읽기에는 "불러오는 중이에요" 를 한 번 읽고 막대는 숨긴다 */
export function SkeletonGroup({ testID, children }: { testID: string; children: ReactNode }) {
  return (
    <View testID={testID} accessible accessibilityLabel={strings.states.loading}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { overflow: 'hidden', backgroundColor: Colors.skeleton },
  shine: { ...StyleSheet.absoluteFill, backgroundColor: Colors.skeletonShine },
  text: { alignSelf: 'stretch' },
  line: { justifyContent: 'center' },
  center: { alignItems: 'center' },
});
