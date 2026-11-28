import { router } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BrandMark } from '@/components/brand-mark';
import { NavBar } from '@/components/nav-bar';
import { OfflineBanner } from '@/components/offline-banner';
import { Screen } from '@/components/screen';
import { useSplashGone } from '@/components/splash-view';
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
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { useBirthRestore } from '@/features/chart/use-birth-restore';
import { markHomeReady } from '@/features/home/home-ready';
import { HomeMenuCard, HomeMenuGrid, HomeMenuList, type HomeMenuGridItem, type HomeMenuRowItem } from '@/features/home/home-menu';
import { MainTabs, openTab } from '@/features/home/main-tabs';
import { useAccount } from '@/features/home/use-account';
import { HomeBell } from '@/features/notifications/home-bell';
import { hasUnread } from '@/features/notifications/notification-rows';
import { useNotifications } from '@/features/notifications/use-notifications';
import { markWhatsNewSeen, useWhatsNewDue } from '@/features/onboarding/whats-new';
import { WhatsNewDialog } from '@/features/onboarding/whats-new-dialog';
import { useStoredHeadline } from '@/features/reading/use-reading';
import { PushAskSheet } from '@/features/push/push-ask-sheet';
import { HomeTodayCard, HomeTodaySkeleton } from '@/features/timing/home-today-card';
import { prefetchMeReport } from '@/features/me/use-me-report';
import { prefetchMonth } from '@/features/timing/use-month';
import { TODAY_CARD_WRITING_AFTER_MS, useTodaySky, useWritingAfter } from '@/features/timing/use-today-sky';
import { prefetchTimingReport } from '@/features/timing/use-timing-report';
import { useUpdateSuggestion } from '@/features/update/update-gate';
import { ME_AREAS } from '@/lib/api';

const MENU = strings.home.menu;
/** 업데이트 확인이 이만큼 지나도 끝나지 않으면 새로워진 점을 기다리게 하지 않는다(알림 받기 권유와 같다) */
const UPDATE_WAIT_MS = 5000;

/** 나 — 내 별명은 그 글(`/reading`), 나머지는 나 탭의 그 칩(결정 102 의 1-2) */
const ME_ITEMS: HomeMenuGridItem[] = [
  { key: 'nickname', label: MENU.me.items.nickname, icon: 'nickname', onPress: () => router.push('/reading') },
  ...ME_AREAS.map((area) => ({
    key: area,
    label: MENU.me.items[area],
    icon: ({ PERSONALITY: 'personality', LOVE: 'love', RELATIONSHIP: 'relationship', WORK: 'work', EMOTION: 'emotion' } as const)[area],
    onPress: () => openTab('me', { area }),
  })),
];
/** 나의 시기 — 시기 탭의 그 칩(결정 102 의 1-3) */
const TIMING_ITEMS: HomeMenuGridItem[] = (['month', 'year', 'life'] as const).map((tab) => ({
  key: tab,
  label: MENU.timing.items[tab],
  icon: tab,
  onPress: () => openTab('timing', { tab }),
}));
/**
 * 나의 사람들 — 연애 · 친구 궁합(결정 102 의 1-4). 사이가 켜진 입력 화면은 A④ 몫이라 지금은 궁합 탭으로 옮기고 사이를 주소에 싣는다(결정 113 의 3).
 * 홈의 다른 메뉴처럼 시트 없이 화면을 옮긴다
 */
const PEOPLE_ITEMS: HomeMenuRowItem[] = (['LOVE', 'FRIEND'] as const).map((relation) => ({
  key: relation,
  title: MENU.people.items[relation].title,
  body: MENU.people.items[relation].body,
  icon: relation === 'LOVE' ? 'synastryLove' : 'synastryFriend',
  onPress: () => openTab('synastry', { relation }),
}));

/** 메뉴판 세 카드 — 앱에 고정한 글이라 서버를 기다리지 않고 처음부터 보인다(결정 102 의 1 · 5) */
function HomeMenus() {
  return (
    <>
      <HomeMenuCard testID="home-menu-me" eyebrow={MENU.me.eyebrow} title={MENU.me.title}>
        <HomeMenuGrid items={ME_ITEMS} />
      </HomeMenuCard>
      <HomeMenuCard testID="home-menu-timing" eyebrow={MENU.timing.eyebrow} title={MENU.timing.title}>
        <HomeMenuGrid items={TIMING_ITEMS} />
      </HomeMenuCard>
      <HomeMenuCard testID="home-menu-people" eyebrow={MENU.people.eyebrow} title={MENU.people.title}>
        <HomeMenuList items={PEOPLE_ITEMS} />
      </HomeMenuCard>
    </>
  );
}

