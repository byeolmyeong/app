/**
 * 소개 3장(결정 041, 시안 보드 2 · 3 · 4). 앱을 처음 받아 처음 켰을 때 한 번만 보인다 — 화면이 뜨는 순간 본 것으로 적는다
 * (건너뛰기 · 시작하기를 기다리지 않는다. 도중에 앱을 꺼도 다음엔 로그인부터). 가로로 넘기고, 건너뛰기 · 시작하기는 로그인으로.
 * 이 화면에 올지는 루트 가드가 정한다(로그인 전 · 이 기기에서 아직 안 봄).
 */
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { Button } from '@/components/button';
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

export default function IntroScreen() {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(0);
  const pager = useRef<React.ComponentRef<typeof ScrollView>>(null);

  useEffect(() => {
    void markIntroSeen();
  }, []);

  const last = index === COUNT - 1;
  const toLogin = () => router.replace('/login');

  function goTo(next: number) {
    setIndex(next);
    pager.current?.scrollTo({ x: next * width, animated: true });
  }

  function onScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (width <= 0) return;
    const next = Math.min(COUNT - 1, Math.max(0, Math.round(e.nativeEvent.contentOffset.x / width)));
    if (next !== index) setIndex(next);
  }

  return (
    <Screen scroll={false} bottomInset={Sizes.stepBottom}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" hitSlop={Spacing.xs} onPress={toLogin} style={styles.skip}>
          <Txt variant="table" color="gray">
            {S.skip}
          </Txt>
        </Pressable>
      </View>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={onScroll}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={styles.pager}
        contentContainerStyle={styles.pages}>
        {S.slides.map((slide, i) => (
          <View key={slide.title} style={[styles.page, width > 0 && { width }]}>
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
        ))}
      </ScrollView>
      <View style={styles.bottom}>
        <View accessible accessibilityLabel={`${index + 1}${strings.steps.separator}${COUNT}`} style={styles.dots}>
          {S.slides.map((slide, i) => (
            <View key={slide.title} style={[styles.dot, i === index && styles.dotOn]} />
          ))}
        </View>
        <Button label={last ? S.start : S.next} onPress={last ? toLogin : () => goTo(index + 1)} />
      </View>
    </Screen>
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
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Sizes.introDot,
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  dot: { width: Sizes.introDot, height: Sizes.introDot, borderRadius: Sizes.introDot / 2, backgroundColor: Colors.muted },
  dotOn: { width: Sizes.introDotActive, backgroundColor: Colors.primary },
});
