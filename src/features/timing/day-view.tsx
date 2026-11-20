import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { GlowBackdrop } from '@/components/glow';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, FontWeight, LineWidth, ReasonLayout, TimingLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { ReasonLine } from '@/features/reason/reason-line';
import { formatDayLong } from '@/features/timing/dates';
import { Skeleton } from '@/components/skeleton';
import { SkBlock, SkLine, TodoList } from '@/features/timing/timing-parts';
import type { Chart, DaySky } from '@/lib/api';

const T = strings.timing;
const D = L.day;
const H = L.hero;
const FLOW: (keyof DaySky['flow'])[] = ['people', 'work', 'mind'];

/**
 * 그날의 하늘(결정 049 의 6, 캔버스 14-4): 머리 카드(날짜 · 요일 · 제목, 오른쪽 위 달) · 그날의 흐름(사람 · 일 · 마음) ·
 * 이렇게 풀이한 이유(그날 지나가는 별 — 오늘이면 "오늘", 작은 지도 없음) · 그날의 작은 실천 셋. 면책 문구는 두지 않는다(결정 064).
 */
export function DayView({ sky, chart, today }: { sky: DaySky; chart: Chart | null; today: string }) {
  return (
    <View>
      <View testID="day-hero" style={styles.hero}>
        <GlowBackdrop color={BrandColors.cardGlow} extent={D.glow.extent} centerX={D.glow.x} centerY={D.glow.y} />
        <View aria-hidden importantForAccessibility="no-hide-descendants" style={styles.moon}>
          <Svg width={D.moon} height={D.moon} viewBox="0 0 100 100">
            <Path d="M58 14 A36 36 0 1 0 86 68 A28 28 0 1 1 58 14 Z" fill={BrandColors.core} />
          </Svg>
        </View>
        <Txt variant="captionStrong" color="accentText">
          {formatDayLong(sky.date)}
        </Txt>
        <Txt variant="title" keepAll style={styles.title}>
          {sky.title}
        </Txt>
      </View>
      <View style={styles.section}>
        <Txt testID="day-section-title" variant="emphasis" accessibilityRole="header">
          {T.day.flow}
        </Txt>
        <View style={styles.flow}>
          {FLOW.map((key, i) => (
            <View key={key} testID="day-flow" style={[styles.row, i > 0 && styles.rowLine]}>
              <Txt variant="item" color="accentText" style={styles.rowLabel}>
                {T.day.flowRows[key]}
              </Txt>
              <Txt variant="paragraph" color="inkSoft" keepAll style={styles.rowText}>
                {sky.flow[key]}
              </Txt>
            </View>
          ))}
        </View>
      </View>
      <View testID="day-reason" style={styles.reason}>
        <ReasonLine reason={sky.reason} chart={chart} today={sky.date === today} />
      </View>
      <View style={styles.section}>
        <Txt testID="day-section-title" variant="emphasis" accessibilityRole="header">
          {T.day.practices}
        </Txt>
        <View style={styles.todos}>
          <TodoList items={sky.practices} />
        </View>
      </View>
    </View>
  );
}

/** 그날의 하늘의 뼈대(결정 071): 머리 카드(날짜 · 제목) · 그날의 흐름 셋 · 이유 상자 · 그날의 작은 실천 셋 — 다 그려진 그날과 같은 배치 */
export function DaySkeleton() {
  return (
    <View>
      <SkBlock of="day-hero" style={styles.hero}>
        <SkLine width="34%" variant="captionStrong" />
        <SkLine width="60%" variant="title" style={styles.title} />
      </SkBlock>
      <View style={styles.section}>
        <SkBlock of="day-section-title">
          <SkLine width="30%" variant="emphasis" />
        </SkBlock>
        <View style={styles.flow}>
          {[0, 1, 2].map((i) => (
            <SkBlock key={i} of="day-flow" style={[styles.row, i > 0 && styles.rowLine]}>
              <SkLine width={D.labelBar} variant="item" style={styles.rowLabel} />
              <View style={styles.rowText}>
                <SkLine width="100%" variant="paragraph" />
                <SkLine width={i === 0 ? '90%' : '48%'} variant="paragraph" />
              </View>
            </SkBlock>
          ))}
        </View>
      </View>
      <SkBlock of="day-reason" style={[styles.reason, styles.reasonBox]}>
        <SkLine width="28%" variant="label" />
        <SkLine width="96%" variant="reason" />
        <SkLine width="40%" variant="reason" />
      </SkBlock>
      <View style={styles.section}>
        <SkBlock of="day-section-title">
          <SkLine width="36%" variant="emphasis" />
        </SkBlock>
        <View style={styles.todos}>
          {[0, 1, 2].map((i) => (
            <SkBlock key={i} of="timing-todo" style={styles.todo}>
              <Skeleton width={L.badge} height={L.badge} pill />
              <SkLine width={i === 1 ? '50%' : '60%'} variant="item" style={styles.rowText} />
            </SkBlock>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    overflow: 'hidden',
    marginTop: D.heroTop,
    paddingVertical: D.padV,
    paddingHorizontal: D.padX,
    borderRadius: H.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  moon: { position: 'absolute', right: D.moonInset, top: D.moonInset },
  title: { marginTop: H.titleTop, marginRight: D.titleRight },
  section: { marginTop: D.sectionTop },
  flow: { marginTop: D.flowTop },
  row: { flexDirection: 'row', gap: D.rowGap, paddingVertical: D.rowPadV },
  rowLine: { borderTopWidth: LineWidth, borderTopColor: Colors.hair },
  rowLabel: { width: D.rowLabel, fontWeight: FontWeight.semibold, lineHeight: D.rowLabelLine },
  rowText: { flex: 1 },
  reason: { marginTop: D.reasonTop },
  todos: { marginTop: D.todosTop },
  todo: { flexDirection: 'row', alignItems: 'center', gap: L.card.gap, minHeight: D.todo },
  reasonBox: {
    gap: ReasonLayout.textGap,
    paddingTop: ReasonLayout.padTop,
    paddingRight: ReasonLayout.padRight,
    paddingBottom: ReasonLayout.padBottom,
    paddingLeft: ReasonLayout.padLeft,
    borderRadius: ReasonLayout.radius,
    backgroundColor: Colors.raised,
  },
});
