import { memo, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { SectionHead } from '@/components/section-head';
import { Txt } from '@/components/txt';
import { CardRadius, Colors, LineWidth, Radius, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { formatMonth, formatPeriod, formatYearAge, groupByYear, isBigChange, splitByWindow } from '@/features/report/timing';
import type { ReportTiming, TimingInterval, TimingMilestone } from '@/lib/api';

const T = strings.report.timing;

/** "더 보기" 를 한 번 누를 때 여는 구간 수 */
const MORE_STEP = 30;

/**
 * 심층 리포트의 시기 탭(결정 021): 지금 나의 구간 → 안내 → 변곡점 넷 → 구간 타임라인.
 * 날짜 · 해 · 만 나이 · 글은 서버가 준 그대로 적는다. 앱은 큰 변화와 지금 앞뒤 10년을 먼저 거르고 시작한 해로 묶기만 한다.
 */
export function TimingView({ timing, share }: { timing: ReportTiming; share?: ReactNode }) {
  const { current } = timing;
  /** 앞뒤 10년 밖에서 더 연 구간 수(지금에 가까운 쪽부터) */
  const [earlierShown, setEarlierShown] = useState(0);
  const [laterShown, setLaterShown] = useState(0);
  /** 큰 변화만 먼저 보여 주고 나머지(작은 변화 · 기회 · 만남)는 접어 둔다. 큰 변화가 없으면 접지 않는다 */
  const [allShown, setAllShown] = useState(false);
  const big = useMemo(() => timing.intervals.filter(isBigChange), [timing.intervals]);
  const foldable = big.length > 0 && big.length < timing.intervals.length;
  const listed = foldable && !allShown ? big : timing.intervals;
  const { earlier, around, later } = useMemo(() => splitByWindow(listed, current.date), [listed, current.date]);
  const groups = useMemo(
    () =>
      groupByYear([
        ...earlier.slice(Math.max(0, earlier.length - earlierShown)),
        ...around,
        ...later.slice(0, laterShown),
      ]),
    [earlier, around, later, earlierShown, laterShown],
  );
  const nowIds = useMemo(() => new Set(current.intervals.map((i) => i.id)), [current.intervals]);
  const earlierLeft = Math.max(0, earlier.length - earlierShown);
  const laterLeft = Math.max(0, later.length - laterShown);

  return (
    <View testID="timing-view" style={styles.root}>
      <NowCard current={current} />
      {/* 다음 변곡점 공유 버튼(화면이 넣는다. 기능끼리는 서로 import 하지 않는다) */}
      {share}

      <View style={styles.notices}>
        <Txt variant="label" color="gray">
          {T.notice}
        </Txt>
        {timing.timeKnown ? null : (
          <Txt variant="label" color="gray">
            {T.timeUnknownNotice}
          </Txt>
        )}
      </View>

      <View style={styles.block}>
        <SectionHead title={T.milestonesHeading} />
        <Txt variant="table" color="gray">
          {T.milestonesIntro}
        </Txt>
        {timing.milestones.map((milestone) => (
          <MilestoneCard
            key={milestone.kind}
            milestone={milestone}
            nearest={milestone.kind === current.nearestMilestone}
          />
        ))}
      </View>

      <View style={styles.block}>
        <SectionHead title={T.timelineHeading} />
        <Txt variant="table" color="gray">
          {T.timelineIntro}
        </Txt>
        <View style={styles.legend}>
          {(['CHANGE', 'OPPORTUNITY', 'FATED'] as const)
            .filter((kind) => timing.timeKnown || kind !== 'FATED')
            .map((kind) => (
              <View key={kind} style={styles.legendRow}>
                <Txt variant="label" color="gray" style={styles.chip}>
                  {T.kinds[kind]}
                </Txt>
                <Txt variant="label" color="gray" style={styles.legendNote}>
                  {T.kindNotes[kind]}
                </Txt>
              </View>
            ))}
        </View>
        {foldable ? (
          <Button
            variant="line"
            label={allShown ? T.showBig : `${T.showAll} (${timing.intervals.length - big.length}${T.countSuffix})`}
            onPress={() => setAllShown((shown) => !shown)}
          />
        ) : null}
        {earlierLeft > 0 ? (
          <MoreLink
            label={`${T.earlier} (${earlierLeft}${T.countSuffix})`}
            onPress={() => setEarlierShown((n) => n + MORE_STEP)}
          />
        ) : null}
        {groups.map((group) => (
          <View key={group.year} style={styles.year}>
            <Txt testID="timing-year" variant="table" color="gray" style={styles.yearHead}>
              {`${group.year}${T.yearSuffix}`}
            </Txt>
            {group.intervals.map((interval) => (
              <IntervalRow key={interval.id} interval={interval} now={nowIds.has(interval.id)} />
            ))}
          </View>
        ))}
        {laterLeft > 0 ? (
          <MoreLink
            label={`${T.later} (${laterLeft}${T.countSuffix})`}
            onPress={() => setLaterShown((n) => n + MORE_STEP)}
          />
        ) : null}
      </View>
    </View>
  );
}

/** 앞뒤 10년 밖의 구간을 더 여는 글자 줄. 버튼이 여럿 겹쳐 보이지 않게 글자로만 둔다 */
function MoreLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} hitSlop={Spacing.xs} style={styles.more}>
      <Txt variant="label" color="gray">
        {label}
      </Txt>
    </Pressable>
  );
}

