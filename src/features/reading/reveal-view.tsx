/**
 * 별명 공개(결정 044, 시안 보드 10). 가입을 마치고 풀이 글이 다 지어지면 한 번 보이는 브랜드 자리:
 * 별이(140)와 뒤 빛 · 반짝임 넷, 아래 "○○ 님의 별명은" · 별명 한 줄(풀이의 headline) · 세 칸(나의 중심 · 나의 마음 · 나의 첫인상), 맨 아래 "풀이 읽기".
 * 움직임: 그림이 아래에서 떠오르고(0.9초, 150 아래 · 1.15배에서), 별이 둥실(3.2초) · 빛(3.2초) · 반짝임(2.4초)이 돌며,
 * 글 · 별명 · 칸 · 버튼이 차례로 떠오른다(0.6초, 0.7 · 1.0 · 1.4 · 1.7초 뒤). 기기의 "동작 줄이기" 가 켜져 있으면 멈춘 마지막 장면만 보인다.
 * 값은 화면(`app/reading.tsx`)이 서버가 준 것(풀이 · 차트)과 가입이 받은 닉네임으로 채운다 — 이 부품은 계산하지 않는다.
 * 작은 화면 · 큰 글자에서 별명이 길어도 이 화면의 유일한 출구인 "풀이 읽기" 는 아래에 붙어 있고 위쪽만 굴러간다.
 */
