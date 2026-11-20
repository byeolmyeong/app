import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';

import { NavBar } from '@/components/nav-bar';
import { OfflineBanner } from '@/components/offline-banner';
import { Screen } from '@/components/screen';
import { StateScreen } from '@/components/state-screen';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { useOnline } from '@/components/use-online';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { birthInputOf } from '@/features/chart/birth-input';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { MainTabs } from '@/features/home/main-tabs';
import { PeriodSkeleton, PeriodView } from '@/features/timing/period-view';
import { shownTiming } from '@/features/timing/time-known';
import { useTimingReport } from '@/features/timing/use-timing-report';

const T = strings.timing;
const ST = strings.states;

/** 뒤로: 시기 탭에서 왔으면 그리로, 주소로 바로 열었으면 시기 탭으로 */
const back = () => (router.canGoBack() ? router.back() : router.replace('/timing'));

/**
 * 시기 자세히 `/timing/period?id=`(결정 049 의 5, 캔버스 14-3). 받아 둔 시기 풀이(기기 → 뒤에서 새로)에서 그 구간을 찾아 그린다.
 * 자세한 글(detail)이 있는 구간만 열린다 — 없거나 시기 풀이가 없으면 시기 탭으로 가는 안내. 뒤로 가기와 아래 탭(시기)이 있다.
 * "지금" 자리는 서버의 오늘(current.date)로 놓는다.
 */
export default function TimingPeriodScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { ready } = useSession();
  const { profile, chart } = useBirthProfile();
  const birth = useMemo(() => (ready && profile ? birthInputOf(profile) : null), [ready, profile]);
  const timing = useTimingReport(birth);
  const online = useOnline();
  const s = timing.state;
  const phase = useLoadingPhase(s.status === 'checking');
  const nav = <NavBar title={T.period.title} chevron onBack={back} />;
  const tabs = <MainTabs active="timing" nested />;

  if (s.status === 'checking' && phase !== 'timeout')
    return (
      <Screen nav={nav} footer={tabs}>
        {phase === 'skeleton' ? <PeriodSkeleton /> : null}
      </Screen>
    );

  // 시기 풀이의 상태를 묻지 못했으면 보드 19(끊겼으면 20-1) — 다시 보기는 상태만 묻는다
  if (s.status === 'unknown' || s.status === 'checking')
    return online ? (
      <StateScreen nav={nav} tabs={tabs} title={T.loadFail.report} body={ST.loadFail.body} primary={{ label: ST.loadFail.retry, onPress: timing.recheck }} />
    ) : (
      <StateScreen nav={nav} tabs={tabs} title={ST.offlineEmpty.title} body={ST.offlineEmpty.body} primary={{ label: ST.offlineEmpty.retry, onPress: timing.recheck }} />
    );

  // 시각 "모름" 이면 받았더라도 돈 · 운명적 만남 구간은 열지 않는다(이중 안전)
  const interval = s.status === 'done' ? shownTiming(s.report).intervals.find((i) => i.id === id) : undefined;
  if (s.status !== 'done' || !interval?.detail)
    return (
      <StateScreen
        nav={nav}
        tabs={tabs}
        title={T.period.missing.title}
        body={T.period.missing.body}
        primary={{ label: T.period.missing.back, onPress: () => router.replace('/timing') }}
      />
    );

  return (
    <Screen nav={nav} footer={tabs}>
      {online ? null : <OfflineBanner />}
      <PeriodView interval={interval} detail={interval.detail} today={s.report.current.date} chart={chart} />
    </Screen>
  );
}