/** 맨 위 카드: 오늘에 걸친 변곡점 · 구간과 언제까지인지, 없으면 다음 구간. 맨 아래에 다음 변곡점 */
function NowCard({ current }: { current: ReportTiming['current'] }) {
  const { milestone, nextInterval, nextMilestone } = current;
  const nothing = current.intervals.length === 0 && !milestone;
  return (
    <View testID="timing-now" style={styles.now}>
      <Txt variant="heading">{T.nowHeading}</Txt>
      {milestone ? (
        <View style={styles.item}>
          <Txt variant="label" color="gray">
            {T.milestoneNow}
          </Txt>
          <Txt variant="button">{milestone.title}</Txt>
          <Txt variant="mono" color="gray">{`${formatMonth(milestone.to)}${T.untilSuffix}`}</Txt>
          <Txt variant="body">{milestone.body}</Txt>
        </View>
      ) : null}
      {current.intervals.map((interval) => (
        <View key={interval.id} style={styles.item}>
          <Tags interval={interval} />
          <Txt variant="button">{interval.title}</Txt>
          <Txt variant="mono" color="gray">{`${formatMonth(interval.to)}${T.untilSuffix}`}</Txt>
          <Txt variant="body">{interval.body}</Txt>
        </View>
      ))}
      {nothing ? <Txt variant="body">{T.nowNone}</Txt> : null}
      {nothing && nextInterval ? (
        <View style={styles.item}>
          <Txt variant="label" color="gray">
            {T.nextIntervalLabel}
          </Txt>
          <Txt variant="button">{nextInterval.title}</Txt>
          <Txt variant="mono" color="gray">{`${formatMonth(nextInterval.from)}${T.fromSuffix}`}</Txt>
          <Tags interval={nextInterval} />
        </View>
      ) : null}
      <View style={styles.next}>
        {nextMilestone ? (
          <>
            <Txt variant="label" color="gray">
              {T.nextMilestoneLabel}
            </Txt>
            <Txt variant="button">{formatYearAge(nextMilestone.year, nextMilestone.age)}</Txt>
            <Txt variant="table" color="gray">
              {nextMilestone.title}
            </Txt>
          </>
        ) : (
          <Txt variant="table" color="gray">
            {T.milestonesDone}
          </Txt>
        )}
      </View>
    </View>
  );
}