/**
 * 홈 메뉴판(결정 102 — 092 의 홈 칸을 대체, 시안 "홈 (1.1.0)" A). 출생 정보가 있으면 머리(로고 · 알림 종) 아래로 오늘의 하늘 한 줄 카드 ·
 * 나(3×2) · 나의 시기(셋) · 나의 사람들(두 줄) · 아래 탭 다섯, 없으면 출생 정보 입력부터 받는다.
 * 앱을 켤 때 나 탭 · 시기 풀이의 상태와 이번 달을 받아 둔다 — 그 탭을 열면 곧바로(결정 075 의 4 · 113 의 4). 홈에는 그리지 않는다.
 * 기기 저장소를 읽기 전에는 아무것도 그리지 않는다(입력 화면이 잠깐 비쳤다가 바뀌지 않게).
 * 기기에 출생 정보가 없고 세션이 있으면 서버에 저장된 것으로 한 번 되살려 본다(결정 029). 그동안 0.3초가 넘으면 되살린 뒤의 홈을 본뜬 뼈대를
 * 보여 주고(결정 071), 서버에 없으면(404 NO_PROFILE) 입력부터 받고, 있는지 알 수 없으면 불러오지 못한 화면(19 · 끊김 20-1)의 다시 보기(결정 112). 처음 열 때는 이 사이를 스플래시가 가린다(결정 068 의 2, home-ready.ts) —
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
  const restore = useBirthRestore(canRestore, save);
  const restoreSettled = restore !== 'pending';
  const input = useMemo(() => (profile ? birthInputOf(profile) : null), [profile]);
  // 받아 둔 풀이의 한 줄 별명 — 알림 받기 권유는 별명 공개를 본 뒤에(결정 066, 서버를 부르지 않는다)
  const { stored: reading } = useStoredHeadline(input);
  // 연결 끊김(결정 061 의 4): 받아 둔 것은 그대로 보이고 머리 아래에 띠(보드 20)
  const online = useOnline();
  // 웹이 시작할 때 서버에 닿지 못해 세션을 확인하지 못했다(결정 068 의 4) — 받아 둔 것을 보이고 띠를 둔다
  const unreachable = session.status === 'offline';
  const account = useAccount(online);
  // 홈의 첫 데이터(결정 068 의 2): 기기를 읽고, 없으면 되살려 그릴 것이 정해질 때까지 루트가 스플래시를 둔다.
  // 10초가 넘으면 스플래시를 걷고 불러오지 못한 화면(19, 결정 065)
  const firstData = loaded && !(empty && (!session.ready || (canRestore && !restoreSettled)));
  const phase = useLoadingPhase(!firstData);
  // 로그인이 확인된 뒤에만 서버에 묻는다(세션 확인 전의 401 이 보관 토큰을 지우지 않게 — 리뷰 PR #41)
  const asking = session.ready && session.status === 'signedIn' ? input : null;
  // 앱을 켤 때 나 탭 · 시기 풀이의 상태와 이번 달을 한 번 받아 둔다 — 그 탭을 열면 곧바로(결정 075 의 4 · 113 의 4). 스플래시는 이것을 기다리지 않는다.
  // 둘 중 하나라도 다 쓴 풀이가 있으면 새로워진 점의 셋째 줄 "받았던 자세한 풀이는 그대로"(결정 113 의 2 — 1.1.0 첫 실행에는 아직 결제할 길이 없다)
  const [received, setReceived] = useState<boolean | null>(null);
  useEffect(() => {
    if (!asking) return;
    let alive = true;
    void Promise.all([prefetchMeReport(asking), prefetchTimingReport(asking)]).then(
      ([me, timing]) => alive && setReceived(me || timing),
      () => alive && setReceived(false),
    );
    void prefetchMonth(asking);
    return () => {
      alive = false;
    };
  }, [asking]);
  // 새로워진 점(결정 109 의 6 · 113 의 1): 1.0.x 에서 올라온 기기에 한 번 — 셋째 줄을 가릴 값을 안 뒤 로그인한 홈 위에.
  // 알림 받기 권유와 같이 스플래시 · 정지 확인이 걷힌 뒤에, 업데이트 권유 창(결정 059)이 뜬 방문에서는 다음으로 미룬다(본 것으로 적지 않는다)
  const whatsNewDue = useWhatsNewDue();
  const splashGone = useSplashGone();
  const update = useUpdateSuggestion();
  const [updateVisit, setUpdateVisit] = useState(false);
  if (update === 'suggesting' && !updateVisit) setUpdateVisit(true);
  const [updateWaitOver, setUpdateWaitOver] = useState(false);
  const waitingUpdate = whatsNewDue && splashGone && update === 'checking';
  useEffect(() => {
    if (!waitingUpdate) return;
    // 업데이트 확인이 멈췄으면 오래 기다리지 않는다(알림 받기 권유와 같은 5초)
    const timer = setTimeout(() => setUpdateWaitOver(true), UPDATE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [waitingUpdate]);
  const updateClear = !updateVisit && (update === 'none' || (update === 'checking' && updateWaitOver));
  // 오늘의 하늘 칸(결정 047 의 1-3 · 051): 기기에 둔 오늘 것을 먼저, 없으면 날짜 없이 POST /day-sky(그날 처음이면 서버가 그때 쓴다)
  const today = useTodaySky(asking);
  const todayLoading = asking !== null && today.state.status === 'loading';
  const todayWriting = useWritingAfter(todayLoading, TODAY_CARD_WRITING_AFTER_MS);
  // 처음 들어올 때 스플래시는 오늘의 하늘 카드의 첫 상태까지 가린다 — 받아 둔 것(기기) 또는 글이나 쓰는 중(1초)까지. 메뉴는 기다릴 것이 없다(결정 113 의 4).
  // 그래야 스플래시를 걷는 첫 그림부터 카드이고 뼈대가 보이지 않는다(소유자 "접속하자마자 바로"). 카드가 10초 넘게 모르면 그대로 걷는다
  const cardsKnown = asking === null || !todayLoading || todayWriting;
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
  // 되살리는 동안(결정 029): 오늘의 하늘 카드 자리만 뼈대이고 메뉴는 그대로 보인다(결정 071 · 102 의 5) · 아래 탭.
  // 종은 출생 정보가 있는 홈에만(리뷰 #66). 0.3초 전 빈 단계도 같은 머리 · 탭
  if (empty && (!session.ready || (canRestore && !restoreSettled)))
    return (
      <Screen nav={nav} footer={<MainTabs active="home" />}>
        {phase === 'skeleton' ? (
          <View style={styles.column}>
            <SkeletonGroup testID="home-skeleton">
              <HomeTodaySkeleton />
            </SkeletonGroup>
            <HomeMenus />
          </View>
        ) : null}
      </Screen>
    );
  if (profile && chart) {
    const openToday = () => router.push('/today');
    const whatsNew = whatsNewDue && received !== null && cardsKnown && splashGone && updateClear;
    return (
      <Screen nav={homeNav} footer={<MainTabs active="home" />}>
        <View testID="home-column" style={styles.column}>
          {/* "인터넷 연결이 끊겼어요" 띠는 정말 끊겼을 때만 — 서버만 닿지 않을 때는 받아 둔 것을 그대로 보인다 */}
          {online ? null : <OfflineBanner />}
          <HomeTodayCard
            state={today.state}
            making={todayWriting || today.made === false}
            online={online}
            timeKnown={chart.timeKnown}
            onOpen={openToday}
            onRetry={today.retry}
          />
          <HomeMenus />
        </View>
        {/* 알림 받기 권유(11-10, 결정 066 — 처음 한 번, 휴대폰 권한을 아직 묻지 않았을 때). 새로워진 점을 띄울 기기면 그 창을 보고 닫을 때까지 기다린다
            (셋째 줄을 가릴 값을 모르는 동안 권유가 먼저 열리지 않게 — 띄울 차례 whatsNewDue 로 본다) */}
        <PushAskSheet time={account?.todaySkyTime} ready={!!reading?.headline && !whatsNewDue} />
        {whatsNew ? (
          <WhatsNewDialog
            received={received}
            onClose={() => void markWhatsNewSeen()}
            onSynastry={() => {
              void markWhatsNewSeen();
              openTab('synastry');
            }}
          />
        ) : null}
      </Screen>
    );
  }
  // 로그인 전 · 가입 중이면 루트 가드가 소개 · 로그인 · 가입 단계로 보낸다 — 그 가림막 아래에서 출생 정보 입력을 그리지 않는다
  // (입력이 곳 목록 GET /places 를 받는다 — 처음 온 사람이 쓰지 않는 요청, 성능 계획 4)
  if (session.status !== 'signedIn') return <Screen nav={nav}>{null}</Screen>;
  // 서버에 출생 정보가 있는지 알 수 없다(끊김 · 서버 오류 · 차트를 받지 못함): 입력 화면을 보이지 않는다 — 있는 사람이 조금 다르게
  // 다시 넣으면 PUT /profile 이 풀이 · 리포트를 지운다(결정 112). 다시 보기는 처음부터(기기 읽기 · 되살리기) 다시 한다
  if (restore === 'failed')
    return online ? (
      <StateScreen
        nav={nav}
        tabs={<MainTabs active="home" />}
        title={strings.states.loadFail.title.home}
        body={strings.states.loadFail.body}
        primary={{ label: strings.states.loadFail.retry, onPress: onRetry }}
      />
    ) : (
      <StateScreen
        nav={nav}
        tabs={<MainTabs active="home" />}
        title={strings.states.offlineEmpty.title}
        body={strings.states.offlineEmpty.body}
        primary={{ label: strings.states.offlineEmpty.retry, onPress: onRetry }}
      />
    );
  return (
    <Screen nav={nav} scroll={false} avoidKeyboard>
      <BirthForm
        stored={null}
        save={save}
        header={
          <View style={styles.intro}>
            <Txt variant="display">{strings.home.title}</Txt>
            <Txt variant="table" color="gray">
              {strings.home.subtitle}
            </Txt>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: Spacing.sm, paddingTop: Spacing.lg, paddingBottom: Spacing.xs },
  /** 머리 아래 12, 카드끼리 12(보드 11) */
  column: { gap: Spacing.sm, paddingTop: Spacing.sm },
});
