import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { OfflineBanner } from '@/components/offline-banner';
import { StateScreen } from '@/components/state-screen';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { useOnReconnect, useOnline } from '@/components/use-online';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { birthInputOf } from '@/features/chart/birth-input';
import { ChartEmpty } from '@/features/chart/chart-empty';
import { useBirthProfile } from '@/features/chart/use-birth-profile';
import { MainTabs } from '@/features/home/main-tabs';
import { TimingView } from '@/features/report/timing-view';
import { useReport } from '@/features/report/use-report';
import { ShareEntry } from '@/features/share/share-entry';
import { useGenerationBusy } from '@/features/update/update-gate';

const S = strings.report;
const ST = strings.states;

/**
 * 시기 탭의 임시 화면(계획 A② 태스크 14): 심층 리포트 화면(`/report`)을 없애면서(결정 048 의 6) 그 시기 부분(변곡점 · 구간)만 여기서 그린다.
 * 글은 지금의 심층 리포트(`POST /reports` · `GET /reports/me`, 서버 S⑦ 까지 있다)를 그대로 쓰고, 요청한 뒤 쓰는 중을 보여 준다.
 * 계획 A③ 이 새 시기 탭(이번 달 · 올해 · 인생, 결정 049)으로 바꾼다. 탭의 첫 화면이라 뒤로 가기가 없다(결정 046 의 2).
 */
export default function TimingScreen() {
  const { ready } = useSession();
  const { loaded, profile } = useBirthProfile();
  // 세션 확인과 기기 저장소 읽기가 끝난 뒤에 서버를 부른다.
  const input = useMemo(() => (ready && profile ? birthInputOf(profile) : null), [ready, profile]);
  const { state, start, recheck } = useReport(input);
  // 쓰는 중이거나 방금 다 쓰인 글이 떠 있는 동안에는 강제 업데이트를 미룬다(결정 027).
  useGenerationBusy(state.status === 'writing', state.status === 'done');
  const nav = <NavBar title={strings.tabs.timing} />;
  const tabs = <MainTabs active="timing" />;
  // 연결 끊김(결정 061 의 4): 다 쓴 글은 그대로 두고 위에 띠, 끊겨서 못 받았으면 연결이 돌아올 때 상태만 다시 묻는다
  const online = useOnline();
  useOnReconnect(online, () => {
    if (state.status === 'failed' && state.error === 'NETWORK') recheck();
  });

  if (loaded && !profile)
    return (
      <Screen nav={nav} footer={tabs}>
        <ChartEmpty />
      </Screen>
    );

  if (state.status === 'checking')
    return (
      <Screen nav={nav} footer={tabs}>
        <View style={styles.status}>
          <Txt variant="table" color="gray">
            {S.checking}
          </Txt>
        </View>
      </Screen>
    );

  if (state.status === 'none')
    return (
      <Screen nav={nav} footer={tabs}>
        <View style={styles.status}>
          <Txt variant="body">{S.intro}</Txt>
          <Button label={S.request} onPress={start} />
        </View>
      </Screen>
    );

  if (state.status === 'writing')
    return (
      <Screen nav={nav} footer={tabs}>
        <View style={styles.status}>
          <Txt variant="heading">{S.writing}</Txt>
          <Txt variant="table" color="gray">
            {S.writingNote}
          </Txt>
        </View>
      </Screen>
    );

  // 못 받았을 때(결정 061 의 1 · 3 · 4): 끊겨서면 보드 20-1, 서버가 끝내 못 썼으면(FAILED) "다시 쓰기", 그 밖에는 보드 19.
  // "다시 보기" 와 연결이 돌아왔을 때는 상태만 다시 확인한다 — 만들기(POST)는 사람이 누를 때만(리뷰 PR #44)
  if (state.status === 'failed') {
    if (state.error === 'NETWORK' && !online)
      return (
        <StateScreen
          nav={nav}
          tabs={tabs}
          title={ST.offlineEmpty.title}
          body={ST.offlineEmpty.body}
          primary={{ label: ST.offlineEmpty.retry, onPress: recheck }}
        />
      );
    if (state.error === 'FAILED')
      return (
        <StateScreen
          nav={nav}
          tabs={tabs}
          title={ST.writeFail.title.report}
          body={ST.writeFail.body}
          primary={{ label: ST.writeFail.retry, onPress: start }}
        />
      );
    return (
      <StateScreen
        nav={nav}
        tabs={tabs}
        title={ST.loadFail.title.report}
        body={state.error === 'LIMIT' ? S.failed.LIMIT : ST.loadFail.body}
        primary={{ label: ST.loadFail.retry, onPress: recheck }}
      />
    );
  }

  return (
    <Screen nav={nav} footer={tabs}>
      {online ? null : <OfflineBanner />}
      <TimingView
        timing={state.report.timing}
        // 다음 변곡점이 없으면(네 번을 모두 지났다) 공유할 것이 없어 버튼을 두지 않는다(결정 025)
        share={
          state.report.timing.current.nextMilestone ? (
            <ShareEntry target={{ kind: 'NEXT_TURN' }} label={strings.share.openNextTurn} />
          ) : undefined
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  status: { gap: Spacing.md, paddingTop: Spacing.lg },
});
