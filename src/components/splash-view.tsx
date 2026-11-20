import { useEffect, useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';

import { GlowBackdrop } from '@/components/glow';
import { Screen } from '@/components/screen';
import { BackdropShape, BrandColors, Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';

/** 네이티브 스플래시와 같은 그림(별이 · 로고, `assets/brand/splash.svg` → PNG, 결정 035) */
const ART = require('@/assets/images/splash-icon.png');
const GLOW = BackdropShape.splash;
/** 웹 스플래시가 너무 빨리 걷혀 깜빡이지 않게 보이는 최소 시간 */
const MIN_MS = 800;

/**
 * 스플래시(보드 1, 결정 067 의 3): 밤색 바탕 · 가운데 위쪽의 옅은 빛 · 가운데 별이와 로고 그림.
 * 웹에는 네이티브 스플래시가 없어 앱이 처음 열릴 때 이것을 그린다. 카카오 웹에서 돌아오는 화면처럼 서버를 기다리는 동안 화면이 따로 있어야 하는 곳도 이 모양이다.
 */
export function SplashView() {
  // 빛과 그림이 따로 나타나지 않게 그림을 받은 뒤 함께 보인다(웹은 그림을 스크립트가 받는다)
  const [ready, setReady] = useState(false);
  return (
    <Screen scroll={false}>
      <View testID="splash" style={styles.center}>
        {ready ? <GlowBackdrop color={BrandColors.backdropDim} extent={GLOW.extent} centerY={GLOW.centerY} /> : null}
        <Image
          source={ART}
          accessibilityLabel={strings.appName}
          onLoad={() => setReady(true)}
          onError={() => setReady(true)}
          style={[styles.art, !ready && styles.waiting]}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  art: { width: Sizes.splashArt, height: Sizes.splashArt },
  waiting: { opacity: 0 },
});

/**
 * 스플래시를 걷어도 되는가. ready(처음 확인할 것이 다 끝났다)이고 웹이면 처음 그린 뒤 0.8초가 지났을 때 true 가 되고, 한 번 true 면 그대로다
 * (나중에 다시 확인 중이 되어도 스플래시를 다시 그리지 않는다). 앱은 네이티브 스플래시가 앱이 켜질 때부터 보였으므로 최소 시간이 없다.
 */
export function useSplashDone(ready: boolean): boolean {
  const [minPassed, setMinPassed] = useState(Platform.OS !== 'web');
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (minPassed) return;
    const timer = setTimeout(() => setMinPassed(true), MIN_MS);
    return () => clearTimeout(timer);
  }, [minPassed]);
  if (!done && ready && minPassed) setDone(true);
  return done || (ready && minPassed);
}
