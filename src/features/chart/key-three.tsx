import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Radius, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { keyThree } from '@/features/chart/chart-rows';
import type { Chart } from '@/lib/api';

export type KeyThreeProps = {
  chart: Chart;
  /** 바탕 없이 그린다(이미 바탕이 있는 카드 안에 넣을 때) */
  bare?: boolean;
};

/** 핵심 3요소(태양·달·상승궁의 별자리, "전갈자리" 꼴). 시각 "모름" 이면 상승궁 칸이 없다. */
export function KeyThree({ chart, bare = false }: KeyThreeProps) {
  return (
    <View style={[styles.row, bare && styles.bare]}>
      {keyThree(chart).map((item, i) => (
        <View key={item.label} style={[styles.cell, i > 0 && styles.divided]}>
          <Txt variant="label" color="gray">
            {item.label}
          </Txt>
          <Txt variant="heading">{item.value + strings.chart.signSuffix}</Txt>
          <Txt variant="label" color="hint" style={styles.caption}>
            {item.caption}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: Colors.fill, borderRadius: Radius, paddingVertical: Spacing.md },
  bare: { alignSelf: 'stretch', backgroundColor: 'transparent', paddingVertical: 0 },
  cell: { flex: 1, alignItems: 'center', gap: Spacing.xs, paddingHorizontal: Spacing.xs },
  caption: { textAlign: 'center' },
  divided: { borderLeftWidth: LineWidth, borderLeftColor: Colors.hair },
});
