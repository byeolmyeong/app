import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { birthInputOf } from '@/features/chart/birth-input';
import { ChartEmpty, goBackOrHome } from '@/features/chart/chart-empty';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { FutureDirection } from '@/features/direction/future-direction';
import { ReportView, TIMING_TAB, type ReportTab } from '@/features/report/report-view';
import { useReport } from '@/features/report/use-report';
import { ShareEntry } from '@/features/share/share-entry';
import { useGenerationBusy, useUpdateBusy } from '@/features/update/update-gate';
import { REPORT_AREAS } from '@/lib/api';

const S = strings.report;
/** 주소의 area 로 고를 수 있는 탭 */
const TABS: ReportTab[] = [...REPORT_AREAS, TIMING_TAB];

/**
 * 심층 리포트: 서버가 쓴 네 영역(성격 · 관계 · 일 · 감정)의 긴 글과 시기(변곡점 · 구간). 글은 1~2분 동안 쓰이므로 요청한 뒤 쓰는 중을 보여 준다.
 * 시기 탭의 "지금" 바로 아래에는 방향성 제시(미래)가 붙고, 그 글은 시기 탭이 보일 때만 요청한다(결정 026 · 031).
 * 주소의 area(예: `/report?area=RELATIONSHIP`, 시기는 `/report?area=TIMING`)로 처음 보일 탭을 고른다. 다시 생성은 없다(같은 차트 = 같은 글).
 */
export default function ReportScreen() {
  const { area } = useLocalSearchParams<{ area?: string }>();
  const { ready } = useSession();
  const { loaded, profile } = useBirthProfile();
  // 세션 확인과 기기 저장소 읽기가 끝난 뒤에 서버를 부른다.
  const input = useMemo(() => (ready && profile ? birthInputOf(profile) : null), [ready, profile]);
  const { state, start } = useReport(input);
  // 쓰는 중이거나 방금 다 쓰인 글이 떠 있는 동안에는 강제 업데이트를 미룬다(결정 027).
  useGenerationBusy(state.status === 'writing', state.status === 'done');
  // 시기 탭의 방향성(미래) 글을 기다리는 동안에도 미룬다.
  const [futureLoading, setFutureLoading] = useState(false);
  useUpdateBusy(futureLoading);
  const nav = <NavBar title={S.title} onBack={goBackOrHome} />;

  if (loaded && !profile)
    return (
      <Screen nav={nav}>
        <ChartEmpty />
      </Screen>
    );

  if (state.status === 'checking')
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="table" color="gray">
            {S.checking}
          </Txt>
        </View>
      </Screen>
    );

  if (state.status === 'none')
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="body">{S.intro}</Txt>
          <Button label={S.request} onPress={start} />
        </View>
      </Screen>
    );

  if (state.status === 'writing')
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="heading">{S.writing}</Txt>
          <Txt variant="table" color="gray">
            {S.writingNote}
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
          <Button label={S.retry} onPress={start} />
        </View>
      </Screen>
    );

  return (
    <Screen nav={nav}>
      <ReportView
        report={state.report}
        initialArea={TABS.find((a) => a === area)}
        // 다음 변곡점이 없으면(네 번을 모두 지났다) 공유할 것이 없어 버튼을 두지 않는다(결정 025)
        timingShare={
          state.report.timing.current.nextMilestone ? (
            <ShareEntry target={{ kind: 'NEXT_TURN' }} label={strings.share.openNextTurn} />
          ) : undefined
        }
        timingAfterNow={<FutureDirection input={input} onLoadingChange={setFutureLoading} />}
      />
      <View style={styles.footer}>
        <Txt variant="label" color="gray">
          {strings.reading.disclaimer}
        </Txt>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { gap: Spacing.md, paddingTop: Spacing.lg },
  footer: { paddingTop: Spacing.lg },
});
