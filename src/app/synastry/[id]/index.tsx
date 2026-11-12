import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { InfoButton } from '@/components/info-button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { SectionHead } from '@/components/section-head';
import { TextLink } from '@/components/text-link';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { goBackOrHome } from '@/features/chart/chart-empty';
import { OverlayWheel } from '@/features/chart/overlay-wheel';
import { SynastrySummary } from '@/features/synastry/synastry-summary';
import { useSynastry } from '@/features/synastry/use-synastry';

const S = strings.synastry.result;
const H = strings.help.overlay;

/**
 * 궁합 결과: 나 기준 점수(서버가 준 값) · 한 줄 요약 · 키워드 셋.
 * 방금 계산한 결과에는 겹친 휠이 있고, 나중에 목록에서 다시 연 결과에는 없다(서버가 상대의 위치를 저장하지 않는다).
 */
export default function SynastryResultScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { ready } = useSession();
  const { state, retry } = useSynastry(ready && typeof id === 'string' ? id : null);
  const nav = <NavBar title={strings.synastry.title} onBack={goBackOrHome} />;

  if (state.status === 'loading')
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="table" color="gray">
            {S.loading}
          </Txt>
        </View>
      </Screen>
    );

  if (state.status === 'failed')
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          {state.notFound ? (
            <>
              <Txt variant="body">{S.notFound}</Txt>
              <Button label={S.goEntry} onPress={() => router.replace('/synastry')} />
            </>
          ) : (
            <>
              <Txt variant="body">
                {state.error === 'NETWORK' || state.error === 'LIMIT' ? S.failed[state.error] : S.failed.OTHER}
              </Txt>
              <Button label={S.retry} onPress={retry} />
            </>
          )}
        </View>
      </Screen>
    );

  const { synastry } = state;
  return (
    <Screen nav={nav}>
      <SynastrySummary synastry={synastry} />
      {synastry.overlay ? (
        <>
          <SectionHead title={S.wheelHeading}>
            <InfoButton testID="info-overlay" title={H.title} items={H.items} />
          </SectionHead>
          <Txt variant="table" color="gray">
            {S.wheelCaption}
          </Txt>
          <OverlayWheel overlay={synastry.overlay} name={synastry.name} />
        </>
      ) : (
        <Txt variant="label" color="gray">
          {S.noWheel}
        </Txt>
      )}
      <View style={styles.footer}>
        <Button
          label={synastry.reportStatus === 'DONE' ? S.seeReport : S.getReport}
          onPress={() => router.push(`/synastry/${synastry.id}/report`)}
        />
        <TextLink label={strings.synastry.past.seeRanking} onPress={() => router.push('/synastry/ranking')} />
        <Txt variant="label" color="gray">
          {strings.reading.disclaimer}
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { gap: Spacing.md, paddingTop: Spacing.lg },
  footer: { marginTop: 'auto', gap: Spacing.lg, paddingTop: Spacing.lg },
});
