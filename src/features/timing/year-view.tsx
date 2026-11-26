import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { SkeletonText } from '@/components/skeleton';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, FontWeight, LineWidth, TimingLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { formatMonth, formatPeriod, upcoming, yearNow, yearSpan } from '@/features/timing/dates';
import {
  IntervalRow,
  IntervalRowSkeleton,
  PracticeCards,
  PracticeCardsSkeleton,
  SectionTitle,
  SectionTitleSkeleton,
  SkBlock,
} from '@/features/timing/timing-parts';
import { shownTiming } from '@/features/timing/time-known';
import { useTrackOnce } from '@/lib/analytics';
import type { LifeArea, TimingInterval, TimingReport } from '@/lib/api';

const T = strings.timing;
const Y = L.year;
/** 띠 그래프의 줄 순서(보드 14): 일 · 사람·인연 · 나 자신 · 돈 */
const ROWS: LifeArea[] = ['WORK', 'PEOPLE', 'SELF', 'MONEY'];

/** 대표 구간 — 서버가 고른 것(current.mainId). 앱은 고르지 않는다 */
export const mainInterval = (report: TimingReport): TimingInterval | null =>
  report.current.mainId ? (report.intervals.find((i) => i.id === report.current.mainId) ?? null) : null;

/** 지금 지나는 중: 대표 구간을 맨 앞에, 나머지는 서버가 준 순서 */
export function ongoing(report: TimingReport): TimingInterval[] {
  const mainId = report.current.mainId;
  const list = report.current.intervals;
  return [...list.filter((i) => i.id === mainId), ...list.filter((i) => i.id !== mainId)];
}

function Band({ left, right, past }: { left: number; right: number; past: boolean }) {
  const id = `band${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View
      testID={past ? 'year-band-past' : 'year-band'}
      style={[styles.band, { left: `${left * 100}%`, width: `${(right - left) * 100}%` }, !past && styles.bandGlow]}>
      <Svg width="100%" height={Y.band}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={BrandColors.glow} />
            <Stop offset="1" stopColor={Colors.primaryBright} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={Y.band} rx={Y.band / 2} fill={past ? Colors.hair : `url(#${id})`} />
      </Svg>
    </View>
  );
}

/**
 * 올해(결정 049 의 3, 캔버스 14): "○○○○년의 흐름" 띠 그래프(영역 넷 — 그해에 걸친 구간을 날짜 글자 비교로 거름, 지난 것은 흐린 띠, "지금" 표시,
 * 달 눈금) · 지금 지나는 중(대표 구간 먼저) · 다가오는 시기(1년 안 · 셋) · 이 시기의 작은 실천. 해 · 오늘은 서버의 current.date 다.
 * 시각 "모름" 이면 돈 줄이 없다. 줄은 자세한 글이 있는 구간만 누를 수 있다.
 */
