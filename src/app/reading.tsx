import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { ReadingView } from '@/features/reading/reading-view';
import { useReading, useStoredReading } from '@/features/reading/use-reading';
import type { Reading } from '@/lib/api';

const S = strings.reading;

/**
 * 요약 해석: 서버가 쓴 글(총평 · 문단 · 강점 · 보완점)을 보여 준다. 차트는 여기서 "내 차트 보기" 로 연다.
 * 다시 생성은 없다(같은 차트 = 같은 글). 실패했을 때만 "다시 시도" 가 보인다.
 */
export default function ReadingScreen() {
  const { ready } = useSession();
  const { loaded, profile } = useBirthProfile();
  const birth = useMemo(
    () => (profile ? { date: profile.date, time: profile.time, placeId: profile.place.id } : null),
    [profile],
  );
  // 먼저 기기에 받아 둔 글을 찾는다. 있으면 세션을 기다리지 않고 바로 보여 준다.
  const stored = useStoredReading(birth);
  // 받아 둔 글이 없을 때만, 세션이 준비된 뒤에 서버에 요청한다.
  const { state, retry } = useReading(ready && stored.checked && !stored.reading ? birth : null);
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
        <ReadingBody reading={stored.reading} />
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
      <ReadingBody reading={state.reading} />
    </Screen>
  );
}

/** 글과 그 아래의 "내 차트 보기" · 안내 문구. */
function ReadingBody({ reading }: { reading: Reading }) {
  return (
    <>
      <ReadingView reading={reading} />
      <View style={styles.footer}>
        <TextLink label={S.seeChart} onPress={() => router.push('/chart')} />
        <Txt variant="label" color="gray">
          {S.disclaimer}
        </Txt>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  status: { gap: Spacing.md, paddingTop: Spacing.lg },
  footer: { gap: Spacing.lg, paddingTop: Spacing.lg },
});
