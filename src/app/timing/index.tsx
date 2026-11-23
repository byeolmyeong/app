import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CardFail } from '@/components/card-fail';
import { MakingView } from '@/components/making-view';
import { NavBar } from '@/components/nav-bar';
import { OfflineBanner } from '@/components/offline-banner';
import { Screen } from '@/components/screen';
import { SkeletonGroup } from '@/components/skeleton';
import { StateScreen } from '@/components/state-screen';
import { Txt } from '@/components/txt';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { useOnReconnect, useOnline } from '@/components/use-online';
import { TimingLayout as L } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { birthInputOf } from '@/features/chart/birth-input';
import { ChartEmpty } from '@/features/chart/chart-empty';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { MainTabs } from '@/features/home/main-tabs';
import { ShareEntry } from '@/features/share/share-entry';
import { koreaToday } from '@/features/timing/dates';
import { LifeSkeleton, LifeView } from '@/features/timing/life-view';
import { MonthSkeleton, MonthView } from '@/features/timing/month-view';
import {
  ChipRow,
  ChipsSkeleton,
  DetailCard,
  DetailCardSkeleton,
  LockedView,
  NowCard,
  NowCardSkeleton,
  PracticeCards,
  TIMING_CHIPS,
  type TimingChip,
} from '@/features/timing/timing-parts';
import { useMonth } from '@/features/timing/use-month';
import { shownTiming } from '@/features/timing/time-known';
import { useTimingReport } from '@/features/timing/use-timing-report';
import { YearSkeleton, YearView, mainInterval } from '@/features/timing/year-view';
import { useGenerationBusy } from '@/features/update/update-gate';

const T = strings.timing;
const ST = strings.states;

/**
 * 시기 탭(결정 049 · 050 · 061 · 065, 캔버스 14 · 14 받기 전 · 14-1 · 14-2 · 14 잠긴 칩 · 14-7 · 14-8).
 * - 시기 풀이를 받기 전: 이번 달만 열린다(올해 · 인생 칩은 잠김 — 누르면 그 자리에 자물쇠 카드), 이번 달 아래에 "자세한 풀이" 카드.
 * - 받기 → 쓰는 중(14-7, 머리 · 아래 탭 없음) → 다 쓰면 올해 칩. 끝까지 못 쓰면 14-8(다시 쓰기 · 나중에 하기).
 * - 받은 뒤: 맨 위 "지금 나의 시기"(대표 구간 — 누르면 시기 자세히) · 처음 고른 칩은 올해(`/timing?tab=month|year|life` 로 고를 수 있다).
 * 처음 불러올 때 0.3초가 넘으면 뼈대, 10초면 보드 19, 볼 게 없는데 끊기면 20-1. 받은 시기 풀이는 기기의 것을 먼저 보인다.
 * 받기 전 · 쓰는 중인 것도 기기가 기억하면 뼈대 없이 곧바로 그 화면 — 이번 달이 늦으면 달력 자리만 기다린다(소유자 지적 2026-11-21).
 * 탭의 첫 화면이라 뒤로 가기가 없고 아래 탭이 있다(결정 046 의 2). 면책 문구는 두지 않는다(결정 064 의 3 — 시안 14 대로).
 */
