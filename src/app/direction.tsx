import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { StatusView } from '@/components/status-view';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { birthInputOf } from '@/features/chart/birth-input';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { DirectionView } from '@/features/direction/direction-view';
import { useDirection } from '@/features/direction/use-direction';
import { useGenerationBusy } from '@/features/update/update-gate';

const S = strings.direction;

/**
 * 방향성 제시(이성): 서버가 쓴 "연애에서 해 볼 만한 것" 한 줄 제목과 3개(결정 023). 처음에는 글을 쓰는 동안 기다린다.
 * 다시 생성은 없다(같은 차트 = 같은 글). 실패했을 때만 "다시 시도" 가 보인다.
 */
export default function DirectionScreen() {
  const { ready } = useSession();
  const { loaded, profile } = useBirthProfile();
  const birth = useMemo(() => (profile ? birthInputOf(profile) : null), [profile]);
  const { state, retry } = useDirection(birth, ready);
  // 기다리는 중이거나 방금 받은 글이 떠 있는 동안에는 강제 업데이트를 미룬다(결정 027).
  useGenerationBusy(profile !== null && state.status === 'loading', state.status === 'done');
  const nav = <NavBar title={S.title} onBack={goBackOrHome} />;

  if (loaded && !profile)
    return (
      <Screen nav={nav}>
        <ChartEmpty />
      </Screen>
    );

  // 기기를 찾아보는 동안에는 아무것도 그리지 않는다(기다리는 문구가 잠깐 비치지 않게).
  if (state.status === 'checking') return <Screen nav={nav}>{null}</Screen>;

  if (state.status === 'loading')
    return (
      <Screen nav={nav}>
        <StatusView state="think" title={S.generating} note={S.generatingNote} />
      </Screen>
    );

  if (state.status === 'failed')
    return (
      <Screen nav={nav}>
        <StatusView state="error" title={state.error === 'NETWORK' || state.error === 'LIMIT' ? S.failed[state.error] : S.failed.OTHER}>
          <Button label={S.retry} onPress={retry} />
        </StatusView>
      </Screen>
    );

  return (
    <Screen nav={nav}>
      <DirectionView direction={state.direction} />
      <View style={styles.footer}>
        <Txt variant="label" color="gray">
          {strings.reading.disclaimer}
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: { paddingTop: Spacing.lg },
});
