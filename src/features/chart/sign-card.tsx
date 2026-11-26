import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Skeleton, SkeletonText } from '@/components/skeleton';
import { Txt } from '@/components/txt';
import { Colors, LineWidth, ReadingLayout, Typography } from '@/constants/theme';
import { strings } from '@/content/strings';
import { keyThree, signFullName } from '@/features/chart/chart-rows';
import { ChartPicture } from '@/features/chart/ChartWheel';
import type { Chart } from '@/lib/api';

const L = ReadingLayout.card;
const K = ReadingLayout.skeleton.card;

/**
 * 내 별명의 별자리 카드(보드 12): 내 별자리(해 자리)의 별 모양 · 이름 · 셋(나의 중심 · 나의 마음 · 나의 첫인상 — 차트의 해 · 달 별자리와 상승점,
 * 시각 "모름" 이면 첫인상 칸 없음) · "내 하늘 지도 보기"(→ /chart). 값은 서버 차트 그대로다.
 */
export function SignCard({ chart }: { chart: Chart }) {
  const sun = chart.positions.find((p) => p.body === 'SUN')?.sign;
  return (
    <View testID="sign-card" style={styles.card}>
      <ChartPicture chart={chart} size={L.picture} named={false} />
      {sun ? (
        <Txt testID="sign-card-name" variant="section" style={styles.name}>
          {signFullName(sun)}
        </Txt>
      ) : null}
      <View style={styles.grid}>
        {keyThree(chart).map((k) => (
          <View key={k.label} testID="sign-card-cell" style={styles.cell}>
            <Txt variant="caption" color="gray">
              {k.label}
            </Txt>
            <Txt variant="subhead">{k.value + strings.chart.signSuffix}</Txt>
            <Txt variant="label" color="hint" style={styles.center}>
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

/**
 * 별자리 카드의 뼈대(결정 071): 같은 카드에 그림 자리(동그라미) · 이름 · 셋 칸(차트 그대로 — 시각 "모름" 이면 둘) · "내 하늘 지도 보기" 줄.
 * 뼈대가 보일 때도 차트는 기기에 있어 칸 수를 안다.
 */
export function SignCardSkeleton({ chart }: { chart: Chart }) {
  return (
    <View testID="sign-card-skeleton" style={styles.card}>
      <Skeleton width={L.picture} height={L.picture} pill />
      <SkeletonText variant="section" widths={[K.name]} center style={styles.name} />
      <View style={styles.grid}>
        {keyThree(chart).map((k) => (
          <View key={k.label} testID="sign-card-cell-skeleton" style={styles.cell}>
            <SkeletonText variant="caption" widths={[K.label]} center />
            <SkeletonText variant="subhead" widths={[K.value]} center />
            <SkeletonText variant="label" widths={[K.caption]} center />
          </View>
        ))}
      </View>
      <View style={styles.map}>
        <Skeleton width={K.map} height={Typography.table.fontSize} />
      </View>
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
