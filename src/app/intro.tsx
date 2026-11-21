/**
 * 소개 2장(결정 042 · 055 의 5, 시안 온보딩 보드 1 · 3 — 나 → 시기). 앱을 처음 받아 처음 켰을 때 한 번만 보인다 — 화면이 뜨는 순간 본 것으로 적는다
 * (건너뛰기 · 시작하기를 기다리지 않는다. 도중에 앱을 꺼도 다음엔 로그인부터). 가로로 넘기고, 건너뛰기 · 시작하기는 로그인으로.
 * 이 화면에 올지는 루트 가드가 정한다(로그인 전 · 이 기기에서 아직 안 봄).
 */
import { router } from 'expo-router';
import { memo, useEffect, useMemo, useRef, useState, type ComponentRef } from 'react';
import { Animated, Platform, Pressable, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { Button } from '@/components/button';
import { useReduceMotion } from '@/components/byeoli';
import { GlowBackdrop } from '@/components/glow';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { BackdropShape, BrandColors, Colors, ScreenPaddingX, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { IntroArt } from '@/features/onboarding/intro-art';
import { markIntroSeen } from '@/features/onboarding/intro-seen';

const S = strings.intro;
const COUNT = S.slides.length;
const GLOW = BackdropShape.intro;
/** 앱은 스크롤 위치 → 막대를 네이티브(UI 스레드)에서 잇는다. 웹은 네이티브 드라이버가 없다 */
const useNativeDriver = Platform.OS !== 'web';
/** 점 · 늘어난 점(막대) · 사이 */
const DOT = Sizes.introDot;
const BAR = Sizes.introDotActive;
const GAP = Sizes.introDot;

/**
 * 막대(점)는 장 넘김의 스크롤 위치 하나만 따라간다(소유자: "다음" 으로 넘길 때 버벅임). 손으로 밀든 "다음" 을 누르든 같은 한 줄기 —
 * 버튼은 scrollTo 만 부르고 막대에 따로 움직임을 걸지 않는다. 장 번호(state)는 스크롤이 어느 장에 딱 닿았을 때만 바꾼다
 * (누르는 순간 바꾸면 스크롤이 시작점 · 가운데를 지나며 앞 장으로 되돌아가 화면이 두 번 더 다시 그려졌다).
 */
export default function IntroScreen() {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const pager = useRef<ComponentRef<typeof Animated.ScrollView>>(null);
  const [scrollX] = useState(() => new Animated.Value(0));
  const reduce = useReduceMotion();

  useEffect(() => {
    void markIntroSeen();
  }, []);

  const last = index === COUNT - 1;
  const toLogin = () => router.replace('/login');
  // 동작 줄이기면 움직임 없이 바로(막대도 스크롤 위치를 따라 함께)
  const next = () => pager.current?.scrollTo({ x: (index + 1) * width, animated: !reduce });

  const onScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
        useNativeDriver,
        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
          if (width <= 0) return;
          const at = e.nativeEvent.contentOffset.x / width;
          const page = Math.round(at);
          if (Math.abs(at - page) < 0.01) setIndex(Math.min(COUNT - 1, Math.max(0, page)));
        },
      }),
    [scrollX, width],
  );
  // 장들은 ScrollView 의 바로 아래 자식이어야 한다(웹의 pagingEnabled 가 자식마다 넘김 칸을 씌운다). 장 번호가 바뀌어도 같은 요소라 다시 그리지 않는다
  const pages = useMemo(() => S.slides.map((slide, i) => <Page key={slide.title} index={i} width={width} />), [width]);
  /** 장 위치(0 ~ COUNT - 1) — 막대가 따라간다 */
  const progress = useMemo(() => Animated.divide(scrollX, width > 0 ? width : 1), [scrollX, width]);

  return (
    <Screen scroll={false} bottomInset={Sizes.stepBottom}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={Spacing.xs} onPress={toLogin} style={styles.skip}>
          <Txt variant="table" color="gray">
            {S.skip}
          </Txt>
        </Pressable>
      </View>
      <Animated.ScrollView
        ref={pager}
        testID="intro-pager"
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={styles.pager}
        contentContainerStyle={styles.pages}>
        {pages}
      </Animated.ScrollView>
      <View style={styles.bottom}>
        <View accessible accessibilityLabel={`${index + 1}${strings.steps.separator}${COUNT}`} style={styles.dots}>
          {S.slides.map((slide, i) => (
            <Dot key={slide.title} index={i} progress={progress} />
          ))}
        </View>
        <Button label={last ? S.start : S.next} onPress={last ? toLogin : next} />
      </View>
    </Screen>
  );
}

