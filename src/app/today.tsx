import { router } from 'expo-router';
import { useMemo } from 'react';
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
import { DaySkeleton, DayView } from '@/features/timing/day-view';
import { useTodaySky, useWritingAfter } from '@/features/timing/use-today-sky';

const T = strings.today;
const ST = strings.states;

/** 뒤로: 홈 · 달력에서 왔으면 그리로, 주소로 바로 열었으면(알림을 눌러 열었을 때) 홈으로 */
const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

/**
 * 오늘의 하늘 `/today`(결정 051 · 061 의 2 · 064, 보드 11-4 · 11-5): 날짜 · 요일 · 제목 · 오늘의 흐름 셋 · 이렇게 풀이한 이유(지나가는 별, 작은 지도 없음) ·
 * 오늘의 작은 실천 셋. 그날의 하늘(14-4)과 같은 틀이다(DayView). 홈 카드와 같은 글을 기기에서 먼저 그린다(useTodaySky).
 * 처음 묻는 중이면 0.3초 뒤 다 그려질 배치를 본뜬 뼈대(결정 071), 3초가 넘으면 쓰는 중(머리(뒤로)만 · 아래 탭 없음), 못 썼으면 실패 틀(다시 쓰기 · 나중에 하기).
 * 머리 오른쪽의 공유 아이콘 자리는 공유 v2(계획 A⑤)가 채운다. 면책 문구는 두지 않는다(결정 064).
 */
export default function TodayScreen() {
  const { ready } = useSession();
  const { profile, chart } = useBirthProfile();
  const birth = useMemo(() => (ready && profile ? birthInputOf(profile) : null), [ready, profile]);
  const { state, retry } = useTodaySky(birth);
  const online = useOnline();
  const loading = state.status === 'loading';
  const phase = useLoadingPhase(loading);
  const writing = useWritingAfter(loading);
  // 끊겨서 못 받았으면 연결이 돌아올 때 다시 부른다(이미 저장된 글이면 그대로 온다)
  useOnReconnect(online, () => {
    if (state.status === 'failed' && state.error === 'NETWORK') retry();
  });

  const nav = (right?: React.ReactNode) => <NavBar title={T.title} chevron onBack={back} right={right} />;

  if (loading)
    return writing ? (
      <MakingView nav={nav()} title={T.making.title} lines={T.making.lines} />
    ) : (
      // 뼈대는 다 그려진 화면처럼 아래 탭과 함께(결정 065 의 2 · 071) — 쓰는 중 · 못 썼을 때만 탭이 없다(결정 061 의 2)
      <Screen nav={nav()} footer={<MainTabs active="home" nested />}>
        {phase === 'blank' ? null : <DaySkeleton />}
      </Screen>
    );

  if (state.status === 'failed') {
    if (state.error === 'NETWORK' && !online)
      return <StateScreen nav={nav()} title={ST.offlineEmpty.title} body={ST.offlineEmpty.body} primary={{ label: ST.offlineEmpty.retry, onPress: retry }} />;
    return (
      <StateScreen
        nav={nav()}
        title={T.fail}
        body={state.error === 'LIMIT' ? T.limit : ST.writeFail.body}
        primary={{ label: ST.writeFail.retry, onPress: retry }}
        later={{ label: strings.timing.later, onPress: back }}
      />
    );
  }

  // 공유 아이콘 자리(보드 11-4 머리 오른쪽) — 공유 v2(계획 A⑤)가 ShareEntry 를 꽂는다
  const shareSpot = <View testID="today-share-spot" style={styles.shareSpot} />;
  return (
    <Screen nav={nav(shareSpot)} footer={<MainTabs active="home" nested />}>
      {/* 이 화면의 글은 늘 오늘 것이다 — 서버의 오늘(한국 날짜)을 그대로 오늘로 그린다("오늘의 흐름" · 이유 머리 "오늘") */}
      <DayView sky={state.sky} chart={chart} today={state.sky.date} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  shareSpot: { width: Sizes.navIcon, height: Sizes.navIcon },
});
