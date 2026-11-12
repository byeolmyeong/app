import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/button';
import { NavBar } from '@/components/nav-bar';
import { Screen } from '@/components/screen';
import { Txt } from '@/components/txt';
import { Spacing } from '@/constants/theme';
import { strings } from '@/content/strings';
import { useSession } from '@/features/auth/use-session';
import { BirthFields, useBirthFields } from '@/features/chart/birth-fields';
import type { BirthProfile } from '@/features/chart/birth-input';
import { goBackOrHome } from '@/features/chart/chart-empty';
import { freshOf } from '@/features/synastry/fresh-synastry';
import { SynastryReportView } from '@/features/synastry/synastry-report-view';
import { useSynastryReport } from '@/features/synastry/use-synastry-report';
import type { BirthInput } from '@/lib/api';

const S = strings.synastry.report;

/**
 * 궁합 리포트: 끌림 · 대화 · 갈등 · 오래가기 네 영역의 긴 글. 글은 1~2분 동안 쓰이므로 요청한 뒤 쓰는 중을 보여 준다.
 * 서버에 상대의 출생 정보가 없어 요청할 때 다시 보낸다(서버 결정 008): 방금 계산한 궁합이면 메모리의 값을 그대로 보내고,
 * 나중에 연 궁합이면 다시 입력받는다. 다 쓰인 글을 읽는 데에는 출생 정보가 필요 없다. 다시 넣은 값도 기기에 보관하지 않는다.
 */
export default function SynastryReportScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { ready } = useSession();
  const synastryId = typeof id === 'string' ? id : null;
  const { state, start, recheck } = useSynastryReport(ready ? synastryId : null);
  /** 이 화면에서 다시 넣은 상대의 출생 정보. 거절됐을 때 칸을 다시 채우는 데만 쓴다(메모리) */
  const [typed, setTyped] = useState<BirthProfile | null>(null);
  /** 방금 계산한 궁합이면 입력 화면에서 넣은 값이 메모리에 있다 */
  const remembered = synastryId ? (freshOf(synastryId)?.birth ?? null) : null;
  const nav = <NavBar title={S.title} onBack={goBackOrHome} />;

  const reenter = (
    <PartnerBirthForm
      initial={typed}
      onSubmit={(profile, input) => {
        setTyped(profile);
        start(input);
      }}
    />
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
          {remembered ? <Button label={S.request} onPress={() => start(remembered)} /> : null}
        </View>
        {remembered ? null : reenter}
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

  if (state.status === 'failed') {
    const { error, stage } = state;
    if (error === 'PROFILE_CHANGED')
      return (
        <Screen nav={nav}>
          <View style={styles.status}>
            <Txt variant="body">{S.profileChanged}</Txt>
            <Button label={S.recalculate} onPress={() => router.replace('/synastry')} />
          </View>
        </Screen>
      );
    const message =
      error === 'BIRTH_MISMATCH'
        ? S.mismatch
        : error === 'NETWORK' || error === 'LIMIT'
          ? S.failed[error]
          : S.failed.OTHER;
    // 상태 확인만 실패했으면 다시 확인한다. 요청이 실패했으면 상대의 출생 정보로 다시 요청해야 한다:
    // 메모리에 있으면 그 값으로, 없거나 그 값이 거절됐으면 다시 입력받는다.
    const retry =
      stage === 'check' ? recheck : remembered && error !== 'BIRTH_MISMATCH' ? () => start(remembered) : null;
    return (
      <Screen nav={nav}>
        <View style={styles.status}>
          <Txt variant="body">{message}</Txt>
          {retry ? <Button label={S.retry} onPress={retry} /> : null}
        </View>
        {retry ? null : reenter}
      </Screen>
    );
  }

  return (
    <Screen nav={nav}>
      <SynastryReportView report={state.report} />
      <View style={styles.footer}>
        <Txt variant="label" color="gray">
          {strings.reading.disclaimer}
        </Txt>
      </View>
    </Screen>
  );
}

/** 상대의 출생 정보를 다시 넣는 칸과 "리포트 받기". 넣은 값은 부른 화면에 돌려줄 뿐 보관하지 않는다. */
function PartnerBirthForm({
  initial,
  onSubmit,
}: {
  initial: BirthProfile | null;
  onSubmit: (profile: BirthProfile, input: BirthInput) => void;
}) {
  const fields = useBirthFields(initial);
  return (
    <View style={styles.reenter}>
      <Txt variant="table" color="gray">
        {S.reenter}
      </Txt>
      <BirthFields control={fields} />
      <Button
        label={S.request}
        onPress={() => {
          const v = fields.validate();
          if (v) onSubmit(v.profile, v.input);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  status: { gap: Spacing.md, paddingTop: Spacing.lg },
  reenter: { gap: Spacing.lg, paddingTop: Spacing.xs },
  footer: { paddingTop: Spacing.lg },
});