/** 장 하나. 장 번호가 바뀌어도 다시 그리지 않는다(폭이 바뀔 때만) */
const Page = memo(function Page({ index: i, width }: { index: number; width: number }) {
  const slide = S.slides[i];
  return (
    <View style={[styles.page, width > 0 && { width }]}>
      <View style={styles.art}>
        <GlowBackdrop color={BrandColors.backdrop} extent={GLOW.extent} centerY={GLOW.centerY[i]} />
        <IntroArt index={i} />
      </View>
      <View style={styles.text}>
        <Txt variant="hero">{slide.title}</Txt>
        <Txt variant="lead" color="gray">
          {slide.body}
        </Txt>
      </View>
    </View>
  );
});

/**
 * 점 하나: 그 장에 가까울수록 막대로 늘고(폭 6 → 20) 주색이 된다. 폭은 네이티브 드라이버가 못 움직여 transform 으로만 —
 * 왼쪽 동그라미 · 가운데 칸(scaleX) · 오른쪽 동그라미(translateX)로 둥근 끝을 지키고, 뒤 점들은 늘어난 만큼 밀린다(translateX).
 * 주색은 같은 모양을 위에 겹쳐 opacity 로.
 */
function Dot({ index: i, progress }: { index: number; progress: ReturnType<typeof Animated.divide> }) {
  const near = progress.interpolate({ inputRange: [i - 1, i, i + 1], outputRange: [0, 1, 0], extrapolate: 'clamp' });
  // 앞 점이 막대면 그만큼 뒤로 밀린다
  const x = progress.interpolate({ inputRange: [i - 1, i], outputRange: [i * (DOT + GAP) + (BAR - DOT), i * (DOT + GAP)], extrapolate: 'clamp' });
  return (
    <Animated.View testID={`intro-dot-${i}`} style={[styles.dotSlot, { transform: [{ translateX: x }] }]}>
      <Pill color={Colors.muted} near={near} />
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: near }]}>
        <Pill color={Colors.primary} near={near} />
      </Animated.View>
    </Animated.View>
  );
}

function Pill({ color, near }: { color: string; near: Animated.AnimatedInterpolation<number> }) {
  const reach = near.interpolate({ inputRange: [0, 1], outputRange: [0, BAR - DOT] });
  return (
    <>
      <View style={[styles.cap, { backgroundColor: color }]} />
      <Animated.View style={[styles.middle, { backgroundColor: color, transform: [{ scaleX: near }] }]} />
      <Animated.View style={[styles.cap, { backgroundColor: color, transform: [{ translateX: reach }] }]} />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    height: Sizes.stepHeader,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: ScreenPaddingX,
  },
  skip: { paddingVertical: Spacing.sm, paddingLeft: Spacing.sm, paddingRight: Spacing.xxs },
  pager: { flex: 1 },
  pages: { flexGrow: 1 },
  page: { flex: 1, paddingHorizontal: ScreenPaddingX },
  art: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { gap: Spacing.sm },
  bottom: { paddingHorizontal: ScreenPaddingX },
  /** 점 칸 전체: 점 COUNT 개 + 사이 + 막대로 늘어난 만큼 */
  dots: {
    width: COUNT * DOT + (COUNT - 1) * GAP + (BAR - DOT),
    height: DOT,
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  dotSlot: { position: 'absolute', left: 0, top: 0, width: BAR, height: DOT },
  cap: { position: 'absolute', left: 0, top: 0, width: DOT, height: DOT, borderRadius: DOT / 2 },
  /** 두 동그라미의 가운데 사이를 메우는 칸. 왼쪽을 기준으로 늘어난다 */
  middle: { position: 'absolute', left: DOT / 2, top: 0, width: BAR - DOT, height: DOT, transformOrigin: 'left' },
});
