import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MakingView } from '@/components/making-view';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { StateScreen } from '@/components/state-screen';
import { useLoadingPhase } from '@/components/use-loading-phase';
import { useOnReconnect, useOnline } from '@/components/use-online';
import { Sizes } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { birthInputOf } from '@/features/chart/birth-input';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { MainTabs } from '@/features/home/main-tabs';
import { formatMonthDay, koreaToday } from '@/features/timing/dates';
import { DayView } from '@/features/timing/day-view';
import { useDaySky } from '@/features/timing/use-day-sky';

const T = strings.timing;
const ST = strings.states;
const DATE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
/** 서버가 범위 밖이거나 틀린 날짜라고 거절한 이름(400) */
const BAD_DATE = ['DATE_OUT_OF_RANGE', 'INVALID_DATE'];

/** 뒤로: 달력에서 왔으면 그리로, 주소로 바로 열었으면 시기 탭으로 */
const back = () => (router.canGoBack() ? router.back() : router.replace('/timing'));

/**
 * 그날의 하늘 `/timing/day?date=YYYY-MM-DD`(결정 049 의 6 · 061 의 2, 캔버스 14-4 · 쓰는 중 · 못 썼을 때).
 * 열 때 `POST /day-sky { date }` — 처음 만드는 날이면 쓰는 중(0.3초가 넘을 때부터, 머리(뒤로)만 · 아래 탭 없음), 다 오면 글과 아래 탭.
 * 못 썼으면 다시 쓰기 · 나중에 하기(뒤로), 생성 한도(429)면 한 줄 안내, 범위 밖(400)이면 돌아가기. 오늘 날짜도 이 화면이다(계획 A④ 전까지).
 * 머리 오른쪽의 공유 아이콘 자리는 공유 v2(계획 A⑤)가 채운다.
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
  const phase = useLoadingPhase(date !== null && state.status === 'loading');
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
    return phase === 'blank' ? (
      <Screen nav={nav()}>{null}</Screen>
    ) : (
      <MakingView nav={nav()} title={T.day.making.title} lines={T.day.making.lines} />
    );

  if (state.status === 'failed') {
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

  // 공유 아이콘 자리(보드 14-4 머리 오른쪽) — 공유 v2(계획 A⑤)가 ShareEntry 를 꽂는다
  const shareSpot = <View testID="day-share-spot" style={styles.shareSpot} />;
  return (
    <Screen nav={nav(shareSpot)} footer={<MainTabs active="timing" nested />}>
      <DayView sky={state.sky} chart={chart} today={today} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  shareSpot: { width: Sizes.navIcon, height: Sizes.navIcon },
});
