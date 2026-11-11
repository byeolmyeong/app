import { StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, Radius, Spacing } from '@/constants/theme';
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
          <Txt variant="label" color="hint">
            {item.caption}
          </Txt>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: Colors.fill, borderRadius: Radius, paddingVertical: Spacing.md },
  cell: { flex: 1, alignItems: 'center', gap: Spacing.xxs },
  divided: { borderLeftWidth: LineWidth, borderLeftColor: Colors.hair },
});