export default function TimingScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const { ready } = useSession();
  const { loaded, profile } = useBirthProfile();
  // 세션 확인과 기기 저장소 읽기가 끝난 뒤에 서버를 부른다
  const birth = useMemo(() => (ready && profile ? birthInputOf(profile) : null), [ready, profile]);
  const timing = useTimingReport(birth);
  const month = useMonth(birth);
  const online = useOnline();
  // 달력의 "오늘" — 화면이 뜬 때로 한 번 정한다(그리는 동안 시계를 읽지 않는다)
  const [today] = useState(() => koreaToday());
  const [picked, setPicked] = useState<TimingChip | null>(null);
  /** 이 화면에서 받기를 눌렀나 — 누른 직후의 쓰는 중만 머리 · 아래 탭 없이(14-7), 열었을 때 이미 쓰는 중이면 탭이 있는 틀 안에 */
  const [requested, setRequested] = useState(false);
  const s = timing.state;
  const done = s.status === 'done';
  // 처음 고른 칩: 주소의 tab, 없으면 시기 풀이를 받았으면 올해 · 아니면 이번 달(결정 049 의 1)
  const chip = picked ?? TIMING_CHIPS.find((c) => c === tab) ?? (done ? 'year' : 'month');
  // 쓰는 중이거나 방금 다 쓰인 풀이가 떠 있는 동안 강제 업데이트를 미룬다(결정 027)
  useGenerationBusy(s.status === 'writing', done);

  const start = () => {
    // 다 쓰면 올해 칩으로(결정 049 의 7) — 고른 칩을 비운다
    setPicked(null);
    setRequested(true);
    timing.start();
  };
  const reload = () => {
    if (s.status !== 'done') timing.recheck();
    if (month.state.status === 'failed') month.retry();
  };
  // 연결이 돌아오면 상태만 다시 묻는다(GET) — 만들기(POST)는 사람이 누를 때만(결정 061 의 4)
  useOnReconnect(online, () => {
    if (s.status === 'done') timing.refresh();
    else if (s.status === 'unknown' || (s.status === 'failed' && s.stage === 'poll' && s.error === 'NETWORK')) timing.recheck();
    if (month.state.status === 'failed') month.retry();
  });

  // 처음 불러올 때: 시기 풀이의 상태를 처음 묻는 중이거나(기기에 기억한 것이 없다), 받기 전인데 이번 달을 아직 받지 못했다
  const monthPending = month.base === null && month.state.status === 'loading';
  const loading = loaded && profile !== null && (s.status === 'checking' || (!done && monthPending));
  const phase = useLoadingPhase(loading);
  // 이번 달 자리만 기다릴 때의 0.3초(시기 풀이의 상태는 안다 — 화면은 곧바로, 달력 자리만 비웠다가 뼈대)
  const monthPhase = useLoadingPhase(loaded && profile !== null && monthPending);

  const nav = <NavBar title={T.title} chevron />;
  const tabs = <MainTabs active="timing" />;

  if (loaded && !profile)
    return (
      <Screen nav={nav} footer={tabs}>
        <ChartEmpty />
      </Screen>
    );

  // 쓰는 중(14-7): 받기를 누른 직후는 머리 · 아래 탭 없이 별명 짓는 중과 같은 그림 · 시기 문구.
  // 다른 곳에서 받기를 눌러 열었을 때 이미 쓰는 중이면(길면 몇 분) 아래 탭이 있는 틀 안에 — 그동안 다른 탭으로 갈 수 있게(리뷰 #49 · #63).
  // 쓰는 중에는 머리가 없다(소유자, 빌드 13)
  if (s.status === 'writing')
    return requested ? (
      <MakingView title={T.making.title} lines={T.making.lines} />
    ) : (
      <MakingView tabs={tabs} title={T.making.title} lines={T.making.lines} />
    );

  if (s.status === 'failed') {
    if (s.error === 'NETWORK' && !online)
      return (
        <StateScreen
          nav={nav}
          tabs={tabs}
          title={ST.offlineEmpty.title}
          body={ST.offlineEmpty.body}
          primary={{ label: ST.offlineEmpty.retry, onPress: s.stage === 'request' ? start : timing.recheck }}
        />
      );
    // 쓰는 중 확인만 못 했으면(서버는 쓰고 있을 수 있다) 보드 19 — 다시 보기는 상태만 묻는다
    if (s.stage === 'poll' && s.error !== 'FAILED')
      return (
        <StateScreen nav={nav} tabs={tabs} title={T.loadFail.report} body={ST.loadFail.body} primary={{ label: ST.loadFail.retry, onPress: timing.recheck }} />
      );
    // 끝까지 못 썼거나 시작하지 못했으면 14-8: 다시 쓰기 · 그 위 나중에 하기(받기 전으로), 머리 · 아래 탭 없이
    return (
      <StateScreen
        title={T.writeFail}
        body={s.error === 'LIMIT' ? T.limit : ST.writeFail.body}
        primary={{ label: ST.writeFail.retry, onPress: start }}
        later={{ label: T.later, onPress: timing.dismiss }}
      />
    );
  }

  // 볼 것이 하나도 없는데 못 불러왔으면 화면 전체(19 · 끊겼으면 20-1) — 아래 탭은 남는다
  const nothing = !done && month.base === null && (month.state.status === 'failed' || phase === 'timeout');
  if (nothing)
    return !online ? (
      <StateScreen nav={nav} tabs={tabs} title={ST.offlineEmpty.title} body={ST.offlineEmpty.body} primary={{ label: ST.offlineEmpty.retry, onPress: reload }} />
    ) : (
      <StateScreen nav={nav} tabs={tabs} title={T.loadFail.title} body={ST.loadFail.body} primary={{ label: ST.loadFail.retry, onPress: reload }} />
    );

  // 화면 전체의 뼈대는 시기 풀이의 상태를 모를 때만(기억이 없다) — 상태를 알면 그 화면을 곧바로 그리고 달력 자리만 기다린다
  if (s.status === 'checking')
    return (
      <Screen nav={nav} footer={tabs}>
        {phase === 'skeleton' ? <TimingTabSkeleton chip={TIMING_CHIPS.find((c) => c === tab) ?? 'month'} month={today.slice(0, 7)} /> : null}
      </Screen>
    );

  // 시각 "모름" 이면 받았더라도 돈 · 운명적 만남 구간은 맨 위 카드 · 작은 실천에도 없다(이중 안전)
  const report = done ? shownTiming(s.report) : null;
  const main = report ? mainInterval(report) : null;
  const timeKnown = report ? report.timeKnown : month.state.status === 'done' ? month.state.sky.timeKnown : true;
  const blocked = s.status === 'none' && s.blocked === true;

  let content: React.ReactNode;
  if (chip === 'month')
    content = (
      <>
        {monthPending ? (
          <MonthPending month={today.slice(0, 7)} visible={monthPhase !== 'blank'} />
        ) : month.base && month.drawn.month ? (
          // 그릴 달(drawn): 고른 달을 받는 중이면 이전 달 그림 그대로 — 다 받으면 한 번에 바뀐다(처음 넘길 때 반짝임, 빌드 11)
          <MonthView
            base={month.base}
            shown={month.drawn.month}
            state={month.drawn.state}
            canPrev={month.canPrev}
            canNext={month.canNext}
            onMove={month.go}
            onRetry={month.retry}
            today={today}
            // 오늘을 누르면 오늘의 하늘(결정 051 의 3), 다른 날은 그날의 하늘
            onDay={(date) => router.push(date === today ? '/today' : `/timing/day?date=${date}`)}
          />
        ) : (
          <CardFail
            kicker={T.month.loadFail.kicker}
            title={T.month.loadFail.title}
            body={T.month.loadFail.body}
            retry={{ label: ST.loadFail.retry, onPress: month.retry }}
          />
        )}
        {main?.practices ? <PracticeCards practices={main.practices} /> : null}
        {report ? null : s.status === 'unknown' ? (
          <CardFail kicker={T.detail.kicker} title={T.loadFail.report} body={T.loadFail.body} retry={{ label: ST.loadFail.retry, onPress: timing.recheck }} />
        ) : (
          <DetailCard blocked={blocked} onRequest={start} />
        )}
      </>
    );
  else if (!report) content = <LockedView chip={chip} blocked={blocked} onRequest={start} />;
  else if (chip === 'year') content = <YearView report={report} onPeriod={(id) => router.push(`/timing/period?id=${id}`)} />;
  else content = <LifeView report={report} share={<ShareEntry target={{ kind: 'NEXT_BIG' }} trigger="cardIcon" label={strings.share.openNextBig} />} />;

  return (
    <Screen nav={nav} footer={tabs}>
      {online ? null : <OfflineBanner />}
      {/* 한 덩어리로 둔다 — 화면의 칸 사이 간격(16)이 끼지 않게 시안 14 의 간격 그대로 */}
      <View>
        {main ? <NowCard interval={main} onPress={main.detail ? () => router.push(`/timing/period?id=${main.id}`) : undefined} /> : null}
        {timeKnown ? null : (
          <Txt variant="caption" color="gray" style={styles.timeUnknown}>
            {T.timeUnknown}
          </Txt>
        )}
        {/* 칩 줄은 세 칩에서 같은 자리 — 잠긴 칩을 골라도 이번 달의 자리 그대로(소유자 지적 2026-11-21) */}
        <View testID="timing-chips-slot" style={main ? styles.chips : styles.chipsBare}>
          <ChipRow value={chip} locked={!report} onChange={setPicked} />
        </View>
        <View style={styles.content}>{content}</View>
      </View>
    </Screen>
  );
}

