import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import type { Synastry } from '@/lib/api';

const S = strings.synastry;

/**
 * 궁합 결과의 머리: 상대 이름 · 관계, 나 기준 점수, 한 줄 요약, 키워드 셋.
 * 점수와 그 옆의 말(`scoreLabel`)은 서버가 준 그대로 보여 준다. 앱은 점수를 만들거나 구간을 판정하지 않는다.
 */
export function SynastrySummary({ synastry }: { synastry: Synastry }) {
  return (
    <View style={styles.root}>
      <Txt variant="table" color="gray">
        {[synastry.name, S.relations[synastry.relation]].join(S.result.nameSeparator)}
      </Txt>
      <View>
        <Txt variant="label" color="gray">
          {S.result.scoreCaption}
        </Txt>
        <View style={styles.scoreRow}>
          <Txt variant="number">{`${synastry.score}${S.result.scoreUnit}`}</Txt>
          {synastry.scoreLabel !== undefined ? (
            <View testID="synastry-score-label">
              <Txt variant="table" color="gray">
                {synastry.scoreLabel}
              </Txt>
            </View>
          ) : null}
        </View>
      </View>
      <Txt variant="heading">{synastry.headline}</Txt>
      <View style={styles.keywords}>
        {synastry.keywords.map((keyword, i) => (
          <View key={i} testID="synastry-keyword" style={styles.keyword}>
            <Txt variant="table">{keyword}</Txt>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: Spacing.md, paddingTop: Spacing.lg },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', columnGap: Spacing.sm },
  keywords: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  keyword: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.fill,
    borderRadius: Radius,
  },
});