export function YearView({ report: received, onPeriod }: { report: TimingReport; onPeriod: (id: string) => void }) {
  useTrackOnce('reading_viewed', { kind: 'timing_report' });
  // 시각 "모름" 이면 받았더라도 돈 · 운명적 만남 구간을 그리지 않는다(이중 안전)
  const report = shownTiming(received);
  const today = report.current.date;
  const year = today.slice(0, 4);
  const rows = ROWS.filter((area) => area !== 'MONEY' || report.timeKnown);
  const now = yearNow(today);
  const main = mainInterval(report);
  const next = upcoming(report.intervals, today);
  const press = (i: TimingInterval) => (i.detail ? () => onPeriod(i.id) : undefined);
  return (
    <View style={styles.root}>
      <View>
        <SectionTitle title={`${year}${T.year.flowSuffix}`} />
        <View testID="year-flow" style={styles.card}>
          <View>
            {rows.map((area) => (
              <View key={area} testID={`year-row-${area}`} style={styles.row}>
                <Txt variant="label" color="gray" style={[styles.label, styles.regular]}>
                  {T.areas[area]}
                </Txt>
                <View style={styles.track}>
                  <View style={styles.line} />
                  {report.intervals
                    .filter((i) => i.area === area)
                    .map((i) => {
                      const span = yearSpan(i, year);
                      if (!span) return null;
                      return <Band key={i.id} left={span.left} right={span.right} past={i.to < today} />;
                    })}
                </View>
              </View>
            ))}
            <View pointerEvents="none" style={styles.nowLayer}>
              <View testID="year-now" style={[styles.nowLine, { left: `${now * 100}%` }]} />
              <View style={[styles.nowLabel, { left: `${now * 100}%` }]}>
                <Txt variant="badge">{T.year.now}</Txt>
              </View>
            </View>
          </View>
          <View style={styles.ticks}>
            {T.year.ticks.map((t) => (
              <Txt key={t} variant="badge" color="hint" style={styles.regular}>
                {t}
              </Txt>
            ))}
          </View>
        </View>
      </View>
      {report.current.intervals.length > 0 ? (
        <View style={styles.list}>
          <SectionTitle title={T.year.ongoing} />
          {ongoing(report).map((i) => (
            <IntervalRow key={i.id} interval={i} meta={`${T.year.untilPrefix}${formatMonth(i.to)}`} onPress={press(i)} />
          ))}
        </View>
      ) : null}
      {next.length > 0 ? (
        <View style={styles.list}>
          <SectionTitle title={T.year.upcoming} />
          {next.map((i) => (
            <IntervalRow key={i.id} interval={i} meta={formatPeriod(i.from, i.to)} onPress={press(i)} />
          ))}
        </View>
      ) : null}
      {main?.practices ? <PracticeCards practices={main.practices} /> : null}
    </View>
  );
}

/** 올해의 뼈대(결정 071): 흐름 제목 · 띠 카드(영역 넷 · 달 눈금) · 지금 지나는 중 둘 · 다가오는 시기 하나 · 작은 실천 셋 — 다 그려진 올해와 같은 배치 */
export function YearSkeleton() {
  return (
    <View style={styles.root}>
      <View>
        <SectionTitleSkeleton width="40%" />
        <SkBlock of="year-flow" style={styles.card}>
          {ROWS.map((area) => (
            <View key={area} style={styles.row}>
              <SkeletonText widths={[Y.labelBar]} variant="label" style={styles.label} />
              <View style={styles.track}>
                <View style={styles.line} />
              </View>
            </View>
          ))}
          <View style={styles.ticks}>
            {T.year.ticks.map((t) => (
              <SkeletonText key={t} widths={[Y.tickBar]} variant="badge" />
            ))}
          </View>
        </SkBlock>
      </View>
      <View style={styles.list}>
        <SectionTitleSkeleton width="36%" />
        <IntervalRowSkeleton />
        <IntervalRowSkeleton />
      </View>
      <View style={styles.list}>
        <SectionTitleSkeleton width="32%" />
        <IntervalRowSkeleton />
      </View>
      <PracticeCardsSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: L.sectionGap },
  regular: { fontWeight: FontWeight.regular },
  card: {
    marginTop: Y.cardTop,
    paddingTop: Y.padTop,
    paddingHorizontal: Y.padX,
    paddingBottom: Y.padBottom,
    borderRadius: Y.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  row: { flexDirection: 'row', alignItems: 'center', height: Y.row },
  label: { width: Y.label },
  track: { flex: 1, height: Y.track },
  line: { position: 'absolute', left: 0, right: 0, top: Y.lineTop, height: Y.line, backgroundColor: Colors.sheetFill },
  band: { position: 'absolute', top: Y.bandTop, height: Y.band, borderRadius: Y.band / 2 },
  bandGlow: { boxShadow: `0 0 10px ${BrandColors.bandGlow}` },
  nowLayer: { position: 'absolute', left: Y.label, right: 0, top: Y.nowTop, bottom: Y.nowBottom },
  nowLine: { position: 'absolute', top: 0, bottom: 0, width: Y.nowWidth, borderRadius: Y.nowWidth / 2, backgroundColor: Colors.ink },
  nowLabel: { position: 'absolute', top: Y.nowLabelTop - Y.nowTop, width: Y.label, marginLeft: -Y.label / 2 + Y.nowWidth / 2, alignItems: 'center' },
  ticks: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Y.ticksTop, marginLeft: Y.label },
  list: { gap: L.listGap },
});
