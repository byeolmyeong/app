import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { NavBar } from '@/components/nav-bar';
import { OfflineBanner } from '@/components/offline-banner';
import { Screen } from '@/components/screen';
import { SkeletonGroup } from '@/components/skeleton';
import { StateScreen } from '@/components/state-screen';
import { Txt } from '@/components/txt';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { useOnReconnect, useOnline } from '@/components/use-online';
import { Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { recheckSession, useSession } from '@/features/auth/use-session';
import { BirthForm } from '@/features/chart/birth-form';
import { birthInputOf } from '@/features/chart/birth-input';
import { signName } from '@/features/chart/chart-rows';
import { CONSTELLATIONS } from '@/features/chart/constellations';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { useBirthRestore } from '@/features/chart/use-birth-restore';
import { daysSince } from '@/features/home/days-since';
import { markHomeReady } from '@/features/home/home-ready';
import { MainTabs } from '@/features/home/main-tabs';
import { NicknameCard, NicknameCardSkeleton } from '@/features/home/nickname-card';
import { useAccount } from '@/features/home/use-account';
import { HomeBell } from '@/features/notifications/home-bell';
import { hasUnread } from '@/features/notifications/notification-rows';
import { useNotifications } from '@/features/notifications/use-notifications';
import { useStoredHeadline } from '@/features/reading/use-reading';
import { onPushReceived } from '@/features/push/push';
import { PushAskSheet } from '@/features/push/push-ask-sheet';
import { HomeTimingCards, HomeTimingSkeleton } from '@/features/timing/home-timing-card';
import { HomeTodayCard, HomeTodaySkeleton } from '@/features/timing/home-today-card';
import { prefetchMeReport } from '@/features/me/use-me-report';
import { prefetchMonth } from '@/features/timing/use-month';
import { TODAY_CARD_WRITING_AFTER_MS, useTodaySky, useWritingAfter } from '@/features/timing/use-today-sky';
import { useTimingReport } from '@/features/timing/use-timing-report';

/**
 * 홈 v2(결정 047 · 055, 보드 11 · 11-1 · 11-2). 출생 정보가 있으면 머리(로고) · 별명 카드 · 지금 나의 시기 · 작은 실천 · 아래 탭 넷을 보여 주고
 * 머리 오른쪽에 알림 종, 별명 카드 아래 오늘의 하늘 카드(A④), 없으면 출생 정보 입력부터 받는다. 시기 칸은 시기 풀이의 상태만 묻는다(기기에 받아 둔 것을 먼저).
 * 기기 저장소를 읽기 전에는 아무것도 그리지 않는다(입력 화면이 잠깐 비쳤다가 바뀌지 않게).
 * 기기에 출생 정보가 없고 세션이 있으면 서버에 저장된 것으로 한 번 되살려 본다(결정 029). 그동안 0.3초가 넘으면 되살린 뒤의 홈을 본뜬 뼈대를
 * 보여 주고(결정 071), 되살리지 못하면 입력부터 받는다. 처음 열 때는 이 사이를 스플래시가 가린다(결정 068 의 2, home-ready.ts) —
 * 뼈대가 보이는 때는 스플래시가 이미 걷힌 뒤(로그인하고 오기 · 19 의 다시 보기 · 앱 스플래시가 5초를 넘김)다.
 */
export default function HomeScreen() {
  // 불러오지 못한 화면(19)의 "다시 보기" 는 처음부터(기기 읽기 · 되살리기) 다시 한다
  const [attempt, setAttempt] = useState(0);
  return <Home key={attempt} onRetry={() => setAttempt((n) => n + 1)} />;
}

function Home({ onRetry }: { onRetry: () => void }) {
  const { loaded, profile, chart, save } = useBirthProfile();
  const session = useSession();
  const empty = loaded && !profile;
  const canRestore = empty && session.status === 'signedIn';
  const restoreSettled = useBirthRestore(canRestore, save);
  // 받아 둔 풀이가 있으면 한 줄 총평을 홈에 올린다(서버를 부르지 않는다).
  const input = useMemo(() => (profile ? birthInputOf(profile) : null), [profile]);
  // 옛 모양으로 받아 둔 풀이도 한 줄 별명은 그대로(업데이트 직후 — 홈은 풀이를 부르지 않는다)
  const { stored: reading } = useStoredHeadline(input);
  // "별명을 받은 지 N일" 의 오늘 — 화면이 뜬 때로 한 번 정한다(그리는 동안 시계를 읽지 않는다)
  const [now] = useState(Date.now);
  // 연결 끊김(결정 061 의 4): 받아 둔 것은 그대로 보이고 머리 아래에 띠(보드 20)
  const online = useOnline();
  // 웹이 시작할 때 서버에 닿지 못해 세션을 확인하지 못했다(결정 068 의 4) — 받아 둔 것을 보이고 띠를 둔다
  const unreachable = session.status === 'offline';
  const account = useAccount(online);
  // 홈의 첫 데이터(결정 068 의 2): 기기를 읽고, 없으면 되살려 그릴 것이 정해질 때까지 루트가 스플래시를 둔다.
  // 10초가 넘으면 스플래시를 걷고 불러오지 못한 화면(19, 결정 065)
  const firstData = loaded && !(empty && (!session.ready || (canRestore && !restoreSettled)));
  const phase = useLoadingPhase(!firstData);
  // 시기 칸(결정 047 의 1-4 · 1-5): 로그인이 확인된 뒤에만 묻는다(세션 확인 전의 401 이 보관 토큰을 지우지 않게 — 리뷰 PR #41)
  const asking = session.ready && session.status === 'signedIn' ? input : null;
  // 홈은 상태만 본다 — 쓰는 중이어도 5초마다 묻지 않는다(홈을 열 때마다 새로 묻는다, 리뷰 #63)
  const timing = useTimingReport(asking, { poll: false });
  const timingPhase = useLoadingPhase(asking !== null && timing.state.status === 'checking');
  useOnReconnect(online, () => {
    if (timing.state.status === 'done') timing.refresh();
    else if (timing.state.status === 'unknown') timing.recheck();
  });
  // 쓰는 중 카드(결정 075 — 047 의 1-5 대체): 홈은 5초마다 묻지 않는다. 끝났는지는 시기 풀이 완성 푸시가 오거나(앱), 홈이 다시 보이거나
  // 앱으로 돌아올 때(웹 · 푸시를 끈 사람) 한 번 다시 물어 같은 자리에서 완료 카드로 바꾼다 — 화면이 떠 있는 동안 서버를 거듭 부르지 않게
  const timingWriting = useRef(false);
  const timingIsWriting = timing.state.status === 'writing';
  useEffect(() => {
    timingWriting.current = timingIsWriting;
  }, [timingIsWriting]);
  const { recheck: recheckTiming } = timing;
  useEffect(
    () =>
      onPushReceived((push) => {
        if (push.type === 'TIMING_REPORT_DONE') recheckTiming();
      }),
    [recheckTiming],
  );
  useFocusEffect(
    useCallback(() => {
      if (timingWriting.current) recheckTiming();
    }, [recheckTiming]),
  );
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && timingWriting.current) recheckTiming();
    });
    return () => sub.remove();
  }, [recheckTiming]);
  // 앱을 켤 때 이번 달 달력 · 나 탭 풀이의 상태를 한 번 받아 둔다 — 그 탭을 열면 곧바로(결정 075 의 4). 스플래시는 이것을 기다리지 않는다
  useEffect(() => {
    if (!asking) return;
    void prefetchMonth(asking);
    void prefetchMeReport(asking);
  }, [asking]);
  // 오늘의 하늘 칸(결정 047 의 1-3 · 051): 기기에 둔 오늘 것을 먼저, 없으면 날짜 없이 POST /day-sky(그날 처음이면 서버가 그때 쓴다)
  const today = useTodaySky(asking);
  const todayLoading = asking !== null && today.state.status === 'loading';
  const todayWriting = useWritingAfter(todayLoading, TODAY_CARD_WRITING_AFTER_MS);
  // 처음 들어올 때 스플래시는 홈 카드의 첫 상태까지 가린다 — 받아 둔 것(기기) 또는 서버의 상태 응답, 오늘의 하늘은 글이나 쓰는 중(1초)까지.
  // 그래야 스플래시를 걷는 첫 그림부터 카드이고 뼈대가 보이지 않는다(소유자 "접속하자마자 바로"). 카드가 10초 넘게 모르면 그대로 걷는다
  const cardsKnown = asking === null || (timing.state.status !== 'checking' && (!todayLoading || todayWriting));
  const cardsPhase = useLoadingPhase(firstData && !cardsKnown);
  useEffect(() => {
    if ((firstData && (cardsKnown || cardsPhase === 'timeout')) || phase === 'timeout') markHomeReady();
  }, [firstData, cardsKnown, cardsPhase, phase]);
  // 끊겨서 못 받았을 때만 연결이 돌아오면 다시 묻는다 — 못 쓴(502) · 한도(429)는 사람이 "다시 쓰기" 를 누를 때만(리뷰 #66)
  useOnReconnect(online, () => {
    if (today.state.status === 'failed' && today.state.error === 'NETWORK') today.retry();
  });
  // 머리의 종(결정 052 의 4): 홈을 열 때 · 알림함에서 돌아올 때 다시 묻는다. 서버에 알림함이 없으면(404 — S⑤ 전) 종을 숨긴다.
  // 종은 출생 정보가 있는 홈에만 — 입력 · 되살리는 중 · 실패 화면의 머리에는 두지 않는다(리뷰 #66)
  const notifications = useNotifications().state;
  const bell =
    notifications.status === 'failed' && notifications.httpStatus === 404 ? null : (
      <HomeBell unread={notifications.status === 'ready' && hasUnread(notifications.list)} onPress={() => router.push('/notifications')} />
    );
  const nav = <NavBar tall left={<BrandMark height={Sizes.brandMarkHeight} />} />;
  const homeNav = <NavBar tall left={<BrandMark height={Sizes.brandMarkHeight} />} right={bell} />;
  if (phase === 'timeout')
    return (
      <StateScreen
        nav={nav}
        tabs={<MainTabs active="home" />}
        title={strings.states.loadFail.title.home}
        body={strings.states.loadFail.body}
        primary={{ label: strings.states.loadFail.retry, onPress: onRetry }}
      />
    );
  if (!loaded) return <Screen nav={nav}>{null}</Screen>;
  // 웹이 시작할 때 서버에 닿지 못했다(결정 068 의 4): 받아 둔 홈이 없으면 볼 게 없는 화면 — 다시 시도는 세션을 다시 확인한다
  // 인터넷은 되는데 서버만 닿지 않으면 끊김(20-1)이 아니라 "불러오지 못했어요"(19) — 소유자 2026-11-21
  if (unreachable && empty)
    return online ? (
      <StateScreen
        nav={nav}
        title={strings.states.loadFail.title.home}
        body={strings.states.loadFail.body}
        primary={{ label: strings.states.loadFail.retry, onPress: () => void recheckSession() }}
      />
    ) : (
      <StateScreen
        nav={nav}
        title={strings.states.offlineEmpty.title}
        body={strings.states.offlineEmpty.body}
        primary={{ label: strings.states.offlineEmpty.retry, onPress: () => void recheckSession() }}
      />
    );
  // 되살리는 동안(결정 029): 되살린 뒤의 홈(받아 둔 풀이가 없는 별명 카드 · 오늘의 하늘 · 시기 · 작은 실천)을 본뜬 뼈대와 아래 탭(결정 071).
  // 종은 출생 정보가 있는 홈에만(리뷰 #66). 0.3초 전 빈 단계도 같은 머리 · 탭
  if (empty && (!session.ready || (canRestore && !restoreSettled)))
    return (
      <Screen nav={nav} footer={<MainTabs active="home" />}>
        {phase === 'skeleton' ? (
          <SkeletonGroup testID="home-skeleton">
            <View style={styles.column}>
              <NicknameCardSkeleton />
              <HomeTodaySkeleton />
              <HomeTimingSkeleton />
            </View>
          </SkeletonGroup>
        ) : null}
      </Screen>
    );
  if (profile && chart) {
    // 해 별자리는 서버 차트의 SUN 그대로(날짜로 셈하지 않는다, 결정 006)
    const sun = chart.positions.find((p) => p.body === 'SUN');
    return (
      <Screen nav={homeNav} footer={<MainTabs active="home" />}>
        <View testID="home-column" style={styles.column}>
          {/* "인터넷 연결이 끊겼어요" 띠는 정말 끊겼을 때만 — 서버만 닿지 않을 때는 받아 둔 것을 그대로 보인다 */}
          {online ? null : <OfflineBanner />}
          <NicknameCard
            nickname={account?.nickname ?? null}
            avatar={account?.avatar ?? null}
            sunSign={sun ? signName(sun.sign) + strings.chart.signSuffix : null}
            // 오른쪽 위 그림도 해 별자리(서버 값)로 고른다 — 사람마다 다르다
            art={sun && CONSTELLATIONS[sun.sign] ? { sign: sun.sign, ...CONSTELLATIONS[sun.sign] } : null}
            days={reading?.createdAt ? daysSince(reading.createdAt, now) : null}
            headline={reading?.headline ?? null}
            onOpen={() => router.push('/reading')}
          />
          <HomeTodayCard
            state={today.state}
            making={todayWriting || today.made === false}
            online={online}
            timeKnown={chart.timeKnown}
            onOpen={() => router.push('/today')}
            onRetry={today.retry}
          />
          {/* 누르면 시기 탭 — 탭을 바꾸는 것과 같이 쌓지 않는다(결정 046 의 2) */}
          <HomeTimingCards
            state={timing.state}
            skeleton={timingPhase === 'skeleton' || timingPhase === 'timeout'}
            online={online} onOpen={() => router.replace('/timing')} onRetry={timing.recheck} />
        </View>
        {/* 알림 받기 권유(11-10, 결정 066 — 처음 한 번, 휴대폰 권한을 아직 묻지 않았을 때) */}
        <PushAskSheet time={account?.todaySkyTime} ready={!!reading?.headline} />
      </Screen>
    );
  }
  return (
    <Screen nav={nav}>
      <View style={styles.intro}>
        <Txt variant="display">{strings.home.title}</Txt>
        <Txt variant="table" color="gray">
          {strings.home.subtitle}
        </Txt>
      </View>
      <BirthForm stored={null} save={save} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.sm, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  /** 머리 아래 12, 카드끼리 12(보드 11) */
  column: { gap: Spacing.sm, paddingTop: Spacing.sm },
});
