import { Pressable, StyleSheet, View } from 'react-native';

import { Txt } from '@/components/txt';
import { Colors, FontWeight, Radius, SkyMapLayout as L, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { skyRows, type SkyRow } from '@/features/chart/chart-rows';
import type { Chart } from '@/lib/api';

export type SkyListProps = {
  chart: Chart;
  /** 고른 별(천체 식별자 · 'ASC' · 'MC'). 없으면 null */
  selected: string | null;
  onSelect: (key: string) => void;
};

/**
 * "별마다 있던 자리"(시안 13): 별 10 + 시각을 알 때만 첫인상의 자리 · 꿈의 자리.
 * 줄마다 이름 · 짧은 주제 · 별자리 · "N하우스 · 주제"(서버 값). 줄을 누르면 그 별을 고른다.
 */
export function SkyList({ chart, selected, onSelect }: SkyListProps) {
  return (
    <View>
      <Txt variant="subhead">{strings.skyMap.listHeading}</Txt>
      <View style={styles.rows}>
        {skyRows(chart).map((row) => (
          <Row key={row.key} row={row} on={row.key === selected} onPress={() => onSelect(row.key)} />
        ))}
      </View>
    </View>
  );
}

function Row({ row, on, onPress }: { row: SkyRow; on: boolean; onPress: () => void }) {
  // 별은 채운 점, 상승점 · 중천은 빈 점. 고른 줄은 점이 주색이고 둘레가 옅게 빛난다.
  const dot = row.angle ? [styles.hollow, on && styles.hollowOn] : [styles.filled, on && styles.filledOn];
  return (
    <Pressable
      testID={`sky-row-${row.key}`}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={[styles.row, on && styles.rowOn]}>
      <View style={styles.dotBox}>
        {on ? <View testID="sky-dot-glow" style={styles.glow} /> : null}
        <View style={[styles.dot, ...dot]} />
      </View>
      <View style={styles.left}>
        <Txt variant="body" style={styles.title}>
          {row.title}
        </Txt>
        <Txt variant="caption" color="hint">
          {row.subtitle}
        </Txt>
      </View>
      <View style={styles.right}>
        <Txt variant="body" style={styles.sign}>
          {row.sign}
        </Txt>
        {row.place ? (
          <Txt variant="caption" color="hint">
            {row.place}
          </Txt>
        ) : null}
      </View>
    </Pressable>
  );
}

/** 고른 점 둘레의 빛: 점보다 사방으로 4 넓다 */
const GLOW = L.dot + Spacing.xxs * 2;

const styles = StyleSheet.create({
  rows: { marginTop: Spacing.xs },
  // 고른 줄의 바탕이 글자 밖으로 12 더 나가도록 양옆을 당긴다(시안)
  row: {
    minHeight: L.row,
    paddingHorizontal: Spacing.sm,
    marginHorizontal: -Spacing.sm,
    borderRadius: Radius,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  rowOn: { backgroundColor: Colors.raised },
  dotBox: { width: L.dot, height: L.dot, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: GLOW, height: GLOW, borderRadius: GLOW / 2, backgroundColor: Colors.primary, opacity: L.haloOpacity },
  dot: { width: L.dot, height: L.dot, borderRadius: L.dot / 2 },
  filled: { backgroundColor: Colors.ink },
  filledOn: { backgroundColor: Colors.primary },
  hollow: { borderWidth: L.dotBorder, borderColor: Colors.gray },
  hollowOn: { borderColor: Colors.primary },
  left: { flex: 1, gap: Spacing.hairline },
  right: { alignItems: 'flex-end', gap: Spacing.hairline },
  title: { fontWeight: FontWeight.semibold },
  sign: { fontWeight: FontWeight.medium },
});
