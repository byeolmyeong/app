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
import { useLoadingPhase } from '@/components/use-loading-phase';
import { useOnReconnect, useOnline } from '@/components/use-online';
import { MeLayout } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSoundtrack } from '@/features/audio/use-soundtrack';
import { useSession } from '@/features/auth/use-session';
import { birthInputOf } from '@/features/chart/birth-input';
import { ChartEmpty } from '@/features/chart/chart-empty';
import { SignCard, SignCardSkeleton } from '@/features/chart/sign-card';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { MainTabs } from '@/features/home/main-tabs';
import { useAccount } from '@/features/home/use-account';
import { AreaView, AreaViewSkeleton } from '@/features/me/area-view';
import { AreaChips, AreaChipsSkeleton, DetailCard, DetailCardSkeleton, MeNicknameCard, MeNicknameCardSkeleton } from '@/features/me/me-parts';
import { useMeReport } from '@/features/me/use-me-report';
import { ReadingSkeleton, ReadingView } from '@/features/reading/reading-view';
import { useReading, useStoredReading } from '@/features/reading/use-reading';
import { ShareEntry } from '@/features/share/share-entry';
import { useGenerationBusy } from '@/features/update/update-gate';
import { ME_AREAS, type MeArea } from '@/lib/api';

const S = strings.me;
const ST = strings.states;

/**
 * 나 탭(결정 048 · 050 · 061 · 065 · 071, 보드 12 받기 전 · 12-8~12-12 · 11-8 · 11-9 · 24-1).
 * - 나 탭 풀이가 다 쓰이지 않았으면: 내 별명 내용(ReadingView) + 맨 아래 "자세한 풀이" 카드. 받기 → 쓰는 중(11-8) → 다 쓰면 성격 칩.
 * - 다 쓰였으면: 맨 위 별명 카드(→ 내 별명) + 칩 다섯(`/me?area=LOVE` 로 고를 수 있다) + 고른 칩의 풀이.
 * - 처음 불러올 때 0.3초가 넘으면 다 그려질 화면과 같은 배치의 뼈대(받기 전 · 칩을 골라 들어오면 받은 뒤), 한 번 받은 풀이는 기기의 것을 먼저 보인다. 못 불러옴 · 끊김은 결정 061 의 틀.
 * 탭의 첫 화면이라 뒤로 가기가 없고 아래 탭이 있다(결정 046 의 2). 면책 문구는 두지 않는다(결정 064).
 */
