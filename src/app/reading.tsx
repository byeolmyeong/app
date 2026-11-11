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
import { useReading } from '@/features/reading/use-reading';

const S = strings.reading;

/**
 * 요약 해석: 서버가 쓴 글(총평 · 문단 · 강점 · 보완점)을 보여 준다. 차트는 여기서 "내 차트 보기" 로 연다.
 * 다시 생성은 없다(같은 차트 = 같은 글). 실패했을 때만 "다시 시도" 가 보인다.
 */
export default function ReadingScreen() {
  const { ready } = useSession();
  const { loaded, profile } = useBirthProfile();
  // 세션 확인과 기기 저장소 읽기가 끝난 뒤에 요청한다.
  const input = useMemo(
    () => (ready && profile ? { date: profile.date, time: profile.time, placeId: profile.place.id } : null),
    [ready, profile],
  );
  const { state, retry } = useReading(input);
  const nav = <NavBar title={S.title} onBack={goBackOrHome} />;

  if (loaded && !profile)
    return (
      <Screen nav={nav}>
        <ChartEmpty />
      </Screen>
    );

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
      <ReadingView reading={state.reading} />
      <View style={styles.footer}>
        <TextLink label={S.seeChart} onPress={() => router.push('/chart')} />
        <Txt variant="label" color="gray">
          {S.disclaimer}
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { gap: Spacing.md, paddingTop: Spacing.lg },
  footer: { gap: Spacing.lg, paddingTop: Spacing.lg },
});
