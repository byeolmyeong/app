import { Pressable, StyleSheet, View } from 'react-native';

import { CardFail } from '@/components/card-fail';
import { Txt } from '@/components/txt';
import { Colors, LineWidth, TimingLayout as L, TodayCardLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { formatMonth } from '@/features/timing/dates';
import { MakingArt } from '@/features/timing/home-today-card';
import { SkeletonGroup, SkeletonText } from '@/components/skeleton';
import { ChevronRight, SkBlock } from '@/features/timing/timing-parts';
import type { TimingReportView } from '@/features/timing/use-timing-report';
import { shownTiming } from '@/features/timing/time-known';
import { mainInterval } from '@/features/timing/year-view';

const T = strings.timing;
const H = L.home;
/** 서버에 시기 풀이 경로가 아직 없을 때(계획 "위험" — 홈은 그 칸을 숨긴다) */
const NOT_FOUND = 404;

/** 카드 머리: 이름표(주색 글자)와 꺾쇠 */
function Head({ label }: { label: string }) {
  return (
    <View style={styles.head}>
      <Txt variant="kicker" color="accentText">
        {label}
      </Txt>
      <ChevronRight size={H.chevron} testID="home-card-chevron" />
    </View>
  );
}

/** "2027년 1월까지 · 다음 큰 변화 2028년" — 다음 큰 변화가 없으면 언제까지만 */
export function timingLine(to: string, nextYear: number | null): string {
  const until = `${formatMonth(to)}${T.date.untilSuffix}`;
  return nextYear === null ? until : `${until}${T.home.separator}${T.home.nextPrefix}${nextYear}${T.date.yearSuffix}`;
}

/**
 * 홈의 시기 칸(결정 092 — 047 의 1-4 · 1-5 대체): 시기 풀이가 다 됐으면 "지금 나의 시기" 한 줄 카드(대표 구간의 이름 ·
 * "○○○○년 ○월까지 · 다음 큰 변화 ○○○○년"). 지나온 · 지금 · 큰 변화 줄 그림과 이 시기의 작은 실천은 시기 탭에만 둔다.
 * 없으면 "지금 나는 어떤 시기일까"(카드 전체가 시기 탭으로), 쓰는 중이면 쓰는 중 카드. 상태를 못 물었으면 그 자리에 안내(19-1) —
 * 서버에 그 경로가 없으면(404) 칸을 숨긴다. 누르면 시기 탭.
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
      // 다른 홈 카드처럼 이름표 줄 오른쪽 위 꺾쇠, 카드 전체가 눌린다 — "자세한 풀이 받기" 는 화면 읽기 이름에만(결정 080)
      <Pressable
        testID="home-timing-empty"
        accessibilityRole="button"
        accessibilityLabel={[T.now, T.home.emptyTitle, T.home.emptyBody, T.home.request].join(T.home.labelSeparator)}
        onPress={onOpen}
        style={styles.card}>
        <Head label={T.now} />
        <Txt variant="subhead" keepAll style={styles.emptyTitle}>
          {T.home.emptyTitle}
        </Txt>
        <Txt variant="small" color="gray" keepAll style={styles.sub}>
          {T.home.emptyBody}
        </Txt>
      </Pressable>
    );
  if (state.status === 'unknown')
    return state.code === NOT_FOUND || !online ? null : (
      <CardFail kicker={T.now} title={T.loadFail.report} body={T.loadFail.body} retry={{ label: strings.states.loadFail.retry, onPress: onRetry }} />
    );
  // 쓰는 중에도 칸은 그 자리에 — "만들고 있어요" 카드, 다 쓰면 같은 자리에서 완료 카드(결정 075 — 047 의 1-5 대체)
  if (state.status === 'writing')
    return (
      <View testID="home-timing-writing" accessible accessibilityLabel={T.home.writing.title} style={styles.card}>
        <Head label={T.now} />
        <View style={styles.writingRow}>
          <MakingArt />
          <View style={styles.writingText}>
            <Txt variant="subhead">{T.home.writing.title}</Txt>
            <Txt variant="caption" color="gray">
              {T.home.writing.body}
            </Txt>
          </View>
        </View>
      </View>
    );
  if (state.status !== 'done') return null;
  const report = shownTiming(state.report);
  const main = mainInterval(report);
  if (!main) return null;
  return (
    <Pressable testID="home-timing-card" accessibilityRole="button" onPress={onOpen} style={styles.card}>
      <Head label={T.now} />
      <Txt variant="subhead" keepAll style={styles.title}>
        {main.title}
      </Txt>
      <Txt variant="small" color="gray" style={styles.sub}>
        {timingLine(main.to, report.current.nextMilestone?.year ?? null)}
      </Txt>
    </Pressable>
  );
}

/** 홈 시기 칸의 뼈대(결정 071): 다 그려진 "지금 나의 시기" 한 줄 카드(이름표 · 이름 · 언제까지)를 본뜬다 */
export function HomeTimingSkeleton() {
  return (
    <SkeletonGroup testID="home-timing-skeleton">
      <SkBlock of="home-timing-card" style={styles.card}>
        <SkeletonText widths={['36%']} variant="kicker" />
        <SkeletonText widths={['66%']} variant="subhead" style={styles.title} />
        <SkeletonText widths={['56%']} variant="small" style={styles.sub} />
      </SkBlock>
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
  /** 이름표 줄 바로 아래 — 받기 전 카드와 같은 틈(줄 그림이 없다, 결정 092) */
  title: { marginTop: H.emptyTitleTop },
  emptyTitle: { marginTop: H.emptyTitleTop },
  sub: { marginTop: H.subTop },
  writingRow: { flexDirection: 'row', alignItems: 'center', gap: TodayCardLayout.rowGap, marginTop: TodayCardLayout.rowTop },
  writingText: { flex: 1, gap: TodayCardLayout.textGap },
});