/**
 * 처음 불러올 때의 뼈대(결정 065 의 2 · 071): 다 그려질 시기 탭의 배치를 본뜬다. 받아 둔 시기 풀이가 없을 때만 보이므로 이번 달이면 받기 전의 모양
 * (칩 · 이번 달 · 자세한 풀이 카드), 주소가 올해 · 인생을 고르면 받은 뒤의 모양(지금 나의 시기 · 칩 · 그 칩).
 */
function TimingTabSkeleton({ chip, month }: { chip: TimingChip; month: string }) {
  const done = chip !== 'month';
  return (
    <SkeletonGroup testID="timing-skeleton">
      {done ? <NowCardSkeleton /> : null}
      <View style={done ? styles.chips : styles.chipsBare}>
        <ChipsSkeleton />
      </View>
      <View style={styles.content}>
        {chip === 'month' ? (
          <>
            <MonthSkeleton month={month} />
            <DetailCardSkeleton />
          </>
        ) : chip === 'year' ? (
          <YearSkeleton />
        ) : (
          <LifeSkeleton />
        )}
      </View>
    </SkeletonGroup>
  );
}

/**
 * 이번 달이 아직 오지 않은 달력 자리(소유자 지적 3): 0.3초 전에는 같은 크기로 비워 두고(달이 빨리 와도 아래 카드가 밀려 내려가지 않게),
 * 넘으면 이번 달의 뼈대(결정 065 의 2 · 071).
 */
function MonthPending({ month, visible }: { month: string; visible: boolean }) {
  return visible ? (
    <SkeletonGroup testID="timing-month-skeleton">
      <MonthSkeleton month={month} />
    </SkeletonGroup>
  ) : (
    <View testID="timing-month-pending" aria-hidden importantForAccessibility="no-hide-descendants" style={styles.reserved}>
      <MonthSkeleton month={month} />
    </View>
  );
}

const styles = StyleSheet.create({
  timeUnknown: { marginTop: L.timeUnknownTop },
  chips: { marginTop: L.chips.top },
  chipsBare: { marginTop: L.chips.topBare },
  content: { paddingTop: L.contentTop, gap: L.sectionGap },
  reserved: { opacity: 0 },
});
