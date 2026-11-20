import { BackdropShape, BrandColors, Colors, Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';

/** 네이티브 스플래시와 같은 그림. 웹에서 이미지 require 는 { uri } 다 */
const ART = require('@/assets/images/splash-icon.png') as { uri?: string };
const GLOW = BackdropShape.splash;
const pct = (n: number) => `${Math.round(n * 100)}%`;
/** 보드 1 의 바탕: radial-gradient(circle at 50% 44%, 빛 0%, 바탕색 58%) */
const BACKDROP = `radial-gradient(circle at 50% ${pct(GLOW.centerY)}, ${BrandColors.backdropDim} 0%, ${Colors.paper} ${pct(GLOW.extent)})`;

/**
 * 스플래시의 빛과 그림(웹, 결정 067 의 3). 웹은 정적 출력이라 서버가 그린 HTML 이 스크립트보다 먼저 보인다 —
 * react-native-web 의 Image 와 크기를 잰 뒤 그리는 빛(GlowBackdrop)은 스크립트가 붙은 뒤에야 보여서,
 * 브라우저가 바로 받는 <img> 와 CSS 의 빛으로 그린다.
 */
export function SplashArt() {
  return (
    <>
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: BACKDROP }} />
      <img
        src={ART.uri}
        alt={strings.appName}
        width={Sizes.splashArt}
        height={Sizes.splashArt}
        draggable={false}
        style={{ position: 'relative', display: 'block' }}
      />
    </>
  );
}
