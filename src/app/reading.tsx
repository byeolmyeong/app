import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { StatusView } from '@/components/status-view';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { CardRadius, Colors, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { clearSignedUp, signedUpNickname } from '@/features/auth/signup-draft';
import { useSession } from '@/features/auth/use-session';
import { birthInputOf } from '@/features/chart/birth-input';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { keyThree } from '@/features/chart/chart-rows';
import { ChartPicture } from '@/features/chart/ChartWheel';
import { KeyThree } from '@/features/chart/key-three';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { MainTabs } from '@/features/home/main-tabs';
import { MakingView } from '@/features/reading/making-view';
import { ReadingView } from '@/features/reading/reading-view';
import { RevealView } from '@/features/reading/reveal-view';
import { useReading, useStoredReading } from '@/features/reading/use-reading';
import { ShareEntry } from '@/features/share/share-entry';
import { useGenerationBusy } from '@/features/update/update-gate';
import type { Chart, Reading } from '@/lib/api';

const S = strings.reading;

/**
 * 요약 해석: 서버가 쓴 글(총평 · 문단 · 강점 · 보완점)을 보여 준다. 차트는 여기서 "내 차트 보기" 로 연다.
 * 다시 생성은 없다(같은 차트 = 같은 글). 실패했을 때만 "다시 시도" 가 보인다.
 * 가입을 마치고 바로 와서(from=signup) 글이 다 지어지면 별명 공개(보드 10)를 한 번 보이고, "풀이 읽기" 로 글을 보인다(결정 044).
 */
export default function ReadingScreen() {
  const { ready } = useSession();
  // 가입을 마치고 바로 온 것인가(별명 짓는 중을 머리 없이, 보드 9). 홈 · 출생 정보 바꾸기에서 오면 뒤로 가기가 있다
  const { from } = useLocalSearchParams<{ from?: string }>();
  // 별명 공개에 쓸 닉네임: 가입 직후에만 메모리에 있다(가입이 받은 값, 결정 044). 앱을 다시 켜거나 웹을 새로 고치면 없다
  const [revealFor, setRevealFor] = useState(() => (from === 'signup' ? signedUpNickname() : null));
  const { loaded, profile, chart } = useBirthProfile();
  const birth = useMemo(() => (profile ? birthInputOf(profile) : null), [profile]);
  // 먼저 기기에 받아 둔 글을 찾는다. 있으면 세션을 기다리지 않고 바로 보여 준다.
  const stored = useStoredReading(birth);
  // 받아 둔 글이 없을 때만, 세션이 준비된 뒤에 서버에 요청한다.
  const { state, retry } = useReading(ready && stored.checked && !stored.reading ? birth : null);
  // 짓는 중이거나 방금 받은 글이 떠 있는 동안에는 강제 업데이트를 미룬다(결정 027). 받아 둔 글을 다시 연 것은 아니다.
  const generating = profile !== null && stored.checked && !stored.reading && state.status === 'loading';
  useGenerationBusy(generating, !stored.reading && state.status === 'done');
  const nav = <NavBar title={S.title} onBack={goBackOrHome} />;
  // 나 탭이 새 화면(/me)이 되기 전까지 글 화면이 나 탭의 자리다 — 받아 둔 글이든 방금 받은 글이든(결정 046 의 4)
  const tabs = <MainTabs active="me" />;

  if (loaded && !profile)
    return (
      <Screen nav={nav} footer={tabs}>
        <ChartEmpty />
      </Screen>
    );

  const written = stored.reading ?? (state.status === 'done' ? state.reading : null);
  if (revealFor && written)
    return (
      <RevealView
        nickname={revealFor}
        headline={written.headline}
        // 해 · 달 · (시각을 알 때만) 상승궁 — 차트 요약(KeyThree)과 같은 값
        signs={chart ? keyThree(chart).map((k) => ({ label: k.label, value: k.value + strings.chart.signSuffix })) : []}
        onRead={() => {
          clearSignedUp();
          setRevealFor(null);
        }}
      />
    );

  if (stored.reading)
    return (
      <Screen nav={nav} footer={tabs}>
        <ReadingBody reading={stored.reading} chart={chart} />
      </Screen>
    );

  // 기기를 찾아보는 동안에는 아무것도 그리지 않는다("짓는 중" 이 잠깐 비치지 않게).
  if (!stored.checked) return <Screen nav={nav}>{null}</Screen>;

  // 짓는 동안은 "별명 짓는 중"(결정 042 보드 9) — 가입을 마치고 처음 오는 곳이기도 하다
  if (state.status === 'loading') return <MakingView nav={from === 'signup' ? undefined : nav} />;

  if (state.status === 'failed')
    return (
      <Screen nav={nav} footer={tabs}>
        <StatusView state="error" title={state.error === 'NETWORK' || state.error === 'LIMIT' ? S.failed[state.error] : S.failed.OTHER}>
          <Button label={S.retry} onPress={retry} />
        </StatusView>
      </Screen>
    );

  return (
    <Screen nav={nav} footer={tabs}>
      <ReadingBody reading={state.reading} chart={chart} />
    </Screen>
  );
}

/** 그 사람의 하늘 그림, 글, 그 아래의 "연애에서 해 볼 만한 것 보기" · "내 차트 보기" · 안내 문구. */
function ReadingBody({ reading, chart }: { reading: Reading; chart: Chart | null }) {
  return (
    <>
      {chart ? (
        <Pressable accessibilityRole="button" onPress={() => router.push('/chart')} style={styles.picture}>
          <ChartPicture chart={chart} size={Sizes.readingPicture} />
          {/* 그림만으로는 무슨 자리인지 알 수 없으니 글로 함께 적는다 */}
          <KeyThree chart={chart} bare />
        </Pressable>
      ) : null}
      <ReadingView reading={reading} />
      <View style={styles.footer}>
        {/* 공유는 누를 때 만든다. 카드에는 한 줄 총평과 키워드만 들어간다(결정 025) */}
        <ShareEntry target={{ kind: 'READING' }} />
        {/* 방향성 "이성" 은 들어가는 줄만 둔다. 글은 그 화면을 열 때 받는다(결정 023) */}
        <TextLink label={S.seeDirection} onPress={() => router.push('/direction')} />
        <TextLink label={S.seeChart} onPress={() => router.push('/chart')} />
        <Txt variant="label" color="gray">
          {S.disclaimer}
        </Txt>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  picture: {
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
    marginTop: Spacing.xs,
    backgroundColor: Colors.fill,
    borderRadius: CardRadius,
  },
  footer: { gap: Spacing.lg, paddingTop: Spacing.lg },
});
