import { memo, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { Txt } from '@/components/txt';
import { CardRadius, Colors, LineWidth, Radius, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import {
  formatMonth,
  formatPeriod,
  formatYearAge,
  groupByYear,
  isBigChange,
  nextYearLabel,
  splitByNow,
  splitByWindow,
} from '@/features/report/timing';
import type { MilestoneKind, ReportTiming, TimingInterval, TimingMilestone } from '@/lib/api';

const T = strings.report.timing;

/** "더 보기" 를 한 번 누를 때 여는 구간 수 */
const MORE_STEP = 30;

/**
 * 심층 리포트의 시기 탭(결정 031): 안내 → 지금 → 올해 · 내년 → 앞으로 → 지나온 시기.
 * 날짜 · 해 · 만 나이 · 글은 서버가 준 그대로 적는다. 앱은 서버가 준 오늘(`current.date`)과 날짜 글자를 비교해 나누고 묶기만 한다.
 * afterNow 는 "지금" 바로 아래에 놓을 것(방향성 제시 미래), share 는 다음 변곡점 카드 아래에 놓을 것(공유 버튼)이다.
 * 둘 다 화면이 넣는다(기능끼리는 서로 import 하지 않는다).
 */
export function TimingView({
  timing,
  share,
  afterNow,
}: {
  timing: ReportTiming;
  share?: ReactNode;
  afterNow?: ReactNode;
}) {
  const { current } = timing;
  const today = current.date;
  const intervals = useMemo(() => splitByNow(timing.intervals, today), [timing.intervals, today]);
  const milestones = useMemo(() => splitByNow(timing.milestones, today), [timing.milestones, today]);
  const nearest = current.nearestMilestone;
  const next = current.nextMilestone;
  /** 다음 변곡점보다 더 뒤의 변곡점 */
  const laterMilestones = timing.milestones.filter((m) => m.from > today && m.kind !== next?.kind);
  const thisYear = today.slice(0, 4);
  const nextYear = nextYearLabel(today);

  return (
    <View testID="timing-view" style={styles.root}>
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

      <Section name="now">
        <NowCard current={current} />
        {afterNow}
      </Section>

      <Section name="near">
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
        {/* 위 "지금" 과 같은 것이지만 언제까지 이어지는지가 이 창에서도 보이게 접은 줄로 다시 적는다 */}
        {milestones.ongoing.length + intervals.ongoing.length > 0 ? (
          <NearGroup
            label={T.nearOngoing}
            milestones={milestones.ongoing}
            intervals={intervals.ongoing}
            nearest={nearest}
            now
          />
        ) : null}
        <NearGroup
          label={`${thisYear}${T.nearThisYearSuffix}`}
          none={`${thisYear}${T.nearThisYearNoneSuffix}`}
          milestones={milestones.thisYear}
          intervals={intervals.thisYear}
          nearest={nearest}
        />
        <NearGroup
          label={`${nextYear}${T.nearNextYearSuffix}`}
          none={`${nextYear}${T.nearNextYearNoneSuffix}`}
          milestones={milestones.nextYear}
          intervals={intervals.nextYear}
          nearest={nearest}
        />
      </Section>

      <Section name="ahead">
        {next ? (
          <>
            <Txt variant="button">{T.nextMilestoneLabel}</Txt>
            <View testID="timing-milestone-next" style={styles.nextCard}>
              <MilestoneTags milestone={next} nearest={nearest} />
              <Txt variant="title">{formatYearAge(next.year, next.age)}</Txt>
              <Txt variant="mono" color="gray">
                {formatPeriod(next.from, next.to)}
              </Txt>
              <Txt variant="button">{next.title}</Txt>
              <Txt variant="body">{next.body}</Txt>
            </View>
            {/* 다음 변곡점 공유 버튼 */}
            {share}
          </>
        ) : (
          <Txt variant="body">{T.milestonesDone}</Txt>
        )}
        <Txt variant="label" color="gray">
          {T.milestonesNote}
        </Txt>
        {laterMilestones.length > 0 ? (
          <View>
            <Txt variant="table" color="gray" style={styles.groupHead}>
              {T.laterMilestonesLabel}
            </Txt>
            {laterMilestones.map((milestone) => (
              <MilestoneRow key={milestone.kind} milestone={milestone} look="later" nearest={nearest} />
            ))}
          </View>
        ) : null}
        <Txt variant="button" style={styles.subhead}>
          {T.aheadIntervalsLabel}
        </Txt>
        {intervals.ahead.length > 0 ? (
          <IntervalList intervals={intervals.ahead} today={today} direction="ahead" />
        ) : (
          <Txt variant="table" color="gray">
            {T.aheadNone}
          </Txt>
        )}
      </Section>

      <PastSection milestones={milestones.past} intervals={intervals.past} today={today} nearest={nearest} />
    </View>
  );
}

/** 네 부분의 뼈대: 제목 · 한 줄 설명 · 내용 */
function Section({ name, children }: { name: keyof typeof T.sections; children: ReactNode }) {
  return (
    <View testID={`timing-section-${name}`} style={styles.section}>
      <View style={styles.sectionHead}>
        <Txt testID="timing-heading" variant="title" accessibilityRole="header">
          {T.sections[name].heading}
        </Txt>
        <Txt variant="table" color="gray">
          {T.sections[name].intro}
        </Txt>
      </View>
      {children}
    </View>
  );
}

/** "지금" 의 카드: 오늘에 걸친 변곡점 · 구간과 언제까지인지. 없으면 없다는 말과 다음 구간 */
function NowCard({ current }: { current: ReportTiming['current'] }) {
  const { milestone, nextInterval } = current;
  const nothing = current.intervals.length === 0 && !milestone;
  return (
    <View testID="timing-now" style={styles.now}>
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
    </View>
  );
}

/** 올해 · 내년의 한 묶음: 머리 · 걸친 변곡점(맨 위, 눈에 띄게) · 구간 줄. 아무것도 없으면 none 을 적는다 */
function NearGroup({
  label,
  none,
  milestones,
  intervals,
  nearest,
  now = false,
}: {
  label: string;
  none?: string;
  milestones: TimingMilestone[];
  intervals: TimingInterval[];
  nearest: MilestoneKind;
  now?: boolean;
}) {
  return (
    <View testID="timing-near-group">
      <Txt testID="timing-near-label" variant="table" color="gray" style={styles.groupHead}>
        {label}
      </Txt>
      {milestones.map((milestone) => (
        <MilestoneRow key={milestone.kind} milestone={milestone} look="near" nearest={nearest} />
      ))}
      {intervals.map((interval) => (
        <IntervalRow key={interval.id} interval={interval} now={now} />
      ))}
      {milestones.length + intervals.length === 0 && none ? (
        <Txt variant="table" color="gray" style={styles.none}>
          {none}
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * 해로 묶은 구간 목록("앞으로" 와 "지나온 시기" 가 함께 쓴다). 큰 변화만 먼저 보여 주고 나머지(작은 변화 · 기회 · 만남)는 접어 둔다.
 * 오늘 앞뒤 10년 안의 것을 먼저 그리고, 그 밖은 "더 보기" 로 지금에 가까운 쪽부터 30개씩 연다.
 * 10년 안에 보여 줄 것이 없으면 그 밖의 첫 30개를 바로 보여 준다(빈 목록을 두지 않는다).
 * direction 이 past 면 새것부터 적는다. intervals 는 받은 순서(시작 순서)다.
 */
function IntervalList({
  intervals,
  today,
  direction,
}: {
  intervals: TimingInterval[];
  today: string;
  direction: 'ahead' | 'past';
}) {
  /** 큰 변화가 없거나 큰 변화뿐이면 접지 않는다 */
  const [allShown, setAllShown] = useState(false);
  /** 10년 밖에서 더 연 구간 수 */
  const [moreShown, setMoreShown] = useState(0);
  const big = useMemo(() => intervals.filter(isBigChange), [intervals]);
  const foldable = big.length > 0 && big.length < intervals.length;
  const listed = foldable && !allShown ? big : intervals;
  const { earlier, around, later } = useMemo(() => splitByWindow(listed, today), [listed, today]);
  const past = direction === 'past';
  /** 10년 밖의 것. 지금에 가까운 것이 앞에 오게 둔다 */
  const beyond = useMemo(() => (past ? [...earlier].reverse() : later), [past, earlier, later]);
  const shown = around.length === 0 ? Math.max(moreShown, MORE_STEP) : moreShown;
  const groups = useMemo(
    () => groupByYear([...(past ? [...around].reverse() : around), ...beyond.slice(0, shown)]),
    [past, around, beyond, shown],
  );
  const left = Math.max(0, beyond.length - shown);
  return (
    <View style={styles.list}>
      {foldable ? (
        <Button
          variant="line"
          label={allShown ? T.showBig : `${T.showAll} (${intervals.length - big.length}${T.countSuffix})`}
          onPress={() => setAllShown((v) => !v)}
        />
      ) : null}
      {groups.map((group) => (
        <View key={group.year} style={styles.year}>
          <Txt testID="timing-year" variant="table" color="gray" style={styles.groupHead}>
            {`${group.year}${T.yearSuffix}`}
          </Txt>
          {group.intervals.map((interval) => (
            <IntervalRow key={interval.id} interval={interval} />
          ))}
        </View>
      ))}
      {left > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => setMoreShown(shown + MORE_STEP)}
          hitSlop={Spacing.xs}
          style={styles.more}
        >
          <Txt variant="label" color="gray">
            {`${past ? T.earlier : T.later} (${left}${T.countSuffix})`}
          </Txt>
        </Pressable>
      ) : null}
    </View>
  );
}

/** 지나온 시기: 누르기 전에는 줄을 그리지 않는다. 열면 지난 변곡점(새것부터, 흐리게)과 지난 구간(새것부터) */
function PastSection({
  milestones,
  intervals,
  today,
  nearest,
}: {
  milestones: TimingMilestone[];
  intervals: TimingInterval[];
  today: string;
  nearest: MilestoneKind;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Section name="past">
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={open ? T.pastHide : T.pastShow}
        onPress={() => setOpen((v) => !v)}
        style={styles.toggle}
      >
        <Txt variant="button">{open ? T.pastHide : T.pastShow}</Txt>
      </Pressable>
      {open && milestones.length + intervals.length === 0 ? (
        <Txt variant="table" color="gray">
          {T.pastNone}
        </Txt>
      ) : null}
      {open && milestones.length > 0 ? (
        <View>
          <Txt variant="table" color="gray" style={styles.groupHead}>
            {T.pastMilestonesLabel}
          </Txt>
          {[...milestones].reverse().map((milestone) => (
            <MilestoneRow key={milestone.kind} milestone={milestone} look="past" nearest={nearest} />
          ))}
        </View>
      ) : null}
      {open && intervals.length > 0 ? (
        <>
          <Txt variant="button" style={styles.subhead}>
            {T.pastIntervalsLabel}
          </Txt>
          <IntervalList intervals={intervals} today={today} direction="past" />
        </>
      ) : null}
    </Section>
  );
}

/** 변곡점의 딱지 줄: 몇 번째인지, 서버가 가장 가깝다고 한 것이면 그 딱지 */
function MilestoneTags({ milestone, nearest }: { milestone: TimingMilestone; nearest: MilestoneKind }) {
  return (
    <View style={styles.tags}>
      <Txt variant="label" color="gray">
        {T.milestoneKinds[milestone.kind]}
      </Txt>
      {milestone.kind === nearest ? (
        <Txt variant="label" style={[styles.chip, styles.chipOn]}>
          {T.nearest}
        </Txt>
      ) : null}
    </View>
  );
}

/**
 * 변곡점의 작은 줄: 몇 번째인지 · 서버가 준 해와 만 나이 · 기간 · 제목. 누르면 본문이 펼쳐진다.
 * near(올해 · 내년에 걸친 것)는 주색 테두리로 눈에 띄게, later(더 뒤)는 보통 줄, past(지난 것)는 흐린 글씨다.
 */
function MilestoneRow({
  milestone,
  look,
  nearest,
}: {
  milestone: TimingMilestone;
  look: 'near' | 'later' | 'past';
  nearest: MilestoneKind;
}) {
  const [open, setOpen] = useState(false);
  const color = look === 'past' ? 'gray' : 'ink';
  return (
    <Pressable
      testID={`timing-milestone-${look}`}
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      onPress={() => setOpen((v) => !v)}
      style={look === 'near' ? styles.nearMilestone : styles.row}
    >
      <MilestoneTags milestone={milestone} nearest={nearest} />
      <Txt variant="table" color={color}>
        {formatYearAge(milestone.year, milestone.age)}
      </Txt>
      <Txt variant="mono" color="gray">
        {formatPeriod(milestone.from, milestone.to)}
      </Txt>
      <Txt variant="button" color={color}>
        {milestone.title}
      </Txt>
      {open ? (
        <Txt variant="body" color={color}>
          {milestone.body}
        </Txt>
      ) : null}
    </Pressable>
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

/** 구간의 한 줄: 기간 · 제목 · 딱지. 누르면 본문이 펼쳐진다(줄이 많아 처음에는 접어 둔다) */
const IntervalRow = memo(function IntervalRow({ interval, now = false }: { interval: TimingInterval; now?: boolean }) {
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
  root: { gap: Spacing.xl, paddingTop: Spacing.lg },
  notices: { gap: Spacing.xs },
  section: { gap: Spacing.md },
  sectionHead: { gap: Spacing.xxs },
  now: { backgroundColor: Colors.fill, borderRadius: CardRadius, padding: Spacing.lg, gap: Spacing.md },
  item: { gap: Spacing.xxs },
  legend: { gap: Spacing.xs },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  legendNote: { flex: 1 },
  groupHead: { paddingBottom: Spacing.xxs, borderBottomWidth: LineWidth, borderBottomColor: Colors.ink },
  none: { paddingVertical: Spacing.sm },
  nextCard: {
    gap: Spacing.xxs,
    padding: Spacing.md,
    borderRadius: CardRadius,
    borderWidth: LineWidth,
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  nearMilestone: {
    gap: Spacing.xxs,
    padding: Spacing.sm,
    marginTop: Spacing.xs,
    borderRadius: Radius,
    borderWidth: LineWidth,
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  subhead: { paddingTop: Spacing.xs },
  list: { gap: Spacing.sm },
  year: { paddingTop: Spacing.xs },
  more: { alignSelf: 'center', paddingVertical: Spacing.xs },
  toggle: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius,
    backgroundColor: Colors.fill,
  },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.xxs },
  chip: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs / 2,
    borderRadius: Radius,
    backgroundColor: Colors.fill,
    overflow: 'hidden',
  },
  chipOn: { backgroundColor: Colors.primarySoft },
  row: { gap: Spacing.xxs, paddingVertical: Spacing.sm, borderBottomWidth: LineWidth, borderBottomColor: Colors.hair },
});