/** 변곡점 하나: 몇 번째인지 · 서버가 준 해와 만 나이 · 기간 · 제목 · 본문. 지금과 가장 가까운 것은 초록 테두리 */
function MilestoneCard({ milestone, nearest }: { milestone: TimingMilestone; nearest: boolean }) {
  return (
    <View
      testID="timing-milestone"
      accessibilityState={{ selected: nearest }}
      style={[styles.milestone, nearest && styles.nearest]}
    >
      <View style={styles.tags}>
        <Txt variant="label" color="gray">
          {T.milestoneKinds[milestone.kind]}
        </Txt>
        {nearest ? (
          <Txt variant="label" style={[styles.chip, styles.chipOn]}>
            {T.nearest}
          </Txt>
        ) : null}
      </View>
      <Txt variant="heading">{formatYearAge(milestone.year, milestone.age)}</Txt>
      <Txt variant="mono" color="gray">
        {formatPeriod(milestone.from, milestone.to)}
      </Txt>
      <Txt variant="button">{milestone.title}</Txt>
      <Txt variant="body">{milestone.body}</Txt>
    </View>
  );
}

/** 구간의 딱지: 지금 · 종류 · 영역 · 크기(변화 구간에만 온다). 영역은 색이 아니라 글자로 구분한다 */
function Tags({ interval, now = false }: { interval: TimingInterval; now?: boolean }) {
  return (
    <View style={styles.tags}>
      {now ? (
        <Txt variant="label" style={[styles.chip, styles.chipOn]}>
          {T.now}
        </Txt>
      ) : null}
      <Txt variant="label" color="gray" style={styles.chip}>
        {T.kinds[interval.kind]}
      </Txt>
      <Txt variant="label" color="gray" style={styles.chip}>
        {T.areas[interval.area]}
      </Txt>
      {interval.size ? (
        <Txt variant="label" color="gray" style={styles.chip}>
          {T.sizes[interval.size]}
        </Txt>
      ) : null}
    </View>
  );
}

/** 타임라인의 한 줄: 기간 · 제목 · 딱지. 누르면 본문이 펼쳐진다(줄이 많아 처음에는 접어 둔다) */
const IntervalRow = memo(function IntervalRow({ interval, now }: { interval: TimingInterval; now: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <Pressable
      testID="timing-interval"
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen((v) => !v)}
      style={styles.row}
    >
      <Txt variant="mono" color="gray">
        {formatPeriod(interval.from, interval.to)}
      </Txt>
      <Txt testID="timing-interval-title" variant="button">
        {interval.title}
      </Txt>
      <Tags interval={interval} now={now} />
      {open ? <Txt variant="body">{interval.body}</Txt> : null}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  root: { gap: Spacing.lg, paddingTop: Spacing.lg },
  now: { backgroundColor: Colors.fill, borderRadius: CardRadius, padding: Spacing.lg, gap: Spacing.md },
  item: { gap: Spacing.xxs },
  next: { gap: Spacing.xxs, paddingTop: Spacing.md, borderTopWidth: LineWidth, borderTopColor: Colors.hair },
  notices: { gap: Spacing.xs },
  block: { gap: Spacing.sm },
  milestone: {
    gap: Spacing.xxs,
    padding: Spacing.md,
    borderRadius: CardRadius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
  },
  nearest: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  legend: { gap: Spacing.xs },
  more: { alignSelf: 'center', paddingVertical: Spacing.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendNote: { flex: 1 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.xxs },
  chip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs / 2,
    borderRadius: Radius,
    backgroundColor: Colors.fill,
    overflow: 'hidden',
  },
  chipOn: { backgroundColor: Colors.primaryLight },
  year: { paddingTop: Spacing.xs },
  yearHead: { paddingBottom: Spacing.xxs, borderBottomWidth: LineWidth, borderBottomColor: Colors.ink },
  row: { gap: Spacing.xxs, paddingVertical: Spacing.sm, borderBottomWidth: LineWidth, borderBottomColor: Colors.hair },
});
