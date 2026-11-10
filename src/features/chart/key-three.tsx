import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Spacing } from '@/constants/theme';
import { keyThree } from '@/features/chart/chart-rows';
import type { Chart } from '@/lib/api';

/** 핵심 3요소(태양·달·상승궁의 별자리). 시각 "모름" 이면 상승궁 칸이 없다. */
export function KeyThree({ chart }: { chart: Chart }) {
  return (
    <View style={styles.row}>
      {keyThree(chart).map((item, i) => (
        <View key={item.label} style={[styles.cell, i > 0 && styles.divided]}>
          <Txt variant="label" color="gray">
            {item.label}
          </Txt>
          <Txt variant="heading">{item.value}</Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderTopWidth: LineWidth,
    borderBottomWidth: LineWidth,
    borderColor: Colors.ink,
  },
  cell: { flex: 1, paddingVertical: Spacing.xs, gap: Spacing.xxs },
  divided: { borderLeftWidth: LineWidth, borderLeftColor: Colors.hair, paddingLeft: Spacing.sm },
});
