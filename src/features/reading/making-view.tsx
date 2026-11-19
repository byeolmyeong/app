/**
 * 별명 짓는 중(결정 041, 시안 보드 9). 풀이 글을 짓는 동안 보이는 브랜드 자리: 별이가 둥실 떠 있고(위아래 8 · 3.2초),
 * 뒤의 빛이 숨 쉬듯 밝아지며(투명도 0.55↔1 · 크기 1↔1.08), 궤도 둘이 반대 방향으로 돌고(9초 · 15초), 작은 별이 반짝인다.
 * 아래 안내 문구 셋이 2.5초마다 바뀐다. 기기의 "동작 줄이기" 가 켜져 있으면 멈춘 첫 장면과 첫 문구만 보인다.
 * "길면 1분쯤 걸려요" 는 넣지 않는다(소유자). 화면 읽기는 제목만 읽는다(바뀌는 문구는 숨긴다). 움직임은 react-native 의 Animated 다 — 별이(`Byeoli`)와 같고 jest · 웹에서 그대로 돈다.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { useReduceMotion } from '@/components/byeoli';
import { GlowBackdrop } from '@/components/glow';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, LineWidth, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const M = strings.making;
const useNativeDriver = Platform.OS !== 'web';
/** 기본 얼굴의 별이(스플래시 · 공유 카드와 같은 그림) */
const BYEOLI = require('@/assets/images/share/byeoli-default.png');

/** 시안의 움직임(ms) */
const FLOAT_MS = 3200;
const ORBIT_MS = 9000;
const INNER_ORBIT_MS = 15000;
const TWINKLE_MS = 2400;
const LINE_MS = 2500;
const LINE_FADE_MS = 450;
const FLOAT_DISTANCE = 8;
const GLOW_SCALE = 1.08;
const GLOW_DIM = 0.55;
const TWINKLE_DIM = 0.25;
const TWINKLE_BRIGHT = 0.9;
const LINE_RISE = 6;

const ease = Easing.inOut(Easing.ease);

/** 0 → 1 → 0 을 끝없이(반 주기씩 ms/2). 움직이지 않을 때는 0 */
function usePulse(run: boolean, ms: number, delay = 0) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!run) return;
    const half = ms / 2;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, { toValue: 1, duration: half, easing: ease, useNativeDriver }),
        Animated.timing(value, { toValue: 0, duration: half, easing: ease, useNativeDriver }),
      ]),
    );
    const timer = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(timer);
      loop.stop();
      value.setValue(0);
    };
  }, [run, ms, delay, value]);
  return value;
}

/** 한 바퀴씩 끝없이 도는 값(0 → 1) */
function useTurn(run: boolean, ms: number) {
  const [value] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (!run) return;
    const loop = Animated.loop(Animated.timing(value, { toValue: 1, duration: ms, easing: Easing.linear, useNativeDriver }));
    loop.start();
    return () => {
      loop.stop();
      value.setValue(0);
    };
  }, [run, ms, value]);
  return value;
}

/** 안내 문구의 차례. 동작 줄이기면 첫 문구에 머문다 */
function useLine(run: boolean) {
  const [index, setIndex] = useState(0);
  const [shown] = useState(() => new Animated.Value(1));
  useEffect(() => {
    if (!run) return;
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % M.lines.length);
      shown.setValue(0);
      Animated.timing(shown, { toValue: 1, duration: LINE_FADE_MS, easing: ease, useNativeDriver }).start();
    }, LINE_MS);
    return () => {
      clearInterval(timer);
      shown.setValue(1);
    };
  }, [run, shown]);
  // 동작 줄이기가 켜지면 첫 문구로 돌아가 머문다
  return { index: run ? index : 0, shown };
}

export type MakingViewProps = {
  /** 화면 머리(뒤로 가기). 가입 직후에는 없다(보드 9), 홈에서 들어왔을 때는 있다 */
  nav?: ReactNode;
};

