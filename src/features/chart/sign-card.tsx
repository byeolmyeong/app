import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Txt } from '@/components/txt';
import { Colors, LineWidth, ReadingLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { keyThree, signFullName } from '@/features/chart/chart-rows';
import { ChartPicture } from '@/features/chart/ChartWheel';
import type { Chart } from '@/lib/api';

const L = ReadingLayout.card;

/**
 * 내 별명의 별자리 카드(보드 12): 내 별자리(해 자리)의 별 모양 · 이름 · 셋(나의 중심 · 나의 마음 · 나의 첫인상 — 차트의 해 · 달 별자리와 상승점,
 * 시각 "모름" 이면 첫인상 칸 없음) · "내 하늘 지도 보기"(→ /chart). 값은 서버 차트 그대로다.
 */
export function SignCard({ chart }: { chart: Chart }) {
  const sun = chart.positions.find((p) => p.body === 'SUN')?.sign;
  return (
    <View style={styles.card}>
      <ChartPicture chart={chart} size={L.picture} named={false} />
      {sun ? (
        <Txt testID="sign-card-name" variant="sheetTitle" style={styles.name}>
          {signFullName(sun)}
        </Txt>
      ) : null}
      <View style={styles.grid}>
        {keyThree(chart).map((k) => (
          <View key={k.label} testID="sign-card-cell" style={styles.cell}>
            <Txt variant="caption" color="gray">
              {k.label}
            </Txt>
            <Txt variant="emphasis">{k.value + strings.chart.signSuffix}</Txt>
            <Txt variant="statLabel" color="hint" style={styles.center}>
              {k.caption}
            </Txt>
          </View>
        ))}
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel={strings.reading.seeSkyMap} onPress={() => router.push('/chart')} style={styles.map}>
        <Txt variant="table" color="gray">
          {strings.reading.seeSkyMap}
        </Txt>
        <Svg width={L.chevron} height={L.chevron} viewBox="0 0 24 24" fill="none">
          <Path d="M9 6l6 6-6 6" stroke={Colors.hint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    paddingTop: L.padTop,
    paddingHorizontal: L.padX,
    paddingBottom: L.padBottom,
    borderRadius: L.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  name: { marginTop: L.nameTop },
  grid: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    gap: L.gridGap,
    marginTop: L.gridTop,
    paddingVertical: L.gridPadV,
    borderTopWidth: LineWidth,
    borderTopColor: Colors.hair,
  },
  cell: { flex: 1, alignItems: 'center', gap: L.cellGap },
  center: { textAlign: 'center' },
  map: {
    alignSelf: 'stretch',
    height: L.mapRow,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: LineWidth,
    borderTopColor: Colors.hair,
  },
});
