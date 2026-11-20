import { useId } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { CardFail } from '@/components/card-fail';
import { Txt } from '@/components/txt';
import { Colors, FontWeight, LineWidth, Spacing, TimingLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { formatMonth } from '@/features/timing/dates';
import { Skeleton, SkeletonGroup, SkeletonText } from '@/components/skeleton';
import { ChevronRight, SkBlock, TodoList } from '@/features/timing/timing-parts';
import type { TimingReportView } from '@/features/timing/use-timing-report';
import { shownTiming } from '@/features/timing/time-known';
import { mainInterval } from '@/features/timing/year-view';

const T = strings.timing;
const H = L.home;
const P = L.period;
/** 서버에 시기 풀이 경로가 아직 없을 때(계획 "위험" — 홈은 그 칸을 숨긴다) */
const NOT_FOUND = 404;

/** 카드 머리: 이름표(주색 글자)와 꺾쇠 */
function Head({ label }: { label: string }) {
  return (
    <View style={styles.head}>
      <Txt variant="captionStrong" color="accentText">
        {label}
      </Txt>
      <ChevronRight size={H.chevron} />
    </View>
  );
}

/** 지나온 시기 — 지금 — 다음 큰 변화의 해 줄(보드 11). "지금" 점의 자리는 시안의 그림 그대로다(날짜로 셈하지 않는다) */
function NowLine({ nextYear }: { nextYear: number | null }) {
  const id = `homeLine${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={styles.lineBox}>
      <View style={styles.track}>
        <Svg style={styles.trackLine} width="100%" height={LineWidth * 2}>
          <Defs>
            <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={Colors.hair} />
              <Stop offset={String(H.litAt)} stopColor={Colors.primary} />
              <Stop offset="1" stopColor={Colors.hair} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height={LineWidth * 2} fill={`url(#${id})`} />
        </Svg>
        <View style={[styles.dot, styles.dotStart]} />
        <View style={[styles.dot, styles.dotEnd]} />
        <View style={[styles.now, { left: `${H.nowAt * 100}%` }]} />
      </View>
      <View style={styles.labels}>
        <Txt variant="badge" color="hint" style={styles.labelStart}>
          {T.home.past}
        </Txt>
        <View style={[styles.nowLabel, { left: `${H.nowAt * 100}%` }]}>
          <Txt variant="badge">{T.home.now}</Txt>
        </View>
        {nextYear !== null ? (
          <Txt variant="badge" color="hint" style={styles.labelEnd}>
            {`${nextYear}${T.home.bigSuffix}`}
          </Txt>
        ) : null}
      </View>
    </View>
  );
}

/**
 * 홈의 시기 칸(결정 047 의 1-4 · 1-5, 보드 11 · 11-1 · 11-2): 시기 풀이가 다 됐으면 "지금 나의 시기"(지나온 · 지금 · 다음 큰 변화의 해 줄,
 * 대표 구간의 이름 · "○○○○년 ○월까지") · "이 시기의 작은 실천" 셋, 없으면 "지금 나는 어떤 시기일까 · 자세한 풀이 받기"(시기 탭으로),
 * 쓰는 중이면 칸이 없다. 상태를 못 물었으면 그 자리에 안내(19-1) — 서버에 그 경로가 없으면(404) 칸을 숨긴다. 누르면 시기 탭.
 */
export function HomeTimingCards({
  state,
  skeleton,
  online,
  onOpen,
  onRetry,
}: {
  state: TimingReportView;
  /** 처음 묻는 중이 0.3초를 넘었다(결정 065 의 2) — 다 그려질 칸을 본뜬 뼈대 */
  skeleton: boolean;
  online: boolean;
  onOpen: () => void;
  onRetry: () => void;
}) {
  if (state.status === 'checking') return skeleton ? <HomeTimingSkeleton /> : null;
  if (state.status === 'none')
    return (
      <View testID="home-timing-empty" style={styles.card}>
        <Txt variant="captionStrong" color="accentText">
          {T.now}
        </Txt>
        <Txt variant="emphasis" keepAll style={styles.emptyTitle}>
          {T.home.emptyTitle}
        </Txt>
        <Txt variant="desc" color="gray" keepAll style={styles.sub}>
          {T.home.emptyBody}
        </Txt>
        <Pressable accessibilityRole="button" onPress={onOpen} style={styles.link}>
          <Txt variant="term">{T.home.request}</Txt>
          <ChevronRight color={Colors.ink} />
        </Pressable>
      </View>
    );
  if (state.status === 'unknown')
    return state.code === NOT_FOUND || !online ? null : (
      <CardFail kicker={T.now} title={T.loadFail.report} body={T.loadFail.body} retry={{ label: strings.states.loadFail.retry, onPress: onRetry }} />
    );
  if (state.status !== 'done') return null;
  const report = shownTiming(state.report);
  const main = mainInterval(report);
  if (!main) return null;
  return (
    <>
      <Pressable testID="home-timing-card" accessibilityRole="button" onPress={onOpen} style={styles.card}>
        <Head label={T.now} />
        <NowLine nextYear={report.current.nextMilestone?.year ?? null} />
        <Txt variant="emphasis" keepAll style={styles.title}>
          {main.title}
        </Txt>
        <Txt variant="desc" color="gray" style={styles.sub}>
          {`${formatMonth(main.to)}${T.date.untilSuffix}`}
        </Txt>
      </Pressable>
      {main.practices ? (
        <Pressable testID="home-timing-practices" accessibilityRole="button" onPress={onOpen} style={styles.card}>
          <Head label={T.practices} />
          <View style={styles.todos}>
            <TodoList items={main.practices} />
          </View>
        </Pressable>
      ) : null}
    </>
  );
}

/** 홈 시기 칸의 뼈대(결정 071, 보드 24): 다 그려진 "지금 나의 시기" 카드(이름표 · 줄 · 이름 · 언제까지)와 작은 실천 카드(셋)를 본뜬다 */
export function HomeTimingSkeleton() {
  return (
    <SkeletonGroup testID="home-timing-skeleton">
      <View style={styles.cards}>
      <SkBlock of="home-timing-card" style={styles.card}>
        <SkeletonText widths={['36%']} variant="captionStrong" />
        <View style={styles.lineBox}>
          <Skeleton width="100%" height={P.track} pill />
          <View style={styles.labels} />
        </View>
        <SkeletonText widths={['66%']} variant="emphasis" style={styles.title} />
        <SkeletonText widths={['40%']} variant="desc" style={styles.sub} />
      </SkBlock>
      <SkBlock of="home-timing-practices" style={styles.card}>
        <SkeletonText widths={['40%']} variant="captionStrong" />
        <View style={styles.todos}>
          {[0, 1, 2].map((i) => (
            <View key={i} testID="sk-timing-todo" style={styles.todo}>
              <Skeleton width={L.badge} height={L.badge} pill />
              <SkeletonText widths={[i === 1 ? '50%' : '62%']} variant="item" style={styles.flex} />
            </View>
          ))}
        </View>
      </SkBlock>
      </View>
    </SkeletonGroup>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: H.pad,
    borderRadius: H.radius,
    borderWidth: LineWidth,
    borderColor: Colors.hair,
    backgroundColor: Colors.raised,
  },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lineBox: { marginTop: H.lineTop },
  track: { height: P.track, marginHorizontal: P.trackInset },
  trackLine: { position: 'absolute', left: 0, right: 0, top: (P.track - LineWidth * 2) / 2 },
  dot: { position: 'absolute', top: (P.track - P.dot) / 2, width: P.dot, height: P.dot, borderRadius: P.dot / 2, backgroundColor: Colors.muted },
  dotStart: { left: -P.trackInset },
  dotEnd: { right: -P.trackInset },
  now: {
    position: 'absolute',
    top: 0,
    width: P.now,
    height: P.now,
    marginLeft: -P.now / 2,
    borderRadius: P.now / 2,
    backgroundColor: Colors.primary,
    boxShadow: `0 0 10px ${Colors.primary}`,
  },
  labels: { marginTop: P.labelsTop, height: P.labels },
  labelStart: { position: 'absolute', left: 0, fontWeight: FontWeight.regular },
  labelEnd: { position: 'absolute', right: 0, fontWeight: FontWeight.regular },
  nowLabel: { position: 'absolute', width: L.hero.art, marginLeft: P.trackInset - L.hero.art / 2, alignItems: 'center' },
  title: { marginTop: H.titleTop },
  emptyTitle: { marginTop: H.emptyTitleTop },
  sub: { marginTop: H.subTop },
  link: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: Spacing.hairline, marginTop: H.linkTop },
  todos: { marginTop: H.todosTop },
  /** 뼈대 두 카드 사이 — 홈의 카드 사이(보드 11)와 같다 */
  cards: { gap: H.cardGap },
  todo: { flexDirection: 'row', alignItems: 'center', gap: L.card.gap, minHeight: L.day.todo },
  flex: { flex: 1 },
});