export default function MeScreen() {
  const { area } = useLocalSearchParams<{ area?: string }>();
  const { ready } = useSession();
  const { loaded, profile, chart } = useBirthProfile();
  const birth = useMemo(() => (profile ? birthInputOf(profile) : null), [profile]);
  // 내 별명: 기기에 받아 둔 것을 먼저, 없을 때만 세션이 준비된 뒤 서버에(같은 차트 = 같은 글)
  const stored = useStoredReading(birth);
  const { state: readingState, retry: retryReading } = useReading(ready && stored.checked && !stored.reading ? birth : null);
  const reading = stored.reading ?? (readingState.status === 'done' ? readingState.reading : null);
  const me = useMeReport(ready ? birth : null);
  const online = useOnline();
  const account = useAccount(online);
  const [picked, setPicked] = useState<MeArea | null>(null);
  const askedArea = ME_AREAS.find((a) => a === area) ?? null;
  const selected = picked ?? askedArea ?? 'PERSONALITY';
  // 쓰는 중이거나 방금 다 쓰인 풀이가 떠 있는 동안 강제 업데이트를 미룬다(결정 027)
  useGenerationBusy(me.state.status === 'writing', me.state.status === 'done');
  // 연결이 돌아오면 상태만 다시 묻는다(GET) — 만들기(POST)는 사람이 누를 때만(결정 061 의 4)
  useOnReconnect(online, () => {
    const s = me.state;
    // 다 쓴 풀이를 보던 중이면 조용히 새로 받고(못 받아도 그대로), 못 물었거나 쓰는 중 확인이 끊겼으면 상태를 다시 묻는다
    if (s.status === 'done') me.refresh();
    else if (s.status === 'unknown' || (s.status === 'failed' && s.stage === 'poll' && s.error === 'NETWORK')) me.recheck();
    if (!reading && readingState.status === 'failed' && readingState.error === 'NETWORK') retryReading();
  });
  // 처음 불러올 때: 내 별명이 아직 없거나 나 탭 풀이의 상태를 처음 묻는 중(기기에 받아 둔 것이 없다)
  const loading = loaded && profile !== null && ((!reading && readingState.status !== 'failed') || me.state.status === 'checking');
  const phase = useLoadingPhase(loading);
  // 쓰는 중 화면(자세한 풀이 · 서버가 내 별명을 짓는 중)이 떠 있는 동안만 기다릴 때 음악(결정 062 의 1)
  useSoundtrack('waiting', me.state.status === 'writing' || (!reading && readingState.status === 'loading' && phase === 'timeout'));

  const tabs = <MainTabs active="me" />;
  const banner = online ? null : <OfflineBanner />;
  const afterNav = <NavBar title={S.title} chevron />;
  // 받은 뒤 머리의 공유 아이콘은 지금 고른 칩의 영역 카드(결정 053 의 2, 보드 12-13)
  const doneNav = <NavBar title={S.title} chevron right={<ShareEntry target={{ kind: 'ME_AREA', area: selected }} trigger="icon" />} />;

  if (loaded && !profile)
    return (
      <Screen nav={afterNav} footer={tabs}>
        <ChartEmpty />
      </Screen>
    );

  const s = me.state;
  if (s.status === 'done')
    return (
      <Screen nav={doneNav} footer={tabs}>
        {banner}
        {/* 한 덩어리로 둔다 — 화면의 칸 사이 간격(16)이 끼지 않게 시안 12-8 의 간격 그대로 */}
        <View>
            <MeNicknameCard
            nickname={account?.nickname ?? null}
            avatar={account?.avatar ?? null}
            headline={reading?.headline ?? null}
            onOpen={() => router.push('/reading')}
          />
          <AreaChips value={selected} onChange={setPicked} />
          {s.report.areas
            .filter((a) => a.area === selected)
            .map((a) => (
              <AreaView key={a.area} area={a} nickname={account?.nickname ?? null} chart={chart} />
            ))}
        </View>
      </Screen>
    );

  // 쓰는 중(11-8): 아래 탭 · 머리 없이 별명 짓는 중과 같은 그림 · 나 탭 문구. 다 쓰면 성격 칩
  if (s.status === 'writing') return <MakingView title={S.making.title} lines={S.making.lines} />;

  if (s.status === 'failed') {
    if (s.error === 'NETWORK' && !online)
      return (
        <StateScreen
          nav={afterNav}
          tabs={tabs}
          title={ST.offlineEmpty.title}
          body={ST.offlineEmpty.body}
          primary={{ label: ST.offlineEmpty.retry, onPress: s.stage === 'request' ? me.start : me.recheck }}
        />
      );
    // 쓰는 중 확인만 못 했으면(서버는 쓰고 있을 수 있다) 보드 19 — 다시 보기는 상태만 묻는다
    if (s.stage === 'poll' && s.error !== 'FAILED')
      return (
        <StateScreen
          nav={afterNav}
          tabs={tabs}
          title={S.loadFail.title}
          body={ST.loadFail.body}
          primary={{ label: ST.loadFail.retry, onPress: me.recheck }}
        />
      );
    // 끝까지 못 썼거나 시작하지 못했으면 보드 11-9: 다시 쓰기 · 그 위 나중에 하기(받기 전으로), 아래 탭 없이
    return (
      <StateScreen
        title={S.writeFail}
        body={s.error === 'LIMIT' ? S.limit : ST.writeFail.body}
        primary={{ label: ST.writeFail.retry, onPress: me.start }}
        later={{ label: S.later, onPress: me.dismiss }}
      />
    );
  }

  if (!reading) {
    if (readingState.status === 'failed')
      return readingState.error === 'NETWORK' && !online ? (
        <StateScreen
          nav={afterNav}
          tabs={tabs}
          title={ST.offlineEmpty.title}
          body={ST.offlineEmpty.body}
          primary={{ label: ST.offlineEmpty.retry, onPress: retryReading }}
        />
      ) : (
        <StateScreen
          nav={afterNav}
          tabs={tabs}
          title={ST.loadFail.title.reading}
          body={readingState.error === 'LIMIT' ? strings.reading.failed.LIMIT : ST.loadFail.body}
          primary={{ label: ST.loadFail.retry, onPress: retryReading }}
        />
      );
    // 10초가 넘도록 내 별명이 오지 않으면 서버가 새로 짓는 중이다(옛 요약 해석만 있던 계정 — 길면 몇 분) —
    // 별명 짓는 중을 아래 탭이 있는 틀에 보여 그동안 다른 탭으로 갈 수 있게 한다(결정 061 · 065 의 2, 리뷰 #49). 머리는 없다(소유자, 빌드 13)
    if (phase === 'timeout') return <MakingView tabs={tabs} />;
  }

  // 상태를 10초 넘게 묻지 못하면 빈 화면 대신 카드 자리 안내(결정 065 의 2) — 기다리던 요청은 훅이 같은 10초에 끊는다
  const checkTimedOut = s.status === 'checking' && phase === 'timeout';
  if (!reading || (s.status === 'checking' && !checkTimedOut)) {
    // 뼈대는 다 그려질 화면의 배치 그대로(결정 071). 기기에 받아 둔 풀이가 없어 대개 받기 전이다 — 칩을 골라 들어왔고
    // (`?area=` — 푸시 "자세한 풀이가 다 됐어요" 는 12-8 로 연다, 결정 066) 아직 상태를 묻는 중이면 받은 뒤 배치.
    // 0.3초 전 빈 단계에도 그 배치의 머리 · 아래 탭을 둔다(중간에 바뀌지 않게, 071 의 6)
    const afterLayout = askedArea !== null && s.status === 'checking';
    // 머리 제목은 받기 전 "내 별명" · 받은 뒤 "나" 다. 상태를 아직 모르면(기억 · 메모리 없음 — 앱을 켠 뒤 처음, 받아 두기 전) 제목을 비워 둔다:
    // 틀린 제목이 먼저 보였다가 바뀌는 것보다 빈 머리에 맞는 제목이 한 번 나타나는 쪽이 덜 튄다(소유자 지적 — 나 탭으로 갈 때 "내 별명" 이 잠깐)
    const loadingNav = afterLayout ? afterNav : s.status === 'checking' ? <NavBar chevron /> : <NavBar title={strings.reading.title} chevron />;
    if (phase !== 'skeleton') return <Screen nav={loadingNav} footer={tabs}>{null}</Screen>;
    if (afterLayout)
      return (
        <Screen nav={loadingNav} footer={tabs}>
          <SkeletonGroup testID="me-after-skeleton">
            <View>
              <MeNicknameCardSkeleton />
              <AreaChipsSkeleton />
              <AreaViewSkeleton />
            </View>
          </SkeletonGroup>
        </Screen>
      );
    return (
      <Screen nav={loadingNav} footer={tabs}>
        <SkeletonGroup testID="me-skeleton">
          <View>
            <ReadingSkeleton card={chart ? <SignCardSkeleton chart={chart} /> : null} />
            <DetailCardSkeleton />
          </View>
        </SkeletonGroup>
      </Screen>
    );
  }

  // 받기 전(보드 12 받기 전): 내 별명 내용 + 맨 아래 "자세한 풀이" 카드(상태를 못 물었으면 그 자리에 19-1, 끊겼으면 띠)
  const beforeNav = <NavBar title={strings.reading.title} chevron right={<ShareEntry target={{ kind: 'NICKNAME' }} trigger="icon" />} />;
  return (
    <Screen nav={beforeNav} footer={tabs}>
      {banner}
      <View>
        <ReadingView reading={reading} chart={chart} card={chart ? <SignCard chart={chart} /> : null} />
        {(s.status === 'unknown' && online) || checkTimedOut ? (
          <View style={styles.cardFail}>
            <CardFail
              kicker={S.detail.kicker}
              title={S.loadFail.title}
              body={S.loadFail.body}
              retry={{ label: ST.loadFail.retry, onPress: me.recheck }}
            />
          </View>
        ) : (
          <DetailCard blocked={s.status === 'none' && s.blocked === true} onRequest={me.start} />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  /** 카드 자리 안내는 "자세한 풀이" 카드가 있던 자리에(보드 12 · 19-1) */
  cardFail: { marginTop: MeLayout.detail.top },
});
