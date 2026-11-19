/**
 * 소개 3장의 그림(결정 041 시안 보드 2 · 3 · 4): 별이 · 별이와 하트 카드 · 달 카드와 시기 줄.
 * 브랜드 자리라 빛나는 그림을 쓴다(결정 035). 별이의 기본 · 반가운 얼굴은 그림(PNG)에만 있어 공유 카드의 그림을 그대로 쓰고,
 * 하트 · 달은 `GlowShape` 다. 장식이라 화면 읽기에서 숨긴다(시기 줄의 글자만 읽힌다).
 */
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { GlowShape } from '@/components/glow';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, LineWidth, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const ART = {
  byeoli: require('@/assets/images/share/byeoli-default.png'),
  byeoliHappy: require('@/assets/images/share/byeoli-happy.png'),
};

/** 시안의 그림 크기(그림 안의 자리는 그림의 일부라 여기 둔다) */
const CARD = { width: 136, height: 172, radius: 22, art: 120, heart: 96 };
const MOON_CARD = { width: 148, height: 184, moon: 100 };
const PAIR = { width: 300, height: 240, top: 30, left: 22, right: 142 };
const TIMELINE = { width: 300, height: 14, line: 2, dot: 10, now: 14 };
const cardShadow = `0 0 48px ${BrandColors.cardShadow}`;

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
          <GlowShape shape="heart" size={CARD.heart} />
        </View>
      </View>
    );
  const T = strings.intro.timeline;
  return (
    <View style={styles.timing}>
      <View aria-hidden importantForAccessibility="no-hide-descendants" style={[styles.card, styles.moonCard]}>
        <GlowShape shape="moon" size={MOON_CARD.moon} />
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
          <Txt variant="label" color="hint">
            {T.past}
          </Txt>
          <Txt variant="label">{T.now}</Txt>
          <Txt variant="label" color="hint">
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
  timing: { alignItems: 'center', gap: Spacing.xl + Spacing.xxs },
  moonCard: { width: MOON_CARD.width, height: MOON_CARD.height, transform: [{ rotate: '-6deg' }] },
  timeline: { width: TIMELINE.width, gap: Spacing.xs + 2 },
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