export function MakingView({ nav }: MakingViewProps) {
  const reduce = useReduceMotion();
  const run = !reduce;
  const float = usePulse(run, FLOAT_MS);
  const glow = usePulse(run, FLOAT_MS);
  const orbit = useTurn(run, ORBIT_MS);
  const inner = useTurn(run, INNER_ORBIT_MS);
  const twinkles = [usePulse(run, TWINKLE_MS, 0), usePulse(run, TWINKLE_MS, 1100), usePulse(run, TWINKLE_MS, 1800)];
  const line = useLine(run);

  const spin = (v: Animated.Value, reverse = false) =>
    v.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });
  // 동작 줄이기면 멈춘 장면: 뒤 빛 · 반짝임은 다 밝은 채(보드 9)
  const twinkle = (v: Animated.Value) => (run ? v.interpolate({ inputRange: [0, 1], outputRange: [TWINKLE_DIM, TWINKLE_BRIGHT] }) : 1);

  return (
    <Screen scroll={false} nav={nav}>
      <View style={styles.body}>
        <GlowBackdrop color={BrandColors.backdropDim} extent={0.56} centerY={0.42} />
        <View testID="making-art" aria-hidden importantForAccessibility="no-hide-descendants" style={styles.art}>
          <Animated.View
            testID="making-glow"
            style={[
              styles.glow,
              {
                opacity: run ? glow.interpolate({ inputRange: [0, 1], outputRange: [GLOW_DIM, 1] }) : 1,
                transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, GLOW_SCALE] }) }],
              },
            ]}>
            <Svg width="100%" height="100%" viewBox="0 0 100 100">
              <Defs>
                <RadialGradient id="makingGlow">
                  <Stop offset="0" stopColor={BrandColors.glowMid} stopOpacity={0.55} />
                  <Stop offset="0.7" stopColor={BrandColors.glowMid} stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Circle cx={50} cy={50} r={50} fill="url(#makingGlow)" />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.orbit, { transform: [{ rotate: spin(orbit) }] }]}>
            <View style={styles.orbitDot} />
          </Animated.View>
          <Animated.View style={[styles.innerOrbit, { transform: [{ rotate: spin(inner, true) }] }]}>
            <View style={styles.innerDot} />
          </Animated.View>
          <Animated.View testID="making-twinkle-0" style={[styles.twinkle, styles.twinkleA, { opacity: twinkle(twinkles[0]) }]} />
          <Animated.View
            testID="making-twinkle-1"
            style={[styles.twinkle, styles.twinkleSmall, styles.twinkleB, { opacity: twinkle(twinkles[1]) }]}
          />
          <Animated.View
            testID="making-twinkle-2"
            style={[styles.twinkle, styles.twinkleSmall, styles.twinkleC, { opacity: twinkle(twinkles[2]) }]}
          />
          <Animated.View
            style={[
              styles.byeoli,
              { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -FLOAT_DISTANCE] }) }] },
            ]}>
            <Image source={BYEOLI} accessible={false} style={styles.byeoliImage} />
          </Animated.View>
        </View>
        <Txt variant="headline" accessibilityRole="header" style={styles.title}>
          {M.title}
        </Txt>
        {/* 바뀌는 안내 문구는 화면 읽기에서 숨긴다 — 제목만 읽힌다(2.5초마다 알리면 시끄럽다) */}
        <View testID="making-lines" style={styles.lines} aria-hidden importantForAccessibility="no-hide-descendants">
          <Animated.View
            style={{
              opacity: line.shown,
              transform: [{ translateY: line.shown.interpolate({ inputRange: [0, 1], outputRange: [LINE_RISE, 0] }) }],
            }}>
            <Txt color="gray" style={styles.center}>
              {M.lines[line.index]}
            </Txt>
          </Animated.View>
        </View>
      </View>
    </Screen>
  );
}

const ART = Sizes.makingArt;
const INNER = ART - Sizes.makingInnerOrbit * 2;

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.xl },
  art: { width: ART, height: ART },
  glow: { position: 'absolute', top: Sizes.makingGlowInset, left: Sizes.makingGlowInset, right: Sizes.makingGlowInset, bottom: Sizes.makingGlowInset },
  orbit: {
    ...StyleSheet.absoluteFill,
    borderRadius: ART / 2,
    borderWidth: LineWidth,
    borderStyle: 'dashed',
    borderColor: Colors.hair,
  },
  orbitDot: {
    position: 'absolute',
    left: ART / 2 - Sizes.makingOrbitDot / 2,
    top: -Sizes.makingOrbitDot / 2,
    width: Sizes.makingOrbitDot,
    height: Sizes.makingOrbitDot,
    borderRadius: Sizes.makingOrbitDot / 2,
    backgroundColor: BrandColors.glowSoft,
    boxShadow: `0 0 12px ${BrandColors.glowMid}`,
  },
  innerOrbit: {
    position: 'absolute',
    top: Sizes.makingInnerOrbit,
    left: Sizes.makingInnerOrbit,
    width: INNER,
    height: INNER,
    borderRadius: INNER / 2,
    borderWidth: LineWidth,
    borderColor: Colors.primarySoft,
  },
  innerDot: {
    position: 'absolute',
    left: -Sizes.makingInnerDot / 2 - LineWidth,
    top: INNER / 2 - Sizes.makingInnerDot / 2,
    width: Sizes.makingInnerDot,
    height: Sizes.makingInnerDot,
    borderRadius: Sizes.makingInnerDot / 2,
    backgroundColor: BrandColors.rimViolet,
  },
  twinkle: {
    position: 'absolute',
    width: Sizes.makingTwinkle,
    height: Sizes.makingTwinkle,
    borderRadius: Sizes.makingTwinkle / 2,
    backgroundColor: BrandColors.core,
  },
  twinkleSmall: { width: Sizes.makingTwinkleSmall, height: Sizes.makingTwinkleSmall },
  // 시안의 반짝임 자리(그림 칸 기준)
  twinkleA: { left: 14, top: 40 },
  twinkleB: { right: 8, top: 170 },
  twinkleC: { left: 60, bottom: 6 },
  byeoli: { position: 'absolute', left: (ART - Sizes.byeoli) / 2, top: (ART - Sizes.byeoli) / 2 },
  byeoliImage: { width: Sizes.byeoli, height: Sizes.byeoli },
  title: { marginTop: Spacing.xl, textAlign: 'center' },
  lines: { alignSelf: 'stretch', height: Sizes.makingLine, marginTop: Spacing.xs + Spacing.hairline, overflow: 'hidden' },
  center: { textAlign: 'center' },
});
