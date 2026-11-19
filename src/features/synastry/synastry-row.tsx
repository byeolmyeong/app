import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';

export type SynastryRowProps = {
  /** 랭킹에서의 차례(서버가 준 순서). 지난 궁합 목록에서는 없다 */
  rank?: number;
  name: string;
  /** 이름 아래의 작은 줄: 랭킹은 키워드, 지난 궁합은 관계 */
  sub: string;
  score: number;
  /** 서버가 낮은 점수에 붙여 준 말. 있을 때만 그대로 적는다 */
  scoreLabel?: string;
  onPress: () => void;
};

/** 궁합 한 줄: (순위) · 이름과 작은 줄 · 점수. 누르면 그 궁합의 결과로 간다. 랭킹과 지난 궁합이 함께 쓴다. */
export function SynastryRow({ rank, name, sub, score, scoreLabel, onPress }: SynastryRowProps) {
  return (
    <Pressable
      testID="synastry-row"
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={styles.row}
    >
      {rank !== undefined ? (
        <Txt variant="number" style={styles.rank}>
          {String(rank)}
        </Txt>
      ) : null}
      <View style={styles.text}>
        <Txt variant="body" style={styles.name}>
          {name}
        </Txt>
        <Txt variant="label" color="gray">
          {sub}
        </Txt>
      </View>
      <View style={styles.score}>
        <Txt variant="table" style={styles.name}>{`${score}${strings.synastry.result.scoreUnit}`}</Txt>
        {scoreLabel !== undefined ? (
          <Txt variant="label" color="gray">
            {scoreLabel}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: LineWidth,
    borderBottomColor: Colors.hair,
  },
  rank: { minWidth: Spacing.xl, textAlign: 'center' },
  text: { flex: 1, gap: Spacing.xxs },
  name: { fontWeight: FontWeight.semibold },
  score: { alignItems: 'flex-end', gap: Spacing.xxs },
});
