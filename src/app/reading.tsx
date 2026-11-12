import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { CardRadius, Colors, Sizes, Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { birthInputOf } from '@/features/chart/birth-input';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { ChartPicture } from '@/features/chart/ChartWheel';
import { KeyThree } from '@/features/chart/key-three';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { ReadingView } from '@/features/reading/reading-view';
import { useReading, useStoredReading } from '@/features/reading/use-reading';
import { ShareEntry } from '@/features/share/share-entry';
import { useGenerationBusy } from '@/features/update/update-gate';
import type { Chart, Reading } from '@/lib/api';

const S = strings.reading;

/**
 * 요약 해석: 서버가 쓴 글(총평 · 문단 · 강점 · 보완점)을 보여 준다. 차트는 여기서 "내 차트 보기" 로 연다.
 * 다시 생성은 없다(같은 차트 = 같은 글). 실패했을 때만 "다시 시도" 가 보인다.
 */
export default function ReadingScreen() {
  const { ready } = useSession();
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

  if (loaded && !profile)
    return (
      <Screen nav={nav}>
        <ChartEmpty />
      </Screen>
    );

  if (stored.reading)
    return (
      <Screen nav={nav}>
        <ReadingBody reading={stored.reading} chart={chart} />
      </Screen>
    );

  // 기기를 찾아보는 동안에는 아무것도 그리지 않는다("짓는 중" 이 잠깐 비치지 않게).
  if (!stored.checked) return <Screen nav={nav}>{null}</Screen>;

  if (state.status === 'loading')
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="heading">{S.generating}</Txt>
          <Txt variant="table" color="gray">
            {S.generatingNote}
          </Txt>
        </View>
      </Screen>
    );

  if (state.status === 'failed')
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="body">
            {state.error === 'NETWORK' || state.error === 'LIMIT' ? S.failed[state.error] : S.failed.OTHER}
          </Txt>
          <Button label={S.retry} onPress={retry} />
        </View>
      </Screen>
    );

  return (
    <Screen nav={nav}>
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
  status: { gap: Spacing.md, paddingTop: Spacing.lg },
  footer: { gap: Spacing.lg, paddingTop: Spacing.lg },
});
