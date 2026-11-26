import { Image, StyleSheet } from 'react-native';

import { GlowBackdrop } from '@/components/glow';
import { BackdropShape, BrandColors, Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';

/** 네이티브 스플래시와 같은 그림(별이 · 로고, `assets/brand/splash.svg` → PNG, 결정 035) */
const ART = require('@/assets/images/splash-icon.png');
const GLOW = BackdropShape.splash;

/** 스플래시의 빛과 그림(앱). 웹은 `splash-art.web.tsx` — 서버가 그린 HTML 에서도 보이게 그린다 */
export function SplashArt() {
  return (
    <>
      <GlowBackdrop color={BrandColors.backdropDim} extent={GLOW.extent} centerY={GLOW.centerY} />
      <Image source={ART} accessibilityLabel={strings.appName} style={styles.art} />
    </>
  );
}

const styles = StyleSheet.create({
  art: { width: Sizes.splashArt, height: Sizes.splashArt },
});
