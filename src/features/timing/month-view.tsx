import { useId } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { CardFail } from '@/components/card-fail';
import { Skeleton, SkeletonCard } from '@/components/skeleton';
import { Txt } from '@/components/txt';
import { BrandColors, Colors, FontWeight, LineWidth, TimingLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { calendarCells, formatMonth, formatMonthDay, inCalendarRange, weekdayOf } from '@/features/timing/dates';
import { CATEGORY_DOT, CATEGORY_TEXT, SectionTitle, Tag, areaLabel, categoryLabel } from '@/features/timing/timing-parts';
import type { MonthState } from '@/features/timing/use-month';
import type { MonthDay, MonthSky } from '@/lib/api';

const T = strings.timing;
const M = L.month;

export type MonthViewProps = {
  /** 처음 받은 달(누를 수 있는 범위의 기준 — 그 달의 지난달 1일 ~ 다음 달 말일) · 보이는 달 */
  base: string;
  shown: string;
  state: MonthState;
  canPrev: boolean;
  canNext: boolean;
  onMove: (delta: 1 | -1) => void;
  onRetry: () => void;
  /** 기기의 오늘(한국 날짜) — 달력의 "오늘" 표시와 지난 날을 흐리게 하는 데만 쓴다 */
  today: string;
  onDay: (date: string) => void;
};

/** 아는 칩의 날만(모르는 칩은 그 줄 · 점을 숨긴다) */
const knownDays = (sky: MonthSky) => sky.days.filter((d) => categoryLabel(d.category) !== null);

function Arrow({ dir, enabled, onPress }: { dir: 1 | -1; enabled: boolean; onPress: () => void }) {
  return (
    <Pressable
      testID={dir === 1 ? 'month-next' : 'month-prev'}
      accessibilityRole="button"
      accessibilityLabel={dir === 1 ? T.month.next : T.month.prev}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      onPress={onPress}
      style={[styles.arrow, !enabled && styles.off]}>
      <Svg width={M.arrowIcon} height={M.arrowIcon} viewBox="0 0 24 24" fill="none">
        <Path d={dir === 1 ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'} stroke={Colors.gray} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </Pressable>
  );
}

/** 이번 달 내내 줄의 띠 표시: 첫 줄은 빛(그라데이션), 둘째 줄은 옅은 보라(보드 14-1) */
function Swatch({ first }: { first: boolean }) {
  const id = `swatch${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width={M.swatch.width} height={M.swatch.height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={BrandColors.glow} />
          <Stop offset="1" stopColor={Colors.primaryBright} />
        </LinearGradient>
      </Defs>
      <Rect
        width={M.swatch.width}
        height={M.swatch.height}
        rx={M.swatch.height / 2}
        fill={first ? `url(#${id})` : BrandColors.themeSoft}
      />
    </Svg>
  );
}

function Calendar({ sky, base, today, onDay }: { sky: MonthSky; base: string; today: string; onDay: (date: string) => void }) {
  const dots = new Map(knownDays(sky).map((d) => [d.date, d.category]));
  const themes = sky.themes.filter((t) => areaLabel(t.area) !== null);
  return (
    <View testID="month-calendar" style={styles.calendar}>
      <View style={styles.week}>
        {T.weekdays.map((w) => (
          <Txt key={w} variant="label" color="hint" style={[styles.cellBox, styles.center, styles.regular]}>
            {w}
          </Txt>
        ))}
      </View>
      <View style={styles.grid}>
        {calendarCells(sky.month).map((date, i) => {
          if (!date) return <View key={`e${i}`} style={styles.cell} />;
          const category = dots.get(date);
          const isToday = date === today;
          const pressable = inCalendarRange(date, base);
          const label = `${formatMonthDay(date)}${category ? T.month.notable : ''}${isToday ? T.month.today : ''}`;
          return (
            <Pressable
              key={date}
              testID={`day-${date}`}
              accessibilityRole={pressable ? 'button' : undefined}
              accessibilityLabel={label}
              disabled={!pressable}
              onPress={() => onDay(date)}
              style={styles.cell}>
              <View style={[styles.day, isToday && styles.today]}>
                <Txt
                  variant="desc"
                  color={isToday ? 'ink' : date < today || !pressable ? 'muted' : 'inkSoft'}
                  style={isToday ? styles.semibold : styles.medium}>
                  {String(Number(date.slice(8)))}
                </Txt>
              </View>
              {category ? (
                <View testID={`dot-${date}`} style={[styles.dot, { backgroundColor: Colors[CATEGORY_DOT[category] ?? 'accentText'] }]} />
              ) : (
                <View style={styles.dotSpace} />
              )}
            </Pressable>
          );
        })}
      </View>
      {themes.length > 0 ? (
        <View style={styles.legend}>
          {themes.map((t, i) => (
            <View key={`${t.title}${i}`} testID="month-theme" style={styles.legendRow}>
              <Swatch first={i === 0} />
              <Txt variant="label" color="gray" style={[styles.flex, styles.regular]} keepAll>
                {`${T.month.allMonth}${T.date.separator}${t.title}`}
              </Txt>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function DayRow({ day, pressable, onPress }: { day: MonthDay; pressable: boolean; onPress: () => void }) {
  const category = categoryLabel(day.category);
  return (
    <Pressable
      testID="month-day"
      accessibilityRole={pressable ? 'button' : undefined}
      disabled={!pressable}
      onPress={onPress}
      style={styles.dayRow}>
      <View style={styles.date}>
        <Txt variant="heading" style={styles.dateNumber}>
          {String(Number(day.date.slice(8)))}
        </Txt>
        <Txt variant="badge" color="hint" style={styles.regular}>
          {T.weekdays[weekdayOf(day.date)]}
        </Txt>
      </View>
      <View style={styles.dayText}>
        {category ? <Tag label={category} color={CATEGORY_TEXT[day.category] ?? 'keywordText'} /> : null}
        <Txt variant="clause" style={styles.medium} keepAll>
          {day.text}
        </Txt>
      </View>
    </Pressable>
  );
}

/**
 * 이번 달(결정 049 의 2, 캔버스 14-1 · 14 받기 전 · 14-1 눈여겨볼 날 없음): 달 머리와 ‹ ›(처음 받은 달 ±1 에서 멈춤) · 달력(칸 배치는 달력 계산,
 * 점은 서버의 눈여겨볼 날) · 이번 달 내내 줄 · 눈여겨볼 날 목록(없으면 안내 한 장). 날짜나 눈여겨볼 날을 누르면 그날의 하늘 — 범위 밖은 못 누른다.
 */
export function MonthView({ base, shown, state, canPrev, canNext, onMove, onRetry, today, onDay }: MonthViewProps) {
  const head = (
    <View style={styles.head}>
      <Txt variant="paragraphTitle" accessibilityRole="header">
        {formatMonth(`${shown}-01`)}
      </Txt>
      <View style={styles.arrows}>
        <Arrow dir={-1} enabled={canPrev} onPress={() => onMove(-1)} />
        <Arrow dir={1} enabled={canNext} onPress={() => onMove(1)} />
      </View>
    </View>
  );
  if (state.status === 'loading')
    return (
      <View style={styles.root}>
        <View>
          {head}
          <View style={styles.calendarTop}>
            <SkeletonCard>
              <Skeleton width="100%" height={L.skeleton.calendar} />
            </SkeletonCard>
          </View>
        </View>
      </View>
    );
  if (state.status === 'failed')
    return (
      <View style={styles.root}>
        <View>
          {head}
          <View style={styles.calendarTop}>
            <CardFail
              kicker={T.month.loadFail.kicker}
              title={T.month.loadFail.title}
              body={T.month.loadFail.body}
              retry={{ label: strings.states.loadFail.retry, onPress: onRetry }}
            />
          </View>
        </View>
      </View>
    );
  const days = knownDays(state.sky);
  return (
    <View style={styles.root}>
      <View>
        {head}
        <View style={styles.calendarTop}>
          <Calendar sky={state.sky} base={base} today={today} onDay={onDay} />
        </View>
      </View>
      <View style={styles.list}>
        <SectionTitle title={T.month.days} />
        {days.length === 0 ? (
          <View testID="month-quiet" style={styles.quiet}>
            <Txt variant="stat" keepAll>
              {T.month.quiet.title}
            </Txt>
            <Txt variant="reason" color="gray" keepAll>
              {T.month.quiet.body}
            </Txt>
          </View>
        ) : (
          days.map((d) => <DayRow key={d.date} day={d} pressable={inCalendarRange(d.date, base)} onPress={() => onDay(d.date)} />)
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: L.sectionGap },
  flex: { flex: 1 },
  center: { textAlign: 'center' },
  regular: { fontWeight: FontWeight.regular },
  medium: { fontWeight: FontWeight.medium },
  semibold: { fontWeight: FontWeight.semibold },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  arrows: { flexDirection: 'row', gap: M.arrowGap },
  arrow: {
    width: M.arrow,
    height: M.arrow,
    borderRadius: M.arrow / 2,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  off: { opacity: M.disabledOpacity },
  calendarTop: { marginTop: M.cardTop },
  calendar: {
    paddingTop: M.padTop,
    paddingHorizontal: M.padX,
    paddingBottom: M.padBottom,
    borderRadius: M.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  week: { flexDirection: 'row', paddingBottom: M.weekBottom },
  cellBox: { width: `${100 / 7}%` },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, height: M.cell, alignItems: 'center', gap: M.dotGap },
  day: { width: M.day, height: M.day, borderRadius: M.day / 2, alignItems: 'center', justifyContent: 'center' },
  today: { backgroundColor: Colors.primary, boxShadow: `0 0 10px ${BrandColors.todayGlow}` },
  dot: { width: M.dot, height: M.dot, borderRadius: M.dot / 2 },
  dotSpace: { height: M.dot },
  legend: {
    marginTop: M.legendInset,
    marginHorizontal: M.legendInset,
    paddingTop: M.legendTop,
    borderTopWidth: LineWidth,
    borderTopColor: Colors.hair,
    gap: M.legendGap,
  },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: M.swatchGap },
  list: { gap: L.listGap },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: M.dayGap,
    paddingVertical: L.card.padV,
    paddingHorizontal: L.card.pad,
    borderRadius: L.card.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  date: { width: M.dateWidth, alignItems: 'center' },
  dateNumber: { lineHeight: M.dateLine },
  dayText: { flex: 1, gap: M.dayTextGap },
  quiet: {
    paddingVertical: M.quietPadV,
    paddingHorizontal: L.card.pad,
    gap: M.quietGap,
    borderRadius: L.card.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
});
