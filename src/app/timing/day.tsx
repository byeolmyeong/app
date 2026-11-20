import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';

import { MakingView } from '@/components/making-view';
import { NavBar } from '@/components/nav-bar';
import { OfflineBanner } from '@/components/offline-banner';
import { Screen } from '@/components/screen';
import { StateScreen } from '@/components/state-screen';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { useOnReconnect, useOnline } from '@/components/use-online';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { birthInputOf } from '@/features/chart/birth-input';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { MainTabs } from '@/features/home/main-tabs';
import { ShareEntry } from '@/features/share/share-entry';
import { formatMonthDay, koreaToday } from '@/features/timing/dates';
import { DaySkeleton, DayView } from '@/features/timing/day-view';
import { useDaySky } from '@/features/timing/use-day-sky';

const T = strings.timing;
const ST = strings.states;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/**
 * 받아 둔 날이면 서버가 곧바로 준다 — 0.3초 넘게 기다리면 먼저 다 그려질 배치의 뼈대(결정 071), 이만큼 넘게 걸리면 그날을 처음 쓰는 중으로 보고
 * 쓰는 중 화면(결정 061 의 2, 보드 14-4 쓰는 중)으로 바꾼다. 서버는 쓰는 중인지 알려 주지 않는다(동기 응답).
 */
const MAKING_AFTER_MS = 3000;
/** 서버가 범위 밖이거나 틀린 날짜라고 거절한 이름(400) */
const BAD_DATE = ['DATE_OUT_OF_RANGE', 'INVALID_DATE'];

/** 뒤로: 달력에서 왔으면 그리로, 주소로 바로 열었으면 시기 탭으로 */
const back = () => (router.canGoBack() ? router.back() : router.replace('/timing'));

/**
 * 그날의 하늘 `/timing/day?date=YYYY-MM-DD`(결정 049 의 6 · 061 의 2, 캔버스 14-4 · 쓰는 중 · 못 썼을 때).
 * 열 때 `POST /day-sky { date }` — 0.3초가 넘으면 뼈대, 3초가 넘으면 처음 쓰는 날로 보고 쓰는 중(머리(뒤로)만 · 아래 탭 없음), 다 오면 글과 아래 탭.
 * 못 썼으면 다시 쓰기 · 나중에 하기(뒤로), 생성 한도(429)면 한 줄 안내, 범위 밖(400)이면 돌아가기. 달력에서 오늘을 누르면 이 화면이 아니라 오늘의 하늘(`/today`)로 간다(계획 A④).
 * 다 쓰면 머리 오른쪽에 공유 아이콘(그날의 하늘 카드 — 결정 053, 시트를 열 때 만든다).
 */
export default function TimingDayScreen() {
  const { date: param } = useLocalSearchParams<{ date?: string }>();
  const date = typeof param === 'string' && DATE.test(param) ? param : null;
  const { ready } = useSession();
  const { profile, chart } = useBirthProfile();
  const birth = useMemo(() => (ready && profile ? birthInputOf(profile) : null), [ready, profile]);
  const { state, retry } = useDaySky(date, birth);
  const online = useOnline();
  const [today] = useState(() => koreaToday());
  const loading = date !== null && state.status === 'loading';
  const phase = useLoadingPhase(loading);
  const [making, setMaking] = useState(false);
  useEffect(() => {
    if (!loading) return;
    const timer = setTimeout(() => setMaking(true), MAKING_AFTER_MS);
    return () => {
      clearTimeout(timer);
      setMaking(false);
    };
  }, [loading]);
  // 끊겨서 못 받았으면 연결이 돌아올 때 다시 부른다(이미 저장된 글이면 그대로 온다)
  useOnReconnect(online, () => {
    if (state.status === 'failed' && state.error === 'NETWORK') retry();
  });

  const nav = (right?: React.ReactNode) => (
    <NavBar title={date ? `${formatMonthDay(date)}${T.day.titleSuffix}` : undefined} chevron onBack={back} right={right} />
  );

  if (!date || (state.status === 'failed' && state.httpStatus === 400 && BAD_DATE.includes(state.code ?? '')))
    return <StateScreen nav={nav()} title={T.day.outOfRange.title} body={T.day.outOfRange.body} primary={{ label: T.day.outOfRange.back, onPress: back }} />;

  if (state.status === 'loading')
    return making ? (
      <MakingView nav={nav()} title={T.day.making.title} lines={T.day.making.lines} />
    ) : (
      // 뼈대는 다 그려진 화면처럼 아래 탭과 함께(결정 065 의 2 · 071) — 쓰는 중 · 못 썼을 때만 탭이 없다(결정 061 의 2)
      <Screen nav={nav()} footer={<MainTabs active="timing" nested />}>
        {phase === 'blank' ? null : <DaySkeleton />}
      </Screen>
    );

  if (state.status === 'failed') {
    // 그 밖의 400(INVALID_REQUEST 등) · 응답 모양이 틀림은 다시 써도 같다 — 돌아가기만(리뷰 #63)
    if (state.httpStatus === 400 || state.error === 'INVALID')
      return <StateScreen nav={nav()} title={T.day.cannotOpen.title} body={T.day.cannotOpen.body} primary={{ label: T.day.cannotOpen.back, onPress: back }} />;
    if (state.error === 'NETWORK' && !online)
      return <StateScreen nav={nav()} title={ST.offlineEmpty.title} body={ST.offlineEmpty.body} primary={{ label: ST.offlineEmpty.retry, onPress: retry }} />;
    return (
      <StateScreen
        nav={nav()}
        title={T.day.fail}
        body={state.error === 'LIMIT' ? T.day.limit : ST.writeFail.body}
        primary={{ label: ST.writeFail.retry, onPress: retry }}
        later={{ label: T.later, onPress: back }}
      />
    );
  }

  // 머리 오른쪽의 공유 아이콘(보드 14-4) — 그날의 하늘 카드(결정 053 의 2)
  const share = <ShareEntry target={{ kind: 'DAY_SKY', date: state.sky.date }} trigger="icon" />;
  return (
    <Screen nav={nav(share)} footer={<MainTabs active="timing" nested />}>
      {/* 연결 끊김(결정 061 의 4): 받은 글은 그대로 두고 머리 아래 띠 */}
      {online ? null : <OfflineBanner />}
      <DayView sky={state.sky} chart={chart} today={today} />
    </Screen>
  );
}
