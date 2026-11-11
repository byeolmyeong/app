import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { CardRadius, Colors, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

const M = strings.main;

export type HomeReadingCardProps = {
  /** 받아 둔 풀이의 한 줄 총평. 아직 없으면 null */
  headline: string | null;
  /** 카드 오른쪽 위에 놓는 작은 그림(그 사람의 하늘 그림) */
  picture?: ReactNode;
  onOpen: () => void;
};

/** 홈의 "나의 별명" 카드. 한 줄 총평을 보여 주고 풀이 글로 보낸다. 아직 없으면 읽으러 가는 버튼을 둔다. */
export function HomeReadingCard({ headline, picture, onOpen }: HomeReadingCardProps) {
  if (!headline)
    return (
      <View style={styles.card}>
        <Txt variant="label" color="gray">
          {M.readingLabel}
        </Txt>
        <Txt variant="body" color="gray">
          {M.readingEmpty}
        </Txt>
        <Button label={M.readingCta} onPress={onOpen} />
      </View>
    );
  return (
    <Pressable testID="home-reading" accessibilityRole="button" onPress={onOpen} style={styles.card}>
      <View style={styles.top}>
        <Txt variant="label" color="gray">
          {M.readingLabel}
        </Txt>
        {picture}
      </View>
      <Txt variant="title">{headline}</Txt>
      <View style={styles.more}>
        <Txt variant="table" color="gray">
          {M.readingMore}
        </Txt>
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6l6 6-6 6" stroke={Colors.gray} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: Colors.fill, borderRadius: CardRadius, padding: Spacing.lg, gap: Spacing.sm },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  more: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs / 2 },
});
