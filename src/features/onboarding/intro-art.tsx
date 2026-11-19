/**
 * 소개 3장의 그림(결정 041 시안 보드 2 · 3 · 4): 별이 · 별이와 하트 카드 · 달 카드와 시기 줄.
 * 브랜드 자리라 빛나는 그림을 쓴다(결정 035). 별이의 기본 · 반가운 얼굴은 그림(PNG)에만 있어 공유 카드의 그림을 그대로 쓰고,
 * 하트 · 달은 보드의 그림(0~100 칸, 빛 · 번짐 · 흰 심 세 겹)을 그대로 그린다. 장식이라 화면 읽기에서 숨긴다(시기 줄의 글자만 읽힌다).
 */
import { useId } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, FeGaussianBlur, Filter, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { BrandColors, Colors, IntroArtLayout, LineWidth, Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';

const ART = {
  byeoli: require('@/assets/images/share/byeoli-default.png'),
  byeoliHappy: require('@/assets/images/share/byeoli-happy.png'),
};

const { card: CARD, moonCard: MOON_CARD, pair: PAIR, timeline: TIMELINE } = IntroArtLayout;
const cardShadow = `0 0 48px ${BrandColors.cardShadow}`;

/** 보드의 하트 · 달(0~100 칸). 빛(번짐 큰 것) · 번짐 작은 것은 같은 모양, 흰 심은 조금 안쪽 모양이다 */
const SHAPES = {
  heart: {
    glow: 'M50 84 C22 64 12 48 12 35 C12 23 21 15 32 15 C40 15 46 20 50 27 C54 20 60 15 68 15 C79 15 88 23 88 35 C88 48 78 64 50 84 Z',
    core: 'M50 80 C25 62 16 47 16 35.5 C16 25 24 18.5 33 18.5 C40.5 18.5 46 23 50 30 C54 23 59.5 18.5 67 18.5 C76 18.5 84 25 84 35.5 C84 47 75 62 50 80 Z',
  },
  moon: {
    glow: 'M58 14 A36 36 0 1 0 86 68 A28 28 0 1 1 58 14 Z',
    core: 'M56 18 A32 32 0 1 0 82 66 A26 26 0 1 1 56 18 Z',
  },
} as const;

/** 카드 안의 빛나는 하트 · 달(보드 그대로: 번짐 8 · 2.4 위에 흰 심) */
function CardShape({ shape, size }: { shape: keyof typeof SHAPES; size: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const d = SHAPES[shape];
  return (
    <Svg testID={`intro-${shape}`} width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <Filter id={`big${id}`} x="-50%" y="-50%" width="200%" height="200%">
          <FeGaussianBlur stdDeviation={8} />
        </Filter>
        <Filter id={`small${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <FeGaussianBlur stdDeviation={2.4} />
        </Filter>
      </Defs>
      <Path d={d.glow} fill={BrandColors.glow} filter={`url(#big${id})`} />
      <Path d={d.glow} fill={BrandColors.glowMid} filter={`url(#small${id})`} />
      <Path d={d.core} fill={BrandColors.core} />
    </Svg>
  );
}

export function IntroArt({ index }: { index: number }) {
  if (index === 0)
    return (
      <View aria-hidden importantForAccessibility="no-hide-descendants">
        <Image source={ART.byeoli} accessible={false} style={styles.byeoli} />
      </View>
    );
  if (index === 1)
    return (
      <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.pair}>
        <View style={[styles.card, styles.cardLeft]}>
          <Image source={ART.byeoliHappy} accessible={false} style={styles.cardArt} />
        </View>
        <View style={[styles.card, styles.cardRight]}>
          <CardShape shape="heart" size={CARD.heart} />
        </View>
      </View>
    );
  const T = strings.intro.timeline;
  return (
    <View style={styles.timing}>
      <View aria-hidden importantForAccessibility="no-hide-descendants" style={[styles.card, styles.moonCard]}>
        <CardShape shape="moon" size={MOON_CARD.moon} />
      </View>
      <View style={styles.timeline}>
        <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.track}>
          <Svg style={styles.line} width={TIMELINE.width - TIMELINE.dot} height={TIMELINE.line}>
            <Defs>
              <LinearGradient id="introTimeline" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor={Colors.hair} />
                <Stop offset="0.5" stopColor={Colors.primary} />
                <Stop offset="1" stopColor={Colors.hair} />
              </LinearGradient>
            </Defs>
            <Rect width={TIMELINE.width - TIMELINE.dot} height={TIMELINE.line} rx={1} fill="url(#introTimeline)" />
          </Svg>
          <View style={styles.dot} />
          <View style={styles.now} />
          <View style={styles.dot} />
        </View>
        <View style={styles.labels}>
          <Txt variant="micro" color="hint">
            {T.past}
          </Txt>
          <Txt variant="micro">{T.now}</Txt>
          <Txt variant="micro" color="hint">
            {T.ahead}
          </Txt>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  byeoli: { width: Sizes.introArt, height: Sizes.introArt },
  pair: { width: PAIR.width, height: PAIR.height },
  card: {
    width: CARD.width,
    height: CARD.height,
    borderRadius: CARD.radius,
    backgroundColor: BrandColors.card,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    boxShadow: cardShadow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLeft: { position: 'absolute', left: PAIR.left, top: PAIR.top, transform: [{ rotate: '-9deg' }] },
  cardRight: { position: 'absolute', left: PAIR.right, top: PAIR.top, transform: [{ rotate: '8deg' }] },
  cardArt: { width: CARD.art, height: CARD.art },
  timing: { alignItems: 'center', gap: IntroArtLayout.artGap },
  moonCard: { width: MOON_CARD.width, height: MOON_CARD.height, transform: [{ rotate: '-6deg' }] },
  timeline: { width: TIMELINE.width, gap: TIMELINE.gap },
  track: { height: TIMELINE.height, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  line: { position: 'absolute', left: TIMELINE.dot / 2, top: (TIMELINE.height - TIMELINE.line) / 2 },
  dot: { width: TIMELINE.dot, height: TIMELINE.dot, borderRadius: TIMELINE.dot / 2, backgroundColor: Colors.muted },
  now: {
    width: TIMELINE.now,
    height: TIMELINE.now,
    borderRadius: TIMELINE.now / 2,
    backgroundColor: Colors.primary,
    boxShadow: `0 0 12px ${Colors.primary}`,
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
});