import { useEffect, useState } from 'react';
import { Animated, Easing, Image, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { reduceMotionNow, useReduceMotion } from '@/components/byeoli';
import { GlowBackdrop, GlowOrb } from '@/components/glow';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { BackdropShape, BrandColors, RevealLayout as L, ScreenPaddingX, Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';
import { usePulse } from '@/components/making-view';

const R = strings.reveal;
const useNativeDriver = Platform.OS !== 'web';
/** 기본 얼굴의 별이(별명 짓는 중과 같은 그림) */
const BYEOLI = require('@/assets/images/share/byeoli-default.png');

/** 시안의 움직임(ms · 거리) */
const RISE_MS = 900;
const RISE_FROM = 150;
const RISE_SCALE = 1.15;
const riseEasing = Easing.bezier(0.2, 0.8, 0.2, 1);
const UP_MS = 600;
const UP_FROM = 12;
/** 글 · 별명 · 세 칸 · 버튼이 떠오르기 시작하는 때 */
const UP_DELAYS = [700, 1000, 1400, 1700];
const FLOAT_MS = 3200;
const FLOAT_DISTANCE = 8;
const GLOW_DIM = 0.55;
const GLOW_SCALE = 1.08;
const TWINKLE_MS = 2400;
const TWINKLE_DELAYS = [0, 1100, 1800, 600];
const TWINKLE_DIM = 0.25;
const TWINKLE_BRIGHT = 0.9;

/**
 * 들어올 때 한 번의 움직임(0 → 1). 동작 줄이기를 알기 전에는 시작 모습(아래 · 투명)이고,
 * 켜져 있으면 움직이지 않고 마지막 장면(still)으로, 꺼져 있으면 움직인다.
 */
function useEntrance() {
  const [rise] = useState(() => new Animated.Value(0));
  const [ups] = useState(() => UP_DELAYS.map(() => new Animated.Value(0)));
  const [still, setStill] = useState(false);
  useEffect(() => {
    let alive = true;
    const running: Animated.CompositeAnimation[] = [];
    void reduceMotionNow().then((reduce) => {
      if (!alive) return;
      if (reduce) return setStill(true);
      running.push(Animated.timing(rise, { toValue: 1, duration: RISE_MS, easing: riseEasing, useNativeDriver }));
      ups.forEach((v, i) =>
        running.push(Animated.timing(v, { toValue: 1, duration: UP_MS, delay: UP_DELAYS[i], easing: Easing.out(Easing.ease), useNativeDriver })),
      );
      running.forEach((a) => a.start());
    });
    return () => {
      alive = false;
      running.forEach((a) => a.stop());
    };
  }, [rise, ups]);
  return { rise, ups, still };
}

export type RevealViewProps = {
  /** 가입이 받은 닉네임 */
  nickname: string;
  /** 별명 한 줄(풀이의 headline) */
  headline: string;
  /** 세 칸의 이름과 값("물병자리"). 시각 "모름" 이면 첫인상 없이 둘 */
  signs: { label: string; value: string }[];
  /** "풀이 읽기" */
  onRead: () => void;
};

export function RevealView({ nickname, headline, signs, onRead }: RevealViewProps) {
  const run = !useReduceMotion();
  const { rise, ups, still } = useEntrance();
  const float = usePulse(run, FLOAT_MS);
  const glow = usePulse(run, FLOAT_MS);
  const twinkles = [
    usePulse(run, TWINKLE_MS, TWINKLE_DELAYS[0]),
    usePulse(run, TWINKLE_MS, TWINKLE_DELAYS[1]),
    usePulse(run, TWINKLE_MS, TWINKLE_DELAYS[2]),
    usePulse(run, TWINKLE_MS, TWINKLE_DELAYS[3]),
  ];

  // 멈춘 마지막 장면: 제자리 · 다 보임, 뒤 빛 · 반짝임은 다 밝은 채(보드 10 의 동작 줄이기)
  const artMotion = still
    ? { transform: [{ translateY: 0 }, { scale: 1 }] }
    : {
        transform: [
          { translateY: rise.interpolate({ inputRange: [0, 1], outputRange: [RISE_FROM, 0] }) },
          { scale: rise.interpolate({ inputRange: [0, 1], outputRange: [RISE_SCALE, 1] }) },
        ],
      };
  const up = (i: number) =>
    still
      ? { opacity: 1 }
      : { opacity: ups[i], transform: [{ translateY: ups[i].interpolate({ inputRange: [0, 1], outputRange: [UP_FROM, 0] }) }] };
  const twinkle = (v: Animated.Value) => (run ? v.interpolate({ inputRange: [0, 1], outputRange: [TWINKLE_DIM, TWINKLE_BRIGHT] }) : 1);

  return (
    <Screen scroll={false} bottomInset={Sizes.stepBottom}>
      <View style={styles.body}>
        <GlowBackdrop color={BrandColors.backdropDim} extent={BackdropShape.reveal.extent} centerY={BackdropShape.reveal.centerY} />
        <ScrollView testID="reveal-scroll" style={styles.fill} showsVerticalScrollIndicator={false}>
          <View style={styles.header} />
          <Animated.View testID="reveal-art" aria-hidden importantForAccessibility="no-hide-descendants" style={[styles.art, artMotion]}>
            <Animated.View
              testID="reveal-glow"
              style={[
                styles.glow,
                {
                  opacity: run ? glow.interpolate({ inputRange: [0, 1], outputRange: [GLOW_DIM, 1] }) : 1,
                  transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [1, GLOW_SCALE] }) }],
                },
              ]}>
              <GlowOrb id="revealGlow" />
            </Animated.View>
            {L.twinkles.map(({ size, ...at }, i) => (
              <Animated.View
                key={i}
                testID={`reveal-twinkle-${i}`}
                style={[styles.twinkle, at, { width: size, height: size, borderRadius: size / 2, opacity: twinkle(twinkles[i]) }]}
              />
            ))}
            <Animated.View
              style={[styles.byeoli, { transform: [{ translateY: float.interpolate({ inputRange: [0, 1], outputRange: [0, -FLOAT_DISTANCE] }) }] }]}>
              <Image source={BYEOLI} accessible={false} style={styles.byeoliImage} />
            </Animated.View>
          </Animated.View>
          <View style={styles.text}>
            <Animated.View testID="reveal-up-0" style={up(0)}>
              <Txt variant="kicker" color="gray">{`${nickname} ${R.nicknameSuffix}`}</Txt>
            </Animated.View>
            <Animated.View testID="reveal-up-1" style={[styles.headline, up(1)]}>
              <Txt variant="title" accessibilityRole="header" keepAll style={styles.center}>
                {headline}
              </Txt>
            </Animated.View>
          </View>
          <Animated.View testID="reveal-up-2" style={up(2)}>
            <View testID="reveal-cells" style={styles.cells}>
              {signs.map((sign) => (
                <View key={sign.label} testID="reveal-cell" style={styles.cell}>
                  <Txt variant="label" color="hint">
                    {sign.label}
                  </Txt>
                  <Txt variant="subhead">{sign.value}</Txt>
                </View>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
        <Animated.View testID="reveal-up-3" style={up(3)}>
          <Button label={R.read} onPress={onRead} />
        </Animated.View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, paddingHorizontal: ScreenPaddingX },
  header: { height: Sizes.stepHeader },
  art: { alignSelf: 'center', width: L.art.width, height: L.art.height, marginTop: L.art.top },
  glow: { position: 'absolute', left: L.glow.left, top: L.glow.top, width: L.glow.size, height: L.glow.size },
  twinkle: { position: 'absolute', backgroundColor: BrandColors.core },
  byeoli: { position: 'absolute', left: L.byeoli.left, top: L.byeoli.top },
  byeoliImage: { width: L.byeoli.size, height: L.byeoli.size },
  text: { alignItems: 'center', marginTop: L.textTop },
  headline: { marginTop: L.headlineTop, paddingHorizontal: L.headlineInset },
  center: { textAlign: 'center' },
  cells: { flexDirection: 'row', justifyContent: 'center', gap: L.cellGap, marginTop: L.cellsTop },
  cell: { width: L.cell, alignItems: 'center', gap: L.cellInnerGap },
  fill: { flex: 1 },
});
